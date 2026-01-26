import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useScheduleStore } from '../../store/useScheduleStore';
import { processRoster, saveJobAliases, getJobAliases } from '../../lib/rosterApi';
import { supabase } from '../../lib/supabaseClient';
import { compressImage, createPreviewUrl, isPDF } from '../../utils/imageUtils';
import { extractFirstPageAsImage } from '../../utils/pdfUtils';
import type { ParsedShift, JobAlias } from '../../types';
import type { ScanStep, JobMapping } from './types';
import { UploadStep } from './UploadStep';
import { ProcessingStep } from './ProcessingStep';
import { JobMappingStep } from './JobMappingStep';
import { ConfirmationStep } from './ConfirmationStep';

interface RosterScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEP_TITLES: Record<ScanStep, string> = {
  upload: 'Scan Roster',
  processing: 'Analyzing',
  mapping: 'Map Jobs',
  confirmation: 'Confirm Shifts'
};

export function RosterScannerModal({ isOpen, onClose }: RosterScannerModalProps) {
  const { jobConfigs, shifts: existingShifts, addMultipleShifts, addJobConfig } = useScheduleStore();
  const [isRendered, setIsRendered] = useState(false);

  // Scanner state
  const [step, setStep] = useState<ScanStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsedShifts, setParsedShifts] = useState<ParsedShift[]>([]);
  const [unmappedJobNames, setUnmappedJobNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [scanLimit, setScanLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jobAliases, setJobAliases] = useState<JobAlias[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setStep('upload');
      setFile(null);
      setPreviewUrl(null);
      setParsedShifts([]);
      setUnmappedJobNames([]);
      setError(null);
      setErrorType(null);
      setScanLimit(null);
      setIsLoading(false);
      setShowSuccess(false);
      setAddedCount(0);

      // Fetch existing job aliases
      getJobAliases().then(aliases => setJobAliases(aliases)).catch(console.error);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setErrorType(null);

    // Create preview for images
    if (!isPDF(selectedFile)) {
      const url = createPreviewUrl(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const handleClearFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setErrorType(null);
  }, [previewUrl]);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    setStep('processing');
    setError(null);
    setErrorType(null);
    setIsLoading(true);

    try {
      // Compress image or extract from PDF
      let imageBase64: string;

      if (isPDF(file)) {
        imageBase64 = await extractFirstPageAsImage(file);
      } else {
        imageBase64 = await compressImage(file);
      }

      // Call API
      const result = await processRoster(
        imageBase64,
        jobConfigs.map(j => ({ id: j.id, name: j.name })),
        jobAliases.map(a => ({ alias: a.alias, job_config_id: a.job_config_id }))
      );

      if (!result.success) {
        setError(result.error || 'Processing failed');
        setErrorType(result.errorType || 'unknown');
        setScanLimit(result.scanLimit ?? null);
        setIsLoading(false);
        return;
      }

      setParsedShifts(result.shifts);

      // Check for unmapped jobs
      const unmapped = result.shifts
        .filter(s => !s.mappedJobId)
        .map(s => s.rosterJobName)
        .filter((name, idx, arr) => arr.indexOf(name) === idx); // unique

      setUnmappedJobNames(unmapped);

      // Go to mapping step if there are unmapped jobs
      if (unmapped.length > 0) {
        setStep('mapping');
      } else {
        setStep('confirmation');
      }
    } catch (err) {
      console.error('Process error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setErrorType('unknown');
      setScanLimit(null);
    } finally {
      setIsLoading(false);
    }
  }, [file, jobConfigs, jobAliases]);

  const handleRetry = useCallback(() => {
    handleProcess();
  }, [handleProcess]);

  const handleBackToUpload = useCallback(() => {
    setStep('upload');
    setError(null);
    setErrorType(null);
  }, []);

  const handleReauth = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      onClose();
    }
  }, [onClose]);

  const handleAddJob = useCallback(async (newJob: import('../../types').JobConfig) => {
    await addJobConfig(newJob);
  }, [addJobConfig]);

  const handleMappingComplete = useCallback(async (mappings: JobMapping[]) => {
    // Apply mappings to shifts
    const updatedShifts = parsedShifts.map(shift => {
      const mapping = mappings.find(m => m.rosterJobName === shift.rosterJobName);
      if (mapping) {
        return { ...shift, mappedJobId: mapping.mappedJobId };
      }
      return shift;
    });

    setParsedShifts(updatedShifts);

    // Save aliases for mappings that should be remembered
    const aliasesToSave = mappings.filter(m => m.saveAsAlias);
    if (aliasesToSave.length > 0) {
      try {
        await saveJobAliases(aliasesToSave.map(m => ({
          alias: m.rosterJobName,
          job_config_id: m.mappedJobId
        })));

        // Update local aliases
        const newAliases = await getJobAliases();
        setJobAliases(newAliases);
      } catch (err) {
        console.error('Failed to save aliases:', err);
      }
    }

    setStep('confirmation');
  }, [parsedShifts]);

  const handleShiftsChange = useCallback((shifts: ParsedShift[]) => {
    setParsedShifts(shifts);
  }, []);

  const handleConfirm = useCallback(async () => {
    const selectedShifts = parsedShifts.filter(s => s.selected && s.mappedJobId);

    if (selectedShifts.length === 0) return;

    setIsLoading(true);

    try {
      // Convert ParsedShift to Shift format
      const shiftsToAdd = selectedShifts.map(s => ({
        id: s.id,
        date: s.date,
        type: s.mappedJobId!,
        hours: s.totalHours,
        note: `Scanned: ${s.startTime}-${s.endTime}`
      }));

      await addMultipleShifts(shiftsToAdd);

      setAddedCount(shiftsToAdd.length);
      setShowSuccess(true);

      // Auto-close after showing success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to add shifts:', err);
      setError('Failed to add shifts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [parsedShifts, addMultipleShifts, onClose]);

  if (!isRendered) return null;

  return (
    <div
      className={clsx(
        "fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <div
        className={clsx(
          "glass-panel w-full max-w-lg mx-4 overflow-hidden transform transition-all duration-300",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg neu-pressed">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-700">
              {STEP_TITLES[step]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neu-icon-btn w-8 h-8 !rounded-lg !p-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Step indicator */}
        {!showSuccess && (
          <div className="px-6 py-3 border-b border-white/20 bg-white/10">
            <div className="flex items-center justify-between">
              {(['upload', 'processing', 'mapping', 'confirmation'] as ScanStep[]).map((s, idx) => (
                <div key={s} className="flex items-center">
                  <div
                    className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      step === s
                        ? "bg-indigo-500 text-white"
                        : ['upload', 'processing', 'mapping', 'confirmation'].indexOf(step) > idx
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-400"
                    )}
                  >
                    {['upload', 'processing', 'mapping', 'confirmation'].indexOf(step) > idx ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < 3 && (
                    <div
                      className={clsx(
                        "w-8 h-0.5 mx-1",
                        ['upload', 'processing', 'mapping', 'confirmation'].indexOf(step) > idx
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="p-4 rounded-full bg-emerald-50 w-fit mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              {addedCount} Shifts Added!
            </h3>
            <p className="text-sm text-slate-500">
              Your calendar has been updated.
            </p>
          </div>
        ) : (
          <>
            {step === 'upload' && (
              <UploadStep
                file={file}
                previewUrl={previewUrl}
                onFileSelect={handleFileSelect}
                onClear={handleClearFile}
                onProcess={handleProcess}
                isLoading={isLoading}
              />
            )}

            {step === 'processing' && (
      <ProcessingStep
        error={error}
        errorType={errorType}
        scanLimit={scanLimit}
        onRetry={handleRetry}
        onBack={handleBackToUpload}
        onReauth={handleReauth}
      />
            )}

            {step === 'mapping' && (
              <JobMappingStep
                unmappedJobNames={unmappedJobNames}
                jobConfigs={jobConfigs}
                onComplete={handleMappingComplete}
                onBack={() => setStep('upload')}
                onAddJob={handleAddJob}
              />
            )}

            {step === 'confirmation' && (
              <ConfirmationStep
                shifts={parsedShifts}
                jobConfigs={jobConfigs}
                existingShifts={existingShifts}
                onShiftsChange={handleShiftsChange}
                onConfirm={handleConfirm}
                onBack={() => unmappedJobNames.length > 0 ? setStep('mapping') : setStep('upload')}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

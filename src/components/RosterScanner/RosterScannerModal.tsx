import { useState, useEffect, useCallback } from 'react';
import { isWeekend } from 'date-fns';
import { X, Sparkles, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useScheduleStore } from '../../store/useScheduleStore';
import { processRosterPhase1, processRosterPhase2, saveJobAliases, getJobAliases, getRosterScanUsage } from '../../lib/rosterApi';
import { supabase } from '../../lib/supabaseClient';
import { compressImage, createPreviewUrl, isPDF } from '../../utils/imageUtils';
import { addHoursToTime } from '../../utils/timeUtils';
import { extractFirstPageAsImage } from '../../utils/pdfUtils';
import type { ParsedShift, JobAlias, IdentifiedPerson, SmartQuestion, QuestionAnswer, OcrResult } from '../../types';
import type { ScanStep, JobMapping } from './types';
import { UploadStep } from './UploadStep';
import { ProcessingStep } from './ProcessingStep';
import { QuestionStep } from './QuestionStep';
import { JobMappingStep } from './JobMappingStep';
import { ConfirmationStep } from './ConfirmationStep';

interface RosterScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extended step type to include questions
type ExtendedScanStep = ScanStep | 'questions';

const STEP_TITLE_KEYS: Record<ExtendedScanStep, string> = {
  upload: 'rosterScanner.scanRoster',
  processing: 'rosterScanner.analyzing',
  questions: 'rosterScanner.quickQuestion',
  mapping: 'rosterScanner.mapJobs',
  confirmation: 'rosterScanner.confirmShifts'
};

const STEP_DESCRIPTION_KEYS: Record<ExtendedScanStep, string> = {
  upload: 'rosterScanner.uploadDescription',
  processing: 'rosterScanner.processingDescription',
  questions: 'rosterScanner.questionsDescription',
  mapping: 'rosterScanner.mappingDescription',
  confirmation: 'rosterScanner.confirmDescription'
};

const STEP_ORDER: ExtendedScanStep[] = ['upload', 'processing', 'questions', 'mapping', 'confirmation'];

export function RosterScannerModal({ isOpen, onClose }: RosterScannerModalProps) {
  const { t } = useTranslation();
  const { jobConfigs, shifts: existingShifts, addMultipleShifts, addJobConfig } = useScheduleStore();
  const [isRendered, setIsRendered] = useState(false);

  // Scanner state
  const [step, setStep] = useState<ExtendedScanStep>('upload');
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

  // AI-first flow state
  const [questions, setQuestions] = useState<SmartQuestion[]>([]);
  const [ocrData, setOcrData] = useState<OcrResult | null>(null);

  // Scan usage state
  const [scanUsage, setScanUsage] = useState<{ used: number; limit: number } | null>(null);

  // Identified person from AI
  const [identifiedPerson, setIdentifiedPerson] = useState<IdentifiedPerson | null>(null);

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
      setQuestions([]);
      setOcrData(null);
      setIdentifiedPerson(null);

      // Fetch existing job aliases
      getJobAliases().then(aliases => setJobAliases(aliases)).catch(console.error);

      // Fetch scan usage
      getRosterScanUsage().then(usage => setScanUsage(usage)).catch(console.error);
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

  // Phase 1: OCR + Question Generation
  const handleProcess = useCallback(async () => {
    if (!file) return;

    setStep('processing');
    setError(null);
    setErrorType(null);
    setIsLoading(true);

    try {
      // Compress image or extract from PDF
      let base64: string;

      if (isPDF(file)) {
        base64 = await extractFirstPageAsImage(file);
      } else {
        base64 = await compressImage(file);
      }

      // Call Phase 1 API: OCR + Question Generation
      const result = await processRosterPhase1(base64);

      if (!result.success) {
        setError(result.error || 'Failed to analyze roster');
        setErrorType(result.errorType || 'unknown');
        setScanLimit(result.scanLimit ?? null);
        setIsLoading(false);
        return;
      }

      // Update scan usage
      if (result.scansUsed !== undefined && result.scanLimit !== undefined) {
        setScanUsage({ used: result.scansUsed, limit: result.scanLimit });
      }

      // Store OCR data and questions (with defensive checks)
      const safeOcrData = result.ocrData || { success: false, contentType: 'text' as const, headers: [], rows: [] };
      setOcrData(safeOcrData);
      const safeQuestions = Array.isArray(result.questions) ? result.questions : [];
      setQuestions(safeQuestions);

      // Check if we should skip questions and go straight to extraction
      // skipToExtraction is true for simple content (single-person, email, etc.)
      const shouldSkipQuestions = result.skipToExtraction === true || safeQuestions.length === 0;

      if (shouldSkipQuestions) {
        // Pass ocrData directly since setState is async
        await handleQuestionSubmit([], safeOcrData);
      } else {
        setStep('questions');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Phase 1 error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setErrorType('unknown');
      setScanLimit(null);
      setIsLoading(false);
    }
  }, [file]);

  // Phase 2: Filter with user's answers
  const handleQuestionSubmit = useCallback(async (answers: QuestionAnswer[], contentData?: OcrResult) => {
    // Use directly passed contentData or fall back to state
    const dataToUse = contentData || ocrData;
    
    if (!dataToUse) {
      setError('Missing OCR data');
      setErrorType('unknown');
      return;
    }

    setStep('processing');
    setIsLoading(true);
    setError(null);

    try {
      // Call Phase 2 API: Filter with answers
      const result = await processRosterPhase2(
        dataToUse,
        answers,
        jobConfigs.map(j => ({ id: j.id, name: j.name })),
        jobAliases.map(a => ({ alias: a.alias, job_config_id: a.job_config_id }))
      );

      if (!result.success) {
        setError(result.error || 'Failed to extract shifts');
        setErrorType(result.errorType || 'unknown');
        setIsLoading(false);
        return;
      }

      // Validate mappedJobId - if the job doesn't exist, treat as unmapped
      const jobConfigIds = new Set(jobConfigs.map(j => j.id));
      const validatedShifts = result.shifts.map(shift => {
        if (shift.mappedJobId && !jobConfigIds.has(shift.mappedJobId)) {
          return { ...shift, mappedJobId: undefined };
        }
        return shift;
      });

      setParsedShifts(validatedShifts);
      setIdentifiedPerson(result.identifiedPerson ?? null);

      // Check for unmapped jobs
      const unmapped = validatedShifts
        .filter(s => !s.mappedJobId)
        .map(s => s.rosterJobName)
        .filter((name, idx, arr) => arr.indexOf(name) === idx);

      setUnmappedJobNames(unmapped);

      // Go to mapping step if there are unmapped jobs
      if (unmapped.length > 0) {
        setStep('mapping');
      } else {
        setStep('confirmation');
      }
    } catch (err) {
      console.error('Phase 2 error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setErrorType('unknown');
    } finally {
      setIsLoading(false);
    }
  }, [ocrData, jobConfigs, jobAliases]);

  const handleRetry = useCallback(() => {
    handleProcess();
  }, [handleProcess]);

  const handleBackToUpload = useCallback(() => {
    setStep('upload');
    setError(null);
    setErrorType(null);
    setQuestions([]);
    setOcrData(null);
  }, []);

  const handleBackToQuestions = useCallback(() => {
    setStep('questions');
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
    const updatedShifts = parsedShifts.map(shift => {
      const mapping = mappings.find(m => m.rosterJobName === shift.rosterJobName);
      if (mapping) {
        return { ...shift, mappedJobId: mapping.mappedJobId };
      }
      return shift;
    });

    setParsedShifts(updatedShifts);

    // Save aliases
    const aliasesToSave = mappings.filter(m => m.saveAsAlias);
    if (aliasesToSave.length > 0) {
      try {
        await saveJobAliases(aliasesToSave.map(m => ({
          alias: m.rosterJobName,
          job_config_id: m.mappedJobId
        })));
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
      const shiftsToAdd = selectedShifts.map(s => {
        let note = `Scanned from roster: ${s.rosterJobName}`;
        if (s.startTime && s.endTime) {
          note = `Scanned: ${s.startTime}-${s.endTime}`;
        }
        
        // Calculate default hours/times if missing
        const jobConfig = jobConfigs.find(j => j.id === s.mappedJobId);
        let hours = s.totalHours ?? 0;
        let startTime = s.startTime;
        let endTime = s.endTime;

        if (jobConfig) {
          const dateObj = new Date(s.date);
          const isWknd = isWeekend(dateObj);
          const defaultDuration = isWknd ? jobConfig.defaultHours.weekend : jobConfig.defaultHours.weekday;

          // 1. If hours is 0, use default duration
          if (!hours && defaultDuration > 0) {
            hours = defaultDuration;
          }

          // 2. If startTime exists but endTime is missing, calculate it
          if (startTime && !endTime) {
            const calculatedEnd = addHoursToTime(startTime, hours);
            if (calculatedEnd) {
              endTime = calculatedEnd;
            }
          }
        }

        return {
          id: s.id,
          date: s.date,
          type: s.mappedJobId!,
          hours: hours,
          note,
          ...(startTime ? { startTime: startTime } : {}),
          ...(endTime ? { endTime: endTime } : {})
        };
      });

      await addMultipleShifts(shiftsToAdd);
      setAddedCount(shiftsToAdd.length);
      setShowSuccess(true);

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

  const getStepIndex = (s: ExtendedScanStep) => STEP_ORDER.indexOf(s);

  if (!isRendered) return null;

  return (
    <div
      className={clsx(
        "fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div
        className={clsx(
          "glass-panel w-full max-w-lg mx-4 overflow-hidden transform transition-all duration-300",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg neu-pressed">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-700">
              {t(STEP_TITLE_KEYS[step])}
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
              {STEP_ORDER.map((s, idx) => (
                <div key={s} className="flex items-center">
                  <div
                    className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      step === s
                        ? "bg-indigo-500 text-white"
                        : getStepIndex(step) > idx
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-400"
                    )}
                  >
                    {getStepIndex(step) > idx ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < STEP_ORDER.length - 1 && (
                    <div
                      className={clsx(
                        "w-6 h-0.5 mx-0.5",
                        getStepIndex(step) > idx ? "bg-emerald-500" : "bg-slate-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">{t(STEP_DESCRIPTION_KEYS[step])}</p>
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
                identifier={null}
                onIdentifierChange={() => {}}
                scanAll={true}
                onScanAllChange={() => {}}
                scanUsage={scanUsage}
              />
            )}

            {step === 'processing' && (
              <ProcessingStep
                error={error}
                errorType={errorType}
                scanLimit={scanLimit}
                onRetry={handleRetry}
                onBack={questions.length > 0 ? handleBackToQuestions : handleBackToUpload}
                onReauth={handleReauth}
              />
            )}

            {step === 'questions' && ocrData && (
              <QuestionStep
                questions={questions}
                ocrData={ocrData}
                onSubmit={handleQuestionSubmit}
                onBack={handleBackToUpload}
                isLoading={isLoading}
              />
            )}

            {step === 'mapping' && (
              <JobMappingStep
                unmappedJobNames={unmappedJobNames}
                jobConfigs={jobConfigs}
                onComplete={handleMappingComplete}
                onBack={handleBackToQuestions}
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
                onBack={() => unmappedJobNames.length > 0 ? setStep('mapping') : handleBackToQuestions()}
                isLoading={isLoading}
                onAddJob={handleAddJob}
                identifiedPerson={identifiedPerson}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

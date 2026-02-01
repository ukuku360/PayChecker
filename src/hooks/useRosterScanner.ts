import { useState, useCallback, useEffect } from 'react';
import { isWeekend, format, parseISO } from 'date-fns';
import { useScheduleStore } from '../store/useScheduleStore';
import { toast } from '../store/useToastStore';
import { processRosterPhase1, processRosterPhase2, saveJobAliases, getJobAliases, getRosterScanUsage } from '../lib/rosterApi';
import { supabase } from '../lib/supabaseClient';
import { compressImage, createPreviewUrl, isPDF } from '../utils/imageUtils';
import { addHoursToTime } from '../utils/timeUtils';
import { extractFirstPageAsImage } from '../utils/pdfUtils';
import type { ParsedShift, JobAlias, IdentifiedPerson, SmartQuestion, QuestionAnswer, OcrResult, JobConfig, Shift } from '../types';
import type { ScanStep, JobMapping } from '../components/RosterScanner/types';

// Extended step type to include questions
export type ExtendedScanStep = ScanStep | 'questions';

interface UseRosterScannerProps {
  initialIsOpen: boolean;
  onClose: () => void;
}

export function useRosterScanner({ initialIsOpen, onClose }: UseRosterScannerProps) {
  const { jobConfigs, shifts: existingShifts, addMultipleShifts, addJobConfig } = useScheduleStore();
  
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

  // Reset state when modal opens
  useEffect(() => {
    if (initialIsOpen) {
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

      getJobAliases().then(aliases => setJobAliases(aliases)).catch(console.error);
      
      const fetchUsage = async () => {
        try {
          const usage = await getRosterScanUsage();
          const { data: { user } } = await supabase.auth.getUser();
          const isDev = user?.email === 'nayoonho2001@gmail.com';
          
          setScanUsage({
            used: usage.used,
            limit: isDev ? usage.limit : 5
          });
        } catch (err) {
          console.error(err);
        }
      };
      fetchUsage();
    }
  }, [initialIsOpen]);

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



  // Helper for Phase 2
  const executePhase2 = async (answers: QuestionAnswer[], contentData: OcrResult) => {
    setStep('processing');
    setIsLoading(true);
    setError(null);

    try {
      const result = await processRosterPhase2(
        contentData,
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

      const jobConfigIds = new Set(jobConfigs.map(j => j.id));
      const validatedShifts = result.shifts.map((shift: ParsedShift) => {
        if (shift.mappedJobId && !jobConfigIds.has(shift.mappedJobId)) {
          return { ...shift, mappedJobId: undefined };
        }
        return shift;
      });

      setParsedShifts(validatedShifts);
      setIdentifiedPerson(result.identifiedPerson ?? null);

      const unmapped = validatedShifts
        .filter((s: ParsedShift) => !s.mappedJobId)
        .map((s: ParsedShift) => s.rosterJobName)
        .filter((name: string, idx: number, arr: string[]) => arr.indexOf(name) === idx);

      setUnmappedJobNames(unmapped);

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
  };

  const handleQuestionSubmit = useCallback(async (answers: QuestionAnswer[], contentData?: OcrResult) => {
    const dataToUse = contentData || ocrData;
    if (!dataToUse) {
      setError('Missing OCR data');
      setErrorType('unknown');
      return;
    }
    await executePhase2(answers, dataToUse);
  }, [ocrData, jobConfigs, jobAliases]);

  // Fix: Chain Phase 1 to Phase 2 if needed.
  // We need to modify handleProcess to call executePhase2 directly if skipping.
  const handleProcessWithSkip = useCallback(async () => {
    if (!file) return;

    // Check usage limit
    if (scanUsage && scanUsage.used >= scanUsage.limit) {
      setError(`Monthly limit reached (${scanUsage.limit} scans).`);
      setErrorType('limit_exceeded');
      return;
    }

    setStep('processing');
    setError(null);
    setErrorType(null);
    setIsLoading(true);

    try {
      let base64: string;
      if (isPDF(file)) {
        base64 = await extractFirstPageAsImage(file);
      } else {
        base64 = await compressImage(file);
      }

      const result = await processRosterPhase1(base64);

      if (!result.success) {
        setError(result.error || 'Failed to analyze roster');
        setErrorType(result.errorType || 'unknown');
        setScanLimit(result.scanLimit ?? null);
        setIsLoading(false);
        return;
      }

      if (result.scansUsed !== undefined && result.scanLimit !== undefined) {
        const { data: { user } } = await supabase.auth.getUser();
        const isDev = user?.email === 'nayoonho2001@gmail.com';
        setScanUsage({ 
          used: result.scansUsed, 
          limit: isDev ? result.scanLimit : 5 
        });
      }

      const safeOcrData = result.ocrData || { success: false, contentType: 'text' as const, headers: [], rows: [] };
      setOcrData(safeOcrData);
      const safeQuestions = Array.isArray(result.questions) ? result.questions : [];
      setQuestions(safeQuestions);

      const shouldSkipQuestions = result.skipToExtraction === true || safeQuestions.length === 0;

      if (shouldSkipQuestions) {
        // Call Phase 2 immediately
        await executePhase2([], safeOcrData);
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
  }, [file, jobConfigs, jobAliases]);

  const handleRetry = useCallback(() => {
    handleProcessWithSkip();
  }, [handleProcessWithSkip]);

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

  const handleAddJob = useCallback(async (newJob: JobConfig) => {
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
        toast.warning('Alias preferences could not be saved. They will need to be re-mapped next time.');
      }
    }

    setStep('confirmation');
  }, [parsedShifts]);

  const handleConfirm = useCallback(async () => {
    const selectedShifts = parsedShifts.filter(s => s.selected && s.mappedJobId);
    if (selectedShifts.length === 0) {
      setError('Please select at least one shift to add.');
      setErrorType('unknown');
      return;
    }

    setIsLoading(true);

    try {
      const shiftsToAdd: Shift[] = selectedShifts.map(s => {
        let note = `Scanned from roster: ${s.rosterJobName}`;
        if (s.startTime && s.endTime) {
          note = `Scanned: ${s.startTime}-${s.endTime}`;
        }
        
        const jobConfig = jobConfigs.find(j => j.id === s.mappedJobId);
        let hours = s.totalHours ?? 0;
        let startTime = s.startTime;
        let endTime = s.endTime;

        if (jobConfig) {
          const dateObj = new Date(s.date);
          const isWknd = isWeekend(dateObj);
          const defaultDuration = isWknd ? jobConfig.defaultHours.weekend : jobConfig.defaultHours.weekday;

          if (!hours && defaultDuration > 0) {
            hours = defaultDuration;
          }

          if (startTime && !endTime) {
            const calculatedEnd = addHoursToTime(startTime, hours);
            if (calculatedEnd) {
              endTime = calculatedEnd;
            }
          }
        }

        return {
          id: s.id,
          date: format(parseISO(s.date), 'yyyy-MM-dd'),
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
  }, [parsedShifts, addMultipleShifts, onClose, jobConfigs]);

  return {
    // State
    step,
    setStep, // Exposed for back button logic if needed
    file,
    previewUrl,
    parsedShifts,
    unmappedJobNames,
    error,
    errorType,
    scanLimit,
    isLoading,
    showSuccess,
    addedCount,
    questions,
    ocrData,
    scanUsage,
    identifiedPerson,
    jobConfigs,
    existingShifts,
    
    // Actions
    handleFileSelect,
    handleClearFile,
    handleProcess: handleProcessWithSkip, // Use the one with skip logic
    handleQuestionSubmit,
    handleRetry,
    handleBackToUpload,
    handleBackToQuestions,
    handleReauth,
    handleAddJob,
    handleMappingComplete,
    handleConfirm,
    setParsedShifts
  };
}

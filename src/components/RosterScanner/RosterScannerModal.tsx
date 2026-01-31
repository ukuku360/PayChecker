import { useState, useEffect } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

// Components
import { UploadStep } from './UploadStep';
import { ProcessingStep } from './ProcessingStep';
import { QuestionStep } from './QuestionStep';
import { JobMappingStep } from './JobMappingStep';
import { ConfirmationStep } from './ConfirmationStep';

// Hook
import { useRosterScanner, type ExtendedScanStep } from '../../hooks/useRosterScanner';

interface RosterScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const [isRendered, setIsRendered] = useState(false);

  // Use the extracted hook
  const {
    step,
    setStep,
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
    
    handleFileSelect,
    handleClearFile,
    handleProcess,
    handleQuestionSubmit,
    handleRetry,
    handleBackToUpload,
    handleBackToQuestions,
    handleReauth,
    handleAddJob,
    handleMappingComplete,
    handleConfirm,
    setParsedShifts
  } = useRosterScanner({ initialIsOpen: isOpen, onClose });

  // Animation delay effect
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
                onShiftsChange={setParsedShifts}
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

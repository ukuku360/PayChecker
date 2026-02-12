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



export function RosterScannerModal({ isOpen, onClose }: RosterScannerModalProps) {
  const { t } = useTranslation();

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

  if (!isOpen) return null;

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
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-[10px] font-bold text-indigo-500 border border-indigo-200 uppercase tracking-wide">
              Beta
            </span>
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
        {/* Step indicator removed as per user request */}

        {/* Content */}
        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="p-4 rounded-full bg-emerald-50 w-fit mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              {t('rosterScanner.shiftsAdded', { count: addedCount })}
            </h3>
            <p className="text-sm text-slate-500">
              {t('rosterScanner.calendarUpdated')}
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

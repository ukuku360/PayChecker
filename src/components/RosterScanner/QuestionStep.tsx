import { useState } from 'react';
import { HelpCircle, ChevronRight, User } from 'lucide-react';
import { clsx } from 'clsx';
import type { SmartQuestion, QuestionAnswer, OcrResult } from '../../types';

interface QuestionStepProps {
  questions: SmartQuestion[];
  ocrData: OcrResult;
  onSubmit: (answers: QuestionAnswer[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function QuestionStep({
  questions,
  ocrData,
  onSubmit,
  onBack,
  isLoading
}: QuestionStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleOptionSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleTextInput = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const answerList: QuestionAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value
    }));
    onSubmit(answerList);
  };

  const allRequiredAnswered = questions
    .filter(q => q.required)
    .every(q => answers[q.id]?.trim());

  // If no questions, show message
  if (questions.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="p-4 rounded-full bg-emerald-50 w-fit mx-auto mb-4">
          <User className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">
          Single Person Roster Detected
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          This roster appears to contain only one person's shifts.
          Click continue to extract all shifts.
        </p>
        <button
          type="button"
          onClick={() => onSubmit([])}
          disabled={isLoading}
          className={clsx(
            "neu-btn !bg-indigo-500 !text-white px-8 py-3 text-base font-semibold",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="p-4 border-b border-white/30 bg-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-indigo-50">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-700">Quick Question</h3>
            <p className="text-xs text-slate-500">Help us identify your shifts</p>
          </div>
        </div>

        {/* OCR Info */}
        {ocrData.metadata?.title && (
          <div className="text-xs text-slate-400 mt-2">
            Roster: {ocrData.metadata.title} ({ocrData.rows?.length || 0} rows)
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {questions.map((question, idx) => (
          <div key={question.id} className="space-y-3">
            {/* Question text */}
            <label className="block text-sm font-semibold text-slate-700">
              {idx + 1}. {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Single select with options */}
            {question.type === 'single_select' && question.options && (
              <div className="space-y-2">
                {question.options.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionSelect(question.id, option.value)}
                    className={clsx(
                      "w-full px-4 py-3 rounded-xl text-left transition-all",
                      answers[question.id] === option.value
                        ? "bg-indigo-500 text-white shadow-lg scale-[1.02]"
                        : "neu-flat hover:scale-[1.01]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={clsx(
                          "font-semibold",
                          answers[question.id] === option.value ? "text-white" : "text-slate-700"
                        )}>
                          {option.label}
                        </span>
                        {option.description && (
                          <p className={clsx(
                            "text-xs mt-0.5",
                            answers[question.id] === option.value ? "text-indigo-100" : "text-slate-400"
                          )}>
                            {option.description}
                          </p>
                        )}
                      </div>
                      {answers[question.id] === option.value && (
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Text input */}
            {question.type === 'text' && (
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={(e) => handleTextInput(question.id, e.target.value)}
                placeholder="Type your answer..."
                className="w-full px-4 py-3 rounded-xl neu-pressed text-sm"
              />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/30 bg-white/10 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allRequiredAnswered || isLoading}
          className={clsx(
            "neu-btn !bg-indigo-500 !text-white text-sm font-semibold flex items-center gap-2 px-6",
            (!allRequiredAnswered || isLoading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? 'Processing...' : 'Extract Shifts'}
          {!isLoading && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

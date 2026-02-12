import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface VisaWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  overageAmount: number;
}

export const VisaWarningModal = ({ isOpen, onClose, onConfirm, overageAmount }: VisaWarningModalProps) => {
  if (!isOpen) return null;

  return (
    <div className={clsx(
      "fixed inset-0 z-[70] flex items-center justify-center transition-all duration-300",
      isOpen ? "bg-slate-900/40 backdrop-blur-sm opacity-100" : "bg-transparent opacity-0 pointer-events-none"
    )}>
      <div 
        className={clsx(
          "bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transition-all duration-300 transform border-2 border-red-100",
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-bold text-red-900">Visa Limit Warning</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-red-100 text-red-400 hover:text-red-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Adding this shift will exceed your 48-hour fortnightly work limit by <strong className="text-red-600">{overageAmount} hours</strong>.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <p className="text-amber-800 text-xs font-medium">
              Only proceed if you are sure about this change or have an exception.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors text-sm"
            >
              Don't Add Shift
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg shadow-red-200 transition-all text-sm"
            >
              Add Anyway
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Closing this dialog will not add the shift.
          </p>
        </div>
      </div>
    </div>
  );
};

import { useFeatureHelpStore } from '../../store/useFeatureHelpStore';
import { CircleHelp, X } from 'lucide-react';
import { clsx } from 'clsx';

export const FeatureHelpTrigger = () => {
  const { isHelpMode, toggleHelpMode } = useFeatureHelpStore();

  return (
    <button 
      onClick={toggleHelpMode}
      className={clsx(
        "relative rounded-xl transition-all duration-300 flex items-center justify-center group",
        isHelpMode 
          ? "w-10 h-10 bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-110 !p-0" 
          : "w-10 h-10 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
      )}
      title={isHelpMode ? "Close Help" : "Show Help"}
    >
      <div className="relative w-5 h-5">
        <CircleHelp 
          className={clsx(
            "absolute inset-0 w-full h-full transition-all duration-300 rotate-0",
            isHelpMode && "opacity-0 -rotate-90 scale-50"
          )} 
        />
        <X 
          className={clsx(
            "absolute inset-0 w-full h-full transition-all duration-300 rotate-90 scale-50 opacity-0",
            isHelpMode && "opacity-100 rotate-0 scale-100"
          )} 
        />
      </div>
      
      {/* Pulse effect when not active to draw attention initially (optional, maybe distracting so I'll keep it subtle or remove) */}
      {!isHelpMode && (
         <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500/10"></span>
         </span>
      )}
    </button>
  );
};

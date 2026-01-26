import React from 'react';
import { useFeatureHelpStore } from '../../store/useFeatureHelpStore';
import { clsx } from 'clsx';
import { Info } from 'lucide-react';

interface FeatureHelpTargetProps {
  children: React.ReactNode;
  message: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  forceShow?: boolean;
  guidance?: boolean; // New prop for click guidance
}

export const FeatureHelpTarget = ({ 
  children, 
  message, 
  title = "Help",
  position = 'bottom',
  className,
  forceShow = false,
  guidance = false,
}: FeatureHelpTargetProps) => {
  const { isHelpMode } = useFeatureHelpStore();
  // Active means the help mode is on (show rings/highlights)
  const isActive = isHelpMode || forceShow;
  
  // Local hover state to control popup visibility
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Show popup only if forced, or if active AND hovered
  // This prevents multiple popups from overlapping
  const showPopup = forceShow || (isActive && isHovered);

  // Position classes
  const positionClasses = {
    top: "bottom-full mb-3 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-3 left-1/2 -translate-x-1/2",
    left: "right-full mr-3 top-0",
    right: "left-full ml-3 top-0"
  };

  // Triangle pointer classes
  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent border-[6px]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent border-[6px]",
    left: "left-full top-6 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent border-[6px]",
    right: "right-full top-6 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent border-[6px]"
  };

  return (
    <div 
      className={clsx("relative inline-block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={clsx(
          "transition-all duration-300 relative", 
          isActive && "z-40",
          showPopup && "!z-50", // Elevate further when popup is showing
          // Guidance ring effect
          (isActive && guidance) && "ring-4 ring-emerald-400 ring-opacity-70 animate-pulse rounded-xl",
          // Standard highlight if not guidance (or both, but guidance takes precedence visuals)
          (isActive && !guidance) && "ring-4 ring-indigo-400/50 rounded-xl"
        )}
      >
        {children}
        
        {/* Floating click indicator for guidance targets */}
        {isActive && guidance && (
           <span className="absolute -top-2 -right-2 flex h-4 w-4 z-50 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
           </span>
        )}
      </div>
      
      <div 
        className={clsx(
          "absolute w-60 p-4 bg-slate-800 text-white rounded-xl shadow-2xl z-50 pointer-events-none transition-all duration-300 origin-center border border-slate-700/50 backdrop-blur-sm",
          positionClasses[position],
          showPopup ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-2 pointer-events-none"
        )}
      >
        {/* Arrow Pointer */}
        <div className={clsx("absolute w-0 h-0", arrowClasses[position])} />

        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-indigo-500 rounded-lg shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm mb-1 text-indigo-200">{title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import { clsx } from 'clsx';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'subtle';
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default'
}: EmptyStateProps) => {
  return (
    <div className={clsx(
      "flex flex-col items-center justify-center text-center py-12 px-6 animate-in zoom-in-95 fade-in duration-500",
      variant === 'subtle' && "py-8"
    )}>
      <div className={clsx(
        "p-4 rounded-2xl mb-4",
        variant === 'default' ? "bg-indigo-50 text-indigo-500" : "bg-slate-100 text-slate-400"
      )}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className={clsx(
        "font-bold mb-2",
        variant === 'default' ? "text-lg text-slate-700" : "text-base text-slate-600"
      )}>
        {title}
      </h3>
      <p className={clsx(
        "text-slate-500 max-w-sm",
        variant === 'default' ? "text-sm" : "text-xs"
      )}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={clsx(
            "mt-4 px-5 py-2.5 rounded-xl font-bold transition-all",
            variant === 'default' 
              ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

import { CalendarRange, Calculator, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface DashboardHeaderProps {
  viewMode: 'monthly' | 'fiscal' | 'budget';
  onViewModeChange: (mode: 'monthly' | 'fiscal' | 'budget') => void;
  children?: React.ReactNode; // For the PaySummaryCards slot
}

export const DashboardHeader = ({
  viewMode,
  onViewModeChange,
  children
}: DashboardHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Row 1: Pay Summary (Visible only in Monthly view) */}
      {viewMode === 'monthly' && children && (
        <div className="flex items-center w-full">
          {children}
        </div>
      )}

      {/* Row 2: View Toggle (Full width) */}
      <div
        className={clsx(
          'neu-flat p-1 flex gap-1 rounded-xl w-full'
        )}
      >
        <button
          onClick={() => onViewModeChange('monthly')}
          className={clsx(
            'flex-1 px-3 py-2 min-h-[44px] md:min-h-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
            viewMode === 'monthly'
              ? 'neu-pressed text-indigo-500'
              : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <CalendarRange className="w-4 h-4 md:w-3.5 md:h-3.5" />
          <span>{t('dashboard.monthly')}</span>
        </button>

        <button
          onClick={() => onViewModeChange('fiscal')}
          className={clsx(
            'flex-1 px-3 py-2 min-h-[44px] md:min-h-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
            viewMode === 'fiscal'
              ? 'neu-pressed text-indigo-500'
              : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <Calculator className="w-4 h-4 md:w-3.5 md:h-3.5" />
          <span>{t('dashboard.details')}</span>
        </button>

        <button
          onClick={() => onViewModeChange('budget')}
          className={clsx(
            'flex-1 px-3 py-2 min-h-[44px] md:min-h-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
            viewMode === 'budget'
              ? 'neu-pressed text-indigo-500'
              : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <DollarSign className="w-4 h-4 md:w-3.5 md:h-3.5" />
          <span>{t('dashboard.budget')}</span>
        </button>
      </div>
    </div>
  );
};

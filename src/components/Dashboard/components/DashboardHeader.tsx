import { CalendarRange, Calculator, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { CountryCode } from '../../../data/countries';

interface DashboardHeaderProps {
  viewMode: 'monthly' | 'fiscal' | 'budget';
  onViewModeChange: (mode: 'monthly' | 'fiscal' | 'budget') => void;
  country: CountryCode | null;
  children?: React.ReactNode; // For the PaySummaryCards slot
}

export const DashboardHeader = ({
  viewMode,
  onViewModeChange,
  country,
  children
}: DashboardHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 min-h-[52px]">
      {/* Left Side: Pay Summary (Visible only in Monthly view) */}
      {viewMode === 'monthly' && children}

      {/* Right Side: View Toggle */}
      <div
        className={clsx(
          'neu-flat p-1 flex gap-1 rounded-xl',
          'w-full md:w-auto flex justify-between md:justify-start', // Mobile full width space-between
          viewMode !== 'monthly' ? 'ml-auto' : 'md:ml-auto' // Correct alignment when summary is hidden
        )}
      >
        <button
          onClick={() => onViewModeChange('monthly')}
          className={clsx(
            'flex-1 md:flex-none px-3 py-3 md:py-1.5 min-h-[44px] md:min-h-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
            viewMode === 'monthly'
              ? 'neu-pressed text-indigo-500'
              : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <CalendarRange className="w-4 h-4 md:w-3.5 md:h-3.5" />
          <span className="md:inline">{t('dashboard.monthly')}</span>
        </button>

        <div className="flex-1 md:flex-none">
          <button
            onClick={() => onViewModeChange('fiscal')}
            className={clsx(
              'w-full h-full px-3 py-3 md:py-1.5 min-h-[44px] md:min-h-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
              viewMode === 'fiscal'
                ? 'neu-pressed text-indigo-500'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Calculator className="w-4 h-4 md:w-3.5 md:h-3.5" />
            <span className="md:inline">{t('dashboard.details')}</span>
          </button>
        </div>

        <div className="flex-1 md:flex-none">
          <button
            onClick={() => onViewModeChange('budget')}
            className={clsx(
              'w-full h-full px-3 py-3 md:py-1.5 min-h-[44px] md:min-h-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
              viewMode === 'budget'
                ? 'neu-pressed text-indigo-500'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {country === 'KR' ? (
              <span className="text-sm font-bold w-4 md:w-3.5 text-center flex items-center justify-center leading-none">
                ₩
              </span>
            ) : (
              <DollarSign className="w-4 h-4 md:w-3.5 md:h-3.5" />
            )}
            <span className="md:inline">{t('dashboard.budget')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import { Wallet, PiggyBank, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TaxCalculator } from '../../../data/taxRates/types';

interface PaySummaryCardsProps {
  monthlyPay: number;
  formatCurrency: (amount: number) => string;
  taxCalculator: TaxCalculator;
}

export const PaySummaryCards = ({
  monthlyPay,
  formatCurrency,
  taxCalculator
}: PaySummaryCardsProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
      {/* Estimated Pay Card */}
      <div className="neu-flat px-4 py-3 flex items-center gap-3">
        <div className="p-1.5 rounded-full neu-pressed shrink-0">
          <Wallet className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight truncate">
              {t('dashboard.estPay')}
            </span>
            <span className="text-sm md:text-base font-bold text-slate-700 truncate">
              {formatCurrency(monthlyPay)}
            </span>
          </div>
        </div>
      </div>

      {/* Superannuation / National Pension Card */}
      <div className="neu-flat px-4 py-3 flex items-center gap-3">
        <div className="p-1.5 rounded-full neu-pressed shrink-0">
          <PiggyBank className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight truncate">
              {t(taxCalculator.getRetirementNameKey())}
            </span>
            <span className="text-sm md:text-base font-bold text-slate-700 truncate">
              {formatCurrency(monthlyPay * taxCalculator.getRetirementRate())}
            </span>
          </div>
        </div>
      </div>

      {/* After-Tax Pay Card - Spans 2 cols on mobile */}
      <div className="col-span-2 md:col-span-1 neu-flat px-4 py-3 flex items-center gap-3">
        <div className="p-1.5 rounded-full neu-pressed shrink-0">
          <Receipt className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex flex-row items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">
              {t('dashboard.netPay')}
            </span>
            <span className="text-base font-bold text-emerald-600">
              {formatCurrency(
                taxCalculator.calculateTakeHome(monthlyPay, 'monthly').netPay
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

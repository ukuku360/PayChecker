import { useFiscalYearData } from '../../hooks/useFiscalYearData';
import { getTaxCalculator } from '../../data/taxRates';
import { Wallet, Receipt, Scale, PiggyBank, AlertCircle, ChevronDown, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';
import { useCountry } from '../../hooks/useCountry';

interface TaxCalculationAccordionProps {
  ytdGrossPay: number;
  ytdEstimatedTaxWithheld: number;
  actualTaxLiability: number;
  estimatedRefund: number;
  formatCurrency: (amount: number) => string;
}

const TaxCalculationAccordion = ({
  ytdGrossPay,
  ytdEstimatedTaxWithheld,
  actualTaxLiability,
  estimatedRefund,
  formatCurrency
}: TaxCalculationAccordionProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const isRefund = estimatedRefund >= 0;

  return (
    <div className="neu-flat rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
      >
        <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-500" />
          {t('fiscal.howCalculated')}
        </span>
        <ChevronDown className={clsx("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('fiscal.totalIncome')}</span>
              <span className="font-mono text-slate-700">{formatCurrency(ytdGrossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('fiscal.actualTax')}</span>
              <span className="font-mono text-slate-700">{formatCurrency(actualTaxLiability)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('fiscal.alreadyDeducted')}</span>
              <span className="font-mono text-slate-700">- {formatCurrency(ytdEstimatedTaxWithheld)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
              <span className={isRefund ? "text-emerald-600" : "text-rose-600"}>
                {isRefund ? t('fiscal.expectedRefund') : t('fiscal.additionalPayment')}
              </span>
              <span className={clsx("font-mono", isRefund ? "text-emerald-600" : "text-rose-600")}>
                {isRefund ? "+" : ""}{formatCurrency(Math.abs(estimatedRefund))}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            * {t('fiscal.calculationFormula')}: {isRefund ? t('fiscal.refundFormula') : t('fiscal.billFormula')}
          </p>
        </div>
      )}
    </div>
  );
};

export const FiscalYearView = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { country, isAustralia, isKorea } = useCountry();
  const taxCalculator = getTaxCalculator(country);
  const taxBrackets = taxCalculator.getTaxBrackets();

  const {
    fyLabel,
    ytdGrossPay,
    ytdEstimatedTaxWithheld,
    actualTaxLiability,
    estimatedRefund,
    fyStart,
    fyEnd
  } = useFiscalYearData();

  const isRefundPos = estimatedRefund >= 0;

  // Get fiscal year info text based on country
  const getFiscalYearInfoTitle = () => {
    if (isKorea) return t('korea.fiscalYear');
    return t('fiscal.australianFiscalYear');
  };

  const getFiscalYearFlag = () => {
    if (isKorea) return '🇰🇷';
    return '🇦🇺';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <div>
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{fyLabel} {t('fiscal.summary')}</h3>
           <p className="text-xs text-slate-400">{format(fyStart, 'd MMM yyyy')} - {format(fyEnd, 'd MMM yyyy')}</p>
        </div>
        <div className="group relative">
          <div className="flex items-center gap-1 text-xs text-slate-400 cursor-help">
            <Info className="w-3.5 h-3.5" />
            <span>{getFiscalYearInfoTitle()}</span>
          </div>
          <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <p className="font-medium mb-2">{getFiscalYearFlag()} {getFiscalYearInfoTitle()}</p>
            <p className="text-slate-300">{isKorea ? t('korea.fiscalYearExplain') : t('fiscal.fiscalYearExplain')}</p>
            {isAustralia && <p className="text-slate-300 mt-1">{t('fiscal.fiscalYearExample')}</p>}
            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* YTD Gross */}
        {/* YTD Gross */}
        <div className="h-full">
            <div className="neu-flat p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl neu-pressed text-indigo-500">
                <Wallet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase">{t('fiscal.ytdIncome')}</span>
            </div>
            <div>
                <span className="text-2xl font-bold text-slate-700 block">{formatCurrency(ytdGrossPay)}</span>
                <span className="text-xs text-slate-400">{t('fiscal.totalGrossPay')}</span>
            </div>
            </div>
        </div>

        {/* Est Withheld */}
        <div className="h-full">
            <div className="neu-flat p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl neu-pressed text-amber-500">
                <Receipt className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase">{t('fiscal.taxWithheld')}</span>
            </div>
            <div>
                <span className="text-2xl font-bold text-slate-700 block">{formatCurrency(ytdEstimatedTaxWithheld)}</span>
                <span className="text-xs text-slate-400">{t('fiscal.estPaidViaPAYG')}</span>
            </div>
            </div>
        </div>

        {/* Actual Liability */}
        <div className="h-full">
            <div className="neu-flat p-5 flex flex-col gap-4 h-full">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl neu-pressed text-rose-500">
                    <Scale className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase">{t('fiscal.taxLiability')}</span>
                </div>
                <div>
                    <span className="text-2xl font-bold text-slate-700 block">{formatCurrency(actualTaxLiability)}</span>
                    <span className="text-xs text-slate-400">{t('fiscal.actualTaxDue')}</span>
                </div>
            </div>
        </div>

        {/* Refund Estimate */}
        <div className="h-full">
            <div className={clsx("neu-flat p-5 flex flex-col gap-4 relative overflow-hidden h-full", isRefundPos ? "border-l-4 border-emerald-400" : "border-l-4 border-rose-400")}>
                <div className="flex items-center gap-3 relative z-10">
                    <div className={clsx("p-2 rounded-xl neu-pressed", isRefundPos ? "text-emerald-500" : "text-rose-500")}>
                        <PiggyBank className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase">{t('fiscal.estReturn')}</span>
                </div>
                <div className="relative z-10">
                    <span className={clsx("text-2xl font-bold block", isRefundPos ? "text-emerald-600" : "text-rose-600")}>
                        {isRefundPos ? '+' : ''}{formatCurrency(estimatedRefund)}
                    </span>
                    <span className="text-xs text-slate-400">
                        {isRefundPos ? t('fiscal.estimatedRefund') : t('fiscal.estimatedTaxBill')}
                    </span>
                </div>
                {/* Background Gradient */}
                <div className={clsx("absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none", isRefundPos ? "bg-emerald-400" : "bg-rose-400")}></div>
            </div>
        </div>
      </div>

      {/* Tax Calculation Breakdown - Accordion */}
      <TaxCalculationAccordion
        ytdGrossPay={ytdGrossPay}
        ytdEstimatedTaxWithheld={ytdEstimatedTaxWithheld}
        actualTaxLiability={actualTaxLiability}
        estimatedRefund={estimatedRefund}
        formatCurrency={formatCurrency}
      />

       {/* Tax Bracket Visualizer */}
      <div className="neu-flat p-6 space-y-6">
        <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                {t('fiscal.taxBrackets')} {isAustralia ? '(2025-26)' : '(2024)'}
                <div className="cursor-help" title={isAustralia ? "Based on Resident Tax Rates" : "Based on Korean Income Tax"}>
                   <AlertCircle className="w-4 h-4 text-slate-400" />
                </div>
            </h4>
            <span className="text-xs font-mono text-slate-400">{formatCurrency(ytdGrossPay)} {t('fiscal.perYear')}</span>
        </div>

        <div className="relative h-12 w-full mt-8">
            {/* Base Bar */}
            <div className="absolute inset-0 bg-slate-100 rounded-lg overflow-hidden flex w-full">
                {taxBrackets.map((bracket, _, arr) => {
                    if (bracket.max === null) return null;

                    // Max out visualization at appropriate amount per country
                    const MAX_VISUAL_LIMIT = isKorea ? 500000000 : 200000; // 5억원 or $200k
                    const prevMax = arr.find(b => b.max === bracket.min - 1)?.max ?? 0;
                    const widthStart = (prevMax / MAX_VISUAL_LIMIT) * 100;
                    const widthEnd = Math.min((bracket.max / MAX_VISUAL_LIMIT) * 100, 100);
                    const width = widthEnd - widthStart;

                    return (
                        <div
                            key={bracket.min}
                            style={{ width: `${width}%` }}
                            className={clsx("h-full border-r border-white/50 relative group",
                                bracket.rate === 0 ? "bg-emerald-100/30" :
                                bracket.rate <= 0.3 ? "bg-amber-100/30" : "bg-rose-100/30"
                            )}
                            title={`${bracket.rate * 100}% Tax Rate`}
                        >
                            <span className="absolute bottom-1 left-1 text-xs font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {bracket.rate * 100}%
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Current Position Marker */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 transition-all duration-1000 ease-out"
                style={{ left: `${Math.min((ytdGrossPay / (isKorea ? 500000000 : 200000)) * 100, 100)}%` }}
            >
                <div className="absolute -top-7 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {t('fiscal.you')}
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45"></div>
                </div>
            </div>

             {/* Axis Labels - Country specific */}
             {isAustralia ? (
               <div className="absolute -bottom-6 left-0 w-full flex text-xs text-slate-400 font-mono">
                  <span className="absolute left-0">0</span>
                  <span className="absolute left-[9.1%]">$18.2k</span>
                  <span className="absolute left-[22.5%]">$45k</span>
                  <span className="absolute left-[67.5%]">$135k</span>
                  <span className="absolute left-[95%]">$190k</span>
               </div>
             ) : (
               <div className="absolute -bottom-6 left-0 w-full flex text-xs text-slate-400 font-mono">
                  <span className="absolute left-0">0</span>
                  <span className="absolute left-[2.8%]">1.4천</span>
                  <span className="absolute left-[10%]">5천</span>
                  <span className="absolute left-[17.6%]">8.8천</span>
                  <span className="absolute left-[30%]">1.5억</span>
                  <span className="absolute left-[60%]">3억</span>
               </div>
             )}
        </div>
        <div className="h-4"></div> {/* Spacer for labels */}
      </div>
    </div>
  );
};

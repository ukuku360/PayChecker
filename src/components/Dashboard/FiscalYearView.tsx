import { useFiscalYearData } from '../../hooks/useFiscalYearData';
import { TAX_BRACKETS_2025_26 } from '../../data/taxRates';
import { Wallet, Receipt, Scale, PiggyBank, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { FeatureHelpTarget } from '../FeatureHelp/FeatureHelpTarget';

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

export const FiscalYearView = () => {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <div>
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{fyLabel} Summary</h3>
           <p className="text-xs text-slate-400">{format(fyStart, 'd MMM yyyy')} - {format(fyEnd, 'd MMM yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* YTD Gross */}
        <FeatureHelpTarget
            message="Your total gross income for this financial year (before tax)."
            title="YTD Gross Income"
            position="bottom"
        >
            <div className="neu-flat p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl neu-pressed text-indigo-500">
                <Wallet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase">YTD Income</span>
            </div>
            <div>
                <span className="text-2xl font-bold text-slate-700 block">{formatCurrency(ytdGrossPay)}</span>
                <span className="text-[10px] text-slate-400">Total Gross Pay</span>
            </div>
            </div>
        </FeatureHelpTarget>

        {/* Est Withheld */}
        <FeatureHelpTarget
             message="Estimated amount of tax your employer has withheld so far."
             title="Tax Withheld"
             position="bottom"
        >
            <div className="neu-flat p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl neu-pressed text-amber-500">
                <Receipt className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase">Tax Withheld</span>
            </div>
            <div>
                <span className="text-2xl font-bold text-slate-700 block">{formatCurrency(ytdEstimatedTaxWithheld)}</span>
                <span className="text-[10px] text-slate-400">Est. paid via PAYG</span>
            </div>
            </div>
        </FeatureHelpTarget>

        {/* Actual Liability */}
        <div className="neu-flat p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl neu-pressed text-rose-500">
                <Scale className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase">Tax Liability</span>
            </div>
            <div>
                <span className="text-2xl font-bold text-slate-700 block">{formatCurrency(actualTaxLiability)}</span>
                <span className="text-[10px] text-slate-400">Actual tax due on YTD</span>
            </div>
        </div>

        {/* Refund Estimate */}
        <FeatureHelpTarget
             message="Estimated tax refund or bill based on current income and tax rates."
             title="Tax Refund Estimate"
             position="left"
        >
            <div className={clsx("neu-flat p-5 flex flex-col gap-4 relative overflow-hidden h-full", isRefundPos ? "border-l-4 border-emerald-400" : "border-l-4 border-rose-400")}>
                <div className="flex items-center gap-3 relative z-10">
                    <div className={clsx("p-2 rounded-xl neu-pressed", isRefundPos ? "text-emerald-500" : "text-rose-500")}>
                        <PiggyBank className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Est. Return</span>
                </div>
                <div className="relative z-10">
                    <span className={clsx("text-2xl font-bold block", isRefundPos ? "text-emerald-600" : "text-rose-600")}>
                        {isRefundPos ? '+' : ''}{formatCurrency(estimatedRefund)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                        {isRefundPos ? 'Estimated Refund' : 'Estimated Tax Bill'}
                    </span>
                </div>
                {/* Background Gradient */}
                <div className={clsx("absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none", isRefundPos ? "bg-emerald-400" : "bg-rose-400")}></div>
            </div>
        </FeatureHelpTarget>
      </div>

       {/* Tax Bracket Visualizer */}
      <div className="neu-flat p-6 space-y-6">
        <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                Tax Brackets (2025-26)
                <div className="cursor-help" title="Based on Resident Tax Rates">
                   <AlertCircle className="w-4 h-4 text-slate-400" />
                </div>
            </h4>
            <span className="text-xs font-mono text-slate-400">{formatCurrency(ytdGrossPay)} / year</span>
        </div>

        <div className="relative h-12 w-full mt-8">
            {/* Base Bar */}
            <div className="absolute inset-0 bg-slate-100 rounded-lg overflow-hidden flex w-full">
                {TAX_BRACKETS_2025_26.map((bracket, _, arr) => {
                    if (bracket.max === null) return null; // Handle top bracket specially? Or just clip it.
                    
                    // Visualizing proportional width is hard because top is Infinity.
                    // Let's us a non-linear or capped scale. Max out at $200k for visualization purposes.
                    const MAX_VISUAL_LIMIT = 200000; 
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
                            <span className="absolute bottom-1 left-1 text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {bracket.rate * 100}%
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Current Position Marker */}
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 transition-all duration-1000 ease-out"
                style={{ left: `${Math.min((ytdGrossPay / 200000) * 100, 100)}%` }}
            >
                <div className="absolute -top-7 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    You
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45"></div>
                </div>
            </div>

             {/* Axis Labels */}
             <div className="absolute -bottom-6 left-0 w-full flex text-[9px] text-slate-400 font-mono">
                <span className="absolute left-0">0</span>
                <span className="absolute left-[9.1%]">$18.2k</span> 
                <span className="absolute left-[22.5%]">$45k</span>
                <span className="absolute left-[67.5%]">$135k</span>
                <span className="absolute left-[95%]">$190k</span>
             </div>
        </div>
        <div className="h-4"></div> {/* Spacer for labels */}
      </div>
    </div>
  );
};

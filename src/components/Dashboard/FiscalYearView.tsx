import { useFiscalYearData } from '../../hooks/useFiscalYearData';
import { TAX_BRACKETS_2025_26 } from '../../data/taxRates';
import { Wallet, Receipt, Scale, PiggyBank, AlertCircle, ChevronDown, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { FeatureHelpTarget } from '../FeatureHelp/FeatureHelpTarget';
import { useState } from 'react';

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

interface TaxCalculationAccordionProps {
  ytdGrossPay: number;
  ytdEstimatedTaxWithheld: number;
  actualTaxLiability: number;
  estimatedRefund: number;
}

const TaxCalculationAccordion = ({
  ytdGrossPay,
  ytdEstimatedTaxWithheld,
  actualTaxLiability,
  estimatedRefund
}: TaxCalculationAccordionProps) => {
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
          어떻게 계산되었나요?
        </span>
        <ChevronDown className={clsx("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      
      {isOpen && (
        <div className="px-5 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">① 총 소득 (YTD)</span>
              <span className="font-mono text-slate-700">{formatCurrency(ytdGrossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">② 실제 세금 (세율표 기준)</span>
              <span className="font-mono text-slate-700">{formatCurrency(actualTaxLiability)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">③ 이미 공제된 세금 (PAYG)</span>
              <span className="font-mono text-slate-700">- {formatCurrency(ytdEstimatedTaxWithheld)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
              <span className={isRefund ? "text-emerald-600" : "text-rose-600"}>
                {isRefund ? "④ 예상 환급액" : "④ 추가 납부액"}
              </span>
              <span className={clsx("font-mono", isRefund ? "text-emerald-600" : "text-rose-600")}>
                {isRefund ? "+" : ""}{formatCurrency(Math.abs(estimatedRefund))}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            * 계산식: {isRefund ? "공제된 세금 - 실제 세금 = 환급액" : "실제 세금 - 공제된 세금 = 납부액"}
          </p>
        </div>
      )}
    </div>
  );
};

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
        <div className="group relative">
          <div className="flex items-center gap-1 text-xs text-slate-400 cursor-help">
            <Info className="w-3.5 h-3.5" />
            <span>호주 회계연도란?</span>
          </div>
          <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <p className="font-medium mb-2">🇦🇺 호주 회계연도</p>
            <p className="text-slate-300">호주의 회계연도(Financial Year)는 <strong>7월 1일 ~ 다음해 6월 30일</strong>입니다.</p>
            <p className="text-slate-300 mt-1">예: FY25-26 = 2025년 7월 ~ 2026년 6월</p>
            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* YTD Gross */}
        <FeatureHelpTarget
            message="YTD(Year-To-Date)는 회계연도 7월 1일부터 지금까지 누적된 총 급여입니다. 세금 공제 전 금액입니다."
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
             message="PAYG(Pay As You Go)는 고용주가 급여 지급 시 세금을 미리 공제하여 ATO에 납부하는 제도입니다. 이 금액은 연말에 실제 세금과 비교됩니다."
             title="Tax Withheld (PAYG)"
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
        <FeatureHelpTarget
             message="호주 세율표 기준으로 계산된 실제 납부해야 할 세금입니다. 위에서 공제된 PAYG와 비교하여 환급 여부가 결정됩니다."
             title="Tax Liability"
             position="bottom"
        >
            <div className="neu-flat p-5 flex flex-col gap-4 h-full">
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
        </FeatureHelpTarget>

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

      {/* Tax Calculation Breakdown - Accordion */}
      <TaxCalculationAccordion 
        ytdGrossPay={ytdGrossPay}
        ytdEstimatedTaxWithheld={ytdEstimatedTaxWithheld}
        actualTaxLiability={actualTaxLiability}
        estimatedRefund={estimatedRefund}
      />

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

import { useState, useMemo } from 'react';
import { X, FileText, Download, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { clsx } from 'clsx';
import { useScheduleStore, SUPER_RATE } from '../../store/useScheduleStore';
import { exportToCSV, exportToPDF, generateICS } from '../../utils/exportUtils';
import { calculateTotalPay } from '../../utils/calculatePay';

interface ExportModalProps {
  currentMonth: Date;
  onClose: () => void;
}

type ExportRange = 'current' | 'previous' | 'custom';

export const ExportModal = ({ currentMonth, onClose }: ExportModalProps) => {
  const { shifts, jobConfigs, holidays } = useScheduleStore();
  
  const [exportRange, setExportRange] = useState<ExportRange>('current');
  const [customStart, setCustomStart] = useState(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(currentMonth), 'yyyy-MM-dd'));

  const dateRange = useMemo(() => {
    switch (exportRange) {
      case 'current': return { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
      case 'previous': const prevMonth = subMonths(currentMonth, 1); return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'custom': return { start: new Date(customStart), end: new Date(customEnd) };
    }
  }, [exportRange, currentMonth, customStart, customEnd]);

  const filteredShifts = useMemo(() => shifts.filter(s => { const d = new Date(s.date); return d >= dateRange.start && d <= dateRange.end; }), [shifts, dateRange]);

  const summary = useMemo(() => {
    const totalHours = filteredShifts.reduce((acc, s) => acc + s.hours, 0);
    const totalPay = calculateTotalPay(filteredShifts, jobConfigs, holidays);
    return { totalHours, totalPay, totalSuper: totalPay * SUPER_RATE, shiftCount: filteredShifts.length };
  }, [filteredShifts, jobConfigs, holidays]);

  const handleExportCSV = () => exportToCSV({ shifts, jobConfigs, holidays, dateRange });
  const handleExportPDF = () => exportToPDF({ shifts, jobConfigs, holidays, dateRange });
  const handleGenerateICS = () => generateICS({ shifts, jobConfigs, holidays, dateRange });
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="glass-panel w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg"><Download className="w-5 h-5 text-indigo-600" /></div>
            <h2 className="text-lg font-bold text-slate-700">Export Report</h2>
          </div>
          <button onClick={onClose} className="neu-icon-btn w-8 h-8 !rounded-lg !p-0" aria-label="Close modal"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1"><Calendar className="w-3 h-3" />Select Period</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'previous', label: format(subMonths(currentMonth, 1), 'MMM yyyy') }, { value: 'current', label: format(currentMonth, 'MMM yyyy') }, { value: 'custom', label: 'Custom' }].map((o) => (
                <button key={o.value} onClick={() => setExportRange(o.value as ExportRange)}
                  className={clsx('px-3 py-2 text-sm font-medium rounded-lg border transition-all', exportRange === o.value ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300')}>{o.label}</button>
              ))}
            </div>
          </div>
          {exportRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-slate-500 mb-1 block">From</label><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-white/50 text-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /></div>
              <div><label className="text-xs font-semibold text-slate-500 mb-1 block">To</label><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-200 bg-white/50 text-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /></div>
            </div>
          )}
          <div className="neu-pressed rounded-xl p-4 space-y-2 !bg-[#e0e5ec]">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-2 rounded-lg"><p className="text-xl font-bold text-slate-700">{summary.shiftCount}</p><p className="text-[10px] text-slate-500 uppercase tracking-wide">Shifts</p></div>
              <div className="p-2 rounded-lg"><p className="text-xl font-bold text-slate-700">{summary.totalHours.toFixed(1)}</p><p className="text-[10px] text-slate-500 uppercase tracking-wide">Hours</p></div>
              <div className="p-2 rounded-lg"><p className="text-xl font-bold text-indigo-600">{formatCurrency(summary.totalPay)}</p><p className="text-[10px] text-slate-500 uppercase tracking-wide">Est. Pay</p></div>
              <div className="p-2 rounded-lg"><p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalSuper)}</p><p className="text-[10px] text-slate-500 uppercase tracking-wide">Super</p></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportCSV} disabled={summary.shiftCount === 0} className={clsx('neu-btn flex items-center justify-center gap-2 !bg-emerald-50 !text-emerald-700 border border-emerald-100', summary.shiftCount === 0 && 'opacity-50 !cursor-not-allowed')}><span>CSV</span></button>
            <button onClick={handleExportPDF} disabled={summary.shiftCount === 0} className={clsx('neu-btn flex items-center justify-center gap-2 !bg-rose-50 !text-rose-700 border border-rose-100', summary.shiftCount === 0 && 'opacity-50 !cursor-not-allowed')}><FileText className="w-5 h-5" /><span>PDF</span></button>
            <button onClick={handleGenerateICS} disabled={summary.shiftCount === 0} className={clsx('neu-btn col-span-2 flex items-center justify-center gap-2 !bg-blue-50 !text-blue-700 border border-blue-100', summary.shiftCount === 0 && 'opacity-50 !cursor-not-allowed')}><Calendar className="w-5 h-5" /><span>Sync to Calendar (ICS)</span></button>
          </div>
          {summary.shiftCount === 0 && <p className="text-xs text-center text-slate-400">No shifts found in the selected period</p>}
        </div>
      </div>
    </div>
  );
};

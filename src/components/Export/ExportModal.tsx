import { useState, useMemo } from 'react';
import { X, FileSpreadsheet, FileText, Download, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { clsx } from 'clsx';
import { useScheduleStore, getWageConfigFromJobConfigs } from '../../store/useScheduleStore';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';
import { calculateTotalPay } from '../../utils/calculatePay';

interface ExportModalProps {
  currentMonth: Date;
  onClose: () => void;
}

type ExportRange = 'current' | 'previous' | 'custom';

export const ExportModal = ({ currentMonth, onClose }: ExportModalProps) => {
  const { shifts, jobConfigs, holidays } = useScheduleStore();
  const wageConfig = getWageConfigFromJobConfigs(jobConfigs);
  
  const [exportRange, setExportRange] = useState<ExportRange>('current');
  const [customStart, setCustomStart] = useState(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(currentMonth), 'yyyy-MM-dd'));

  const dateRange = useMemo(() => {
    switch (exportRange) {
      case 'current':
        return { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
      case 'previous':
        const prevMonth = subMonths(currentMonth, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'custom':
        return { start: new Date(customStart), end: new Date(customEnd) };
    }
  }, [exportRange, currentMonth, customStart, customEnd]);

  // Filter shifts for the selected range
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= dateRange.start && shiftDate <= dateRange.end;
    });
  }, [shifts, dateRange]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalHours = filteredShifts.reduce((acc, s) => acc + s.hours + (s.overtimeHours || 0), 0);
    const totalPay = calculateTotalPay(filteredShifts, wageConfig, holidays);
    return { totalHours, totalPay, shiftCount: filteredShifts.length };
  }, [filteredShifts, wageConfig, holidays]);

  const handleExportCSV = () => {
    exportToCSV({
      shifts,
      jobConfigs,
      wageConfig,
      holidays,
      dateRange,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      shifts,
      jobConfigs,
      wageConfig,
      holidays,
      dateRange,
    });
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Export Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Period Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Select Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'previous', label: format(subMonths(currentMonth, 1), 'MMM yyyy') },
                { value: 'current', label: format(currentMonth, 'MMM yyyy') },
                { value: 'custom', label: 'Custom' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setExportRange(option.value as ExportRange)}
                  className={clsx(
                    'px-3 py-2 text-sm font-medium rounded-lg border transition-all',
                    exportRange === option.value
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          {exportRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:color-scheme-dark"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:color-scheme-dark"
                />
              </div>
            </div>
          )}

          {/* Summary Preview */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preview</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.shiftCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Shifts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalHours.toFixed(1)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hours</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(summary.totalPay)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Est. Pay</p>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportCSV}
              disabled={summary.shiftCount === 0}
              className={clsx(
                'flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all',
                summary.shiftCount > 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              )}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={summary.shiftCount === 0}
              className={clsx(
                'flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all',
                summary.shiftCount > 0
                  ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              )}
            >
              <FileText className="w-5 h-5" />
              <span>Export PDF</span>
            </button>
          </div>

          {summary.shiftCount === 0 && (
            <p className="text-xs text-center text-slate-400">
              No shifts found in the selected period
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

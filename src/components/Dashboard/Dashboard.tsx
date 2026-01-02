import { useScheduleStore, getWageConfigFromJobConfigs } from '../../store/useScheduleStore';
import { calculateTotalPay, calculateFortnightlyHours } from '../../utils/calculatePay';
import { calculateTakeHome } from '../../data/taxRates';
import type { JobType, JobConfig } from '../../types';
import { Wallet, Clock, AlertTriangle, Plus, Download, Receipt } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { clsx } from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { dotColorMap, borderColorMap } from '../../utils/colorUtils';

interface DashboardProps {
  currentMonth: Date;
  onJobDoubleClick?: (job: JobConfig) => void;
  onAddJob?: () => void;
  onExport?: () => void;
}

const DraggableJobCard = ({ 
  job, 
  hours, 
  onDoubleClick 
}: { 
  job: JobConfig; 
  hours: number;
  onDoubleClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draggable-source-${job.id}`,
    data: {
      type: job.id,
      isSource: true,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onDoubleClick}
      className={clsx(
        'bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-sm border flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all select-none',
        borderColorMap[job.color] || 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
        isDragging ? 'opacity-80 shadow-lg scale-105 z-50' : 'hover:shadow-md'
      )}
    >
      <div className={clsx("w-3 h-3 rounded-full", dotColorMap[job.color] || 'bg-slate-500')} />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{job.name}</span>
        <span className="text-lg font-bold text-slate-900 dark:text-white">{hours}h</span>
      </div>
    </div>
  );
};

export const Dashboard = ({ currentMonth, onJobDoubleClick, onAddJob, onExport }: DashboardProps) => {
  const { shifts, jobConfigs, holidays } = useScheduleStore();
  const wageConfig = getWageConfigFromJobConfigs(jobConfigs);

  const allFortnightlyHours = calculateFortnightlyHours(shifts);
  
  // Filter to only show periods that overlap with the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const fortnightlyHours = allFortnightlyHours.filter((period) => {
    const periodStart = new Date(period.periodStart);
    const periodEnd = addDays(periodStart, 13); // 2 weeks = 14 days (0-13)
    
    // Check if period overlaps with current month
    // Overlap exists if: periodStart <= monthEnd AND periodEnd >= monthStart
    // Check if period overlaps with current month
    // Overlap exists if: periodStart <= monthEnd AND periodEnd >= monthStart
    return periodStart <= monthEnd && periodEnd >= monthStart;
  });

  // Calculate monthly pay
  const monthlyShifts = shifts.filter(s => {
    const shiftDate = new Date(s.date);
    return shiftDate >= monthStart && shiftDate <= monthEnd;
  });
  
  const monthlyPay = calculateTotalPay(monthlyShifts, wageConfig, holidays);
  
  const getHoursByType = (type: JobType) => 
    monthlyShifts.filter(s => s.type === type).reduce((acc, s) => acc + (s.hours || 0), 0);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  return (
    <div className="space-y-6 mb-6">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Estimated Pay Card */}
        <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600 bg-opacity-10 dark:bg-opacity-20">
            <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Est. Pay (Monthly)</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Gross Income</span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(monthlyPay)}</span>
          </div>
        </div>

        {/* After-Tax Pay Card */}
        <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600 bg-opacity-10 dark:bg-opacity-20">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">After Tax</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(calculateTakeHome(monthlyPay, 'monthly', true).netPay)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Student Visa (No Medicare)</span>
          </div>
        </div>

        {/* Job Cards - Draggable + Double-click for settings */}
        {jobConfigs.map((job) => (
          <DraggableJobCard
            key={job.id}
            job={job}
            hours={getHoursByType(job.id)}
            onDoubleClick={() => onJobDoubleClick?.(job)}
          />
        ))}

        {/* Add Job Button */}
        {onAddJob && (
          <button
            onClick={onAddJob}
            className="px-3 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-1"
            title="Add new job"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Export Button */}
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center gap-1"
            title="Export report"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {fortnightlyHours.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Visa Compliance (2주간 제한: 48시간)
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fortnightlyHours.sort((a, b) => b.periodStart.localeCompare(a.periodStart)).slice(0, 6).map((period) => {
              const start = new Date(period.periodStart);
              const end = addDays(start, 13);
              
              // Check if period is during vacation (January or February)
              const startMonth = start.getMonth(); // 0 = Jan, 1 = Feb
              const endMonth = end.getMonth();
              const isVacation = startMonth === 0 || startMonth === 1 || endMonth === 0 || endMonth === 1;
              
              const isOverLimit = !isVacation && period.totalHours > 48;
              const isNearLimit = !isVacation && period.totalHours > 40;
              const progressPercent = isVacation ? 100 : Math.min(100, (period.totalHours / 48) * 100);

              return (
                <div 
                  key={period.periodStart}
                  className={clsx(
                    "p-4 rounded-xl border transition-all",
                    isVacation
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : isOverLimit 
                        ? "bg-red-50 border-red-200 text-red-900" 
                        : isNearLimit
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-slate-50/50 border-slate-100 text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold opacity-70">
                      {format(start, 'M/d')} - {format(end, 'M/d')}
                    </span>
                    {isVacation ? (
                      <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">
                        🏖️ VACATION
                      </span>
                    ) : isOverLimit ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all",
                        isVacation
                          ? "bg-blue-400"
                          : isOverLimit 
                            ? "bg-red-500" 
                            : isNearLimit
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className={clsx("text-2xl font-bold tracking-tight", isOverLimit ? "text-red-600" : "text-slate-900")}>
                        {period.totalHours}
                      </span>
                      <span className="text-xs font-medium opacity-60">
                        {isVacation ? 'h (무제한)' : '/ 48h'}
                      </span>
                    </div>
                    {!isVacation && !isOverLimit && (
                      <span className={clsx("text-xs font-semibold", isNearLimit ? "text-amber-600" : "text-emerald-600")}>
                        {period.remainingHours}h 남음
                      </span>
                    )}
                  </div>
                  
                  {/* Week breakdown */}
                  <div className="mt-2 text-[10px] opacity-60 flex gap-2">
                    <span>1주차: {period.week1Hours}h</span>
                    <span>•</span>
                    <span>2주차: {period.week2Hours}h</span>
                  </div>

                  {isOverLimit && (
                    <p className="text-xs font-semibold mt-2 text-red-600">⚠️ 학생비자 제한 초과!</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import { useScheduleStore, SUPER_RATE } from '../../store/useScheduleStore';
import { calculateTotalPay, calculateFortnightlyHours } from '../../utils/calculatePay';
import { calculateTakeHome } from '../../data/taxRates';
import type { JobType, JobConfig } from '../../types';
import { Wallet, Clock, AlertTriangle, Plus, Download, Receipt, PiggyBank, CalendarRange, Calculator, TrendingUp } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { clsx } from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { dotColorMap, borderColorMap } from '../../utils/colorUtils';
import { useState } from 'react';
import { FiscalYearView } from './FiscalYearView';
import { IncomeChart } from './IncomeChart';

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
        'neu-flat px-4 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all select-none border-t border-l border-white/50',
        borderColorMap[job.color] ? '' : 'border-transparent',
        isDragging ? 'opacity-80 scale-105 z-50' : 'hover:scale-[1.02]'
      )}
    >
      <div className={clsx("w-3 h-3 rounded-full shadow-inner", dotColorMap[job.color] || 'bg-slate-500')} />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase">{job.name}</span>
        <span className="text-lg font-bold text-slate-700">{hours}h</span>
      </div>
    </div>
  );
};

export const Dashboard = ({ currentMonth, onJobDoubleClick, onAddJob, onExport }: DashboardProps) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'fiscal' | 'trends'>('monthly');
  const { shifts, jobConfigs, holidays, isStudentVisaHolder } = useScheduleStore();

  const allFortnightlyHours = calculateFortnightlyHours(shifts);
  
  // Filter to only show periods that overlap with the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const fortnightlyHours = allFortnightlyHours.filter((period) => {
    const periodStart = new Date(period.periodStart);
    const periodEnd = addDays(periodStart, 13); // 2 weeks = 14 days (0-13)
    // Check if period overlaps with current month
    return periodStart <= monthEnd && periodEnd >= monthStart;
  });

  // Calculate monthly pay
  const monthlyShifts = shifts.filter(s => {
    const shiftDate = new Date(s.date);
    return shiftDate >= monthStart && shiftDate <= monthEnd;
  });
  
  const monthlyPay = calculateTotalPay(monthlyShifts, jobConfigs, holidays);
  
  const getHoursByType = (type: JobType) => 
    monthlyShifts.filter(s => s.type === type).reduce((acc, s) => acc + (s.hours || 0), 0);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  return (
    <div className="space-y-6 mb-6">
      {/* View Toggle */}
      <div className="flex justify-end mb-2">
        <div className="neu-flat p-1 flex gap-1 rounded-xl">
          <button
            onClick={() => setViewMode('monthly')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              viewMode === 'monthly' ? "neu-pressed text-indigo-500" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Monthly
          </button>
          <button
            onClick={() => setViewMode('fiscal')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              viewMode === 'fiscal' ? "neu-pressed text-indigo-500" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Calculator className="w-3.5 h-3.5" />
            Fiscal Year
          </button>
          <button
            onClick={() => setViewMode('trends')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              viewMode === 'trends' ? "neu-pressed text-indigo-500" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Trends
          </button>
        </div>
      </div>

      {viewMode === 'trends' ? (
         <IncomeChart />
      ) : viewMode === 'fiscal' ? (
        <FiscalYearView />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Estimated Pay Card */}
            <div className="neu-flat px-6 py-4 flex items-center gap-4">
              <div className="p-2 rounded-full neu-pressed">
                <Wallet className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Pay</span>
                  <span className="text-[10px] text-slate-400">Gross Income</span>
                </div>
                <span className="text-xl font-bold text-slate-700">{formatCurrency(monthlyPay)}</span>
              </div>
            </div>

            {/* Superannuation Card */}
            <div className="neu-flat px-6 py-4 flex items-center gap-4">
              <div className="p-2 rounded-full neu-pressed">
                <PiggyBank className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Super</span>
                  <span className="text-lg font-bold text-slate-700">
                    {formatCurrency(monthlyPay * SUPER_RATE)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">11.5% Rate</span>
              </div>
            </div>

            {/* After-Tax Pay Card */}
            <div className="neu-flat px-6 py-4 flex items-center gap-4">
              <div className="p-2 rounded-full neu-pressed">
                <Receipt className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Pay</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(calculateTakeHome(monthlyPay, 'monthly', isStudentVisaHolder).netPay)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {isStudentVisaHolder ? 'Student Visa' : 'Includes Medicare'}
                </span>
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
                className="neu-icon-btn w-12 h-12 rounded-xl !p-0"
                title="Add new job"
              >
                <Plus className="w-5 h-5 text-slate-500" />
              </button>
            )}

            {/* Export Button */}
            {onExport && (
              <button
                onClick={onExport}
                className="neu-icon-btn w-12 h-12 rounded-xl !p-0"
                title="Export report"
              >
                <Download className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>

          {isStudentVisaHolder && fortnightlyHours.length > 0 && (
            <div className="neu-flat px-4 py-3 flex items-center gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 text-slate-500 shrink-0">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Visa Hours</span>
              </div>
              <div className="flex gap-3">
                {fortnightlyHours.sort((a, b) => a.periodStart.localeCompare(b.periodStart)).map((period) => {
                  const start = new Date(period.periodStart);
                  const end = addDays(start, 13);
                  const startMonth = start.getMonth();
                  const endMonth = end.getMonth();
                  const isVacation = startMonth === 0 || startMonth === 1 || endMonth === 0 || endMonth === 1;
                  const isOverLimit = !isVacation && period.totalHours > 48;
                  const isNearLimit = !isVacation && period.totalHours > 40;
                  const progressPercent = isVacation ? 100 : Math.min(100, (period.totalHours / 48) * 100);

                  return (
                    <div key={period.periodStart} className={clsx(
                      "px-3 py-2 rounded-lg border flex items-center gap-3 shrink-0 bg-transparent",
                      isVacation ? "border-blue-200/50" : isOverLimit ? "border-red-200/50" : isNearLimit ? "border-amber-200/50" : "border-slate-200/50"
                    )}>
                      <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">{format(start, 'M/d')}-{format(end, 'M/d')}</span>
                      <div className="w-16 h-1.5 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                        <div className={clsx("h-full rounded-full", isVacation ? "bg-blue-400" : isOverLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${progressPercent}%` }} />
                      </div>
                      <span className={clsx("text-sm font-bold tabular-nums", isOverLimit ? "text-red-500" : isVacation ? "text-blue-500" : "text-slate-600")}>{period.totalHours}h</span>
                      {isVacation && <span className="text-[9px]">🏖️</span>}
                      {isOverLimit && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


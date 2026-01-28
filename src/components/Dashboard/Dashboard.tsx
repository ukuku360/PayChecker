import { useScheduleStore } from '../../store/useScheduleStore';
import { calculateTotalPay, calculateFortnightlyHours } from '../../utils/calculatePay';
import { getTaxCalculator } from '../../data/taxRates';
import type { JobType, JobConfig } from '../../types';
import { Wallet, Clock, AlertTriangle, Plus, Download, Receipt, PiggyBank, CalendarRange, Calculator, DollarSign, Sparkles, Briefcase, Calendar } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { clsx } from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { dotColorMap, borderColorMap } from '../../utils/colorUtils';
import { useState } from 'react';
import { FiscalYearView } from './FiscalYearView';
import { IncomeChart } from './IncomeChart';
import { JobBreakdown } from './JobBreakdown';
import { WorkStats } from './WorkStats';
import { SavingsGoal } from './SavingsGoal';
import { ExpensesView } from './ExpensesView';
import { FeatureHelpTarget } from '../FeatureHelp/FeatureHelpTarget';
import { EmptyState } from '../EmptyState';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';
import { useCountry } from '../../hooks/useCountry';

interface DashboardProps {
  currentMonth: Date;
  onJobDoubleClick?: (job: JobConfig) => void;
  onAddJob?: () => void;
  onExport?: () => void;
  onAIScan?: () => void;
  onViewModeChange?: (mode: 'monthly' | 'fiscal' | 'budget') => void;
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

export const Dashboard = ({ currentMonth, onJobDoubleClick, onAddJob, onExport, onAIScan, onViewModeChange }: DashboardProps) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { country, isAustralia } = useCountry();
  const [viewMode, setViewMode] = useState<'monthly' | 'fiscal' | 'budget'>('monthly');
  const { shifts, jobConfigs, holidays, isStudentVisaHolder } = useScheduleStore();

  // Get country-specific tax calculator
  const taxCalculator = getTaxCalculator(country);

  const handleViewModeChange = (mode: 'monthly' | 'fiscal' | 'budget') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

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

  return (
    <div className="space-y-6 mb-6">
      {/* View Toggle */}
      <div className="flex justify-end -mt-2 mb-6">
        <div className="neu-flat p-1 flex gap-1 rounded-xl">
          <button
            onClick={() => handleViewModeChange('monthly')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              viewMode === 'monthly' ? "neu-pressed text-indigo-500" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            {t('dashboard.monthly')}
          </button>
          <FeatureHelpTarget
             message={t('featureHelp.fiscalDetails')}
             title={t('dashboard.details')}
             position="bottom"
             guidance={true}
          >
           <button
             onClick={() => handleViewModeChange('fiscal')}
             className={clsx(
               "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
               viewMode === 'fiscal' ? "neu-pressed text-indigo-500" : "text-slate-400 hover:text-slate-600"
             )}
           >
             <Calculator className="w-3.5 h-3.5" />
             {t('dashboard.details')}
           </button>
          </FeatureHelpTarget>

          <FeatureHelpTarget
             message={t('featureHelp.budgetExpenses')}
             title={t('dashboard.budget')}
             position="bottom"
             guidance={true}
          >
           <button
             onClick={() => handleViewModeChange('budget')}
             className={clsx(
               "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
               viewMode === 'budget' ? "neu-pressed text-indigo-500" : "text-slate-400 hover:text-slate-600"
             )}
           >
             {country === 'KR' ? (
               <span className="text-sm font-bold w-3.5 text-center flex items-center justify-center leading-none">₩</span>
             ) : (
               <DollarSign className="w-3.5 h-3.5" />
             )}
             {t('dashboard.budget')}
           </button>
          </FeatureHelpTarget>
        </div>
      </div>

      {viewMode === 'fiscal' ? (
        <div className="space-y-6">
          <SavingsGoal />
          <FiscalYearView />
          <IncomeChart />
          <JobBreakdown />
          <WorkStats />
        </div>
      ) : viewMode === 'budget' ? (
        <ExpensesView />
      ) : (
        <div className="space-y-6">
          {/* Row 1: Unified Pay Summary & Action Buttons */}
          <div className="flex flex-wrap gap-2 md:gap-3 items-center">
            {/* Estimated Pay Card */}
            <div className="neu-flat px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-full neu-pressed">
                <Wallet className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">{t('dashboard.estPay')}</span>
                  <span className="text-base font-bold text-slate-700">{formatCurrency(monthlyPay)}</span>
                </div>
              </div>
            </div>

            {/* Superannuation / National Pension Card */}
            <div className="neu-flat px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-full neu-pressed">
                <PiggyBank className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
                    {t(taxCalculator.getRetirementNameKey())}
                  </span>
                  <span className="text-base font-bold text-slate-700">
                    {formatCurrency(monthlyPay * taxCalculator.getRetirementRate())}
                  </span>
                </div>
              </div>
            </div>

            {/* After-Tax Pay Card */}
            <div className="neu-flat px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-full neu-pressed">
                <Receipt className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">{t('dashboard.netPay')}</span>
                  <span className="text-base font-bold text-emerald-600">
                    {formatCurrency(taxCalculator.calculateTakeHome(monthlyPay, 'monthly', isStudentVisaHolder).netPay)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Grouped closely */}
            <div className="flex gap-2 items-center ml-auto md:ml-0">
              {onAddJob && (
                <button
                  onClick={onAddJob}
                  className="neu-icon-btn w-10 h-10 rounded-xl !p-0"
                  title={t('dashboard.addNewJob')}
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                </button>
              )}

              {onAIScan && (
                <FeatureHelpTarget
                  message={t('featureHelp.smartRosterScan')}
                  title={t('rosterScanner.scanRoster')}
                  position="bottom"
                  guidance={true}
                >
                  <button
                    onClick={onAIScan}
                    className="neu-icon-btn w-10 h-10 rounded-xl !p-0 group"
                    title={t('dashboard.scanRoster')}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                  </button>
                </FeatureHelpTarget>
              )}

              {onExport && (
                <FeatureHelpTarget
                  message={t('featureHelp.exportSync')}
                  title={t('dashboard.exportReport')}
                  position="bottom"
                  guidance={true}
                >
                  <button
                    onClick={onExport}
                    className="neu-icon-btn w-10 h-10 rounded-xl !p-0"
                    title={t('dashboard.exportReport')}
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                  </button>
                </FeatureHelpTarget>
              )}
            </div>
          </div>

          {/* Row 2: Job Cards - Draggable + Double-click for settings */}
          {jobConfigs.length > 0 && (
            <div className="flex flex-wrap gap-4 items-center">
              {jobConfigs.map((job) => (
                <DraggableJobCard
                  key={job.id}
                  job={job}
                  hours={getHoursByType(job.id)}
                  onDoubleClick={() => onJobDoubleClick?.(job)}
                />
              ))}
            </div>
          )}

          {isStudentVisaHolder && isAustralia && fortnightlyHours.length > 0 && (
            <div className="neu-flat px-4 py-3 flex items-center gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 text-slate-500 shrink-0">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{t('dashboard.visaHours')}</span>
              </div>
              <div className="flex gap-3">
                {fortnightlyHours.sort((a, b) => a.periodStart.localeCompare(b.periodStart)).map((period) => {
                  const start = new Date(period.periodStart);
                  const end = addDays(start, 13);
                  
                  // Check if any day in the fortnight falls within user's vacation periods
                  const isVacation = useScheduleStore.getState().vacationPeriods.some(vp => {
                    const vpStart = new Date(vp.start);
                    const vpEnd = new Date(vp.end);
                    return (start <= vpEnd && end >= vpStart);
                  });
                  
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

          {/* Empty State - No Jobs */}
          {jobConfigs.length === 0 && (
            <div className="neu-flat">
              <EmptyState
                icon={Briefcase}
                title={t('emptyState.addFirstJob')}
                description={t('emptyState.addFirstJobDescription')}
                actionLabel={t('emptyState.addJob')}
                onAction={onAddJob}
              />
            </div>
          )}

          {/* Empty State - No Shifts This Month */}
          {jobConfigs.length > 0 && monthlyShifts.length === 0 && (
            <div className="neu-flat">
              <EmptyState
                icon={Calendar}
                title={t('emptyState.noShiftsThisMonth')}
                description={t('emptyState.noShiftsDescription')}
                actionLabel={t('emptyState.scanRoster')}
                onAction={onAIScan}
                variant="subtle"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};


import { useScheduleStore } from '../../store/useScheduleStore';
import { calculateTotalPay, calculateFortnightlyHours, calculatePaidHours } from '../../utils/calculatePay';
import { getTaxCalculator } from '../../data/taxRates';
import type { JobType, JobConfig } from '../../types';
import { Clock, AlertTriangle, Briefcase, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { clsx } from 'clsx';
import { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { EmptyState } from '../EmptyState';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';
import {
  parseLocalDate,
  formatLocalDate,
  addDaysToDate,
  isDateInRange,
  doRangesOverlap,
} from '../../utils/dateUtils';

// Subcomponents
import { DashboardHeader } from './components/DashboardHeader';
import { PaySummaryCards } from './components/PaySummaryCards';
import { DraggableJobGrid } from './components/DraggableJobGrid';

const FiscalYearView = lazy(() => import('./FiscalYearView').then(module => ({ default: module.FiscalYearView })));
const IncomeChart = lazy(() => import('./IncomeChart').then(module => ({ default: module.IncomeChart })));
const JobBreakdown = lazy(() => import('./JobBreakdown').then(module => ({ default: module.JobBreakdown })));
const WorkStats = lazy(() => import('./WorkStats').then(module => ({ default: module.WorkStats })));
const SavingsGoal = lazy(() => import('./SavingsGoal').then(module => ({ default: module.SavingsGoal })));
const ExpensesView = lazy(() => import('./ExpensesView').then(module => ({ default: module.ExpensesView })));

interface DashboardProps {
  currentMonth: Date;
  onJobClick?: (job: JobConfig) => void;
  onAddJob?: () => void;
  onExport?: () => void;
  onAIScan?: () => void;
  onViewModeChange?: (mode: 'monthly' | 'fiscal' | 'budget') => void;
}

export const Dashboard = ({
  currentMonth,
  onJobClick,
  onAddJob,
  onExport,
  onAIScan,
  onViewModeChange,
}: DashboardProps) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [viewMode, setViewMode] = useState<'monthly' | 'fiscal' | 'budget'>('monthly');
  const { shifts, jobConfigs, holidays, visaType } = useScheduleStore();

  // Get Australian tax calculator with visa type
  const taxCalculator = getTaxCalculator(visaType);

  const handleViewModeChange = (mode: 'monthly' | 'fiscal' | 'budget') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  // Memoize month boundaries
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  // Memoize fortnightly hours calculation
  const fortnightlyHours = useMemo(() => {
    const allFortnightlyHours = calculateFortnightlyHours(shifts, jobConfigs);
    const monthStartStr = formatLocalDate(monthStart);
    const monthEndStr = formatLocalDate(monthEnd);

    return allFortnightlyHours.filter((period) => {
      // Period is 14 days (days 0-13 from start)
      const periodEndStr = addDaysToDate(parseLocalDate(period.periodStart), 13);
      const periodEndFormatted = formatLocalDate(periodEndStr);
      // Check if period overlaps with current month using string comparison
      return doRangesOverlap(period.periodStart, periodEndFormatted, monthStartStr, monthEndStr);
    });
  }, [shifts, jobConfigs, monthStart, monthEnd]);

  // Memoize monthly shifts filtering using string comparison
  const monthlyShifts = useMemo(() => {
    const monthStartStr = formatLocalDate(monthStart);
    const monthEndStr = formatLocalDate(monthEnd);
    return shifts.filter((s) => isDateInRange(s.date, monthStartStr, monthEndStr));
  }, [shifts, monthStart, monthEnd]);

  // Memoize monthly pay calculation
  const monthlyPay = useMemo(
    () => calculateTotalPay(monthlyShifts, jobConfigs, holidays, 'AU'),
    [monthlyShifts, jobConfigs, holidays]
  );

  // Memoize getJobStats function
  const getJobStats = useCallback(
    (type: JobType) => {
      const typeShifts = monthlyShifts.filter((s) => s.type === type);
      const totalHours = typeShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
      const actualHours = typeShifts.reduce((acc, s) => acc + calculatePaidHours(s, jobConfigs), 0);
      return { totalHours, actualHours };
    },
    [monthlyShifts, jobConfigs]
  );

  return (
    <div className="space-y-6 mb-6">
      {/* Unified Header Row */}
      <DashboardHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      >
        <PaySummaryCards
          monthlyPay={monthlyPay}
          formatCurrency={formatCurrency}
          taxCalculator={taxCalculator}
        />
      </DashboardHeader>

      {viewMode === 'fiscal' ? (
        <Suspense fallback={<div className="neu-flat p-8 text-center text-slate-400">Loading view...</div>}>
          <div className="space-y-6">
            <SavingsGoal />
            <FiscalYearView />
            <IncomeChart />
            <JobBreakdown />
            <WorkStats />
          </div>
        </Suspense>
      ) : viewMode === 'budget' ? (
        <Suspense fallback={<div className="neu-flat p-8 text-center text-slate-400">Loading view...</div>}>
          <ExpensesView />
        </Suspense>
      ) : (
        <div className="space-y-6">
          {/* Row 2: Job Cards - Draggable + Click for settings */}
          {jobConfigs.length > 0 && (
            <DraggableJobGrid
              jobConfigs={jobConfigs}
              getJobStats={getJobStats}
              onJobClick={onJobClick}
              onAddJob={onAddJob}
              onAIScan={onAIScan}
              onExport={onExport}
            />
          )}

          {/* Row 3: Visa Hours (Block Format) */}
          {visaType === 'student_visa' && fortnightlyHours.length > 0 && (
            <div className="neu-flat p-4 space-y-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t('dashboard.visaHours')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {fortnightlyHours
                  .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
                  .map((period) => {
                    const start = parseLocalDate(period.periodStart);
                    const end = addDaysToDate(start, 13);
                    const periodEndStr = formatLocalDate(end);

                    const isVacation = useScheduleStore
                      .getState()
                      .vacationPeriods.some((vp) =>
                        doRangesOverlap(period.periodStart, periodEndStr, vp.start, vp.end)
                      );

                    const isOverLimit = !isVacation && period.totalHours > 48;
                    const isNearLimit = !isVacation && period.totalHours > 40;
                    const progressPercent = isVacation
                      ? 100
                      : Math.min(100, (period.totalHours / 48) * 100);

                    return (
                      <div
                        key={period.periodStart}
                        className={clsx(
                          'p-3 rounded-xl border flex flex-col gap-2 transition-all duration-200',
                          isVacation
                            ? 'border-blue-200 bg-blue-50/30'
                            : isOverLimit
                            ? 'border-red-200 bg-red-50/30'
                            : isNearLimit
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-slate-200 bg-white/50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            {format(start, 'M/d')}-{format(end, 'M/d')}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className={clsx(
                                'text-sm font-black tabular-nums',
                                isOverLimit
                                  ? 'text-red-500'
                                  : isVacation
                                  ? 'text-blue-500'
                                  : 'text-slate-700'
                              )}
                            >
                              {period.totalHours}h
                            </span>
                            {isVacation && <span className="text-xs">🏖️</span>}
                            {isOverLimit && <AlertTriangle className="w-3 h-3 text-red-500" />}
                          </div>
                        </div>

                        <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden shadow-inner w-full">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-500',
                              isVacation
                                ? 'bg-blue-400'
                                : isOverLimit
                                ? 'bg-red-500'
                                : isNearLimit
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
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

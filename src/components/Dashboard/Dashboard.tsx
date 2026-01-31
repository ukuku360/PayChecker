import { useScheduleStore } from '../../store/useScheduleStore';
import { calculateTotalPay, calculateFortnightlyHours, calculatePaidHours } from '../../utils/calculatePay';
import { getTaxCalculator } from '../../data/taxRates';
import type { JobType, JobConfig } from '../../types';
import { Clock, AlertTriangle, Briefcase, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { clsx } from 'clsx';
import { useState, useMemo, useCallback } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { FiscalYearView } from './FiscalYearView';
import { IncomeChart } from './IncomeChart';
import { JobBreakdown } from './JobBreakdown';
import { WorkStats } from './WorkStats';
import { SavingsGoal } from './SavingsGoal';
import { ExpensesView } from './ExpensesView';
import { EmptyState } from '../EmptyState';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';
import { useCountry } from '../../hooks/useCountry';
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

interface DashboardProps {
  currentMonth: Date;
  onJobDoubleClick?: (job: JobConfig) => void;
  onAddJob?: () => void;
  onExport?: () => void;
  onAIScan?: () => void;
  onViewModeChange?: (mode: 'monthly' | 'fiscal' | 'budget') => void;
}

export const Dashboard = ({
  currentMonth,
  onJobDoubleClick,
  onAddJob,
  onExport,
  onAIScan,
  onViewModeChange,
}: DashboardProps) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { country, isAustralia } = useCountry();
  const [viewMode, setViewMode] = useState<'monthly' | 'fiscal' | 'budget'>('monthly');
  const { shifts, jobConfigs, holidays, isStudentVisaHolder } = useScheduleStore();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Get country-specific tax calculator
  const taxCalculator = getTaxCalculator(country);

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

  // Memoize monthly pay calculation with country-aware holiday detection
  const monthlyPay = useMemo(
    () => calculateTotalPay(monthlyShifts, jobConfigs, holidays, country),
    [monthlyShifts, jobConfigs, holidays, country]
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
        country={country}
      >
        <PaySummaryCards
          monthlyPay={monthlyPay}
          formatCurrency={formatCurrency}
          taxCalculator={taxCalculator}
          isStudentVisaHolder={isStudentVisaHolder}
        />
      </DashboardHeader>

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
          {/* Row 2: Job Cards - Draggable + Double-click for settings */}
          {jobConfigs.length > 0 && (
            <DraggableJobGrid
              jobConfigs={jobConfigs}
              getJobStats={getJobStats}
              onJobDoubleClick={onJobDoubleClick}
              onAddJob={onAddJob}
              onAIScan={onAIScan}
              onExport={onExport}
            />
          )}

          {isStudentVisaHolder && isAustralia && fortnightlyHours.length > 0 && (
            <div className={clsx(
              "neu-flat px-4 py-3",
              isMobile ? "flex flex-col gap-3" : "flex items-center gap-4 overflow-x-auto"
            )}>
              <div className="flex items-center gap-2 text-slate-500 shrink-0">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">
                  {t('dashboard.visaHours')}
                </span>
              </div>
              <div className={clsx(isMobile ? "grid grid-cols-2 gap-2" : "flex gap-3")}>
                {fortnightlyHours
                  .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
                  .map((period) => {
                    const start = parseLocalDate(period.periodStart);
                    const end = addDaysToDate(start, 13);
                    const periodEndStr = formatLocalDate(end);

                    // Check if any day in the fortnight falls within user's vacation periods
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
                          'px-3 py-2 rounded-lg border flex items-center gap-2 bg-transparent',
                          isMobile ? 'flex-col' : 'gap-3 shrink-0',
                          isVacation
                            ? 'border-blue-200/50'
                            : isOverLimit
                            ? 'border-red-200/50'
                            : isNearLimit
                            ? 'border-amber-200/50'
                            : 'border-slate-200/50'
                        )}
                      >
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                          {format(start, 'M/d')}-{format(end, 'M/d')}
                        </span>
                        <div className={clsx(
                          "h-1.5 bg-slate-200/50 rounded-full overflow-hidden shadow-inner",
                          isMobile ? "w-full" : "w-16"
                        )}>
                          <div
                            className={clsx(
                              'h-full rounded-full',
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
                        <div className="flex items-center gap-1">
                          <span
                            className={clsx(
                              'text-sm font-bold tabular-nums',
                              isOverLimit
                                ? 'text-red-500'
                                : isVacation
                                ? 'text-blue-500'
                                : 'text-slate-600'
                            )}
                          >
                            {period.totalHours}h
                          </span>
                          {isVacation && <span className="text-xs">🏖️</span>}
                          {isOverLimit && <AlertTriangle className="w-3 h-3 text-red-400" />}
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

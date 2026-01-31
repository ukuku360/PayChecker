import { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { startOfMonth, endOfMonth, subMonths, addMonths, format, getDay, parseISO } from 'date-fns';
import { enAU, ko } from 'date-fns/locale';
import { Clock, Calendar, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useCountry } from '../../hooks/useCountry';

export const WorkStats = () => {
  const { shifts } = useScheduleStore();
  const { t } = useTranslation();
  const { isKorea } = useCountry();
  const dateLocale = isKorea ? ko : enAU;
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const selectedMonthStart = startOfMonth(selectedDate);
  const selectedMonthEnd = endOfMonth(selectedDate);
  const prevMonthStart = startOfMonth(subMonths(selectedDate, 1));
  const prevMonthEnd = endOfMonth(subMonths(selectedDate, 1));

  // Filter shifts by selected month
  const selectedMonthShifts = shifts.filter(s => {
    const d = new Date(s.date);
    return d >= selectedMonthStart && d <= selectedMonthEnd;
  });
  
  const prevMonthShifts = shifts.filter(s => {
    const d = new Date(s.date);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  // Calculate hours
  const selectedMonthHours = selectedMonthShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
  const prevMonthHours = prevMonthShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
  const hoursDiff = selectedMonthHours - prevMonthHours;
  const hoursPercentChange = prevMonthHours > 0 ? ((hoursDiff / prevMonthHours) * 100) : 0;

  // Count work days and calculate average
  const selectedMonthWorkDays = new Set(selectedMonthShifts.map(s => s.date)).size;
  const avgHoursPerDay = selectedMonthWorkDays > 0 ? selectedMonthHours / selectedMonthWorkDays : 0;

  // Find busiest day (most hours)
  const dayHoursMap: { [date: string]: number } = {};
  selectedMonthShifts.forEach(s => {
    dayHoursMap[s.date] = (dayHoursMap[s.date] || 0) + (s.hours || 0);
  });
  
  let busiestDay = '';
  let busiestDayHours = 0;
  Object.entries(dayHoursMap).forEach(([date, hours]) => {
    if (hours > busiestDayHours) {
      busiestDay = date;
      busiestDayHours = hours;
    }
  });

  // Day of week statistics - COUNT how many times each day occurred, then calculate AVERAGE
  const dayOfWeekTotalHours: number[] = [0, 0, 0, 0, 0, 0, 0];
  const dayOfWeekCount: number[] = [0, 0, 0, 0, 0, 0, 0];
  
  selectedMonthShifts.forEach(s => {
    const dow = getDay(parseISO(s.date));
    dayOfWeekTotalHours[dow] += s.hours || 0;
  });

  // Count unique dates per day of week
  const datesByDOW: Set<string>[] = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()];
  selectedMonthShifts.forEach(s => {
    const dow = getDay(parseISO(s.date));
    datesByDOW[dow].add(s.date);
  });
  
  datesByDOW.forEach((dates, dow) => {
    dayOfWeekCount[dow] = dates.size;
  });

  // Calculate average hours per day of week
  const dayOfWeekAvgHours = dayOfWeekTotalHours.map((total, idx) => 
    dayOfWeekCount[idx] > 0 ? total / dayOfWeekCount[idx] : 0
  );
  
  const maxAvgHours = Math.max(...dayOfWeekAvgHours);
  const mostWorkedDayOfWeek = dayOfWeekAvgHours.indexOf(maxAvgHours);

  // Navigation handlers
  const goToPrevMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const goToNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const goToCurrentMonth = () => setSelectedDate(new Date());

  const isCurrentMonth = format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  return (
    <div className="neu-flat p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t('stats.title')}
        </h3>
        
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button 
            onClick={goToPrevMonth}
            className="neu-icon-btn !p-1.5"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={goToCurrentMonth}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all",
              isCurrentMonth ? "neu-pressed text-indigo-500" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {format(selectedDate, 'MMM yyyy', { locale: dateLocale })}
          </button>
          <button 
            onClick={goToNextMonth}
            className="neu-icon-btn !p-1.5"
            disabled={isCurrentMonth}
          >
            <ChevronRight className={clsx("w-4 h-4", isCurrentMonth ? "text-slate-200" : "text-slate-400")} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Selected Month Hours */}
        <div className="p-4 rounded-xl bg-slate-50/50">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">{format(selectedDate, 'MMMM', { locale: dateLocale })}</p>
          <p className="text-2xl font-bold text-slate-700">{selectedMonthHours}h</p>
          <div className={clsx(
            "flex items-center gap-1 mt-1 text-xs font-medium",
            hoursDiff >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {hoursDiff >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(hoursDiff)}h ({hoursPercentChange.toFixed(0)}%)
          </div>
        </div>

        {/* Previous Month Hours */}
        <div className="p-4 rounded-xl bg-slate-50/50">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('stats.previous')}</p>
          <p className="text-2xl font-bold text-slate-500">{prevMonthHours}h</p>
          <p className="text-xs text-slate-400 mt-1">{format(prevMonthStart, 'MMMM', { locale: dateLocale })}</p>
        </div>

        {/* Average per Day */}
        <div className="p-4 rounded-xl bg-slate-50/50">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('stats.avgDay')}</p>
          <p className="text-2xl font-bold text-slate-700">{avgHoursPerDay.toFixed(1)}h</p>
          <p className="text-xs text-slate-400 mt-1">{selectedMonthWorkDays} {t('stats.workDays')}</p>
        </div>

        {/* Most Worked Day of Week */}
        <div className="p-4 rounded-xl bg-slate-50/50">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('stats.busiestDay')}</p>
          <p className="text-2xl font-bold text-indigo-500">
            {maxAvgHours > 0 
              ? [t('stats.sun'), t('stats.mon'), t('stats.tue'), t('stats.wed'), t('stats.thu'), t('stats.fri'), t('stats.sat')][mostWorkedDayOfWeek] 
              : '-'
            }
          </p>
          <p className="text-xs text-slate-400 mt-1">{maxAvgHours.toFixed(1)}h {t('stats.avg')}</p>
        </div>
      </div>

      {/* Day of Week Breakdown - Now showing AVERAGE */}
      <div className="mt-6">
        <p className="text-xs font-bold text-slate-400 uppercase mb-3">{t('stats.avgByDay')}</p>
        <div className="flex gap-2">
          {[t('stats.sun'), t('stats.mon'), t('stats.tue'), t('stats.wed'), t('stats.thu'), t('stats.fri'), t('stats.sat')].map((day, index) => {
            const avgHours = dayOfWeekAvgHours[index];
            const heightPercent = maxAvgHours > 0 ? (avgHours / maxAvgHours) * 100 : 0;
            const isMax = index === mostWorkedDayOfWeek && avgHours > 0;
            
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-16 bg-slate-100 rounded-lg relative overflow-hidden">
                  <div 
                    className={clsx(
                      "absolute bottom-0 w-full rounded-t-lg transition-all duration-500",
                      isMax ? "bg-indigo-500" : "bg-slate-300"
                    )}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className={clsx(
                  "text-xs font-medium",
                  isMax ? "text-indigo-500" : "text-slate-400"
                )}>{day}</span>
                <span className="text-xs text-slate-400">{avgHours.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Busiest Single Day */}
      {busiestDay && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50/50 border border-amber-200/30 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-xs font-medium text-slate-600">
              {t('stats.busiestDay')}: <span className="font-bold">{format(parseISO(busiestDay), 'MMM d, yyyy', { locale: dateLocale })}</span>
            </p>
            <p className="text-xs text-slate-400">{busiestDayHours}h {t('stats.worked')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

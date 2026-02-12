import { useMemo } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { calculateTotalPay } from '../utils/calculatePay';
import { format, parseISO } from 'date-fns';

interface MonthlyTrendRow {
  name: string;
  originalDate: number;
  [jobId: string]: string | number;
}

export const useMonthlyTrends = (numberOfMonths = 6) => {
  const { shifts, jobConfigs, holidays } = useScheduleStore();

  const data = useMemo(() => {
    // 1. Group shifts by Month string (YYYY-MM)
    const groupedByMonth: Record<string, typeof shifts> = {};

    shifts.forEach(shift => {
      const date = parseISO(shift.date);
      const monthKey = format(date, 'yyyy-MM');
      
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = [];
      }
      groupedByMonth[monthKey].push(shift);
    });

    // 2. Process each month
    const processedData = Object.keys(groupedByMonth).sort().map(monthKey => {
       const monthShifts = groupedByMonth[monthKey];
       
       // Initialize object with readable date
       const monthDate = parseISO(`${monthKey}-01`);
       const row: MonthlyTrendRow = {
         name: format(monthDate, 'MMM yy'),
         originalDate: monthDate.getTime(), // for sorting if needed
       };

       // Aggregated pay per job type
       jobConfigs.forEach(job => {
          const jobShifts = monthShifts.filter(s => s.type === job.id);
          const pay = calculateTotalPay(jobShifts, jobConfigs, holidays);
          row[job.id] = Math.round(pay); // Round for cleaner charts
       });
       
       return row;
    });

    // Sort by date just in case
    processedData.sort((a, b) => a.originalDate - b.originalDate);

    // Filter to last N months if needed (optional)
    const slicedData = numberOfMonths ? processedData.slice(-numberOfMonths) : processedData;

    return {
      chartData: slicedData,
      jobs: jobConfigs
    };
  }, [shifts, jobConfigs, holidays, numberOfMonths]);

  return data;
};

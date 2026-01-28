import { useMemo } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { calculateTotalPay } from '../utils/calculatePay';
import { calculateTakeHome, calculateIncomeTax, calculateMedicareLevy } from '../data/taxRates';
import { getFiscalYearRange, groupShiftsByFortnightYTD } from '../utils/fiscalYearUtils';

import { useCountry } from './useCountry';

export const useFiscalYearData = () => {
  const { shifts, jobConfigs, holidays, isStudentVisaHolder } = useScheduleStore();
  const { country } = useCountry();

  const { start: fyStart, end: fyEnd, label: fyLabel } = getFiscalYearRange(new Date(), country);

  const data = useMemo(() => {
    // 1. Group shifts
    const fortnights = groupShiftsByFortnightYTD(shifts, fyStart);

    // 2. Calculate Gross Pay per Fortnight & Estimate Withholding
    let ytdGrossPay = 0;
    let ytdEstimatedTaxWithheld = 0;
    
    // We only sum up "passed" or "active" fortnights for YTD "Real" data?
    // Or do we sum up EVERYTHING visible in the schedule? 
    // Let's sum everything in the schedule for the FY to show "Projected" if they have future shifts.
    
    fortnights.forEach(fn => {
        if (fn.shifts.length === 0) return;

        const periodGross = calculateTotalPay(fn.shifts, jobConfigs, holidays);
        
        // Calculate tax for this specific fortnight period
        // Treat it as a fortnightly pay cycle
        const taxDetails = calculateTakeHome(periodGross, 'fortnightly', isStudentVisaHolder, country);
        
        ytdGrossPay += periodGross;
        ytdEstimatedTaxWithheld += taxDetails.totalTax;
    });

    // 3. Calculate Actual Liability (Annualized Calculation on Total YTD)
    // If we want "True Liability at end of year", we take YTD Gross and run it through Annual Tax tables.
    const annualIncomeTax = calculateIncomeTax(ytdGrossPay, country);
    const annualMedicare = (country === 'AU' && !isStudentVisaHolder) ? calculateMedicareLevy(ytdGrossPay) : 0;
    const actualTaxLiability = annualIncomeTax + annualMedicare;

    // 4. Refund / Bill
    // If Withheld > Liability = Refund (Positive)
    // If Withheld < Liability = Bill (Negative)
    const estimatedRefund = ytdEstimatedTaxWithheld - actualTaxLiability;

    return {
      fyStart,
      fyEnd,
      fyLabel,
      ytdGrossPay,
      ytdEstimatedTaxWithheld,
      actualTaxLiability,
      estimatedRefund,
      fortnights
    };
  }, [shifts, jobConfigs, holidays, isStudentVisaHolder, fyStart, country]);

  return data;
};

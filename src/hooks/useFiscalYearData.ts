import { useMemo } from 'react';
import { useScheduleStore, getWageConfigFromJobConfigs } from '../store/useScheduleStore';
import { calculateTotalPay } from '../utils/calculatePay';
import { calculateTakeHome, calculateIncomeTax, calculateMedicareLevy } from '../data/taxRates';
import { getFiscalYearRange, groupShiftsByFortnightYTD } from '../utils/fiscalYearUtils';

export const useFiscalYearData = () => {
  const { shifts, jobConfigs, holidays, isStudentVisaHolder } = useScheduleStore();
  const wageConfig = getWageConfigFromJobConfigs(jobConfigs);

  const { start: fyStart, end: fyEnd, label: fyLabel } = getFiscalYearRange(new Date());

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

        const periodGross = calculateTotalPay(fn.shifts, wageConfig, holidays);
        
        // Calculate tax for this specific fortnight period
        // Treat it as a fortnightly pay cycle
        const taxDetails = calculateTakeHome(periodGross, 'fortnightly', isStudentVisaHolder);
        
        ytdGrossPay += periodGross;
        ytdEstimatedTaxWithheld += taxDetails.totalTax;
    });

    // 3. Calculate Actual Liability (Annualized Calculation on Total YTD)
    // If we want "True Liability at end of year", we take YTD Gross and run it through Annual Tax tables.
    const annualIncomeTax = calculateIncomeTax(ytdGrossPay);
    const annualMedicare = isStudentVisaHolder ? 0 : calculateMedicareLevy(ytdGrossPay);
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
  }, [shifts, jobConfigs, holidays, isStudentVisaHolder, fyStart]);

  return data;
};

import { useMemo } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { calculateTotalPay } from '../utils/calculatePay';
import { getTaxCalculator } from '../data/taxRates';
import { getFiscalYearRange, groupShiftsByFortnightYTD } from '../utils/fiscalYearUtils';

export const useFiscalYearData = () => {
  const { shifts, jobConfigs, holidays, visaType } = useScheduleStore();

  const { start: fyStart, end: fyEnd, label: fyLabel } = getFiscalYearRange(new Date(), 'AU');

  // Get tax calculator with visa type
  const taxCalculator = getTaxCalculator(visaType);

  const data = useMemo(() => {
    // 1. Group shifts
    const fortnights = groupShiftsByFortnightYTD(shifts, fyStart);

    // 2. Calculate Gross Pay per Fortnight & Estimate Withholding
    let ytdGrossPay = 0;
    let ytdEstimatedTaxWithheld = 0;

    fortnights.forEach(fn => {
        if (fn.shifts.length === 0) return;

        const periodGross = calculateTotalPay(fn.shifts, jobConfigs, holidays);

        // Calculate tax for this specific fortnight period
        const taxDetails = taxCalculator.calculateTakeHome(periodGross, 'fortnightly');

        ytdGrossPay += periodGross;
        ytdEstimatedTaxWithheld += taxDetails.totalDeductions;
    });

    // 3. Calculate Actual Liability (Annualized Calculation on Total YTD)
    const annualIncomeTax = taxCalculator.calculateIncomeTax(ytdGrossPay);
    const socialContributions = taxCalculator.calculateSocialContributions(ytdGrossPay);
    const annualSocialTotal = socialContributions.reduce((sum, c) => sum + c.amount, 0);
    const actualTaxLiability = annualIncomeTax + annualSocialTotal;

    // 4. Refund / Bill
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
  }, [shifts, jobConfigs, holidays, visaType, fyStart, taxCalculator]);

  return data;
};

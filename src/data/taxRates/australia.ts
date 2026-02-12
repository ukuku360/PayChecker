/**
 * Australian Tax Rates - 2025-26 Financial Year
 *
 * Stage 3 Tax Cuts applied (effective from 1 July 2024)
 * Reference: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 * WHM Rates: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-working-holiday-makers
 */

import type { TaxBracket, TaxCalculator, PayPeriod, SocialContribution, TaxCalculationResult } from './types';
import type { AustraliaVisaType } from '../../types';

// ATO 2025-26 Tax Brackets for Australian Residents (Domestic & Student Visa)
export const AU_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18201, max: 45000, rate: 0.16, baseTax: 0 },
  { min: 45001, max: 135000, rate: 0.30, baseTax: 4288 },
  { min: 135001, max: 190000, rate: 0.37, baseTax: 31288 },
  { min: 190001, max: null, rate: 0.45, baseTax: 51638 },
];

// Working Holiday Maker (WHM) Tax Brackets - 417/462 Visa
// Flat 15% on first $45,000, then ordinary rates (no tax-free threshold)
export const AU_WHM_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 45000, rate: 0.15, baseTax: 0 },           // Flat 15% on first $45k
  { min: 45001, max: 135000, rate: 0.30, baseTax: 6750 },   // 30% above $45k
  { min: 135001, max: 190000, rate: 0.37, baseTax: 33750 }, // 37% above $135k
  { min: 190001, max: null, rate: 0.45, baseTax: 54100 },   // 45% above $190k
];

// Tax-free threshold
export const AU_TAX_FREE_THRESHOLD = 18200;
export const AU_WHM_TAX_FREE_THRESHOLD = 0; // WHM has NO tax-free threshold
export const TAX_FREE_THRESHOLD = AU_TAX_FREE_THRESHOLD; // Alias for backward compatibility

// Medicare Levy (2%)
export const AU_MEDICARE_LEVY_RATE = 0.02;
export const AU_MEDICARE_LEVY_THRESHOLD = 27222; // Low-income threshold for singles (2024-25, 2025-26 FY)

// Superannuation (12% from 1 July 2025)
export const AU_SUPER_RATE = 0.12;

/**
 * ATO NAT 1004 Schedule 1 - PAYG Withholding Coefficients
 * Effective from 1 July 2024 (Stage 3 Tax Cuts)
 *
 * Formula: Weekly Tax = (a × Weekly Earnings) - b
 * Weekly Earnings should be rounded down to whole dollars plus 99 cents
 *
 * Reference: https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld
 */

interface PAYGCoefficient {
  min: number;      // Weekly earnings minimum (inclusive)
  max: number;      // Weekly earnings maximum (inclusive)
  a: number;        // Coefficient 'a'
  b: number;        // Coefficient 'b'
}

// Scale 2: Resident claiming tax-free threshold (with Medicare Levy)
// Use for: Domestic residents
const PAYG_SCALE_2: PAYGCoefficient[] = [
  { min: 0, max: 359, a: 0, b: 0 },
  { min: 359, max: 438, a: 0.1900, b: 68.3462 },
  { min: 438, max: 548, a: 0.2900, b: 112.1942 },
  { min: 548, max: 721, a: 0.2100, b: 68.3465 },
  { min: 721, max: 865, a: 0.2190, b: 74.8369 },
  { min: 865, max: 1282, a: 0.3477, b: 186.2119 },
  { min: 1282, max: 2307, a: 0.3450, b: 182.7504 },
  { min: 2307, max: 3461, a: 0.3900, b: 286.5965 },
  { min: 3461, max: Infinity, a: 0.4700, b: 563.5196 },
];

// Scale 6: Resident claiming tax-free threshold (Medicare Levy EXEMPTION)
// Use for: Student Visa holders with Medicare Levy Exemption Certificate
const PAYG_SCALE_6: PAYGCoefficient[] = [
  { min: 0, max: 359, a: 0, b: 0 },
  { min: 359, max: 721, a: 0.1900, b: 68.3462 },
  { min: 721, max: 865, a: 0.1990, b: 74.8365 },
  { min: 865, max: 2307, a: 0.3250, b: 183.7058 },
  { min: 2307, max: 3461, a: 0.3700, b: 287.5504 },
  { min: 3461, max: Infinity, a: 0.4500, b: 564.4731 },
];

// Schedule 15: Working Holiday Makers (417/462 visa)
// 15% flat rate on first $45,000, then ordinary rates
const PAYG_SCHEDULE_15: PAYGCoefficient[] = [
  { min: 0, max: 865, a: 0.1500, b: 0 },           // 15% flat rate
  { min: 865, max: 2307, a: 0.3250, b: 151.4423 }, // 30% + 2% Medicare - cumulative
  { min: 2307, max: 3461, a: 0.3700, b: 255.2869 },
  { min: 3461, max: Infinity, a: 0.4500, b: 532.2096 },
];

/**
 * Convert gross pay to weekly equivalent
 */
const convertToWeekly = (grossPay: number, period: PayPeriod): number => {
  switch (period) {
    case 'weekly':
      return grossPay;
    case 'fortnightly':
      return grossPay / 2;
    case 'monthly':
      return (grossPay * 12) / 52;
    case 'annual':
      return grossPay / 52;
    default:
      return grossPay;
  }
};

/**
 * Convert weekly tax back to the original period
 */
const convertFromWeekly = (weeklyTax: number, period: PayPeriod): number => {
  switch (period) {
    case 'weekly':
      return weeklyTax;
    case 'fortnightly':
      return weeklyTax * 2;
    case 'monthly':
      return (weeklyTax * 52) / 12;
    case 'annual':
      return weeklyTax * 52;
    default:
      return weeklyTax;
  }
};

/**
 * Get the appropriate PAYG coefficient table based on visa type
 */
const getPAYGCoefficients = (visaType: AustraliaVisaType): PAYGCoefficient[] => {
  switch (visaType) {
    case 'working_holiday':
      return PAYG_SCHEDULE_15;
    case 'student_visa':
      return PAYG_SCALE_6;
    case 'domestic':
    default:
      return PAYG_SCALE_2;
  }
};

/**
 * Calculate PAYG withholding using ATO coefficient formula
 * Formula: Tax = (a × weekly_earnings) - b
 *
 * This provides more accurate withholding amounts that match actual payslips
 * compared to the annual tax / period method.
 */
const calculatePAYGWithholding = (
  grossPay: number,
  period: PayPeriod,
  visaType: AustraliaVisaType = 'domestic'
): number => {
  if (grossPay <= 0) return 0;

  // Convert to weekly earnings (rounded down to whole dollars + 99 cents as per ATO)
  const weeklyEarnings = convertToWeekly(grossPay, period);
  const roundedWeekly = Math.floor(weeklyEarnings) + 0.99;

  // Get the appropriate coefficient table
  const coefficients = getPAYGCoefficients(visaType);

  // Find the matching coefficient bracket
  let coeff: PAYGCoefficient | undefined;
  for (const c of coefficients) {
    if (roundedWeekly >= c.min && roundedWeekly < c.max) {
      coeff = c;
      break;
    }
    // Handle the last bracket (max = Infinity)
    if (c.max === Infinity && roundedWeekly >= c.min) {
      coeff = c;
      break;
    }
  }

  if (!coeff) {
    // Fallback: no tax for very low income
    return 0;
  }

  // Calculate weekly tax using the formula: y = ax - b
  const weeklyTax = Math.max(0, (coeff.a * roundedWeekly) - coeff.b);

  // Round to nearest dollar as per ATO
  const roundedWeeklyTax = Math.round(weeklyTax);

  // Convert back to the original period
  return convertFromWeekly(roundedWeeklyTax, period);
};

// Calculate income tax based on visa type
const calculateIncomeTaxForVisa = (annualIncome: number, visaType: AustraliaVisaType = 'domestic'): number => {
  if (annualIncome <= 0) return 0;

  // WHM uses different tax brackets (no tax-free threshold, 15% flat rate on first $45k)
  const brackets = visaType === 'working_holiday' ? AU_WHM_TAX_BRACKETS : AU_TAX_BRACKETS;

  for (const bracket of brackets) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      const taxableInBracket = annualIncome - bracket.min;
      return bracket.baseTax + taxableInBracket * bracket.rate;
    }
  }

  // Fallback to top bracket
  const topBracket = brackets[brackets.length - 1];
  const taxableInBracket = annualIncome - topBracket.min;
  return topBracket.baseTax + taxableInBracket * topBracket.rate;
};

// Legacy function for backward compatibility
const calculateIncomeTax = (annualIncome: number): number => {
  return calculateIncomeTaxForVisa(annualIncome, 'domestic');
};

// Calculate Medicare Levy based on visa type
// WHM and Student Visa holders are exempt (Student Visa holders apply for exemption certificate)
const calculateMedicareLevyForVisa = (annualIncome: number, visaType: AustraliaVisaType = 'domestic'): number => {
  // WHM and Student Visa holders are exempt from Medicare Levy
  if (visaType === 'working_holiday' || visaType === 'student_visa') {
    return 0;
  }

  // Domestic residents pay Medicare Levy
  if (annualIncome <= AU_MEDICARE_LEVY_THRESHOLD) return 0;
  return annualIncome * AU_MEDICARE_LEVY_RATE;
};

// Legacy function for backward compatibility
const calculateMedicareLevy = (annualIncome: number): number => {
  return calculateMedicareLevyForVisa(annualIncome, 'domestic');
};

// Calculate social contributions based on visa type
const calculateSocialContributionsForVisa = (
  annualIncome: number,
  visaType: AustraliaVisaType = 'domestic'
): SocialContribution[] => {
  const contributions: SocialContribution[] = [];

  // Only domestic residents pay Medicare Levy
  const medicareLevy = calculateMedicareLevyForVisa(annualIncome, visaType);
  if (medicareLevy > 0) {
    contributions.push({
      name: 'Medicare Levy',
      nameKey: 'dashboard.includesMedicare',
      amount: medicareLevy,
      rate: AU_MEDICARE_LEVY_RATE,
    });
  }

  return contributions;
};


// Calculate total tax based on visa type
const calculateTotalTaxForVisa = (annualIncome: number, visaType: AustraliaVisaType = 'domestic'): number => {
  const incomeTax = calculateIncomeTaxForVisa(annualIncome, visaType);
  const contributions = calculateSocialContributionsForVisa(annualIncome, visaType);
  const socialTotal = contributions.reduce((sum, c) => sum + c.amount, 0);
  return incomeTax + socialTotal;
};

// Legacy function for backward compatibility
const calculateTotalTax = (annualIncome: number, excludeMedicare = false): number => {
  const visaType: AustraliaVisaType = excludeMedicare ? 'student_visa' : 'domestic';
  return calculateTotalTaxForVisa(annualIncome, visaType);
};

// Calculate take-home pay based on visa type
// Uses ATO PAYG withholding coefficients for accurate payslip matching
const calculateTakeHomeForVisa = (
  grossPay: number,
  period: PayPeriod = 'fortnightly',
  visaType: AustraliaVisaType = 'domestic'
): TaxCalculationResult => {
  // Calculate PAYG withholding using ATO coefficient formula
  // This already includes Medicare Levy for domestic residents (Scale 2)
  // and excludes it for student visa (Scale 6) and WHM (Schedule 15)
  const paygWithholding = calculatePAYGWithholding(grossPay, period, visaType);

  // Annualize for effective rate calculation
  let annualIncome = 0;
  switch (period) {
    case 'weekly':
      annualIncome = grossPay * 52;
      break;
    case 'fortnightly':
      annualIncome = grossPay * 26;
      break;
    case 'monthly':
      annualIncome = grossPay * 12;
      break;
    case 'annual':
      annualIncome = grossPay;
      break;
  }

  // For domestic residents, Medicare Levy is already included in PAYG withholding (Scale 2)
  // We still show it separately for informational purposes
  const socialContributions: SocialContribution[] = [];
  if (visaType === 'domestic' && annualIncome > AU_MEDICARE_LEVY_THRESHOLD) {
    // Calculate Medicare portion for display (approx 2% of gross)
    // Note: This is informational only - actual withholding uses PAYG formula
    const medicareAmount = grossPay * AU_MEDICARE_LEVY_RATE;
    socialContributions.push({
      name: 'Medicare Levy',
      nameKey: 'dashboard.includesMedicare',
      amount: medicareAmount,
      rate: AU_MEDICARE_LEVY_RATE,
    });
  }

  const totalDeductions = paygWithholding;
  const netPay = grossPay - totalDeductions;
  const effectiveRate = grossPay > 0 ? totalDeductions / grossPay : 0;

  return {
    grossPay,
    incomeTax: paygWithholding, // PAYG withholding is the total tax (includes Medicare for domestic)
    socialContributions,
    totalDeductions,
    netPay,
    effectiveRate,
  };
};

// Legacy function for backward compatibility
const calculateTakeHome = (
  grossPay: number,
  period: PayPeriod = 'fortnightly',
  excludeMedicare = false
): TaxCalculationResult => {
  const visaType: AustraliaVisaType = excludeMedicare ? 'student_visa' : 'domestic';
  return calculateTakeHomeForVisa(grossPay, period, visaType);
};

// Get marginal rate based on visa type
const getMarginalRateForVisa = (annualIncome: number, visaType: AustraliaVisaType = 'domestic'): number => {
  const brackets = visaType === 'working_holiday' ? AU_WHM_TAX_BRACKETS : AU_TAX_BRACKETS;

  for (const bracket of brackets) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1].rate;
};

// Legacy function for backward compatibility
const getMarginalRate = (annualIncome: number): number => {
  return getMarginalRateForVisa(annualIncome, 'domestic');
};

// Create Australian tax calculator with visa type support
export const createAustralianCalculator = (visaType: AustraliaVisaType = 'domestic'): TaxCalculator => ({
  calculateIncomeTax: (income: number) => calculateIncomeTaxForVisa(income, visaType),
  calculateSocialContributions: (income: number) => calculateSocialContributionsForVisa(income, visaType),
  calculateTotalTax: (income: number) => calculateTotalTaxForVisa(income, visaType),
  calculateTakeHome: (grossPay: number, period: PayPeriod = 'fortnightly') =>
    calculateTakeHomeForVisa(grossPay, period, visaType),
  getMarginalRate: (income: number) => getMarginalRateForVisa(income, visaType),
  getTaxBrackets: () => visaType === 'working_holiday' ? AU_WHM_TAX_BRACKETS : AU_TAX_BRACKETS,
  getRetirementRate: () => AU_SUPER_RATE,
  getRetirementName: () => 'Super',
  getRetirementNameKey: () => 'dashboard.super',
});

// Export visa-aware functions
export {
  calculateIncomeTaxForVisa,
  calculateMedicareLevyForVisa,
  calculateTotalTaxForVisa,
  calculateTakeHomeForVisa,
  getMarginalRateForVisa,
  calculateSocialContributionsForVisa,
};

// Export legacy functions for backward compatibility
export {
  calculateIncomeTax,
  calculateMedicareLevy,
  calculateTotalTax,
  calculateTakeHome,
  getMarginalRate,
};

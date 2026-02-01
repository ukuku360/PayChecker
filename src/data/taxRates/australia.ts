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
const calculateTakeHomeForVisa = (
  grossPay: number,
  period: PayPeriod = 'fortnightly',
  visaType: AustraliaVisaType = 'domestic'
): TaxCalculationResult => {
  // Annualize income based on period
  let annualIncome = 0;
  let scale = 1;

  switch (period) {
    case 'weekly':
      annualIncome = grossPay * 52;
      scale = 1 / 52;
      break;
    case 'fortnightly':
      annualIncome = grossPay * 26;
      scale = 1 / 26;
      break;
    case 'monthly':
      annualIncome = grossPay * 12;
      scale = 1 / 12;
      break;
    case 'annual':
      annualIncome = grossPay;
      scale = 1;
      break;
  }

  const incomeTax = calculateIncomeTaxForVisa(annualIncome, visaType);
  const socialContributions = calculateSocialContributionsForVisa(annualIncome, visaType);
  const socialTotal = socialContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalDeductions = incomeTax + socialTotal;
  const netPay = annualIncome - totalDeductions;
  const effectiveRate = annualIncome > 0 ? totalDeductions / annualIncome : 0;

  return {
    grossPay,
    incomeTax: incomeTax * scale,
    socialContributions: socialContributions.map(c => ({
      ...c,
      amount: c.amount * scale,
    })),
    totalDeductions: totalDeductions * scale,
    netPay: netPay * scale,
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

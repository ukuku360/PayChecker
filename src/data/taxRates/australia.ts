/**
 * Australian Tax Rates - 2025-26 Financial Year
 *
 * Stage 3 Tax Cuts applied (effective from 1 July 2024)
 * Reference: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 */

import type { TaxBracket, TaxCalculator, PayPeriod, SocialContribution, TaxCalculationResult } from './types';

// ATO 2025-26 Tax Brackets for Australian Residents
export const AU_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18201, max: 45000, rate: 0.16, baseTax: 0 },
  { min: 45001, max: 135000, rate: 0.30, baseTax: 4288 },
  { min: 135001, max: 190000, rate: 0.37, baseTax: 31288 },
  { min: 190001, max: null, rate: 0.45, baseTax: 51638 },
];

// Tax-free threshold
export const AU_TAX_FREE_THRESHOLD = 18200;
export const TAX_FREE_THRESHOLD = AU_TAX_FREE_THRESHOLD; // Alias for backward compatibility

// Medicare Levy (2%)
export const AU_MEDICARE_LEVY_RATE = 0.02;
export const AU_MEDICARE_LEVY_THRESHOLD = 26000; // Low-income threshold (approx)

// Superannuation (11.5%)
export const AU_SUPER_RATE = 0.115;

const calculateIncomeTax = (annualIncome: number): number => {
  if (annualIncome <= 0) return 0;

  for (const bracket of AU_TAX_BRACKETS) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      const taxableInBracket = annualIncome - bracket.min;
      return bracket.baseTax + taxableInBracket * bracket.rate;
    }
  }

  // Should never reach here, but fallback to top bracket
  const topBracket = AU_TAX_BRACKETS[AU_TAX_BRACKETS.length - 1];
  const taxableInBracket = annualIncome - topBracket.min;
  return topBracket.baseTax + taxableInBracket * topBracket.rate;
};

const calculateMedicareLevy = (annualIncome: number): number => {
  if (annualIncome <= AU_MEDICARE_LEVY_THRESHOLD) return 0;
  return annualIncome * AU_MEDICARE_LEVY_RATE;
};

const calculateSocialContributions = (annualIncome: number, excludeMedicare = false): SocialContribution[] => {
  const contributions: SocialContribution[] = [];

  if (!excludeMedicare) {
    const medicareLevy = calculateMedicareLevy(annualIncome);
    if (medicareLevy > 0) {
      contributions.push({
        name: 'Medicare Levy',
        nameKey: 'dashboard.includesMedicare',
        amount: medicareLevy,
        rate: AU_MEDICARE_LEVY_RATE,
      });
    }
  }

  return contributions;
};

const calculateTotalTax = (annualIncome: number, excludeMedicare = false): number => {
  const incomeTax = calculateIncomeTax(annualIncome);
  const contributions = calculateSocialContributions(annualIncome, excludeMedicare);
  const socialTotal = contributions.reduce((sum, c) => sum + c.amount, 0);
  return incomeTax + socialTotal;
};

const calculateTakeHome = (
  grossPay: number,
  period: PayPeriod = 'fortnightly',
  excludeMedicare = false
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

  const incomeTax = calculateIncomeTax(annualIncome);
  const socialContributions = calculateSocialContributions(annualIncome, excludeMedicare);
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

const getMarginalRate = (annualIncome: number): number => {
  for (const bracket of AU_TAX_BRACKETS) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      return bracket.rate;
    }
  }
  return AU_TAX_BRACKETS[AU_TAX_BRACKETS.length - 1].rate;
};

export const createAustralianCalculator = (): TaxCalculator => ({
  calculateIncomeTax,
  calculateSocialContributions,
  calculateTotalTax,
  calculateTakeHome,
  getMarginalRate,
  getTaxBrackets: () => AU_TAX_BRACKETS,
  getRetirementRate: () => AU_SUPER_RATE,
  getRetirementName: () => 'Super',
  getRetirementNameKey: () => 'dashboard.super',
});

// Export legacy functions for backward compatibility
export {
  calculateIncomeTax,
  calculateMedicareLevy,
  calculateTotalTax,
  calculateTakeHome,
  getMarginalRate,
};

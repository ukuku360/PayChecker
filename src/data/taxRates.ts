/**
 * Australian Tax Rates - 2025-26 Financial Year
 * 
 * Stage 3 Tax Cuts applied (effective from 1 July 2024)
 * Reference: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 */

export interface TaxBracket {
  min: number;
  max: number | null; // null means no upper limit
  rate: number; // as decimal (e.g., 0.30 for 30%)
  baseTax: number; // cumulative tax from lower brackets
}

// ATO 2025-26 Tax Brackets for Australian Residents
export const TAX_BRACKETS_2025_26: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18201, max: 45000, rate: 0.16, baseTax: 0 },
  { min: 45001, max: 135000, rate: 0.30, baseTax: 4288 },
  { min: 135001, max: 190000, rate: 0.37, baseTax: 31288 },
  { min: 190001, max: null, rate: 0.45, baseTax: 51638 },
];

// Tax-free threshold
export const TAX_FREE_THRESHOLD = 18200;

// Medicare Levy (2%)
export const MEDICARE_LEVY_RATE = 0.02;
export const MEDICARE_LEVY_THRESHOLD = 26000; // Low-income threshold (approx)

/**
 * Calculate annual income tax based on ATO 2025-26 rates
 * @param annualIncome - Gross annual income
 * @returns Tax amount (excluding Medicare Levy)
 */
export const calculateIncomeTax = (annualIncome: number): number => {
  if (annualIncome <= 0) return 0;
  
  for (const bracket of TAX_BRACKETS_2025_26) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      const taxableInBracket = annualIncome - bracket.min;
      return bracket.baseTax + taxableInBracket * bracket.rate;
    }
  }
  
  // Should never reach here, but fallback to top bracket
  const topBracket = TAX_BRACKETS_2025_26[TAX_BRACKETS_2025_26.length - 1];
  const taxableInBracket = annualIncome - topBracket.min;
  return topBracket.baseTax + taxableInBracket * topBracket.rate;
};

/**
 * Calculate Medicare Levy
 * @param annualIncome - Gross annual income
 * @returns Medicare Levy amount
 */
export const calculateMedicareLevy = (annualIncome: number): number => {
  if (annualIncome <= MEDICARE_LEVY_THRESHOLD) return 0;
  return annualIncome * MEDICARE_LEVY_RATE;
};

/**
 * Calculate total tax (Income Tax + Medicare Levy)
 */
export const calculateTotalTax = (annualIncome: number): number => {
  return calculateIncomeTax(annualIncome) + calculateMedicareLevy(annualIncome);
};

export type PayPeriod = 'weekly' | 'fortnightly' | 'monthly' | 'annual';

/**
 * Calculate take-home pay after tax
 * @param grossPay - Gross pay amount for the specified period
 * @param period - Pay period (default: 'fortnightly')
 * @param excludeMedicare - Whether to exclude Medicare Levy (e.g. for some student visas)
 * @returns Object with tax breakdown
 */
export const calculateTakeHome = (
  grossPay: number,
  period: PayPeriod = 'fortnightly',
  excludeMedicare = false
): {
  grossPay: number;
  incomeTax: number;
  medicareLevy: number;
  totalTax: number;
  netPay: number;
  effectiveRate: number;
} => {
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
  const medicareLevy = excludeMedicare ? 0 : calculateMedicareLevy(annualIncome);
  const totalTax = incomeTax + medicareLevy;
  const netPay = annualIncome - totalTax;
  const effectiveRate = annualIncome > 0 ? totalTax / annualIncome : 0;

  return {
    grossPay,
    incomeTax: incomeTax * scale,
    medicareLevy: medicareLevy * scale,
    totalTax: totalTax * scale,
    netPay: netPay * scale,
    effectiveRate,
  };
};

/**
 * Get marginal tax rate for a given income
 */
export const getMarginalRate = (annualIncome: number): number => {
  for (const bracket of TAX_BRACKETS_2025_26) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      return bracket.rate;
    }
  }
  return TAX_BRACKETS_2025_26[TAX_BRACKETS_2025_26.length - 1].rate;
};

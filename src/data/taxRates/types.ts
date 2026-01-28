/**
 * Common types for tax calculations across countries
 */

export interface TaxBracket {
  min: number;
  max: number | null; // null means no upper limit
  rate: number; // as decimal (e.g., 0.30 for 30%)
  baseTax: number; // cumulative tax from lower brackets
}

export type PayPeriod = 'weekly' | 'fortnightly' | 'monthly' | 'annual';

export interface SocialContribution {
  name: string; // 'Medicare Levy', 'National Pension', etc.
  nameKey: string; // i18n key
  amount: number;
  rate: number;
  isEmployerPaid?: boolean;
}

export interface TaxCalculationResult {
  grossPay: number;
  incomeTax: number;
  socialContributions: SocialContribution[];
  totalDeductions: number;
  netPay: number;
  effectiveRate: number;
}

export interface TaxCalculator {
  calculateIncomeTax: (annualIncome: number) => number;
  calculateSocialContributions: (annualIncome: number, excludeMedicare?: boolean) => SocialContribution[];
  calculateTotalTax: (annualIncome: number, excludeMedicare?: boolean) => number;
  calculateTakeHome: (grossPay: number, period: PayPeriod, excludeMedicare?: boolean) => TaxCalculationResult;
  getMarginalRate: (annualIncome: number) => number;
  getTaxBrackets: () => TaxBracket[];
  getRetirementRate: () => number; // Super (AU) or NPS employer portion (KR)
  getRetirementName: () => string; // "Super" or "국민연금"
  getRetirementNameKey: () => string; // i18n key
}

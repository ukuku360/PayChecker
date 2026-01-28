/**
 * Korean Tax Rates - 2024 기준
 *
 * 소득세 + 4대보험 (국민연금, 건강보험, 장기요양, 고용보험)
 * Reference: 국세청 세율표
 */

import type { TaxBracket, TaxCalculator, PayPeriod, SocialContribution, TaxCalculationResult } from './types';

// Korean 2024 Income Tax Brackets (소득세)
export const KR_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 14_000_000, rate: 0.06, baseTax: 0 },
  { min: 14_000_001, max: 50_000_000, rate: 0.15, baseTax: 840_000 },
  { min: 50_000_001, max: 88_000_000, rate: 0.24, baseTax: 6_240_000 },
  { min: 88_000_001, max: 150_000_000, rate: 0.35, baseTax: 15_360_000 },
  { min: 150_000_001, max: 300_000_000, rate: 0.38, baseTax: 37_060_000 },
  { min: 300_000_001, max: 500_000_000, rate: 0.40, baseTax: 94_060_000 },
  { min: 500_000_001, max: 1_000_000_000, rate: 0.42, baseTax: 174_060_000 },
  { min: 1_000_000_001, max: null, rate: 0.45, baseTax: 384_060_000 },
];

// 4대보험 (Social Insurance) - Employee portions (본인부담분)
export const KR_SOCIAL_RATES = {
  nationalPension: 0.045, // 국민연금 4.5% (사업자 4.5% 매칭)
  healthInsurance: 0.03545, // 건강보험 3.545% (사업자 3.545% 매칭)
  longTermCareRate: 0.1281, // 장기요양보험 - 건강보험료의 12.81%
  employmentInsurance: 0.009, // 고용보험 0.9%
};

// 지방소득세 (Local Income Tax) - 소득세의 10%
export const KR_LOCAL_INCOME_TAX_RATE = 0.10;

const calculateIncomeTax = (annualIncome: number): number => {
  if (annualIncome <= 0) return 0;

  for (const bracket of KR_TAX_BRACKETS) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      const taxableInBracket = annualIncome - bracket.min;
      return bracket.baseTax + taxableInBracket * bracket.rate;
    }
  }

  // Fallback to top bracket
  const topBracket = KR_TAX_BRACKETS[KR_TAX_BRACKETS.length - 1];
  const taxableInBracket = annualIncome - topBracket.min;
  return topBracket.baseTax + taxableInBracket * topBracket.rate;
};

const calculateLocalIncomeTax = (incomeTax: number): number => {
  return incomeTax * KR_LOCAL_INCOME_TAX_RATE;
};

const calculateSocialContributions = (annualIncome: number): SocialContribution[] => {
  const contributions: SocialContribution[] = [];

  // 국민연금 (National Pension) - 4.5%
  const nationalPension = annualIncome * KR_SOCIAL_RATES.nationalPension;
  contributions.push({
    name: '국민연금',
    nameKey: 'korea.nationalPension',
    amount: nationalPension,
    rate: KR_SOCIAL_RATES.nationalPension,
  });

  // 건강보험 (Health Insurance) - 3.545%
  const healthInsurance = annualIncome * KR_SOCIAL_RATES.healthInsurance;
  contributions.push({
    name: '건강보험',
    nameKey: 'korea.healthInsurance',
    amount: healthInsurance,
    rate: KR_SOCIAL_RATES.healthInsurance,
  });

  // 장기요양보험 (Long-term Care) - 건강보험의 12.81%
  const longTermCare = healthInsurance * KR_SOCIAL_RATES.longTermCareRate;
  contributions.push({
    name: '장기요양',
    nameKey: 'korea.longTermCare',
    amount: longTermCare,
    rate: KR_SOCIAL_RATES.healthInsurance * KR_SOCIAL_RATES.longTermCareRate,
  });

  // 고용보험 (Employment Insurance) - 0.9%
  const employmentInsurance = annualIncome * KR_SOCIAL_RATES.employmentInsurance;
  contributions.push({
    name: '고용보험',
    nameKey: 'korea.employmentInsurance',
    amount: employmentInsurance,
    rate: KR_SOCIAL_RATES.employmentInsurance,
  });

  return contributions;
};

const calculateTotalTax = (annualIncome: number): number => {
  const incomeTax = calculateIncomeTax(annualIncome);
  const localIncomeTax = calculateLocalIncomeTax(incomeTax);
  const contributions = calculateSocialContributions(annualIncome);
  const socialTotal = contributions.reduce((sum, c) => sum + c.amount, 0);
  return incomeTax + localIncomeTax + socialTotal;
};

const calculateTakeHome = (
  grossPay: number,
  period: PayPeriod = 'monthly'
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
  const localIncomeTax = calculateLocalIncomeTax(incomeTax);
  const totalIncomeTax = incomeTax + localIncomeTax;
  const socialContributions = calculateSocialContributions(annualIncome);
  const socialTotal = socialContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalDeductions = totalIncomeTax + socialTotal;
  const netPay = annualIncome - totalDeductions;
  const effectiveRate = annualIncome > 0 ? totalDeductions / annualIncome : 0;

  return {
    grossPay,
    incomeTax: totalIncomeTax * scale,
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
  for (const bracket of KR_TAX_BRACKETS) {
    const max = bracket.max ?? Infinity;
    if (annualIncome <= max) {
      return bracket.rate;
    }
  }
  return KR_TAX_BRACKETS[KR_TAX_BRACKETS.length - 1].rate;
};

export const createKoreanCalculator = (): TaxCalculator => ({
  calculateIncomeTax,
  calculateSocialContributions,
  calculateTotalTax,
  calculateTakeHome,
  getMarginalRate,
  getTaxBrackets: () => KR_TAX_BRACKETS,
  getRetirementRate: () => KR_SOCIAL_RATES.nationalPension, // 본인부담 4.5%
  getRetirementName: () => '국민연금',
  getRetirementNameKey: () => 'korea.nationalPension',
});

export {
  calculateIncomeTax,
  calculateLocalIncomeTax,
  calculateSocialContributions,
  calculateTotalTax,
  calculateTakeHome,
  getMarginalRate,
};

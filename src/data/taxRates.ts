/**
 * Tax Rates Module
 *
 * This file re-exports from the modular tax rates structure for backward compatibility.
 * New code should import from './taxRates/index' directly.
 */

import type { CountryCode } from './countries';
import type { PayPeriod } from './taxRates/types';
import { calculateTakeHome as auCalculateTakeHome, calculateIncomeTax as auCalculateIncomeTax } from './taxRates/australia';

// Re-export everything from the new modular structure
export * from './taxRates/index';

/**
 * Calculates generic annual income tax for residents.
 * Wrapper to support country code.
 */
export const calculateIncomeTax = (annualGross: number, country: CountryCode = 'AU'): number => {
  if (country === 'AU') {
    return auCalculateIncomeTax(annualGross);
  }
  // Placeholder for KR: No tax calculation logic yet
  return 0;
};

// Legacy compatibility: export the old interface for calculateTakeHome
// Some components expect medicareLevy instead of socialContributions
export const calculateTakeHome = (
  grossPay: number,
  period: PayPeriod = 'fortnightly',
  excludeMedicare = false,
  country: CountryCode = 'AU'
): {
  grossPay: number;
  incomeTax: number;
  medicareLevy: number;
  totalTax: number;
  netPay: number;
  effectiveRate: number;
} => {
  if (country === 'AU') {
      const result = auCalculateTakeHome(grossPay, period, excludeMedicare);
      const medicareLevy = result.socialContributions.find(c => c.nameKey === 'dashboard.includesMedicare')?.amount ?? 0;

      return {
        grossPay: result.grossPay,
        incomeTax: result.incomeTax,
        medicareLevy,
        totalTax: result.totalDeductions,
        netPay: result.netPay,
        effectiveRate: result.effectiveRate,
      };
  }

  // Non-AU (e.g., KR) - Return 0 tax for now
  return {
    grossPay,
    incomeTax: 0,
    medicareLevy: 0,
    totalTax: 0,
    netPay: grossPay,
    effectiveRate: 0,
  };
};

// Re-export constants that are needed for backward compatibility
export { TAX_FREE_THRESHOLD } from './taxRates/australia';

// Alias for backward compatibility
import { AU_MEDICARE_LEVY_RATE, AU_MEDICARE_LEVY_THRESHOLD } from './taxRates/australia';
export const MEDICARE_LEVY_RATE = AU_MEDICARE_LEVY_RATE;
export const MEDICARE_LEVY_THRESHOLD = AU_MEDICARE_LEVY_THRESHOLD;

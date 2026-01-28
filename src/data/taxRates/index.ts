/**
 * Tax Calculator Factory
 *
 * Returns country-specific tax calculator based on country code
 */

import type { CountryCode } from '../countries';
import type { TaxCalculator, TaxBracket, PayPeriod, SocialContribution, TaxCalculationResult } from './types';
import { createAustralianCalculator, AU_TAX_BRACKETS, AU_SUPER_RATE } from './australia';
import { createKoreanCalculator } from './korea';

// Re-export types
export type { TaxBracket, PayPeriod, SocialContribution, TaxCalculationResult, TaxCalculator };

// Factory function to get country-specific calculator
export const getTaxCalculator = (country: CountryCode): TaxCalculator => {
  switch (country) {
    case 'KR':
      return createKoreanCalculator();
    case 'AU':
    default:
      return createAustralianCalculator();
  }
};

// Export AU tax brackets for backward compatibility (FiscalYearView uses directly)
export const TAX_BRACKETS_2025_26 = AU_TAX_BRACKETS;

// Export AU Super rate for backward compatibility
export const SUPER_RATE = AU_SUPER_RATE;

// Legacy exports for backward compatibility
export {
  calculateIncomeTax,
  calculateMedicareLevy,
  calculateTotalTax,
  calculateTakeHome,
  getMarginalRate,
} from './australia';

// Also export the AU constants
export { AU_TAX_BRACKETS, AU_MEDICARE_LEVY_RATE, AU_MEDICARE_LEVY_THRESHOLD, AU_SUPER_RATE } from './australia';

// Export KR constants
export { KR_TAX_BRACKETS, KR_SOCIAL_RATES } from './korea';

/**
 * Australian Tax Calculator Factory
 *
 * Returns visa-specific tax calculator for Australia (2025-26 FY)
 */

import type { TaxCalculator, TaxBracket, PayPeriod, SocialContribution, TaxCalculationResult } from './types';
import type { AustraliaVisaType } from '../../types';
import { createAustralianCalculator, AU_TAX_BRACKETS, AU_SUPER_RATE } from './australia';

// Re-export types
export type { TaxBracket, PayPeriod, SocialContribution, TaxCalculationResult, TaxCalculator };

// Factory function to get Australian tax calculator with visa type
export const getTaxCalculator = (visaType?: AustraliaVisaType): TaxCalculator => {
  return createAustralianCalculator(visaType ?? 'domestic');
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
export {
  AU_TAX_BRACKETS,
  AU_WHM_TAX_BRACKETS,
  AU_MEDICARE_LEVY_RATE,
  AU_MEDICARE_LEVY_THRESHOLD,
  AU_SUPER_RATE,
  AU_TAX_FREE_THRESHOLD,
  AU_WHM_TAX_FREE_THRESHOLD,
  // Visa-aware functions
  calculateIncomeTaxForVisa,
  calculateMedicareLevyForVisa,
  calculateTotalTaxForVisa,
  calculateTakeHomeForVisa,
  getMarginalRateForVisa,
  calculateSocialContributionsForVisa,
} from './australia';

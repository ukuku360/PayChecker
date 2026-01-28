/**
 * Currency and Date Formatting Utilities
 */

import type { CountryCode } from '../data/countries';
import { COUNTRIES } from '../data/countries';

/**
 * Format currency based on country configuration
 */
export const formatCurrency = (amount: number, country: CountryCode): string => {
  const config = COUNTRIES[country];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    maximumFractionDigits: config.currencyDecimals,
    minimumFractionDigits: config.currencyDecimals,
  }).format(amount);
};

/**
 * Format number with country-appropriate locale
 */
export const formatNumber = (num: number, country: CountryCode): string => {
  const config = COUNTRIES[country];
  return new Intl.NumberFormat(config.locale).format(num);
};

/**
 * Get currency symbol for a country
 */
export const getCurrencySymbol = (country: CountryCode): string => {
  return COUNTRIES[country].currencySymbol;
};

/**
 * Create a currency formatter function for a specific country
 */
export const createCurrencyFormatter = (country: CountryCode) => {
  return (amount: number) => formatCurrency(amount, country);
};

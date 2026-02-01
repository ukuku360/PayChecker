/**
 * Country Configuration for PayChecker
 * Supports Australia (AU) and Korea (KR)
 */

export type CountryCode = 'AU';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  nameNative: string;
  locale: string;
  language: 'en';
  currency: string;
  currencySymbol: string;
  currencyDecimals: number;
  fiscalYearStart: { month: number; day: number };
  dateFormat: string;
  flag: string;
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  AU: {
    code: 'AU',
    name: 'Australia',
    nameNative: 'Australia',
    locale: 'en-AU',
    language: 'en',
    currency: 'AUD',
    currencySymbol: '$',
    currencyDecimals: 2,
    fiscalYearStart: { month: 7, day: 1 }, // July 1
    dateFormat: 'dd/MM/yyyy',
    flag: '🇦🇺',
  },
};

export const getCountryConfig = (country: CountryCode): CountryConfig => {
  return COUNTRIES[country];
};

export const getCountryByLanguage = (_language: 'en'): CountryCode => {
  return 'AU';
};

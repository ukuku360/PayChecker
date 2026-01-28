/**
 * Country Configuration for PayChecker
 * Supports Australia (AU) and Korea (KR)
 */

export type CountryCode = 'AU' | 'KR';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  nameNative: string;
  locale: string;
  language: 'en' | 'ko';
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
  KR: {
    code: 'KR',
    name: 'Korea',
    nameNative: '한국',
    locale: 'ko-KR',
    language: 'ko',
    currency: 'KRW',
    currencySymbol: '₩',
    currencyDecimals: 0,
    fiscalYearStart: { month: 1, day: 1 }, // January 1
    dateFormat: 'yyyy.MM.dd',
    flag: '🇰🇷',
  },
};

export const getCountryConfig = (country: CountryCode): CountryConfig => {
  return COUNTRIES[country];
};

export const getCountryByLanguage = (language: 'en' | 'ko'): CountryCode => {
  return language === 'ko' ? 'KR' : 'AU';
};

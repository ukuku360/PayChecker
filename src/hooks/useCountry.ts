/**
 * Hook to access country-related data from the store
 */

import { useScheduleStore } from '../store/useScheduleStore';
import type { CountryCode, CountryConfig } from '../data/countries';
import { COUNTRIES } from '../data/countries';

export const useCountry = () => {
  const { country, setCountry } = useScheduleStore();

  // Default to AU if country is not set
  const currentCountry: CountryCode = country || 'AU';
  const config: CountryConfig = COUNTRIES[currentCountry];

  return {
    country: currentCountry,
    config,
    setCountry,
    isKorea: false,
    isAustralia: currentCountry === 'AU',
    language: config.language,
    locale: config.locale,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
  };
};

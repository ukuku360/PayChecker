/**
 * Hook for currency formatting
 */

import { useCallback } from 'react';
import { useCountry } from './useCountry';
import { formatCurrency, formatNumber } from '../utils/formatters';

export const useCurrency = () => {
  const { country, config } = useCountry();

  const format = useCallback(
    (amount: number) => formatCurrency(amount, country),
    [country]
  );

  const formatNum = useCallback(
    (num: number) => formatNumber(num, country),
    [country]
  );

  return {
    formatCurrency: format,
    formatNumber: formatNum,
    currency: config.currency,
    symbol: config.currencySymbol,
    decimals: config.currencyDecimals,
  };
};

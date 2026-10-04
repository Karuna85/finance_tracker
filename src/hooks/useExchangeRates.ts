import { useEffect, useState } from 'react';
import { fetchLatestExchangeRates, readCachedExchangeRates, type ExchangeRateSnapshot } from '../services/exchangeRates';

type RateStatus = 'loading' | 'current' | 'cached' | 'error';

export function useExchangeRates() {
  const [snapshot, setSnapshot] = useState<ExchangeRateSnapshot | null>(readCachedExchangeRates);
  const [status, setStatus] = useState<RateStatus>(snapshot ? 'cached' : 'loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const latest = await fetchLatestExchangeRates();
        if (!active) return;
        setSnapshot(latest);
        setStatus('current');
        setError('');
      } catch (failure) {
        if (!active) return;
        const message = failure instanceof Error ? failure.message : 'Could not retrieve exchange rates.';
        console.error('Could not retrieve latest exchange rates.', failure);
        setStatus((current) => current === 'current' || current === 'cached' ? 'cached' : 'error');
        setError(message);
      }
    }

    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 60 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  return { snapshot, status, error };
}

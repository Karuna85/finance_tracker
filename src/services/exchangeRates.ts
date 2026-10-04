export type ExchangeRates = Record<string, number>;

export interface ExchangeRateSnapshot {
  base: string;
  date: string;
  rates: ExchangeRates;
}

const CACHE_KEY = 'pearl-budget-exchange-rates-v1';
const supportedCurrencies = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'INR', 'JPY'];

function parseSnapshot(value: unknown): ExchangeRateSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ExchangeRateSnapshot>;
  if (candidate.base !== 'USD' || typeof candidate.date !== 'string' || !candidate.rates || typeof candidate.rates !== 'object') return null;
  const rates: ExchangeRates = { USD: 1 };
  for (const currency of supportedCurrencies) {
    if (currency === 'USD') continue;
    const rate = candidate.rates[currency];
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
    rates[currency] = rate;
  }
  return { base: 'USD', date: candidate.date, rates };
}

export function readCachedExchangeRates(): ExchangeRateSnapshot | null {
  try {
    const saved = window.localStorage.getItem(CACHE_KEY);
    return saved ? parseSnapshot(JSON.parse(saved)) : null;
  } catch (error) {
    console.error('Could not read cached exchange rates.', error);
    return null;
  }
}

export async function fetchLatestExchangeRates(): Promise<ExchangeRateSnapshot> {
  const symbols = supportedCurrencies.filter((currency) => currency !== 'USD').join(',');
  const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${symbols}`);
  if (!response.ok) throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  const snapshot = parseSnapshot(payload);
  if (!snapshot) throw new Error('Exchange-rate service returned incomplete or invalid data.');

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Could not cache exchange rates.', error);
  }
  return snapshot;
}

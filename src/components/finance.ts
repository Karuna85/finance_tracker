import type { Account, Budget, FinanceData, Transaction } from '../types/finance';
import type { ExchangeRates } from '../services/exchangeRates';

export const currencyOptions = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'CAD', label: 'Canadian Dollar (CA$)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
];

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

export function convertCurrency(amount: number, from: string, to: string, rates: ExchangeRates): number | null {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) return null;
  return (amount / fromRate) * toRate;
}

export function formatConvertedMoney(amount: number, from: string, to: string, rates: ExchangeRates): string {
  const converted = convertCurrency(amount, from, to, rates);
  return converted === null ? 'Rate unavailable' : formatMoney(converted, to);
}

export function accountBalance(account: Account, transactions: Transaction[], rates: ExchangeRates): number | null {
  let balance = account.openingBalance;
  for (const transaction of transactions) {
    if (transaction.accountId !== account.id) continue;
    const amount = convertCurrency(transaction.amount, transaction.currency, account.currency, rates);
    if (amount === null) return null;
    balance += transaction.type === 'income' ? amount : -amount;
  }
  return balance;
}

export function normalizeFinanceData(data: FinanceData): FinanceData {
  return {
    ...data,
    accounts: data.accounts.map((account) => ({
      ...account,
      currency: account.currency || data.currency,
    })),
    transactions: data.transactions.map((transaction) => ({
      ...transaction,
      currency: transaction.currency || data.currency,
    })),
    budgets: data.budgets.map((budget) => ({
      ...budget,
      currency: budget.currency || data.currency,
    })),
  };
}

export function sumConvertedTransactions(
  transactions: Transaction[],
  targetCurrency: string,
  rates: ExchangeRates,
  type?: Transaction['type'],
): number | null {
  let total = 0;
  for (const transaction of transactions) {
    if (type && transaction.type !== type) continue;
    const converted = convertCurrency(transaction.amount, transaction.currency, targetCurrency, rates);
    if (converted === null) return null;
    total += converted;
  }
  return total;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function currentMonthKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${key}-01T12:00:00`));
}

export function shortDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

import type { FinanceData } from '../types/finance';

const STORAGE_KEY = 'finance-tracker-data-v1';

function localDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export const starterData: FinanceData = {
  currency: 'USD',
  accounts: [
    { id: 'account-checking', name: 'Everyday checking', type: 'checking', openingBalance: 3420 },
    { id: 'account-savings', name: 'Rainy day fund', type: 'savings', openingBalance: 7800 },
    { id: 'account-card', name: 'Credit card', type: 'credit', openingBalance: -620 },
  ],
  transactions: [
    { id: 'transaction-1', description: 'Monthly paycheck', amount: 4250, type: 'income', category: 'Salary', accountId: 'account-checking', date: localDate(1), notes: 'Payday' },
    { id: 'transaction-2', description: 'Weekly groceries', amount: 86.42, type: 'expense', category: 'Groceries', accountId: 'account-checking', date: localDate(1), notes: '' },
    { id: 'transaction-3', description: 'Apartment rent', amount: 1450, type: 'expense', category: 'Housing', accountId: 'account-checking', date: localDate(3), notes: '' },
    { id: 'transaction-4', description: 'Coffee with Sam', amount: 12.5, type: 'expense', category: 'Dining', accountId: 'account-card', date: localDate(4), notes: '' },
    { id: 'transaction-5', description: 'Freelance project', amount: 380, type: 'income', category: 'Freelance', accountId: 'account-checking', date: localDate(6), notes: '' },
    { id: 'transaction-6', description: 'Electricity bill', amount: 74.9, type: 'expense', category: 'Utilities', accountId: 'account-checking', date: localDate(8), notes: '' },
    { id: 'transaction-7', description: 'New running shoes', amount: 94.99, type: 'expense', category: 'Shopping', accountId: 'account-card', date: localDate(10), notes: '' },
    { id: 'transaction-8', description: 'Train pass', amount: 58, type: 'expense', category: 'Transport', accountId: 'account-checking', date: localDate(13), notes: '' },
  ],
  budgets: [
    { id: 'budget-housing', category: 'Housing', limit: 1600 },
    { id: 'budget-groceries', category: 'Groceries', limit: 450 },
    { id: 'budget-dining', category: 'Dining', limit: 220 },
    { id: 'budget-transport', category: 'Transport', limit: 180 },
    { id: 'budget-shopping', category: 'Shopping', limit: 250 },
  ],
};

export function hasSavedFinanceData(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

export function loadFinanceData(): FinanceData {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return starterData;

    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'transactions' in parsed &&
      Array.isArray(parsed.transactions) &&
      'accounts' in parsed &&
      Array.isArray(parsed.accounts) &&
      'budgets' in parsed &&
      Array.isArray(parsed.budgets) &&
      'currency' in parsed &&
      typeof parsed.currency === 'string'
    ) {
      return parsed as FinanceData;
    }
    throw new Error('Saved finance data has an unsupported format.');
  } catch (error) {
    console.error('Could not load saved finance data.', error);
    return starterData;
  }
}

export function saveFinanceData(data: FinanceData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

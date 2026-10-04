import type { Account, Transaction } from '../types/finance';

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

export function accountBalance(account: Account, transactions: Transaction[]): number {
  return account.openingBalance + transactions
    .filter((transaction) => transaction.accountId === account.id)
    .reduce((sum, transaction) => sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount), 0);
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

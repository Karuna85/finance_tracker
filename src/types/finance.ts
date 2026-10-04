export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'savings' | 'cash' | 'credit';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  date: string;
  notes: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface FinanceData {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  currency: string;
}

export type PageName = 'Overview' | 'Transactions' | 'Accounts' | 'Budgets' | 'Reports';

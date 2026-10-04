import type { Account, Budget, PageName, Transaction } from '../../types/finance';
import { accountBalance, convertCurrency, formatMoney, formatConvertedMoney, sumConvertedTransactions, monthKey, monthLabel, currentMonthKey, shortDate } from '../../components/finance';
import type { ExchangeRates } from '../../services/exchangeRates';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  currency: string;
  rates: ExchangeRates;
  onNavigate: (page: PageName) => void;
  onNewTransaction: () => void;
}

export function DashboardPage({ transactions, accounts, budgets, currency, rates, onNavigate, onNewTransaction }: Props) {
  const thisMonth = currentMonthKey();
  const monthTransactions = transactions.filter((item) => monthKey(item.date) === thisMonth);
  const income = sumConvertedTransactions(monthTransactions, currency, rates, 'income');
  const expenses = sumConvertedTransactions(monthTransactions, currency, rates, 'expense');
  const accountBalances = accounts.map((account) => {
    const balance = accountBalance(account, transactions, rates);
    return balance === null ? null : convertCurrency(balance, account.currency, currency, rates);
  });
  const totalBalance = accountBalances.some((balance) => balance === null)
    ? null
    : accountBalances.reduce<number>((sum, balance) => sum + (balance ?? 0), 0);
  const availableToSave = income === null || expenses === null ? null : income - expenses;
  const sortedTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const chartMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthItems = transactions.filter((item) => monthKey(item.date) === key && item.type === 'expense');
    return {
      label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date),
      total: sumConvertedTransactions(monthItems, currency, rates, 'expense') ?? 0,
    };
  });
  const maxBar = Math.max(...chartMonths.map((month) => month.total), 1);

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">YOUR MONEY, IN FOCUS</p><h1>Good things happen when you know.</h1><p className="subheading">Here’s your financial snapshot for {monthLabel(thisMonth)}.</p></div>
        <button className="button button-primary" onClick={onNewTransaction}><span aria-hidden="true">＋</span> Add transaction</button>
      </div>
      <section className="metric-grid" aria-label="Monthly summary">
        <article className="metric-card balance-card"><div className="metric-label">Total balance <span className="metric-icon">↗</span></div><div className="metric-value">{totalBalance === null ? 'Rate unavailable' : formatMoney(totalBalance, currency)}</div><div className="metric-footnote">Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</div></article>
        <article className="metric-card"><div className="metric-label">Income this month <span className="metric-icon income-icon">↓</span></div><div className="metric-value">{income === null ? 'Rate unavailable' : formatMoney(income, currency)}</div><div className="metric-footnote">Money in this month</div></article>
        <article className="metric-card"><div className="metric-label">Spending this month <span className="metric-icon expense-icon">↑</span></div><div className="metric-value">{expenses === null ? 'Rate unavailable' : formatMoney(expenses, currency)}</div><div className="metric-footnote">Money out this month</div></article>
        <article className="metric-card"><div className="metric-label">Available to save <span className="metric-icon savings-icon">✳</span></div><div className="metric-value">{availableToSave === null ? 'Rate unavailable' : formatMoney(availableToSave, currency)}</div><div className="metric-footnote">Income minus spending</div></article>
      </section>

      <section className="content-grid">
        <article className="panel spending-panel">
          <div className="panel-heading"><div><h2>Spending overview</h2><p>Expenses over the last six months</p></div><span className="panel-badge">6 months</span></div>
          <div className="chart-legend"><span className="legend-dot" /> Spending</div>
          <div className="bar-chart" role="img" aria-label={`Monthly spending: ${chartMonths.map((month) => `${month.label} ${formatMoney(month.total, currency)}`).join(', ')}`}>
            {chartMonths.map((month) => (
              <div className="bar-column" key={month.label} title={`${month.label}: ${formatMoney(month.total, currency)}`}>
                <div className="bar-value">{month.total ? formatMoney(month.total, currency) : ''}</div>
                <div className="bar-track"><div className="bar-fill" style={{ height: `${month.total ? Math.max(8, (month.total / maxBar) * 100) : 2}%` }} /></div>
                <span className="bar-label">{month.label}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel budget-panel">
          <div className="panel-heading"><div><h2>Budget check-in</h2><p>Your monthly category limits</p></div><button className="text-button" onClick={() => onNavigate('Budgets')}>See all <span aria-hidden="true">→</span></button></div>
          {budgets.length ? <div className="budget-list">
            {budgets.slice(0, 5).map((budget) => {
              const spentItems = monthTransactions.filter((item) => item.type === 'expense' && item.category === budget.category);
              const spent = sumConvertedTransactions(spentItems, budget.currency, rates, 'expense');
              const displaySpent = spent === null ? null : convertCurrency(spent, budget.currency, currency, rates);
              const displayLimit = convertCurrency(budget.limit, budget.currency, currency, rates);
              const percentage = spent !== null && budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
              return <div className="budget-row" key={budget.id}>
                <div className="budget-row-top"><span>{budget.category}</span><span>{displaySpent === null || displayLimit === null ? 'Rate unavailable' : <>{formatMoney(displaySpent, currency)} <span className="muted">/ {formatMoney(displayLimit, currency)}</span></>}</span></div>
                <div className="progress-track"><div className={`progress-fill ${percentage >= 100 ? 'over-budget' : percentage >= 80 ? 'near-budget' : ''}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div>
              </div>;
            })}
          </div> : <div className="empty-inline"><span>No budgets yet</span><button className="text-button" onClick={() => onNavigate('Budgets')}>Create a budget</button></div>}
        </article>
      </section>

      <section className="content-grid lower-grid">
        <article className="panel transactions-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest transactions</p></div><button className="text-button" onClick={() => onNavigate('Transactions')}>View all <span aria-hidden="true">→</span></button></div>
          {sortedTransactions.length ? <div className="activity-list">
            {sortedTransactions.map((transaction) => {
              const account = accounts.find((item) => item.id === transaction.accountId);
              return <div className="activity-row" key={transaction.id}>
                <span className={`activity-symbol ${transaction.type}`}>{transaction.type === 'income' ? '↓' : '↑'}</span>
                <div className="activity-description"><strong>{transaction.description}</strong><span>{transaction.category} · {account?.name ?? 'Account removed'}</span></div>
                <span className="activity-date">{shortDate(transaction.date)}</span>
                <strong className={`activity-amount ${transaction.type}`}>{transaction.type === 'income' ? '+' : '−'}{formatConvertedMoney(transaction.amount, transaction.currency, currency, rates)}</strong>
              </div>;
            })}
          </div> : <div className="empty-state"><p>No activity yet.</p><button className="text-button" onClick={onNewTransaction}>Add your first transaction</button></div>}
        </article>
        <article className="panel accounts-panel">
          <div className="panel-heading"><div><h2>Your accounts</h2><p>Balances across your money</p></div><button className="text-button" onClick={() => onNavigate('Accounts')}>Manage <span aria-hidden="true">→</span></button></div>
          {accounts.length ? <div className="account-list">
            {accounts.slice(0, 4).map((account, index) => <div className="account-row" key={account.id}>
              <span className={`account-mark ${account.type}`} aria-hidden="true">{account.type === 'savings' ? '✳' : account.type === 'credit' ? '▤' : account.type === 'cash' ? '$' : '◈'}</span>
              <div className="account-description"><strong>{account.name}</strong><span>{account.type}</span></div>
              <strong>{accountBalances[index] === null ? 'Rate unavailable' : formatMoney(accountBalances[index] ?? 0, currency)}</strong>
            </div>)}
          </div> : <div className="empty-state"><p>No accounts added.</p><button className="text-button" onClick={() => onNavigate('Accounts')}>Add an account</button></div>}
        </article>
      </section>
    </>
  );
}

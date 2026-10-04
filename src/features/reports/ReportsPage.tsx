import { useMemo, useState } from 'react';
import { formatMoney, monthKey, monthLabel, currentMonthKey, shortDate } from '../../components/finance';
import type { Account, Transaction } from '../../types/finance';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  currency: string;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ReportsPage({ transactions, accounts, currency }: Props) {
  const [month, setMonth] = useState(currentMonthKey());
  const monthTransactions = useMemo(() => transactions
    .filter((item) => monthKey(item.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date)), [transactions, month]);
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const categoryTotals = Object.entries(monthTransactions
    .filter((item) => item.type === 'expense')
    .reduce<Record<string, number>>((totals, item) => {
      totals[item.category] = (totals[item.category] ?? 0) + item.amount;
      return totals;
    }, {}))
    .sort((a, b) => b[1] - a[1]);
  const topCategorySpend = Math.max(...categoryTotals.map(([, total]) => total), 1);

  function exportCsv() {
    const header = ['Date', 'Description', 'Type', 'Category', 'Account', 'Amount', 'Notes'];
    const rows = monthTransactions.map((item) => [
      item.date,
      item.description,
      item.type,
      item.category,
      accounts.find((account) => account.id === item.accountId)?.name ?? 'Account removed',
      item.amount.toFixed(2),
      item.notes,
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => csvCell(String(value))).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-report-${month}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">THE BIGGER PICTURE</p><h1>Reports</h1><p className="subheading">Understand your patterns and celebrate your progress.</p></div>
      <button className="button button-primary" onClick={exportCsv} disabled={!monthTransactions.length}><span aria-hidden="true">↓</span> Export CSV</button>
    </div>
    <section className="report-controls panel">
      <div><p className="eyebrow">MONTHLY REPORT</p><h2>{monthLabel(month)}</h2></div>
      <label className="form-field report-month">Choose month<input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} /></label>
    </section>
    <section className="metric-grid report-metrics">
      <article className="metric-card"><div className="metric-label">Income</div><div className="metric-value positive-value">{formatMoney(income, currency)}</div><div className="metric-footnote">{monthTransactions.filter((item) => item.type === 'income').length} income transactions</div></article>
      <article className="metric-card"><div className="metric-label">Expenses</div><div className="metric-value negative-value">{formatMoney(expenses, currency)}</div><div className="metric-footnote">{monthTransactions.filter((item) => item.type === 'expense').length} expense transactions</div></article>
      <article className="metric-card"><div className="metric-label">Net cash flow</div><div className={`metric-value ${income - expenses >= 0 ? 'positive-value' : 'negative-value'}`}>{formatMoney(income - expenses, currency)}</div><div className="metric-footnote">Income minus expenses</div></article>
    </section>
    <section className="content-grid report-grid">
      <article className="panel">
        <div className="panel-heading"><div><h2>Spending by category</h2><p>Where your money went this month</p></div></div>
        {categoryTotals.length ? <div className="category-breakdown">
          {categoryTotals.map(([category, total]) => <div className="category-breakdown-row" key={category}>
            <div className="category-breakdown-label"><span>{category}</span><strong>{formatMoney(total, currency)}</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${(total / topCategorySpend) * 100}%` }} /></div>
          </div>)}
        </div> : <div className="empty-state"><p>No expenses recorded for this month.</p></div>}
      </article>
      <article className="panel">
        <div className="panel-heading"><div><h2>Monthly highlights</h2><p>A few useful numbers</p></div></div>
        <div className="highlight-list">
          <div><span>Largest category</span><strong>{categoryTotals[0]?.[0] ?? '—'}</strong></div>
          <div><span>Largest category spend</span><strong>{formatMoney(categoryTotals[0]?.[1] ?? 0, currency)}</strong></div>
          <div><span>Average expense</span><strong>{formatMoney(monthTransactions.filter((item) => item.type === 'expense').length ? expenses / monthTransactions.filter((item) => item.type === 'expense').length : 0, currency)}</strong></div>
          <div><span>Net savings rate</span><strong>{income ? `${(((income - expenses) / income) * 100).toFixed(1)}%` : '—'}</strong></div>
        </div>
      </article>
    </section>
    <section className="panel full-panel report-transactions">
      <div className="panel-heading"><div><h2>Transactions in {monthLabel(month)}</h2><p>Included in this report</p></div><span className="panel-badge">{monthTransactions.length} entries</span></div>
      {monthTransactions.length ? <div className="table-wrap"><table>
        <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th className="align-right">AMOUNT</th></tr></thead>
        <tbody>{monthTransactions.map((item) => <tr key={item.id}><td><div className="table-description"><span className={`activity-symbol ${item.type}`}>{item.type === 'income' ? '↓' : '↑'}</span><strong>{item.description}</strong></div></td><td><span className="category-pill">{item.category}</span></td><td>{shortDate(item.date)}</td><td className={`align-right table-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{formatMoney(item.amount, currency)}</td></tr>)}</tbody>
      </table></div> : <div className="empty-state"><p>There are no transactions to report for this month yet.</p></div>}
    </section>
  </>;
}

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { formatMoney, monthKey, shortDate } from '../../components/finance';
import type { Account, Transaction, TransactionType } from '../../types/finance';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  currency: string;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onManageAccounts: () => void;
  quickAdd: boolean;
  onQuickAddOpened: () => void;
}

const categories = ['Bills', 'Dining', 'Education', 'Entertainment', 'Freelance', 'Gifts', 'Groceries', 'Healthcare', 'Housing', 'Salary', 'Shopping', 'Transport', 'Travel', 'Utilities'];

export function TransactionsPage({ transactions, accounts, currency, onSave, onDelete, onManageAccounts, quickAdd, onQuickAddOpened }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined);
  useEffect(() => {
    if (quickAdd) {
      setEditing(null);
      onQuickAddOpened();
    }
  }, [quickAdd, onQuickAddOpened]);
  const months = [...new Set(transactions.map((item) => monthKey(item.date)))].sort((a, b) => b.localeCompare(a));
  const filtered = useMemo(() => transactions
    .filter((item) => typeFilter === 'all' || item.type === typeFilter)
    .filter((item) => monthFilter === 'all' || monthKey(item.date) === monthFilter)
    .filter((item) => `${item.description} ${item.category} ${item.notes}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [transactions, typeFilter, monthFilter, search]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get('amount'));
    if (!Number.isFinite(amount) || amount <= 0) return;
    onSave({
      ...(editing ? { id: editing.id } : {}),
      description: String(form.get('description')).trim(),
      amount,
      type: String(form.get('type')) as TransactionType,
      category: String(form.get('category')).trim(),
      accountId: String(form.get('accountId')),
      date: String(form.get('date')),
      notes: String(form.get('notes')).trim(),
    });
    setEditing(undefined);
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">THE DETAILS</p><h1>Transactions</h1><p className="subheading">Every dollar has a story. Keep yours up to date.</p></div>
      <button className="button button-primary" onClick={() => setEditing(null)} disabled={!accounts.length}><span aria-hidden="true">＋</span> Add transaction</button>
    </div>
    <section className="panel full-panel">
      <div className="toolbar">
        <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search transactions" placeholder="Search transactions..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="select-field"><span className="sr-only">Filter by type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></label>
        <label className="select-field"><span className="sr-only">Filter by month</span><select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">All dates</option>{months.map((month) => <option key={month} value={month}>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))}</option>)}</select></label>
        <span className="result-count">{filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}</span>
      </div>
      {!accounts.length && <div className="notice">Add an account before recording transactions. <button className="text-button" onClick={onManageAccounts}>Manage accounts →</button></div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>ACCOUNT</th><th>DATE</th><th className="align-right">AMOUNT</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {filtered.map((item) => {
              const account = accounts.find((entry) => entry.id === item.accountId);
              return <tr key={item.id}>
                <td><div className="table-description"><span className={`activity-symbol ${item.type}`}>{item.type === 'income' ? '↓' : '↑'}</span><div><strong>{item.description}</strong>{item.notes && <small>{item.notes}</small>}</div></div></td>
                <td><span className="category-pill">{item.category}</span></td>
                <td>{account?.name ?? <span className="muted">Account removed</span>}</td>
                <td>{shortDate(item.date)}</td>
                <td className={`align-right table-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{formatMoney(item.amount, currency)}</td>
                <td><div className="row-actions"><button className="icon-button" title="Edit transaction" aria-label={`Edit ${item.description}`} onClick={() => setEditing(item)}>✎</button><button className="icon-button delete-action" title="Delete transaction" aria-label={`Delete ${item.description}`} onClick={() => { if (window.confirm(`Delete “${item.description}”?`)) onDelete(item.id); }}>×</button></div></td>
              </tr>;
            })}
          </tbody>
        </table>
        {!filtered.length && <div className="empty-state table-empty"><span className="empty-icon">⌕</span><p>{transactions.length ? 'No transactions match these filters.' : 'Your transaction list is waiting for its first entry.'}</p>{!transactions.length && accounts.length > 0 && <button className="button button-primary" onClick={() => setEditing(null)}>Add your first transaction</button>}</div>}
      </div>
    </section>
    {editing !== undefined && <Modal title={editing ? 'Edit transaction' : 'Add transaction'} onClose={() => setEditing(undefined)} onSubmit={submit} submitLabel={editing ? 'Save changes' : 'Add transaction'}>
      <div className="form-grid">
        <label className="form-field full-width">Description<input name="description" required maxLength={80} placeholder="e.g. Weekly groceries" defaultValue={editing?.description} autoFocus /></label>
        <label className="form-field">Type<select name="type" defaultValue={editing?.type ?? 'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label className="form-field">Amount<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" defaultValue={editing?.amount} /></label>
        <label className="form-field">Category<input name="category" list="transaction-categories" required maxLength={40} placeholder="Choose or type a category" defaultValue={editing?.category} /><datalist id="transaction-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>
        <label className="form-field">Account<select name="accountId" required defaultValue={editing?.accountId ?? accounts[0]?.id}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className="form-field">Date<input name="date" type="date" required defaultValue={editing?.date ?? new Date().toLocaleDateString('en-CA')} /></label>
        <label className="form-field full-width">Notes <span className="optional-label">Optional</span><input name="notes" maxLength={160} placeholder="Add a note" defaultValue={editing?.notes} /></label>
      </div>
    </Modal>}
  </>;
}

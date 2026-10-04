import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { currentMonthKey, formatMoney, monthKey, monthLabel } from '../../components/finance';
import type { Budget, Transaction } from '../../types/finance';

interface Props {
  budgets: Budget[];
  transactions: Transaction[];
  currency: string;
  onSave: (budget: Omit<Budget, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

const budgetCategories = ['Bills', 'Dining', 'Education', 'Entertainment', 'Groceries', 'Healthcare', 'Housing', 'Shopping', 'Transport', 'Travel', 'Utilities'];

export function BudgetsPage({ budgets, transactions, currency, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Budget | null | undefined>(undefined);
  const [categoryError, setCategoryError] = useState('');
  const thisMonth = currentMonthKey();
  const spentFor = (category: string) => transactions
    .filter((item) => item.type === 'expense' && item.category === category && monthKey(item.date) === thisMonth)
    .reduce((sum, item) => sum + item.amount, 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const category = String(form.get('category')).trim();
    const limit = Number(form.get('limit'));
    if (!category || !Number.isFinite(limit) || limit <= 0) return;
    const existing = budgets.find((item) => item.category.toLowerCase() === category.toLowerCase());
    if (existing && existing.id !== editing?.id) {
      setCategoryError('A budget for this category already exists. Edit that budget instead.');
      return;
    }
    setCategoryError('');
    onSave({ ...(editing?.id ?? existing?.id ? { id: editing?.id ?? existing?.id } : {}), category, limit });
    setEditing(undefined);
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">GIVE EVERY DOLLAR A PURPOSE</p><h1>Budgets</h1><p className="subheading">A little intention goes a long way. Progress for {monthLabel(thisMonth)}.</p></div>
      <button className="button button-primary" onClick={() => setEditing(null)}><span aria-hidden="true">＋</span> Create budget</button>
    </div>
    {budgets.length ? <section className="budget-card-grid">
      {budgets.map((budget) => {
        const spent = spentFor(budget.category);
        const remaining = budget.limit - spent;
        const percentage = (spent / budget.limit) * 100;
        const state = percentage >= 100 ? 'over' : percentage >= 80 ? 'near' : 'good';
        return <article className="panel budget-card" key={budget.id}>
          <div className="budget-card-heading"><div><span className={`budget-dot ${state}`} /><h2>{budget.category}</h2></div><div className="row-actions"><button className="icon-button" title="Edit budget" aria-label={`Edit ${budget.category} budget`} onClick={() => setEditing(budget)}>✎</button><button className="icon-button delete-action" title="Delete budget" aria-label={`Delete ${budget.category} budget`} onClick={() => { if (window.confirm(`Remove the ${budget.category} budget?`)) onDelete(budget.id); }}>×</button></div></div>
          <div className="budget-spent">{formatMoney(spent, currency)}<span> spent</span></div>
          <div className="progress-track large-progress"><div className={`progress-fill ${state === 'over' ? 'over-budget' : state === 'near' ? 'near-budget' : ''}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div>
          <div className="budget-card-foot"><span>{formatMoney(budget.limit, currency)} monthly limit</span><strong className={remaining < 0 ? 'over-text' : ''}>{remaining < 0 ? `${formatMoney(Math.abs(remaining), currency)} over` : `${formatMoney(remaining, currency)} left`}</strong></div>
          {percentage >= 80 && <p className={`budget-message ${state}`}>{state === 'over' ? 'You’ve reached this budget. Take a moment before spending more.' : 'You’re getting close to this month’s limit.'}</p>}
        </article>;
      })}
    </section> : <section className="panel empty-budget"><span className="empty-icon">◎</span><h2>Start with a spending plan</h2><p>Create a monthly limit for a category and see how you’re tracking as transactions come in.</p><button className="button button-primary" onClick={() => setEditing(null)}>Create your first budget</button></section>}
    <div className="notice account-tip"><strong>Budgets are monthly</strong><span>Only expense transactions in the current month count toward each category.</span></div>
    {editing !== undefined && <Modal title={editing ? 'Edit budget' : 'Create budget'} onClose={() => setEditing(undefined)} onSubmit={submit} submitLabel={editing ? 'Save changes' : 'Create budget'}>
      <div className="form-grid">
        <label className="form-field full-width">Category<input name="category" list="budget-categories" required maxLength={40} placeholder="e.g. Groceries" defaultValue={editing?.category} onChange={() => setCategoryError('')} autoFocus /><datalist id="budget-categories">{budgetCategories.map((category) => <option key={category} value={category} />)}</datalist>{categoryError && <span className="form-error" role="alert">{categoryError}</span>}</label>
        <label className="form-field full-width">Monthly limit<input name="limit" type="number" min="0.01" step="0.01" required placeholder="0.00" defaultValue={editing?.limit} /><span className="field-hint">If a budget for that category already exists, its limit will be updated.</span></label>
      </div>
    </Modal>}
  </>;
}

import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { accountBalance, formatMoney } from '../../components/finance';
import type { Account, AccountType, Transaction } from '../../types/finance';

interface Props {
  accounts: Account[];
  transactions: Transaction[];
  currency: string;
  onSave: (account: Omit<Account, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

const accountTypes: AccountType[] = ['checking', 'savings', 'cash', 'credit'];

export function AccountsPage({ accounts, transactions, currency, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const openingBalance = Number(form.get('openingBalance'));
    if (!Number.isFinite(openingBalance)) return;
    onSave({
      ...(editing ? { id: editing.id } : {}),
      name: String(form.get('name')).trim(),
      type: String(form.get('type')) as AccountType,
      openingBalance,
    });
    setEditing(undefined);
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">WHERE YOUR MONEY LIVES</p><h1>Accounts</h1><p className="subheading">See all your balances together in one place.</p></div>
      <button className="button button-primary" onClick={() => setEditing(null)}><span aria-hidden="true">＋</span> Add account</button>
    </div>
    <section className="account-card-grid">
      {accounts.map((account) => {
        const balance = accountBalance(account, transactions);
        const linkedTransactions = transactions.filter((item) => item.accountId === account.id).length;
        return <article className="panel account-card" key={account.id}>
          <div className="account-card-top"><span className={`account-mark ${account.type}`} aria-hidden="true">{account.type === 'savings' ? '✳' : account.type === 'credit' ? '▤' : account.type === 'cash' ? '$' : '◈'}</span><span className="account-type">{account.type}</span><button className="icon-button" aria-label={`Edit ${account.name}`} title="Edit account" onClick={() => setEditing(account)}>✎</button></div>
          <h2>{account.name}</h2>
          <p className="account-balance-label">Current balance</p>
          <strong className="account-balance">{formatMoney(balance, currency)}</strong>
          <div className="account-card-foot"><span>Starting balance</span><span>{formatMoney(account.openingBalance, currency)}</span></div>
          <div className="account-card-actions">{linkedTransactions
            ? <span className="muted">{linkedTransactions} linked {linkedTransactions === 1 ? 'transaction' : 'transactions'}</span>
            : <button className="text-button danger-text" onClick={() => { if (window.confirm(`Delete the ${account.name} account?`)) onDelete(account.id); }}>Remove account</button>}
          </div>
        </article>;
      })}
      <button className="add-account-card" onClick={() => setEditing(null)}><span className="add-account-plus">＋</span><strong>Add another account</strong><span>Checking, savings, cash, or credit</span></button>
    </section>
    <div className="notice account-tip"><strong>How balances work</strong><span>Current balance = starting balance + income − expenses recorded for that account.</span></div>
    {editing !== undefined && <Modal title={editing ? 'Edit account' : 'Add account'} onClose={() => setEditing(undefined)} onSubmit={submit} submitLabel={editing ? 'Save changes' : 'Add account'}>
      <div className="form-grid">
        <label className="form-field full-width">Account name<input name="name" required maxLength={50} placeholder="e.g. Holiday savings" defaultValue={editing?.name} autoFocus /></label>
        <label className="form-field">Account type<select name="type" defaultValue={editing?.type ?? 'checking'}>{accountTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label>
        <label className="form-field">Starting balance<input name="openingBalance" type="number" step="0.01" required defaultValue={editing?.openingBalance ?? 0} /><span className="field-hint">Use a negative value for a balance owed.</span></label>
      </div>
    </Modal>}
  </>;
}

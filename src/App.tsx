import { useState } from 'react';
import { useFinanceData } from './hooks/useFinanceData';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { BudgetsPage } from './features/budgets/BudgetsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import type { PageName } from './types/finance';
import { BrowserImportDialog, CloudAccess } from './components/CloudAccess';

const navigation: { name: PageName; symbol: string; group: string }[] = [
  { name: 'Overview', symbol: '⌂', group: 'MAIN MENU' },
  { name: 'Transactions', symbol: '↕', group: 'MAIN MENU' },
  { name: 'Accounts', symbol: '▤', group: 'MANAGE' },
  { name: 'Budgets', symbol: '◎', group: 'MANAGE' },
  { name: 'Reports', symbol: '▥', group: 'MANAGE' },
];

const currencyOptions = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'CAD', label: 'Canadian Dollar (CA$)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
];

export default function App() {
  const {
    data,
    saveError,
    authError,
    authMessage,
    session,
    authLoading,
    cloudConfigured,
    cloudStatus,
    migrationRequired,
    migrationHasCloudData,
    migrationHasLocalData,
    signIn,
    signUp,
    signOut,
    importBrowserData,
    keepCloudData,
    startWithEmptyCloudData,
    upsertTransaction,
    deleteTransaction,
    upsertAccount,
    deleteAccount,
    upsertBudget,
    deleteBudget,
    setCurrency,
  } = useFinanceData();
  const [page, setPage] = useState<PageName>('Overview');
  const [quickAdd, setQuickAdd] = useState(false);
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  function startTransaction() {
    setPage('Transactions');
    setQuickAdd(true);
  }

  function finishQuickAdd() {
    setQuickAdd(false);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); setPage('Overview'); }}>
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>PEARL BUDGET<small>YOUR MONEY, MINDFULLY</small></span>
        </a>
        <div className="sidebar-rule" />
        {['MAIN MENU', 'MANAGE'].map((group) => (
          <nav className="side-nav" aria-label={group === 'MAIN MENU' ? 'Main menu' : 'Manage finances'} key={group}>
            <p className="nav-heading">{group}</p>
            {navigation.filter((item) => item.group === group).map((item) => (
              <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => setPage(item.name)} aria-current={page === item.name ? 'page' : undefined}>
                <span className="nav-symbol" aria-hidden="true">{item.symbol}</span><span>{item.name}</span>{item.name === 'Transactions' && <span className="nav-count">{data.transactions.length}</span>}
              </button>
            ))}
          </nav>
        ))}
        <div className="sidebar-spacer" />
        <div className="sidebar-tip">
          <span className="tip-sparkle" aria-hidden="true">✳</span>
          <strong>Small steps add up.</strong>
          <p>Every mindful money moment is a step toward your goals.</p>
        </div>
        <div className="sidebar-footer"><span className="avatar">N</span><div><strong>Your finances</strong><span>Private on this device</span></div><span className="privacy-lock" aria-label="Private">⌑</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>My finances</span><span aria-hidden="true">/</span><strong>{page}</strong></div><div className="topbar-actions"><span className="today-label">{today}</span><label className="currency-picker"><span className="sr-only">Display currency</span><select aria-label="Display currency" value={data.currency} onChange={(event) => setCurrency(event.target.value)}>{currencyOptions.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></label><CloudAccess configured={cloudConfigured} authLoading={authLoading} session={session} status={cloudStatus} authError={authError} authMessage={authMessage} onSignIn={signIn} onSignUp={signUp} onSignOut={signOut} /></div></header>
        <div className="page-content">
          {!cloudConfigured && <div className="cloud-setup-notice"><strong>Cloud sync is not configured.</strong><span>Add your Supabase URL and anon key to <code>.env.local</code>, run the database migration, and restart the app. <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase</a></span></div>}
          {saveError && <div className="save-warning" role="alert"><span>!</span>{saveError}</div>}
          {page === 'Overview' && <DashboardPage transactions={data.transactions} accounts={data.accounts} budgets={data.budgets} currency={data.currency} onNavigate={setPage} onNewTransaction={startTransaction} />}
          {page === 'Transactions' && <TransactionsPage transactions={data.transactions} accounts={data.accounts} currency={data.currency} onSave={upsertTransaction} onDelete={deleteTransaction} onManageAccounts={() => setPage('Accounts')} quickAdd={quickAdd} onQuickAddOpened={finishQuickAdd} />}
          {page === 'Accounts' && <AccountsPage accounts={data.accounts} transactions={data.transactions} currency={data.currency} onSave={upsertAccount} onDelete={deleteAccount} />}
          {page === 'Budgets' && <BudgetsPage budgets={data.budgets} transactions={data.transactions} currency={data.currency} onSave={upsertBudget} onDelete={deleteBudget} />}
          {page === 'Reports' && <ReportsPage transactions={data.transactions} accounts={data.accounts} currency={data.currency} />}
          <footer className="page-footer">Your finances stay on this device. Take care of your future self. <span>✳</span></footer>
        </div>
      </main>
      {migrationRequired && <BrowserImportDialog hasCloudData={migrationHasCloudData} hasLocalData={migrationHasLocalData} error={saveError} onImport={importBrowserData} onKeepCloud={keepCloudData} onStartEmpty={startWithEmptyCloudData} />}
    </div>
  );
}

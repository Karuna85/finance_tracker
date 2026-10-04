import { useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Modal } from './Modal';
import type { CloudStatus } from '../hooks/useFinanceData';

interface CloudAccessProps {
  configured: boolean;
  authLoading: boolean;
  session: Session | null;
  status: CloudStatus;
  authError: string;
  authMessage: string;
  onSignIn: (username: string, password: string) => Promise<string | null>;
  onSignUp: (username: string, password: string) => Promise<string | null>;
  onSignOut: () => Promise<void>;
}

function statusLabel(status: CloudStatus): string {
  switch (status) {
    case 'unconfigured': return 'Cloud not configured';
    case 'local': return 'Saved on this device';
    case 'loading': return 'Loading cloud data';
    case 'migration': return 'Import choice needed';
    case 'saving': return 'Saving to cloud';
    case 'error': return 'Cloud save error';
    case 'synced': return 'Saved to cloud';
  }
}

export function CloudAccess({
  configured,
  authLoading,
  session,
  status,
  authError,
  authMessage,
  onSignIn,
  onSignUp,
  onSignOut,
}: CloudAccessProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signUpMode, setSignUpMode] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username')).trim();
    const password = String(form.get('password'));
    const error = signUpMode ? await onSignUp(username, password) : await onSignIn(username, password);
    setFormError(error ?? '');
    if (!error) setDialogOpen(false);
  }

  async function handleSignOut() {
    await onSignOut();
  }

  return (
    <>
      <div className={`cloud-access ${status === 'error' ? 'cloud-error' : ''}`} title={statusLabel(status)}>
        <span className={`cloud-status-dot ${session ? 'connected' : ''}`} />
        <span className="cloud-status-label">{authLoading ? 'Checking session' : statusLabel(status)}</span>
        {configured && session
          ? <button className="cloud-user-button" onClick={() => void handleSignOut()} title={`Sign out ${session.user.user_metadata.username ?? 'your account'}`}>Sign out</button>
          : <button className="cloud-user-button" disabled={!configured || authLoading} onClick={() => { setFormError(''); setDialogOpen(true); }}>
            {configured ? 'Sign in' : 'Setup'}
          </button>}
      </div>

      {dialogOpen && <Modal
        title={signUpMode ? 'Create a cloud account' : 'Sign in to cloud storage'}
        onClose={() => setDialogOpen(false)}
        onSubmit={(event) => { void submit(event); }}
        submitLabel={signUpMode ? 'Create account' : 'Sign in'}
      >
        <div className="cloud-form">
          <p className="cloud-form-intro">{signUpMode
            ? 'Choose a unique username and password. There is no email verification or password recovery for these accounts.'
            : 'Your finance data is private to your signed-in account and can sync across devices.'}</p>
          <label className="form-field full-width">Username<input name="username" type="text" autoComplete="username" required minLength={3} maxLength={24} pattern={'[A-Za-z0-9][A-Za-z0-9._\\-]{2,23}'} title="Use 3–24 letters, numbers, periods, underscores, or hyphens. Start with a letter or number." placeholder="your_username" autoCapitalize="none" spellCheck={false} autoFocus /></label>
          <label className="form-field full-width">Password<input name="password" type="password" autoComplete={signUpMode ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} placeholder={signUpMode ? 'At least 8 characters' : 'Your password'} /></label>
          {(formError || authError) && <p className="cloud-form-error" role="alert">{formError || authError}</p>}
          {authMessage && <p className="cloud-form-success" role="status">{authMessage}</p>}
          <button className="text-button cloud-mode-toggle" type="button" onClick={() => { setSignUpMode((current) => !current); setFormError(''); }}>
            {signUpMode ? 'Already have an account? Sign in' : 'New to PEARL BUDGET cloud? Create an account'}
          </button>
          <p className="cloud-security-note">Username-only accounts cannot recover a forgotten password. Keep your password safe.</p>
        </div>
      </Modal>}
    </>
  );
}

interface BrowserImportDialogProps {
  hasCloudData: boolean;
  hasLocalData: boolean;
  error: string;
  onImport: () => Promise<void>;
  onKeepCloud: () => Promise<void>;
  onStartEmpty: () => Promise<void>;
}

export function BrowserImportDialog({ hasCloudData, hasLocalData, error, onImport, onKeepCloud, onStartEmpty }: BrowserImportDialogProps) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError('');
    try {
      await action();
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Could not complete the data choice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal migration-modal" role="dialog" aria-modal="true" aria-labelledby="migration-title">
        <div className="modal-heading"><h2 id="migration-title">Choose which data to use</h2></div>
        <div className="modal-content">
          <p className="migration-copy">{hasCloudData
            ? 'This browser has finance data saved on this device. Choose whether to copy it to your signed-in cloud account.'
            : hasLocalData
              ? 'This browser has finance data saved on this device. Choose whether to import it or begin fresh in your cloud account.'
              : 'Choose whether to start your new cloud account with example data or begin with an empty account.'}</p>
          <div className="migration-choice">
            <strong>{hasLocalData ? 'Import this browser’s data' : 'Start with sample data'}</strong>
            <span>{hasCloudData
              ? 'This replaces the finance data currently in your cloud account.'
              : hasLocalData
                ? 'This copies your transactions, accounts, budgets, and currency to the cloud.'
                : 'Add the example transactions and budgets to your new cloud account.'}</span>
          </div>
          <div className="migration-choice">
            <strong>{hasCloudData ? 'Use cloud data' : 'Start with empty data'}</strong>
            <span>{hasCloudData
              ? 'Keep the cloud version and leave this browser’s saved copy untouched.'
              : 'Start with no accounts, transactions, or budgets. This browser’s saved data will not be changed.'}</span>
          </div>
          {(actionError || error) && <p className="cloud-form-error" role="alert">{actionError || error}</p>}
        </div>
        <div className="migration-actions">
          <button className="button button-quiet" type="button" disabled={busy} onClick={() => void run(hasCloudData ? onKeepCloud : onStartEmpty)}>{hasCloudData ? 'Use cloud data' : 'Start empty'}</button>
          <button className="button button-primary" type="button" disabled={busy} onClick={() => void run(onImport)}>{busy ? 'Saving…' : hasLocalData ? 'Import browser data' : 'Use sample data'}</button>
        </div>
      </section>
    </div>
  );
}

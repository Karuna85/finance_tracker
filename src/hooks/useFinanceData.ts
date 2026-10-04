import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { loadCloudFinanceData, markBrowserImportComplete, saveCloudFinanceData } from '../services/cloudFinanceStorage';
import { hasSavedFinanceData, loadFinanceData, saveFinanceData, starterData } from '../services/financeStorage';
import { supabase, supabaseConfigured } from '../services/supabase';
import type { Account, Budget, FinanceData, Transaction } from '../types/finance';

export type CloudStatus = 'unconfigured' | 'local' | 'loading' | 'migration' | 'synced' | 'saving' | 'error';

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected cloud storage error occurred.';
}

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(loadFinanceData);
  const [saveError, setSaveError] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(supabaseConfigured ? 'loading' : 'unconfigured');
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [migrationHasCloudData, setMigrationHasCloudData] = useState(false);
  const [migrationHasLocalData, setMigrationHasLocalData] = useState(false);
  const readyUserId = useRef<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const cloudUserId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthLoading(false);
      setAuthError('');
      setAuthMessage('');
    });

    supabase.auth.getSession().then(({ data: result, error }) => {
      if (!active) return;
      if (error) throw error;
      setSession(result.session);
      setAuthLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('Could not restore the Supabase session.', error);
      setAuthError(`Could not restore your cloud session: ${getErrorMessage(error)}`);
      setAuthLoading(false);
      setCloudStatus('error');
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    if (!cloudUserId) {
      const wasUsingCloud = readyUserId.current !== null;
      readyUserId.current = null;
      setMigrationRequired(false);
      setMigrationHasCloudData(false);
      setMigrationHasLocalData(false);
      setCloudStatus(supabaseConfigured ? 'local' : 'unconfigured');
      if (wasUsingCloud) setData(loadFinanceData());
      return () => {
        active = false;
      };
    }

    readyUserId.current = null;
    setCloudStatus('loading');
    setSaveError('');
    loadCloudFinanceData(cloudUserId).then(async (record) => {
      if (!active) return;
      const localDataAvailable = hasSavedFinanceData();
      if (!record || (!record.localImportCompletedAt && localDataAvailable)) {
        setData(record?.data ?? (localDataAvailable ? loadFinanceData() : starterData));
        setMigrationHasCloudData(Boolean(record));
        setMigrationHasLocalData(localDataAvailable);
        setMigrationRequired(true);
        setCloudStatus('migration');
        return;
      }

      if (!record.localImportCompletedAt) await markBrowserImportComplete(cloudUserId);
      setData(record.data);
      readyUserId.current = cloudUserId;
      setCloudStatus('synced');
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('Could not load finance data from Supabase.', error);
      setSaveError(`Could not load your cloud data: ${getErrorMessage(error)}`);
      setCloudStatus('error');
    });

    return () => {
      active = false;
    };
  }, [authLoading, cloudUserId]);

  useEffect(() => {
    if (authLoading) return;

    if (!cloudUserId) {
      try {
        saveFinanceData(data);
        setSaveError('');
      } catch (error) {
        console.error('Could not save finance data in this browser.', error);
        setSaveError('Your latest changes could not be saved in this browser.');
      }
      return;
    }

    if (readyUserId.current !== cloudUserId) return;

    const userId = cloudUserId;
    const timer = window.setTimeout(() => {
      setCloudStatus('saving');
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => saveCloudFinanceData(userId, data))
        .then(() => {
          if (readyUserId.current !== userId) return;
          setSaveError('');
          setCloudStatus('synced');
        })
        .catch((error: unknown) => {
          if (readyUserId.current !== userId) return;
          console.error('Could not save finance data to Supabase.', error);
          setSaveError(`Could not save your cloud data: ${getErrorMessage(error)}`);
          setCloudStatus('error');
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [data, authLoading, cloudUserId]);

  const usernameAuth = useCallback(async (action: 'sign-in' | 'sign-up', username: string, password: string) => {
    if (!supabase) return 'Cloud storage is not configured. Add the Supabase environment variables first.';
    setAuthError('');
    setAuthMessage('');
    const { data: response, error } = await supabase.functions.invoke<{
      access_token: string;
      refresh_token: string;
      message?: string;
    }>('username-auth', {
      body: { action, username: username.trim().toLowerCase(), password },
    });
    if (error) {
      const message = error.message || 'Username sign-in failed.';
      setAuthError(message);
      return message;
    }

    if (!response?.access_token || !response.refresh_token) {
      const message = response?.message ?? 'Authentication service returned an invalid session.';
      setAuthError(message);
      return message;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    });
    if (sessionError) {
      setAuthError(sessionError.message);
      return sessionError.message;
    }
    if (action === 'sign-up') setAuthMessage('Your account is ready. You are signed in.');
    return null;
  }, []);

  const signIn = useCallback((username: string, password: string) => (
    usernameAuth('sign-in', username, password)
  ), [usernameAuth]);

  const signUp = useCallback((username: string, password: string) => (
    usernameAuth('sign-up', username, password)
  ), [usernameAuth]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Could not sign out of Supabase.', error);
      setAuthError(`Could not sign out: ${error.message}`);
    }
  }, []);

  const importBrowserData = useCallback(async () => {
    if (!cloudUserId) throw new Error('Sign in before importing browser data.');
    const browserData = loadFinanceData();
    setCloudStatus('saving');
    try {
      await saveCloudFinanceData(cloudUserId, browserData);
      await markBrowserImportComplete(cloudUserId);
      setData(browserData);
      readyUserId.current = cloudUserId;
      setMigrationRequired(false);
      setMigrationHasLocalData(false);
      setSaveError('');
      setCloudStatus('synced');
    } catch (error) {
      console.error('Could not import browser data to Supabase.', error);
      setSaveError(`Could not import browser data: ${getErrorMessage(error)}`);
      setCloudStatus('error');
      throw error;
    }
  }, [cloudUserId]);

  const keepCloudData = useCallback(async () => {
    if (!cloudUserId) throw new Error('Sign in before choosing cloud data.');
    const existing = await loadCloudFinanceData(cloudUserId);
    const selectedData = existing?.data ?? starterData;
    try {
      if (!existing) await saveCloudFinanceData(cloudUserId, selectedData);
      await markBrowserImportComplete(cloudUserId);
      setData(selectedData);
      readyUserId.current = cloudUserId;
      setMigrationRequired(false);
      setMigrationHasLocalData(false);
      setSaveError('');
      setCloudStatus('synced');
    } catch (error) {
      console.error('Could not finish cloud data setup.', error);
      setSaveError(`Could not finish cloud data setup: ${getErrorMessage(error)}`);
      setCloudStatus('error');
      throw error;
    }
  }, [cloudUserId]);

  const startWithEmptyCloudData = useCallback(async () => {
    if (!cloudUserId) throw new Error('Sign in before starting with empty cloud data.');
    const emptyData: FinanceData = {
      transactions: [],
      accounts: [],
      budgets: [],
      currency: 'INR',
    };
    setCloudStatus('saving');
    try {
      await saveCloudFinanceData(cloudUserId, emptyData);
      await markBrowserImportComplete(cloudUserId);
      setData(emptyData);
      readyUserId.current = cloudUserId;
      setMigrationRequired(false);
      setMigrationHasLocalData(false);
      setSaveError('');
      setCloudStatus('synced');
    } catch (error) {
      console.error('Could not initialize empty cloud data.', error);
      setSaveError(`Could not start with empty cloud data: ${getErrorMessage(error)}`);
      setCloudStatus('error');
      throw error;
    }
  }, [cloudUserId]);

  function upsertTransaction(transaction: Omit<Transaction, 'id'> & { id?: string }) {
    const next = { ...transaction, id: transaction.id ?? createId() };
    setData((current) => ({
      ...current,
      transactions: transaction.id
        ? current.transactions.map((item) => (item.id === transaction.id ? next : item))
        : [next, ...current.transactions],
    }));
  }

  function deleteTransaction(id: string) {
    setData((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
  }

  function upsertAccount(account: Omit<Account, 'id'> & { id?: string }) {
    const next = { ...account, id: account.id ?? createId() };
    setData((current) => ({
      ...current,
      accounts: account.id
        ? current.accounts.map((item) => (item.id === account.id ? next : item))
        : [...current.accounts, next],
    }));
  }

  function deleteAccount(id: string) {
    setData((current) => ({ ...current, accounts: current.accounts.filter((item) => item.id !== id) }));
  }

  function upsertBudget(budget: Omit<Budget, 'id'> & { id?: string }) {
    const next = { ...budget, id: budget.id ?? createId() };
    setData((current) => ({
      ...current,
      budgets: budget.id
        ? current.budgets.map((item) => (item.id === budget.id ? next : item))
        : [...current.budgets, next],
    }));
  }

  function deleteBudget(id: string) {
    setData((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== id) }));
  }

  function setCurrency(currency: string) {
    setData((current) => ({ ...current, currency }));
  }

  return {
    data,
    saveError,
    authError,
    authMessage,
    session,
    authLoading,
    cloudConfigured: supabaseConfigured,
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
  };
}

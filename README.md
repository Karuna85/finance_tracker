# PEARL BUDGET

A local-first personal finance tracker with support for Indian rupees and other currencies, built with React, TypeScript, and Vite. Requires Node.js 18 or newer.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`, or preview it locally with `npm run preview`.

## Publish on GitHub Pages

1. Push this project to a GitHub repository on the `main` branch.
2. In the repository, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.
3. Under **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_SUPABASE_URL` — the Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — the Supabase publishable/anon key
4. Push to `main` or run the **Deploy to GitHub Pages** workflow from the Actions tab. GitHub will show the published URL in the Pages settings and deployment.

The Pages workflow builds the Vite app using the repository path automatically. The Supabase URL and anon key are public client configuration and will be included in the built frontend; row-level security must be enabled. **Never add the Supabase service-role key as a Vite variable or GitHub Pages variable.** Keep that key only as a Supabase Edge Function secret. Deploy the `username-auth` Edge Function to Supabase separately; GitHub Pages hosts only the frontend.

## Features

- Dashboard with account balances, monthly income and expenses, a six-month spending chart, recent activity, and budget progress.
- Add, edit, search, and filter income and expense transactions. Categories can be selected or entered freely.
- Manage checking, savings, cash, and credit accounts. Account balances are calculated from the opening balance and recorded transactions.
- Create and update monthly category budgets, with current-month spending progress and over-budget alerts.
- Review a monthly report, including cash flow, category breakdowns, highlights, and a spreadsheet-friendly CSV export.
- Change the display currency and retain your changes in browser local storage.

The first launch includes example data so the dashboard is immediately useful. Without Supabase configuration, finance data stays in browser storage on this device; clearing browser storage removes it.

## Supabase cloud storage and username accounts

1. Create a Supabase project and enable the Email provider in Supabase Auth. The app's users sign in with usernames; Supabase uses internal, non-deliverable email aliases for its password auth.
2. Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings. Never put a service-role key in this client app.
3. Run [`supabase/migrations/20261004000000_create_finance_data.sql`](./supabase/migrations/20261004000000_create_finance_data.sql) in the Supabase SQL editor.
4. Set the Edge Function's server-side service-role secret and deploy the username auth function:

   ```sh
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   supabase functions deploy username-auth
   ```

   Never expose the service-role key in `.env.local`, client code, or source control.
5. Restart the Vite dev server. Create an account or sign in using a 3–24 character username and password.
6. When prompted, import this browser's data or choose sample data or an empty INR account. The empty-data choice leaves this browser's saved finance data untouched.

The finance record is isolated by authenticated user through row-level security. Browser data is not deleted by the import, and the migration choice is recorded for the account.

Username accounts do not use email addresses and cannot use email verification or password recovery. Users who forget their password cannot recover that account's data. New accounts use the `users.pearlbudget.invalid` internal alias. The Edge Function also falls back to `users.nidhivora.invalid` for existing usernames; deploy the updated function before expecting new aliases or legacy sign-in to work.

This is a client-side tracker and does not connect to a bank. Cloud synchronization requires a configured Supabase project.

## Project layout

- `src/features/` - dashboard, transaction, account, budget, and report screens
- `src/components/` - reusable interface components and finance formatting helpers
- `src/hooks/` - shared finance data state and persistence
- `src/services/` - browser storage integration
- `src/types/` - shared finance domain types

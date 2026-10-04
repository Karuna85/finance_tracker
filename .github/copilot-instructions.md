# Project Guidance

- Build the client with React 18, TypeScript, and Vite.
- Keep dashboard, transaction, account, budget, and report code inside their matching folders under `src/features/`.
- Put reusable UI in `src/components/`, shared hooks in `src/hooks/`, and persistence or API integrations in `src/services/`.
- Keep shared domain types in `src/types/`; prefer feature-local types when they are not shared.
- Run `npm run build` to validate changes. Do not assume a backend or persistence layer exists yet.

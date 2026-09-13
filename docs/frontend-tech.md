# Frontend technology

The frontend is a typed React single-page application:

- React 19 with TypeScript
- Vite 7 for development and production builds
- TanStack Query for API/server state
- React Router 7 for screens
- Recharts for dashboard and period charts
- lucide-react for icons
- `@use-gesture/react` for swipe-to-delete

This fits the existing deployment model: Firebase Hosting serves the compiled
SPA, while `/api` requests are rewritten to the Go backend on Cloud Run.
The same build also runs as an nginx container (compose stack) that proxies
`/api` to the backend service. Server-side rendering is not needed.

Production Hosting sets a Content Security Policy that allows the app
stylesheet and Google Identity Services, plus `X-Content-Type-Options` and
`Referrer-Policy`. The app is installable as a standalone PWA (manifest,
icons, network-only service worker).

Local and containerized builds can show **Continue locally** instead of
Google Sign-In (`DEV` or `VITE_DEV_LOGIN=1`). Production Hosting injects
`VITE_OAUTH_CLIENT_ID` at build time.

## Completed

### Phase 1: read-only screens

- Replaced the static frontend prototype with a typed React/Vite application.
- Added the authenticated application shell with responsive desktop and mobile
  navigation.
- Added the dashboard with net worth, assets, liabilities, liquid balance, and
  trend visualizations.
- Added accounts with balance-sheet, income/expense, and hidden-account
  groupings.
- Added transactions with search, date/account filters, pagination, transaction
  details, and top-expense summaries.
- Added monthly and yearly insight views with income, expenses, savings,
  capital gains, effect, net worth, and progress metrics.
- Added `/api/v1/view/` read-model endpoints for the dashboard, accounts,
  transactions, months, years, and retranslation data.
- Kept the CockroachDB ledger schema unchanged. View-only account flags are
  derived from existing ledger data rather than stored as new CRDB columns.
- Added frontend type-checking and production builds to GitHub Actions, with
  Firebase Hosting deployment through the existing `/api` rewrite.

### Phase 2: write screens

- Added create, edit, duplicate, and delete for transactions. Edit changes
  notes and date only; amounts and accounts stay as posted. Delete requires
  confirmation.
- Added create, edit, hide, and delete for accounts, including optional
  opening balances. Hide uses the existing `is_active` flag. Currency change
  and delete are allowed only when the account has no journal activity.
- Added validation, confirmation, and API error handling on write forms.
  Cross-currency transfers can use ECB conversion or manually entered amounts.
- Reused the existing ledger write APIs, with PATCH/DELETE wrappers for
  account and transaction metadata. Opening balances post against
  `Equity:Opening:{currency}`. No CockroachDB schema change. Liquidity remains
  derived from active assets until Phase 3.

### Phase 3: settings and onboarding

- Added first-time onboarding when `/api/config` has no functional currency.
  The gate collects functional currency, theme, and ledger timezone.
- Added Settings for the same preferences. Theme (light/dark) and timezone
  persist across devices. Civil days, months, and “today” use the ledger
  timezone; journals stay in UTC.
- Changing functional currency requires confirmation and restates lot costs
  at today’s ECB rate (IAS 21: infrequent). The UI polls the running job and
  shows progress. Native accounts stay native.
- Added explicit Hidden and Liquid toggles on account create/edit. Hidden
  accounts drop out of pickers and sit at the bottom of Accounts. Liquid
  accounts feed the Overview liquid total. These are stored flags on the
  account write APIs, not new CockroachDB columns.
- Preferences use `GET`/`PUT /api/config` and `/api/config/timezone`.

### Later polish (Done)

- Transactions use infinite scroll and show top incomes as well as expenses.
- Months and years can book unrealised FX via the retranslation banner
  (`POST /api/v1/retranslate`).
- Mobile: swipe to delete and long-press to edit on accounts and
  transactions, with confirmation before delete.
- Desktop: `n` starts the context-appropriate new account or transaction
  flow (ignored while typing or when a dialog is open).
- Transaction date chips for today / this month / last month / two months.
- Mobile menu can clear the backend view cache.
- Installable PWA with standalone display.
- Hosting CSP for the stylesheet and Google Identity Services; PR `/deploy`
  comments deploy the same Firebase Hosting workflow.

## Remaining work

The planned frontend phases are complete. Keep GitHub Actions typecheck,
build, and Firebase Hosting as the production release path.

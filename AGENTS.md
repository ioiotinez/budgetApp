# AGENTS.md

Compact reference for AI agents working on BudgetApp.

## Stack

- **Expo SDK 54** managed workflow (New Arch enabled).
- **TypeScript strict** — verify with `npx tsc --noEmit`.
- **SQLite** via `expo-sqlite`. Singleton connection from `src/db/database.ts`. Schema and seed data in `src/db/schema.ts`.
- **Zustand v5** — one store per domain in `src/store/`. Stores call DB services directly, no API layer.
- **React Native Paper v5** — use `useTheme()` from paper for colors. Theme defined in `src/theme/theme.ts`. No hardcoded colors.
- **React Navigation v7** — bottom tabs (Dashboard, Transactions, Reports, Settings) with nested stacks for Transactions and Settings. See `src/navigation/AppNavigator.tsx`.
- **`react-native-reanimated`** plugin must be **last** in `babel.config.js`.

## Architecture

```
src/
  db/          — SQL queries and DB connection
  store/       — Zustand stores (budget, category, transaction, settings)
  hooks/       — Derived/computed data (reports, deviations)
  services/    — Backup export/import (JSON files)
  screens/     — View + store orchestration
  components/  — Shared UI components
  navigation/  — AppNavigator
  theme/       — Light/dark theme definitions
  types/       — All TypeScript interfaces
  utils/       — Date/currency formatters
```

State flow: **Screen → Store action → DB service → SQLite → Store state update → Re-render**.

## Database

- Dates stored as ISO `YYYY-MM-DD` `TEXT`.
- `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` set in `CREATE_TABLES_SQL`.
- Schema changes require users to delete `budget.db` locally (no migration system yet).
- `getDb()` returns a singleton. On web, uses an in-memory mock backed by `localStorage`.
- DB services (`transactionService.ts`, etc.) throw `DatabaseError` on failure.

## Stores

- `transactionStore`: `addTransaction` auto-refreshes with `{ year, month }` from the new transaction's date. Not `loadTransactions({})`.
- `budgetStore`: call `checkAndInitCurrentMonth` on app start to seed monthly budgets from template or previous month.
- `categoryStore`: `addCategory` auto-refreshes categories and template.
- `settingsStore`: persists `dark_mode` to `settings` table.

## Screens & Navigation

- `TransactionsScreen` reloads on focus via `navigation.addListener('focus', reload)`, not `useFocusEffect`.
- `AddEditTransactionScreen` navigates back on save via `goBack()`, falls back to `navigate('TransactionList')`.
- `ReportsScreen` still uses `useFocusEffect` with `loadCategories`/`loadTransactions`/`loadMonthTotals`.

## Build (APK)

Uses Docker (no local Android SDK needed):

```bash
docker-compose up -d && docker exec budgetapp_app-build_1 ./build-apk.sh
```

Output: `apk-output/budgetapp-release.apk`. Builds single arch `arm64-v8a` via `-PreactNativeArchitectures=arm64-v8a`. First build ~20-30 min, subsequent ~5-10 min. See `BUILD_INSTRUCTIONS.md`.

## What's missing

- No test framework, no lint config, no CI/CD, no pre-commit hooks.
- `victory-native` is listed in `package.json` but unused.
- Charts were removed; `react-native-svg` is no longer needed.

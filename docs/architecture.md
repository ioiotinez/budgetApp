# Architecture

BudgetApp is an offline-first personal finance app: an Expo/React Native UI over local SQLite,
Zustand stores as the only state layer, and local JSON files as the only import/export path.

## Stack and layers

| Layer | Choice | Role |
|---|---|---|
| App shell | Expo SDK 54 managed workflow, React Native 0.81.5, React 19.1.0, New Architecture (`app.json` → `newArchEnabled: true`) | Runtime and native modules |
| Language | TypeScript 5.9, `strict: true` in `tsconfig.json` | Type safety |
| UI | React Native Paper 5 (Material Design 3); emoji for categories/tabs, Paper icons for actions; `react-native-reanimated` 4 with its Babel plugin last | Presentation |
| Navigation | React Navigation 7: bottom tabs + native stacks | Routing |
| State | Zustand 5, one store per domain | Application state |
| Persistence | `expo-sqlite` 16 (`budget.db`), hand-written `localStorage` mock on web | Data storage |
| Formatting | `date-fns` 4 plus `Intl.NumberFormat` (`es-AR`, `ARS`) | Currency and dates |

There is no API layer, network client, or backend.

## Directory tree

```
App.tsx                        Opens DB, loads settings, provides Paper theme + navigator
index.ts                       Expo entry point via registerRootComponent(App)
src/
├── db/
│   ├── database.ts            Singleton getDb(); DDL + seeding; localStorage web mock
│   ├── schema.ts              CREATE_TABLES_SQL (6 tables, indexes) + 15 seed categories
│   ├── categoryService.ts     Category CRUD and budget-template upsert
│   ├── budgetService.ts       Monthly budgets, month init/copy, deviation queries
│   ├── transactionService.ts  Transaction CRUD, filters, month/year aggregates, DatabaseError
│   └── recurringService.ts    Recurring-rule CRUD and pending-due computation
├── store/
│   ├── budgetStore.ts         Current period, budgets, deviations, month auto-init
│   ├── categoryStore.ts       Categories and template state
│   ├── transactionStore.ts    Transaction list, filters, month totals
│   ├── recurringStore.ts      Rule CRUD, pending list, confirm/skip actions
│   └── settingsStore.ts       Dark mode and amount visibility persisted in settings
├── hooks/
│   ├── useDeviations.ts       Memoized over/warning lists and hasAlerts
│   ├── useMonthlyReport.ts    Income, expenses, balance, expense-by-category
│   ├── useAnnualReport.ts     Annual totals and 6-month projection
│   ├── usePeriodNavigation.ts Prev/next month callbacks over budgetStore
│   └── usePendingRecurring.ts Effect wrapper around loadPending (no screen imports it yet)
├── services/
│   └── backupService.ts       Collect/export/pick/restore JSON, merge or replace
├── screens/
│   ├── DashboardScreen.tsx    Month overview: summary, balance, pending, deviations, FAB
│   ├── TransactionsScreen.tsx Month list with search, category chips, focus reload, delete
│   ├── AddEditTransactionScreen.tsx  Create/edit transaction form and validation
│   ├── ReportsScreen.tsx      Monthly/annual reports, 12-month table, projection
│   ├── SettingsScreen.tsx     Links, dark mode, JSON export/import
│   ├── CategoriesScreen.tsx   Category CRUD with emoji/color pickers
│   ├── BudgetScreen.tsx       Per-category budget inline edit, copy previous, remove
│   ├── RecurringRulesScreen.tsx      Rule list with edit/delete and FAB
│   └── AddEditRecurringScreen.tsx    Rule form: amount, type, category, frequency, dates
├── components/
│   ├── BalanceCard.tsx        Balance card with privacy (show/hide amounts) toggle
│   ├── SummaryCard.tsx        Income/expense figure card, maskable
│   ├── DeviationRow.tsx       Alert row with percentage chip
│   ├── PendingRecurringBanner.tsx  Pending items with Skip/Confirm dialog
│   └── ErrorBanner.tsx        Error surface fed by transactionStore.error
├── navigation/
│   └── AppNavigator.tsx       Tab navigator and nested Transaction/Settings stacks
├── theme/
│   └── theme.ts               MD3 light/dark themes and semantic colors
├── types/
│   └── index.ts               Domain, report, recurring, backup, navigation types
└── utils/
    └── formatters.ts          ARS currency, date/month labels, masking, prev/next month
```

Root support files: `babel.config.js`, `metro.config.js`, `app.json`, `eas.json`, `Dockerfile`,
`docker-compose.yml`, `build-apk.sh`, `BUILD_INSTRUCTIONS.md`.

## Data flow

```
Screen → store action → DB service → getDb()/SQLite → Zustand set(...) → re-render
```

- Stores call DB services directly (screens never run SQL); services throw `DatabaseError`;
  `set(...)` replaces store slices and re-renders subscribers.
- Derived data is memoized in `src/hooks/`; direct service calls bypass stores in
  `ReportsScreen` → `getYearTotals`, `SettingsScreen` → backup, and `confirmPending` → `createTransaction`.
- Reloads: `useFocusEffect` in Dashboard, Reports, Budget, Categories, RecurringRules;
  `TransactionsScreen` uses `addListener('focus')`; Dashboard has pull-to-refresh.

## Database

| Table | Key columns | Notes |
|---|---|---|
| `categories` | `id`, `name`, `type`, `icon`, `color`, `createdAt` | `type` is `income`/`expense` (CHECK) |
| `budget_templates` | `id`, `category_id`, `amount` | FK → categories, cascade delete |
| `monthly_budgets` | `id`, `year`, `month`, `category_id`, `amount` | `UNIQUE(year, month, category_id)` |
| `transactions` | `id`, `amount`, `type`, `category_id`, `date`, `description`, `createdAt` | Indexed on date, category, type, date+type |
| `settings` | `key` (PK), `value` | App preferences as text |
| `recurring_rules` | `id`, `amount`, `type`, `category_id`, `description`, `frequency`, `start_date`, `end_date`, `last_generated_date`, `active`, `createdAt` | `active` is 0/1; indexed |

- Dates (`date`, `start_date`, `end_date`, `last_generated_date`) are ISO `YYYY-MM-DD`
  `TEXT`; `createdAt`/`exportedAt` are full ISO timestamps.
- `CREATE_TABLES_SQL` sets `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`, then
  creates tables/indexes with `IF NOT EXISTS`; there is no migration system, so schema changes
  require deleting `budget.db` (or clearing the web key).
- `getDb()` is a singleton: opens `budget.db`, runs the DDL and seeds 15 categories when empty.
- On web (`USE_SQLITE_IN_WEB = false` in `database.ts`) `getDb()` returns a hand-written mock
  persisted to `localStorage` under `budget_app_data`, implementing only the SQL shapes used.

## Recurring-rules engine

- Frequencies: `weekly` (+7 days), `biweekly` (+14 days), `monthly` (+1 month),
  `yearly` (+1 year).
- `getPendingRecurring(rules, year, month)` considers active rules overlapping the month and
  advances the next due date from the later of `start_date`/`last_generated_date`, with catch-up
  jumping whole periods when behind. A rule is pending when that date falls inside the month
  and after `last_generated_date` (one instance per rule, sorted by due date).
- `confirmPending` creates a transaction and sets `last_generated_date`; `skipPending` only
  advances it; `PendingRecurringBanner` exposes both plus a details dialog.
- Dashboard calls `loadPending` on focus; rule CRUD lives in `RecurringRulesScreen` and
  `AddEditRecurringScreen` under Settings.

## Backup service

- `collectAllData()` exports `version: 1`, `exportedAt`, categories, templates, budgets,
  transactions, recurring rules and settings into the `BackupData` shape (`types/index.ts`).
- `exportLocal()` writes/shares `budgetapp_backup_YYYY-MM-DD.json` (Blob download on web);
  `pickLocalBackup()` reads a file through `expo-document-picker`.
- `restoreFromBackup(data, merge)` runs `BEGIN`/`COMMIT` with `ROLLBACK`; `merge = false`
  clears the five data tables (not `settings`), `merge = true` upserts by id.

## Theming

- `AppLightTheme` and `AppDarkTheme` extend Paper `MD3LightTheme`/`MD3DarkTheme`: teal primary
  `#14b8a6`, indigo secondary `#818cf8`, rose error `#f43f5e`, slate dark surfaces. Semantic
  exports: `incomeColor`, `expenseColor`, `deviationColors` (`ok`/`warning`/`over`).
- `App.tsx` picks the theme from `settingsStore.darkMode` (persisted in `settings`) and feeds
  `PaperProvider` plus `StatusBar`.
- Most surfaces use `useTheme()`; a few screens still inline semantic hex values, so color
  usage is not fully centralized.

## Navigation graph

```
AppNavigator (bottom tabs; tab headers hidden)
├── Dashboard (tab "Inicio") → DashboardScreen
├── Transactions (tab "Movimientos") → TransactionsNavigator
│   ├── TransactionList
│   └── AddEditTransaction { transactionId? }
├── Reports (tab "Reportes") → ReportsScreen
└── Settings (tab "Config") → SettingsNavigator
    ├── SettingsHome
    ├── Categories
    ├── BudgetSetup { year, month }
    ├── RecurringRules
    └── AddEditRecurring { ruleId? }
```

Pressing the Transactions tab always targets `TransactionList`. The tab bar uses emoji icons and
theme colors; nested stacks render their own headers with Spanish titles.

## Build and release

- Primary path is Docker: `docker-compose up -d` starts `hmerritt/android-sdk` with the repo
  mounted at `/project/app`, then `docker exec budgetapp_app-build_1 ./build-apk.sh`; `eas.json`
  also defines development/preview/production profiles.
- `build-apk.sh` installs deps if needed, deletes and regenerates `android/` with
  `npx expo prebuild --platform android`, creates a debug keystore if absent, runs
  `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`, and copies the APK to
  `apk-output/budgetapp-release.apk`. `BUILD_INSTRUCTIONS.md` covers debug and single-ABI builds.

## Known gaps

- No test framework, lint config, CI pipeline or pre-commit hooks; no migration framework
  either, so schema edits require a local database reset.
- `package-lock.json` retains stale top-level dependencies (`victory-native`,
  `react-native-svg`, `expo-notifications`, `expo-web-browser`, among others) absent from
  `package.json` and unused in `src/`; `app.json` still declares the latter two plugins.
- `README.md` (donut charts, Old Architecture) and `BUILD_INSTRUCTIONS.md` (Old Architecture) contradict `app.json`/`ReportsScreen`.
- Error handling is uneven: `transactionStore` exposes `error` for `ErrorBanner`, while other
  stores mostly log or store a plain string.

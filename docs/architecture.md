# Architecture

## Stack

- **Expo SDK 54** managed workflow (New Arch enabled)
- **TypeScript strict**
- **SQLite** via `expo-sqlite`
- **Zustand v5** state management
- **React Native Paper v5** UI library
- **React Navigation v7** routing
- **react-native-reanimated** animations

## Project structure

```
src/
├── db/           SQL queries and DB connection
│   ├── database.ts         Singleton connection (SQLite / localStorage mock on web)
│   ├── schema.ts           DDL + 15 seed categories
│   ├── categoryService.ts  Category + template queries
│   ├── budgetService.ts    Monthly budget + deviation queries
│   └── transactionService.ts  Transaction CRUD + aggregation queries
├── store/        Zustand stores (one per domain)
│   ├── budgetStore.ts      Budget state, deviations, period management
│   ├── categoryStore.ts    Categories + template state
│   ├── transactionStore.ts Transactions + filters + month totals
│   └── settingsStore.ts    Dark mode toggle
├── hooks/        Derived/computed data
│   ├── useDeviations.ts     Filtered over/warning/ok deviation lists
│   ├── useMonthlyReport.ts  Income/expense breakdowns from transactions
│   ├── useAnnualReport.ts   Year totals, monthly breakdown, 6-month projection
│   └── usePeriodNavigation.ts  Prev/next month callbacks
├── services/     Business logic
│   └── backupService.ts     Export/import JSON with merge/replace
├── screens/      View + store orchestration
│   ├── DashboardScreen.tsx
│   ├── TransactionsScreen.tsx
│   ├── AddEditTransactionScreen.tsx
│   ├── ReportsScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── CategoriesScreen.tsx
│   └── BudgetScreen.tsx
├── components/   Shared UI
│   ├── SummaryCard.tsx
│   ├── DeviationRow.tsx
│   └── ErrorBanner.tsx
├── navigation/   AppNavigator (tabs + nested stacks)
├── theme/        Light/dark theme (Paper MD3)
├── types/        All TypeScript interfaces
└── utils/        Date/currency formatters (locale es-AR)
```

## State flow

```
Screen → Store action → DB service → SQLite → Store state update → Re-render
```

No API layer. Stores call DB services directly.

## Database

- Singleton `getDb()` → `SQLite.openDatabaseAsync('budget.db')`
- `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`
- 5 tables: `categories`, `budget_templates`, `monthly_budgets`, `transactions`, `settings`
- Dates stored as ISO `YYYY-MM-DD TEXT`
- Web fallback: in-memory mock backed by `localStorage`

## Navigation

```
RootTabNavigator
├── Dashboard (tab)
├── Transactions (tab → nested stack)
│   ├── TransactionList
│   └── AddEditTransaction
├── Reports (tab)
└── Settings (tab → nested stack)
    ├── SettingsHome
    ├── Categories
    └── BudgetSetup
```

## Theming

- `AppLightTheme` / `AppDarkTheme` extend Paper `MD3LightTheme` / `MD3DarkTheme`
- Primary: Teal (`#14b8a6`), Secondary: Indigo, Error: Rose
- Semantic colors: `incomeColor` (emerald), `expenseColor` (rose), `deviationColors` (ok/warning/over)
- No hardcoded colors in components — all use `useTheme()` or semantic constants

## Key patterns

| Pattern | Where |
|---|---|
| Focus-based reload | `TransactionsScreen` via `navigation.addListener('focus')`; `ReportsScreen`/`Dashboard` via `useFocusEffect` |
| Optimistic updates | `budgetStore.setBudgetAmount`, `budgetStore.removeCategory` |
| Month auto-init | `budgetStore.checkAndInitCurrentMonth` → template or previous month |
| Transaction month scoping | `addTransaction` refreshes data for the transaction's own `{ year, month }` |
| No migration system | Schema changes require manual `budget.db` deletion |
| Emoji icons | Categories, tabs — no SVG or icon fonts |
| Cascade deletes | Categories FK with `ON DELETE CASCADE` |

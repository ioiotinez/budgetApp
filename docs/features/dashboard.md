# Dashboard

Month-at-a-glance financial overview. Shows summary cards for income (green) and expenses (red), global deviation (budgeted vs actual) with status chips, balance display, budget alerts (over-budget and warning items), and a per-category breakdown with progress bars.

## Key files

- `src/screens/DashboardScreen.tsx`
- `src/components/SummaryCard.tsx`
- `src/components/DeviationRow.tsx`
- `src/hooks/useDeviations.ts`

## Data flow

`useFocusEffect` triggers a `reload` callback that calls `loadDeviations`, `loadGlobalDeviations`, and `loadMonthTotals` from the budget and transaction stores. The `useDeviations` hook derives filtered lists (over/warning/ok) from the store.

## States

- **Loading:** `ActivityIndicator` overlay while data is being fetched.
- **Empty (no transactions):** Balance shown as $0, no deviation items, no category breakdown.
- **Error:** Not individually handled — relies on store error states.

## Interactions

- **Period navigation:** Prev/next month chevrons via `usePeriodNavigation`.
- **Pull-to-refresh:** `RefreshControl` on the `ScrollView`.
- **FAB:** Navigates to `AddEditTransaction` to add a new transaction.
- **Category row:** Shows icon, progress bar, percentage, actual vs budgeted amounts.

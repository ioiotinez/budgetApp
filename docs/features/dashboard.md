# Dashboard

Month-at-a-glance financial overview: income/expense summary cards, a balance card with an amount-privacy toggle, pending recurring items, budget-vs-actual deviations (global and per category), and budget alerts.

## Key files

- `src/screens/DashboardScreen.tsx`
- `src/components/BalanceCard.tsx`
- `src/components/SummaryCard.tsx`
- `src/components/DeviationRow.tsx`
- `src/components/PendingRecurringBanner.tsx`
- `src/hooks/useDeviations.ts`
- `src/hooks/usePeriodNavigation.ts`

## Layout (top to bottom)

1. **Period header** — prev/next chevrons via `usePeriodNavigation`, month label from `formatMonthYear`.
2. **Summary cards** — "Ingresos" (green) and "Gastos" (red) from `transactionStore.monthTotals`.
3. **Pending recurring banner** — rendered only when rules have unconfirmed occurrences (see `recurring.md`).
4. **Credit card card** — `CreditCardSummaryCard`, rendered when the month has credit spending or a limit is configured. Total, status chip and progress bar against `creditCardLimit` (80 % warning, >100 % over) plus a per-category breakdown. Never part of the budget or the balance (see `credit-card.md`).
5. **"Desviación vs Presupuestado"** — shown when global deviations exist and at least one has a non-zero budget. One row per type: budgeted → actual, plus a status chip (`OVER` / `UNDER` / `OK` with a percentage). For income, under 100% is flagged red (`UNDER`); for expenses, over 100% is red (`OVER`); everything else is green (`OK`).
6. **Balance card** — `monthTotals.income - monthTotals.expense`, with the privacy toggle.
7. **"Alertas de presupuesto"** — only when `hasAlerts` from `useDeviations`; lists over-budget rows first, then warning rows, each with a percentage chip.
8. **"Resumen por categoría"** — one card per expense category: icon, name, percentage colored by status, progress bar (capped at 100%) and `actual / budgeted`. The "Sin presupuesto configurado para este mes." message only appears when there are no expense categories, because `getDeviations` returns every expense category (budget `0` included).

## Amount privacy toggle

The balance card has an eye button that hides all headline amounts — balance, income and expenses — replacing them with `••••••`, the pattern banking apps use for account balances. The cards stay in place, and hidden values turn neutral gray so neither the sign (positive/negative) nor the income/expense colors leak.

- State: `amountsVisible` in `settingsStore`, persisted to the `settings` table under `amounts_visible` (defaults to visible).
- Toggle: `toggleAmountsVisibility()` — writes to SQLite and updates the store, so the choice survives app restarts.
- Masking helpers: `MASKED_AMOUNT` / `formatAmount(value, visible)` in `src/utils/formatters.ts`, used by both `BalanceCard` and `SummaryCard` (`visible` prop).
- Global deviation figures, alerts and the per-category breakdown still show amounts; extend the same flag there if full privacy mode is needed.

## Data flow

`useFocusEffect` runs `reload` on focus and whenever the period changes. It awaits, in order: `loadCategories`, `checkAndInitCurrentMonth`, `loadMonthTotals`, `loadCreditCardTotals`, `loadDeviations`, `loadGlobalDeviations`, `loadPending`. The `useDeviations` hook derives filtered `over` / `warning` lists from `budgetStore.deviations`; `getDeviations` marks a category `over` above 100%, `warning` from 80% to 100%, otherwise `ok`.

## States

- **No loading UI:** stores update in place; there is no dashboard `ActivityIndicator`.
- **Empty (no transactions):** balance shows `$0`, actual amounts are `0`, alerts are hidden, and category rows are still listed with `0 / budgeted`.
- **Error:** not rendered — store errors are not displayed on this screen.
- **Pull-to-refresh:** `RefreshControl` on the `ScrollView` calls `reload`; its `refreshing` prop is hard-coded to `false`.

## Interactions

- **Period navigation:** prev/next month chevrons change `budgetStore.currentYear/currentMonth`.
- **Balance visibility:** eye button on the balance card (see above).
- **FAB:** navigates into the Transactions tab at `AddEditTransaction` with empty params.
- **Category row:** read-only display (icon, progress bar, percentage, actual vs budgeted).

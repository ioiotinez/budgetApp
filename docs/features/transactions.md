# Transactions

CRUD for individual financial transactions (income/expense). Browse by month, search, filter by category, create, edit and delete.

## Key files

- `src/screens/TransactionsScreen.tsx`
- `src/screens/AddEditTransactionScreen.tsx`
- `src/db/transactionService.ts`
- `src/store/transactionStore.ts`
- `src/components/ErrorBanner.tsx`

## List screen

Layout, top to bottom:

1. **Period header** — prev/next chevrons from `usePeriodNavigation` and the formatted month. The period lives in `budgetStore` and is shared with the Dashboard and Reports; changing it reloads the month.
2. **Error banner** — `ErrorBanner` with `transactionStore.error` when a fetch fails.
3. **Search bar** — placeholder "Buscar descripción o categoría...".
4. **Category chips** — a horizontally scrollable "Todos" chip plus one per category (with its emoji). Selecting a chip applies the filter; tapping it again deselects and returns to all categories. A "Tarjeta" chip filters expenses paid with credit card (`paymentMethod: 'credit'`).
5. **Transaction list** — rows separated by `Divider`s, ordered by `date DESC, createdAt DESC`.

Each row shows the category icon and name, the description (if any), the formatted date, the signed amount (green for income, red for expense, indigo for credit card) and a trash icon. Credit card rows also show a `💳 Tarjeta` label. Tapping a row opens `AddEditTransaction` with `{ transactionId }`.

## Filtering

Two different mechanisms:

- **Category** — sent to SQL via `loadTransactions({ year, month, categoryId })`, so only matching rows are fetched for the month.
- **Payment method** — the "Tarjeta" chip toggles `paymentMethod: 'credit'` in the same query; credit card expenses never enter budget totals (see `credit-card.md`).
- **Search** — applied client-side in a memo: case-insensitive match on `description` or `category_name` of the already loaded rows.

`transactionStore.setFilters` exists but no screen calls it; the list screen always passes explicit `{ year, month, categoryId }`.

## States

- **Empty:** alert icon + "No hay movimientos para este filtro." — same message when the month has no transactions at all.
- **Error:** `ErrorBanner` shown above the list.
- **Loading:** `isLoading` is tracked but the screen renders no spinner.

## Delete

Trash icon → `Dialog` with "¿Estás seguro de que deseas eliminar esta transacción?" → `removeTransaction(id)`. There is no swipe-to-delete.

## Add / edit form

`AddEditTransactionScreen` fields:

- **Type** segmented buttons (Gasto / Ingreso); switching resets the selected category.
- **Amount** (`decimal-pad`, `$` affix, comma accepted).
- **Date** — plain `TextInput` labeled "Fecha (YYYY-MM-DD) *", defaulting to `todayISO()` (no native date picker).
- **Description** — optional multiline input.
- **Payment method** — only for expenses: `SegmentedButtons` Efectivo / Débito / Tarjeta, stored in `payment_method`. "Tarjeta" is excluded from budget totals (see `credit-card.md`).
- **Category** — emoji grid filtered to the selected type.
- **Save** — "Registrar transacción" when creating, "Guardar cambios" when editing.

Editing prefills the form from the transaction with that id in the store's loaded list (once, on mount / id change).

Validation blocks the save when the amount is missing, non-numeric or `<= 0`, when no category is selected, or when the date is empty. After a successful save the fields reset and the screen calls `goBack()` (falling back to `navigate('TransactionList')`).

## Data flow and refreshes

Screen → store action → `transactionService` → SQLite → store update → re-render.

- `TransactionsScreen` reloads on mount, when the period or category filter changes, and on `navigation.addListener('focus', reload)`.
- `addTransaction` inserts and reloads transactions and month totals for the **saved transaction's** `{ year, month }`.
- `editTransaction` / `removeTransaction` call `loadTransactions()` without arguments, so they fetch unfiltered data; coming back from the edit form triggers the screen's focus reload, which restores the month/category view (an in-place delete shows the unfiltered list until the next reload).
- `loadMonthTotals` feeds the Dashboard summary cards and Reports. `getMonthTotals` returns `{ income, expense, credit }`; credit card expenses are reported in `credit` and never added to `expense`.

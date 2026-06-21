# Transactions

CRUD for individual financial transactions (income/expense). Browse, search, filter, create, edit, and delete.

## Key files

- `src/screens/TransactionsScreen.tsx`
- `src/screens/AddEditTransactionScreen.tsx`
- `src/db/transactionService.ts`
- `src/store/transactionStore.ts`

## Data flow

Screen → Store action → `transactionService` → SQLite → Store update → Re-render. Reloads on screen focus via `navigation.addListener('focus', reload)`.

## States

- **Loading:** `ActivityIndicator` overlay.
- **Empty:** Icon + message ("Todavía no hay movimientos").
- **Error:** `ErrorBanner` component shown on DB failure; dismissable.
- **Filtered empty:** Different message when filters produce no results.
- **Form validation:** Amount must be positive, category required, date required.

## Interactions

- **Search bar:** Filters by description or category name locally (client-side).
- **Category chips:** Horizontal scrollable filter chips; select/deselect.
- **Transaction row:** Tap to edit → navigates to `AddEditTransaction` with `transactionId`.
- **Delete:** Swipe/icon tap → confirmation dialog → remove.
- **Form:** Income/Expense toggle, amount input, date picker, multiline description, emoji category grid.
- **Save:** Navigates back via `goBack()` (falls back to `TransactionList`).

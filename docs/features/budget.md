# Budget

Monthly budget configuration per category. Set expected income and expense targets, edit amounts inline, copy the previous month's figures, and remove categories from a given month.

## Key files

- `src/screens/BudgetScreen.tsx`
- `src/db/budgetService.ts`
- `src/store/budgetStore.ts`

## Data flow

Screen → Budget store → `budgetService` → SQLite → store update → re-render. `BudgetScreen` receives `{ year, month }` from navigation and, on focus, calls `setCurrentPeriod(year, month)`, `loadBudgets` and `loadDeviations`.

## What a budget row is

`getAllCategoriesWithBudget` LEFT JOINs `categories` with `monthly_budgets`, so every category is listed for the month even when no budget row exists (amount `0`). Rows carry the joined `name`, `type`, `icon` and `color`, and are ordered by type then name. The list is therefore empty only when there are no categories at all.

## Month initialization

`checkAndInitCurrentMonth` runs on every Dashboard reload (not only at app start) and operates on the store's current period, so paging the Dashboard to another month initializes that month as well:

1. `isMonthInitialized` — does any `monthly_budgets` row exist for the period?
2. If not, `initMonthFromPrevious` copies rows from the previous month.
3. When the previous month has no rows, that function falls back to `initMonthFromTemplate`, which inserts a `0`-amount row for every category (`INSERT OR IGNORE`, so existing rows are kept).

`budget_templates` and `categoryStore.loadTemplate` / `updateTemplateAmount` exist, but no screen edits template amounts yet — the template step seeds zeros, not stored template values.

## States

- **Loading:** full-screen `ActivityIndicator` while `isLoading` is true or while copying ("Copiando presupuesto...").
- **Empty:** guidance card ("Sin presupuesto configurado") with a "Copiar del mes anterior" button; shown when there are no categories.
- **Populated:** two sections — "Ingresos esperados" (green total) and "Gastos presupuestados" (red total) — each a `Surface` card of rows with a per-section total in the header.

## Interactions

- **Inline editing:** tap the amount → `TextInput` appears with a checkmark button. When both separators are present, dots are treated as thousands separators and the comma as the decimal separator (`1.234,56` → `1234.56`); negative or non-numeric values raise an `Alert` and cancel the edit.
- **Remove category:** `close` icon on the row → `Alert` confirmation → `removeCategoryFromBudget` deletes the month's row for that category.
- **Copy from previous month:** button in the empty state and below the populated list → `Alert` confirmation naming the source month → `initFromPreviousMonth`.
- **Header:** title, current month label and a `close` icon that calls `goBack()`.
- **Keyboard:** `KeyboardAvoidingView` on iOS; the screen scrolls.

## Optimistic updates

`setBudgetAmount` patches the matching row in local state immediately, persists the amount, then reloads budgets and deviations. `removeCategory` filters the row out locally, deletes it, then reloads. On failure both log the error and reload from the database, so the UI falls back to persisted data rather than showing an unsaved value.

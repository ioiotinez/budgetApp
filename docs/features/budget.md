# Budget

Monthly budget configuration per category. Set expected income and expense targets, copy from previous month, and remove categories from the budget.

## Key files

- `src/screens/BudgetScreen.tsx`
- `src/db/budgetService.ts`
- `src/store/budgetStore.ts`

## Data flow

Screen → Budget store → `budgetService` → SQLite → Store update → Re-render.

## Month initialization

On app start, `checkAndInitCurrentMonth` runs:
1. Check if current month is initialized (`isMonthInitialized`).
2. If not, try `initMonthFromPrevious` (copy previous month's budgets).
3. If no previous data, `initMonthFromTemplate` (seed 0 amounts from template).
4. Template amounts are configured per category in `CategoriesScreen`.

## States

- **Loading:** `ActivityIndicator` overlay (also shown during "copy from previous").
- **Empty (uninitialized):** Guidance text + "Copy from previous month" button.
- **Populated:** Two `Surface` cards — "Ingresos esperados" and "Gastos presupuestados" — with editable rows.

## Interactions

- **Inline editing:** Tap an amount → `TextInput` appears → checkmark saves.
- **Remove category:** Trash icon → confirmation dialog.
- **Copy from previous month:** Button in empty state and at bottom of list.
- **Totals:** Calculated per section and displayed.
- **Keyboard:** `KeyboardAvoidingView` for iOS.

## Optimistic updates

`setBudgetAmount` and `removeCategory` update local state immediately, persist to DB, and roll back on error.

# Credit Card Expenses

Expenses paid with a credit card are recorded like any other transaction, but they are **kept out of
the monthly budget and the balance**. They accumulate in their own dashboard block, which warns when
the configured monthly limit is approached (80 %) or exceeded (>100 %).

## Key files

- `src/components/CreditCardSummaryCard.tsx`
- `src/screens/AddEditTransactionScreen.tsx` (payment method selector)
- `src/screens/TransactionsScreen.tsx` (badge and filter)
- `src/db/transactionService.ts` (`getCreditCardTotals`, credit filters in aggregates)
- `src/store/transactionStore.ts` (`creditCardTotals`, `loadCreditCardTotals`)
- `src/store/settingsStore.ts` (`creditCardLimit`)

## Data model

`transactions.payment_method` is `'cash' | 'debit' | 'credit'` (`PaymentMethod` in
`src/types/index.ts`), `NOT NULL DEFAULT 'cash'` with a `CHECK` in the fresh schema.

- Income is always stored as `cash`; the selector only appears for expenses.
- `getMonthTotals` returns `{ income, expense, credit }`: `expense` sums only non-credit rows, while
  `credit` sums the credit-card expenses of the same month.
- Every budget aggregate ignores credit: `getMonthExpenseByCategory`, `getDeviations`,
  `getGlobalDeviations`, `getYearTotals` and `useMonthlyReport`'s category breakdown.

## Migration

`migrateSchema()` in `src/db/database.ts` runs after the DDL and before seeding. It reads
`PRAGMA table_info(transactions)` and adds the column only when missing, then creates
`idx_transactions_payment_method`. Existing installs keep their data; no `budget.db` deletion is
needed. The web mock normalizes stored transactions with `payment_method: 'cash'` when the field is
absent.

## Capture

In `AddEditTransactionScreen`, expense transactions show a `SegmentedButtons` control:
**Efectivo / Débito / Tarjeta**. Selecting "Tarjeta" displays the note "Los gastos con tarjeta no
descuentan del presupuesto mensual." The value is prefilled when editing and reset to `cash` after
each save.

## List

`TransactionsScreen` shows a `💳 Tarjeta` label next to the date and paints the amount with
`creditCardColor` (indigo `#818cf8`) instead of the expense rose. The "Tarjeta" chip filters through
SQL with `loadTransactions({ …, paymentMethod: 'credit' })`.

## Dashboard block

`CreditCardSummaryCard` is rendered when there is credit spending in the month or a limit is
configured. It shows:

- Total spent (respects the `amountsVisible` privacy toggle via `formatAmount`).
- Status chip and progress bar against `creditCardLimit`: green (`creditCardColor`) below 80 %,
  amber 80–100 %, red above 100 %.
- "Sin límite configurado · Ajustes → Límite de tarjeta" when the limit is 0.
- Per-category breakdown sorted by amount descending.

## Limit setting

`settingsStore.creditCardLimit` is persisted in the `settings` table under `credit_card_limit`;
`0` means "no limit". Settings → **TARJETA DE CRÉDITO** exposes a numeric field that saves on blur or
submit. The alert is advisory: nothing is blocked.

## Backup

`BackupData.version` is now `2`; transactions carry `payment_method`. Restore defaults missing values
to `'cash'`, so version-1 backups import unchanged.

## Limitations

- One implicit card: no card entities, closing/due dates, installments or pending debt tracking.
- Recurring rules always generate `cash` transactions; credit card support is out of scope.
- Credit spending never reaches the balance, so paying the card statement later does not affect the
  month in which the money actually leaves the account.

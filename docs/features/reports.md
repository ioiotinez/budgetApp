# Reports

Monthly and annual financial reports with a category breakdown, a 12-month table and a 6-month forward projection. A `SegmentedButtons` control switches between **Mensual** and **Anual**.

## Key files

- `src/screens/ReportsScreen.tsx`
- `src/hooks/useMonthlyReport.ts`
- `src/hooks/useAnnualReport.ts`
- `src/db/transactionService.ts`
- `src/store/budgetStore.ts`

## Monthly view

- Period navigation (prev/next month) changes `budgetStore.currentYear/currentMonth`.
- Three stat cards: Ingresos, Gastos and Balance (green when `>= 0`, red otherwise).
- A "💳 Tarjeta de crédito — fuera del presupuesto" row when `monthTotals.credit > 0`; credit card expenses are excluded from Gastos, from the balance and from the category breakdown.
- "Detalle por categoría" — rendered only when there are expenses. Expense-only (credit card excluded), aggregated per category, sorted by amount descending: colored dot, category name, amount and percentage of **total expenses** (rounded).

## Annual view

- Year navigation with prev/next chevrons; it changes only the year and keeps the current month in the shared period.
- Three annual stat cards: total income, total expenses and balance.
- A "💳 Tarjeta de crédito (año)" row when the year has credit spending; `getYearTotals` keeps `credit` per month outside `expense` and out of the projection.
- "Detalle por mes" — always 12 rows from `getYearTotals(year)` (month abbreviation, income, expense, balance), zero-filled for months without transactions.
- **Proyección** — rendered only when at least one month in the year has data (see below).

## Data flow

- `useFocusEffect` loads categories, transactions for the current month and month totals, so the monthly view always reflects the selected period.
- A separate effect calls `getYearTotals(currentYear)` whenever the year changes; the annual view and projection are derived from that array by `useAnnualReport`, not from the monthly transaction store.
- `useMonthlyReport` derives totals from `transactionStore.monthTotals` and builds `expenseByCategory` from the loaded transactions plus `categoryStore.categories`.

## States

- **Empty month:** category breakdown hidden (`expenseByCategory.length === 0`); stat cards show `$0`.
- **Empty year:** 12 zeroed rows; the projection section is hidden because `monthsWithData` is empty.
- **Partial year:** totals include only the months with rows; projection averages over months that have income or expense greater than zero.
- No dedicated loading indicator is rendered.

## Projection logic

`useAnnualReport` averages the year totals over months with data:

- `avgIncome = totalIncome / monthsWithData`, same for expenses and balance; values are rounded.
- The "Promedio (N meses)" row shows those averages.
- Six rows are generated for the months **following the device's current month**, using the device's current year (`new Date()`), regardless of which year is being viewed. Months roll over into the next year after December.
- When no month has data, `projection` is `null` and the section is not rendered.

## How amounts are formatted

All figures use `formatCurrency` (`es-AR` / ARS, no decimals unless present), independent of the Dashboard's privacy toggle — reports always show amounts.

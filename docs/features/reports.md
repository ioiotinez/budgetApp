# Reports

Monthly and annual financial reports with category breakdowns and forward projections.

## Key files

- `src/screens/ReportsScreen.tsx`
- `src/hooks/useMonthlyReport.ts`
- `src/hooks/useAnnualReport.ts`
- `src/db/transactionService.ts`

## Views

### Monthly

- Period navigation (prev/next month).
- Three stat cards: Income, Expenses, Balance.
- Category breakdown table: colored dot, name, amount, percentage of total.

### Annual

- Year navigation.
- Three annual stat cards: total income, expenses, balance.
- Monthly breakdown table: 12 rows with month name, income, expense, balance.
- **Projection:** Averages from months with data → 6-month forward projection of income, expenses, and balance.

## Data flow

`useFocusEffect` triggers `loadCategories`, `loadTransactions`, `loadMonthTotals`. Annual totals via `getYearTotals` service.

## States

- **Loading:** `ActivityIndicator` while fetching.
- **Empty month (no data):** Category breakdown shows nothing; totals are $0.
- **Empty year (no data):** Monthly breakdown shows 12 zeroed rows; projection shows $0.
- **Partial year:** Projection averages from available months only.

## Projection logic

Simple averages of months with data (ignores months with $0). Computes 6 forward months: `monthlyAverage * 6`.

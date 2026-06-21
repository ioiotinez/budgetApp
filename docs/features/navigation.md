# Navigation

React Navigation v7 with bottom tabs and nested stacks.

## Structure

```
RootTabNavigator
├── Dashboard (tab, screen)
├── Transactions (tab, nested stack)
│   ├── TransactionList
│   └── AddEditTransaction
├── Reports (tab, screen)
└── Settings (tab, nested stack)
    ├── SettingsHome
    ├── Categories
    └── BudgetSetup
```

## Key file

`src/navigation/AppNavigator.tsx`

## Tab icons

Emoji-based (hardcoded): Dashboard = 🏠, Transactions = 💸, Reports = 📊, Settings = ⚙️.

## Navigation params

| Screen             | Params                          |
| ------------------ | ------------------------------- |
| `AddEditTransaction` | `{ transactionId?: string }`  |
| `BudgetSetup`        | `{ year: number, month: number }` |

## Routing patterns

- `Dashboard` reloads via `useFocusEffect`.
- `TransactionsScreen` reloads via `navigation.addListener('focus', reload)`.
- `ReportsScreen` reloads via `useFocusEffect`.
- `AddEditTransaction` calls `goBack()` on save (falls back to `navigate('TransactionList')`).
- Emoji tab icons mapped via route name in `AppNavigator.tsx`.

# Navigation

React Navigation v7 with a bottom tab navigator and two nested native stacks.

## Structure

```
RootTabNavigator
├── Dashboard (tab → screen)
├── Transactions (tab → nested stack, initial: TransactionList)
│   ├── TransactionList
│   └── AddEditTransaction
├── Reports (tab → screen)
└── Settings (tab → nested stack, initial: SettingsHome)
    ├── SettingsHome
    ├── Categories
    ├── BudgetSetup
    ├── RecurringRules
    └── AddEditRecurring
```

## Key file

`src/navigation/AppNavigator.tsx`

## Tabs

| Route          | Label        | Icon | Component               |
| -------------- | ------------ | ---- | ----------------------- |
| `Dashboard`    | Inicio       | 🏠   | `DashboardScreen`       |
| `Transactions` | Movimientos  | 💸   | `TransactionsNavigator` |
| `Reports`      | Reportes     | 📊   | `ReportsScreen`         |
| `Settings`     | Config       | ⚙️   | `SettingsNavigator`     |

- Emoji icons are hardcoded by route name (`TabIcon` scales the emoji when focused).
- Header is hidden on the tab navigator; each stack renders its own header with `theme.colors.surface` background, `onSurface` tint and no shadow.
- Tab bar height is `88` on iOS and `68 + insets.bottom` elsewhere, with safe-area padding.
- Active tint is `primary`, inactive is `onSurfaceVariant`.
- Pressing the Transactions tab prevents the default action and always navigates to `{ screen: 'TransactionList' }`, so it returns to the list instead of a previously open form.

## Screen titles

| Stack screen        | Title                                             |
| ------------------- | ------------------------------------------------- |
| `TransactionList`   | Transacciones                                     |
| `AddEditTransaction`| Editar transacción / Nueva transacción            |
| `SettingsHome`      | Configuración                                     |
| `Categories`        | Categorías                                        |
| `BudgetSetup`       | Presupuesto mensual                               |
| `RecurringRules`    | Transacciones recurrentes                         |
| `AddEditRecurring`  | Editar regla / Nueva regla recurrente             |

The add/edit titles switch on `route.params?.transactionId` and `route.params?.ruleId`.

## Navigation params

| Screen              | Params                         |
| ------------------- | ------------------------------ |
| `AddEditTransaction`| `{ transactionId?: number }`   |
| `BudgetSetup`       | `{ year: number, month: number }` |
| `AddEditRecurring`  | `{ ruleId?: number }`          |

## Routing patterns

- `Dashboard` reloads via `useFocusEffect`; `TransactionsScreen` builds its own reload and subscribes with `navigation.addListener('focus', ...)`; `ReportsScreen`, `CategoriesScreen`, `BudgetScreen` and `RecurringRulesScreen` use `useFocusEffect`.
- `AddEditTransaction` and `AddEditRecurring` call `goBack()` on save, falling back to `navigate('TransactionList')` / `navigate('RecurringRules')` when there is no history.
- The Dashboard FAB jumps across tabs into the Transactions stack: `navigate('Transactions', { screen: 'AddEditTransaction', params: {} })`.
- Settings links pass the current period to `BudgetSetup` and open `RecurringRules`.

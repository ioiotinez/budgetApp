# Settings

App configuration hub: categories, monthly budget, recurring rules, dark mode and local JSON backup/restore.

## Key files

- `src/screens/SettingsScreen.tsx`
- `src/services/backupService.ts`
- `src/store/settingsStore.ts`
- `src/db/schema.ts`

## Sections

The screen is a `ScrollView` of labeled `Surface` cards, in this order:

### PRESUPUESTO

- **Categorías** → `Categories` stack screen.
- **Presupuesto mensual** → `BudgetSetup` with `{ year, month }` taken from the current period; the description shows the formatted month.

### TARJETA DE CRÉDITO

- **Límite mensual** — numeric `TextInput` bound to `settingsStore.creditCardLimit`, persisted under `credit_card_limit` (empty or `0` means "no limit"). It saves on blur/submit and drives the Dashboard alert at 80 % and above 100 %.
- Credit card expenses never consume the monthly budget; see `credit-card.md`.

### TRANSACCIONES RECURRENTES

- **Reglas recurrentes** → `RecurringRules` (rule CRUD and pending confirmations; see `recurring.md`).

### APARIENCIA

- Dark mode `Switch` bound to `settingsStore.darkMode`; `toggleDarkMode()` persists `dark_mode` to the `settings` table. `App.tsx` loads settings at startup and picks `AppDarkTheme` / `AppLightTheme`.
- `loadSettings()` also runs when this screen mounts.

### RESPALDO LOCAL (JSON)

- **Exportar JSON** — `collectAllData()` gathers every table, writes `budgetapp_backup_YYYY-MM-DD.json` in the document directory and opens the share sheet via `expo-sharing`; on web it triggers a browser download instead.
- **Importar JSON** — `pickLocalBackup()` opens `expo-document-picker` for `application/json`, parses it and shows an `Alert` with **Reemplazar**, **Fusionar** or **Cancelar**:
  - Replace wipes transactions, monthly budgets, templates, recurring rules and categories first.
  - Merge inserts/replaces by id without deleting local data.
  - Both run inside an explicit transaction (`BEGIN` / `COMMIT`, `ROLLBACK` on error).
- List items are disabled while an import/export is in flight.

## Amount visibility

The Dashboard amount privacy (`amounts_visible` setting) is also persisted by `settingsStore` via `toggleAmountsVisibility()`, but it is toggled from the eye button on the Dashboard balance card, not from Settings.

## Backup data structure

`BackupData` in `src/types/index.ts`: `version` (`2`), `exportedAt`, `categories`, `templates`, `budgets`, `transactions` (including `payment_method`), `recurringRules` and `settings` (both optional for older files). Restore reads the same shapes, including the `recurring_rules` table, and defaults a missing `payment_method` to `'cash'`, so version-1 backups still import.

## States

- **Normal:** list-based UI with `List.Item` rows and emoji icons.
- **Import dialog:** platform `Alert` (not a Portal dialog) with the three choices.
- **Busy:** export/import rows disabled; errors are shown with `Alert.alert('Error', ...)` and success with a confirmation alert.

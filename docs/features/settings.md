# Settings

App configuration hub: category management, budget setup, dark mode, and backup/restore.

## Key files

- `src/screens/SettingsScreen.tsx`
- `src/services/backupService.ts`
- `src/store/settingsStore.ts`

## Sections

### Budget

Links to `CategoriesScreen` and `BudgetSetup` (pre-filled with current month).

### Appearance

Dark mode toggle (`Switch` component). Persisted to `settings` table via `settingsStore.toggleDarkMode()`.

### Backup

- **Export JSON:** Collects all data (`collectAllData`), writes to filesystem, opens share sheet via `expo-sharing`. On web, triggers a download.
- **Import JSON:** Opens document picker (`expo-document-picker`), parses JSON, prompts user to **Replace** (wipe + insert) or **Merge** (`INSERT OR REPLACE`).

## Backup data structure

See `BackupData` type in `src/types/index.ts`: `version`, `exportedAt`, `categories`, `templates`, `budgets`, `transactions`, `settings`.

## States

- **Normal:** List-based UI with `List.Item` components and emoji icons.
- **Import dialog:** Portal-based confirmation with Replace / Merge options.
- **Loading during import:** Transactional restore with rollback on failure.

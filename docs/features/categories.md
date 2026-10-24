# Categories

CRUD management of income/expense categories. Each category has a name, type (`income` / `expense`), emoji icon and hex color.

## Key files

- `src/screens/CategoriesScreen.tsx`
- `src/db/categoryService.ts`
- `src/store/categoryStore.ts`

## Data model

| Field       | Type                    |
| ----------- | ----------------------- |
| `id`        | `number`                |
| `name`      | `string`                |
| `type`      | `'income' \| 'expense'` |
| `icon`      | `string` (emoji)        |
| `color`     | `string` (hex, e.g. `#22c55e`) |
| `createdAt` | `string` (ISO timestamp) |

## Seed data

15 default categories on first launch (4 income, 11 expense), defined in `DEFAULT_CATEGORIES` in `src/db/schema.ts`. The list is ordered by type then name, so expenses appear first.

## States

- **Populated:** `FlatList` of rows with emoji, name, type chip (colored with the category color) and pencil/trash actions.
- **Empty:** no dedicated empty component — the list simply renders nothing (only possible if every category was deleted).
- **Loading:** `categoryStore.isLoading` exists but the screen renders no spinner.

## Interactions

- **Add:** FAB → dialog with empty defaults (name empty, type `expense`, icon `💰`, color `#14b8a6`).
- **Edit:** pencil icon → same dialog prefilled from the row.
- **Dialog fields:** name `TextInput`, type `SegmentedButtons` (Gasto / Ingreso), icon grid (16 emojis) and color grid (12 colors). Saving requires a non-empty trimmed name.
- **Delete:** trash icon → confirmation dialog that warns budgets and movements will be removed too → `removeCategory`.
- **Refresh:** the screen reloads categories on focus via `useFocusEffect`.

## Store refreshes

`addCategory` refreshes categories **and** the budget template; `removeCategory` does the same. `editCategory` refreshes categories only. `updateTemplateAmount` (upsert into `budget_templates`) and `loadTemplate` exist in the store but no screen calls them yet.

## Cascade deletion

Category foreign keys use `ON DELETE CASCADE`, so deleting a category also removes its `budget_templates`, `monthly_budgets`, `transactions` and `recurring_rules` rows.

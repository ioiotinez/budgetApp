# Categories

CRUD management of income/expense categories. Each category has a name, type (`income` / `expense`), emoji icon, and hex color.

## Key files

- `src/screens/CategoriesScreen.tsx`
- `src/db/categoryService.ts`
- `src/store/categoryStore.ts`

## Data models

| Field      | Type                          |
| ---------- | ----------------------------- |
| `name`     | `string`                      |
| `type`     | `'income' \| 'expense'`       |
| `icon`     | `string` (emoji)              |
| `color`    | `string` (hex, e.g. `#22c55e`) |

## Seed data

15 default categories on first launch (4 income, 11 expense). See `src/db/schema.ts`.

## States

- **Loading:** `ActivityIndicator` overlay.
- **Empty:** No categories exist (unlikely after seeding).
- **Populated:** FlatList with emoji, name, type chip per row.

## Interactions

- **Edit:** Pencil icon → Portal dialog with name, type toggle, icon grid (16 emojis), color grid (12 colors).
- **Delete:** Trash icon → confirmation dialog (warns about cascade deletion of related transactions/budgets).
- **Add:** FAB → same dialog as edit (empty fields).
- **Auto-refresh:** `addCategory` / `editCategory` / `removeCategory` refresh both categories and template store.

## Cascade deletion

Foreign keys with `ON DELETE CASCADE` — deleting a category removes all associated budgets, template entries, and transactions.

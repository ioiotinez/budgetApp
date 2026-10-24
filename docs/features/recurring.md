# Recurring Transactions

Rules for transactions that repeat (rent, salary, subscriptions). A rule never writes to the ledger on its own: it produces **pending** items that you confirm (creates a transaction) or skip on the Dashboard.

## Key files

- `src/screens/RecurringRulesScreen.tsx`
- `src/screens/AddEditRecurringScreen.tsx`
- `src/components/PendingRecurringBanner.tsx`
- `src/store/recurringStore.ts`
- `src/db/recurringService.ts`
- `src/hooks/usePendingRecurring.ts`

## Data model

`RecurringRule` (`src/types/index.ts`), table `recurring_rules`:

| Field                 | Type                                          |
| --------------------- | --------------------------------------------- |
| `amount`              | `number`                                      |
| `type`                | `'income' \| 'expense'`                       |
| `category_id`         | `number` (FK, `ON DELETE CASCADE`)            |
| `description`         | `string` (defaults to `''`)                   |
| `frequency`           | `'weekly' \| 'biweekly' \| 'monthly' \| 'yearly'` |
| `start_date`          | `string` (`YYYY-MM-DD`)                       |
| `end_date`            | `string?` (`YYYY-MM-DD`)                      |
| `last_generated_date` | `string?` — cursor of the last confirmed/skipped occurrence |
| `active`              | `boolean` (`INTEGER 0/1` in SQLite)           |
| `createdAt`           | `string` (ISO timestamp)                      |

Queries join `categories` and expose `category_name`, `category_icon`, `category_color`, `category_type`.

## Rule list

`RecurringRulesScreen` loads all rules on focus (`loadRules`) and renders a `FlatList` ordered by `createdAt DESC`:

- Category icon + name, description (falls back to the frequency label when empty), a frequency tag, and an "Inactiva" tag for paused rules.
- Signed amount, green for income and red for expense.
- Pencil icon → `AddEditRecurring` with `{ ruleId }`; trash icon → confirmation dialog. Deleting a rule does not touch transactions it already generated.
- FAB → `AddEditRecurring` with empty params.
- Empty state: 🔄 icon, "No tenés transacciones recurrentes configuradas." and a hint to use the + button.

## Add / edit form

`AddEditRecurringScreen` fields:

- **Type** segmented buttons (Gasto / Ingreso); switching resets the selected category.
- **Amount** (`decimal-pad`, comma accepted, must be > 0).
- **Frequency** segmented buttons: `weekly`, `biweekly`, `monthly`, `yearly`.
- **Description** (optional, multiline).
- **Start date** and **End date** as plain `TextInput`s in `YYYY-MM-DD` format (default start = `todayISO()`).
- **Active** switch — paused rules are excluded from pending detection.
- **Category** grid, filtered to categories matching the selected type.

Validation: amount positive, category selected, start date present, and `end_date` must not be earlier than `start_date`. Saving calls `addRule` or `editRule`, then `goBack()` (falls back to `navigate('RecurringRules')`). The edit payload sends `last_generated_date: undefined`, and the service ignores `undefined` fields, so editing a rule **preserves** its cursor.

## Pending detection

`getPendingRecurring(rules, year, month)` is a pure function over rules already loaded from the DB:

1. Skip rules with `active = 0`.
2. Skip rules whose `end_date` is before the first day of the requested month.
3. Compute the **next due date**: start from `last_generated_date` (or `start_date` if the cursor is missing/earlier), then add one period — 7 days for `weekly`, 14 days for `biweekly`, one month for `monthly`, one year for `yearly`.
4. If that date is still before the first of the month, fast-forward whole periods until it lands in the future (monthly/yearly catch-up counts periods using 30/365-day approximations).
5. Emit a pending item only when the due date falls inside the requested month and is later than `last_generated_date`.

Items are sorted by `dueDate`. Because only the next occurrence is computed per rule, at most one item per rule is returned per call; weekly/biweekly rules can produce several occurrences in a month, and each one appears after the cursor advances and pending is recomputed.

`usePendingRecurring(year, month)` wraps `loadPending` for components (the Dashboard calls `loadPending` directly).

## Confirm vs skip

`PendingRecurringBanner` renders on the Dashboard only when `pending` is non-empty. Each row shows category, signed amount, description and due date, with two actions:

- **Confirmar** — opens a Portal `Dialog` with category, amount, description and date. "Confirmar y guardar" calls `confirmPending`, which:
  1. `createTransaction({ amount, type, category_id, date: dueDate, description })`.
  2. `updateRecurringRule(rule.id, { last_generated_date: dueDate })`.
  3. Removes the item from the in-memory `pending` list.
  The Dashboard's `onConfirm` callback then reloads its data.
- **Saltar** — `skipPending` only moves the cursor (`last_generated_date = dueDate`) and drops the item; no transaction is created.

Buttons are disabled per row while their request is in flight. Confirming also triggers the Dashboard reload, which recomputes pending, so another occurrence in the same month can appear immediately; skipping only drops the item from local state, so pending is recomputed on the next Dashboard reload.

## `last_generated_date`

The cursor is the single source of truth for de-duplication:

- `null` → the next occurrence is one period after `start_date`.
- Set by `confirmPending` and `skipPending` to the due date that was handled.
- Never set by rule creation or editing; the form always submits it as `undefined` for new rules.
- It only moves forward through confirm/skip — there is no background generator or scheduled job.

## Store actions

`useRecurringStore` (`src/store/recurringStore.ts`):

| Action                          | Effect                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| `loadRules()`                   | Fetch every rule (active and paused).                        |
| `loadPending(year, month)`      | Fetch active rules and compute pending items for the month.  |
| `addRule(data)`                 | Insert, then reload rules.                                   |
| `editRule(id, data)`            | Partial update, then reload rules.                           |
| `removeRule(id)`                | Delete, then reload rules.                                   |
| `confirmPending(pending)`       | Create transaction, advance cursor, drop item from state.    |
| `skipPending(pending)`          | Advance cursor, drop item from state.                        |

Errors are surfaced through `error`, and DB failures throw `DatabaseError`.

## Where it lives in the app

- Settings → **Reglas recurrentes** (`RecurringRules`) opens the list; `AddEditRecurring` is the sibling stack screen.
- Suspended rules are backed up too: `BackupData.recurringRules` and the `recurring_rules` table (see `src/db/schema.ts`).

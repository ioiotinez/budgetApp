# Plan — Gastos con tarjeta de crédito fuera del presupuesto

Rama: `feature/nueva-funcionalidad` (base `develop` = `b8c606e`)
Estado: **implementado** — ver `docs/features/credit-card.md`

## Objetivo

Registrar gastos pagados con tarjeta de crédito que **no afecten el presupuesto mensual ni el
balance**, pero que se acumulen y generen una **alerta contra un límite mensual configurable**.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Modelo | Campo `payment_method` en `transactions`: `'cash' | 'debit' | 'credit'` (default `'cash'`) |
| Alerta | Límite mensual configurable en Ajustes; aviso al 80 % (warning) y al >100 % (over) |
| Balance | El total de tarjeta **no** entra en ingresos − gastos ni en desviaciones de presupuesto |
| Alcance v1 | Sin tabla de tarjetas, cuotas, cierre/vencimiento ni deuda acumulada; sin tarjeta en reglas recurrentes |

## Modelo de datos

```sql
-- CREATE TABLE transactions (nuevo, en schema.ts)
payment_method TEXT NOT NULL DEFAULT 'cash'
  CHECK(payment_method IN ('cash','debit','credit'))

CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
```

`ALTER TABLE ... ADD COLUMN` en SQLite no acepta `UNIQUE`/`PRIMARY KEY`; el `CHECK` se omite en la
migración y se valida en la capa de servicio para no fallar con filas existentes.

### Migración (`src/db/database.ts`)

`CREATE TABLE IF NOT EXISTS` no agrega columnas a una DB ya creada, y hoy no hay sistema de
migraciones: sin este paso cada usuario tendría que borrar `budget.db`.

```ts
async function migrate(db) {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transactions)');
  if (!cols.some(c => c.name === 'payment_method')) {
    await db.execAsync("ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'");
  }
}
```

Se llama en `getDb()` después de `execAsync(CREATE_TABLES_SQL)` y antes del seed. Es idempotente.

## Consultas afectadas

| Archivo / función | Cambio |
|---|---|
| `transactionService.getMonthTotals` | Excluir `credit` de `expense`; devolver además `credit` |
| `transactionService.getMonthExpenseByCategory` | `AND payment_method <> 'credit'` |
| `transactionService.getYearTotals` | Excluir `credit` del gasto; agregar `credit` por mes |
| `transactionService.getTransactions` | Nuevo filtro opcional `paymentMethod` |
| `transactionService` (**nuevo**) | `getCreditCardTotals(year, month)` → `{ total, byCategory }` |
| `budgetService.getDeviations` | `LEFT JOIN transactions ... AND t.payment_method <> 'credit'` |
| `budgetService.getGlobalDeviations` | `WHERE date LIKE ? AND payment_method <> 'credit'` |
| `backupService.collectAllData` / `restoreFromBackup` | Exportar/restaurar `payment_method`, default `'cash'` |

`getTransactions` sin filtro sigue devolviendo todas: la lista muestra los gastos de tarjeta.

## Tipos (`src/types/index.ts`)

```ts
export type PaymentMethod = 'cash' | 'debit' | 'credit';
// Transaction.payment_method: PaymentMethod
// MonthTotals { income; expense; credit }
// CreditCardTotals { total: number; byCategory: Array<{ category: Category; total: number }> }
// BackupData.version = 2  (import tolerante: campo ausente ⇒ 'cash')
```

## Stores

- `transactionStore`: `monthTotals` pasa a `{ income, expense, credit }`; `loadCreditTotals(year, month)`;
  `addTransaction` sigue recargando el período de la fecha.
- `settingsStore`: `creditCardLimit: number`, `setCreditCardLimit(limit)`, clave `credit_card_limit`.

## UI

| Pantalla / componente | Cambio |
|---|---|
| `AddEditTransactionScreen` | Si `type === 'expense'`: SegmentedButtons "Efectivo / Débito / Tarjeta"; prefill al editar; persistir `payment_method` |
| `TransactionsScreen` | Badge 💳 + label "Tarjeta" en la fila; chip de filtro "Tarjeta" |
| `DashboardScreen` | Bloque nuevo de tarjeta: total del mes, límite, barra de progreso y alerta 80 %/100 %. Respeta `amountsVisible` |
| `components/CreditCardSummaryCard.tsx` | **Nuevo** componente del bloque anterior |
| `ReportsScreen` + `useMonthlyReport` | El gasto y la torta excluyen `credit`; línea informativa "Gastos con tarjeta (fuera de presupuesto)" |
| `SettingsScreen` | Campo "Límite mensual de tarjeta" (numérico, opcional) |

Sin colores hardcodeados: `useTheme()` y `deviationColors` de `src/theme/theme.ts`.

## Riesgos

1. **Mock web** (`database.ts`): parsea `params` por posición y matchea SQL por substring. Agregar
   `payment_method` al final del `INSERT` y al `SELECT` de agregados; sin esto la web rompe.
2. **Presupuesto "no usado"**: si una categoría se paga siempre con tarjeta, su desviación queda en 0 %.
   Mitigación: el bloque de tarjeta muestra el desglose por categoría.
3. **`getGlobalDeviations` percentage**: al excluir `credit`, no cambia la lógica de porcentaje.
4. **Backups v1** importados: sin `payment_method` ⇒ `'cash'`. No romper `restoreFromBackup`.
5. **Reglas recurrentes**: siguen generando transacciones `cash`. Documentar como limitación.

## Fases

- [x] **1. Datos** — `schema.ts`, migración en `database.ts`, mock web, tipos.
- [x] **2. Servicios** — filtros y agregados, `getCreditCardTotals`, backup v2.
- [x] **3. Stores** — `monthTotals.credit`, `loadCreditTotals`, `creditCardLimit`.
- [x] **4. Captura** — toggle de medio de pago en alta/edición + badge y filtro en la lista.
- [x] **5. Alertas** — `CreditCardSummaryCard` en Dashboard + límite en Ajustes.
- [x] **6. Reportes** — excluir tarjeta de mensual/anual y mostrar el total informativo.
- [x] **7. Verificación** — `npx tsc --noEmit`, prueba manual Android y web, backup/restore de ida y vuelta.
- [x] **8. Docs** — `docs/features/credit-card.md`, actualizar `architecture.md`, `AGENTS.md`, `README.md`.

## Criterios de aceptación

1. Un gasto con `payment_method = 'credit'` no modifica `Gastos`, balance ni desviaciones del mes.
2. El total de tarjeta del mes aparece en Dashboard y en Reportes, y respeta el toggle de privacidad.
3. Con límite configurado: 0–79 % sin aviso, 80–100 % warning, >100 % over.
4. La lista muestra el badge de tarjeta y permite filtrar por ese medio.
5. Exportar y restaurar conserva `payment_method`; un backup v1 se importa sin errores.
6. `npx tsc --noEmit` pasa sin errores.

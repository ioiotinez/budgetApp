import { getDb } from './database';
import type { CreditCardTotals, MonthTotals, PaymentMethod, Transaction, TransactionType } from '../types';

export class DatabaseError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = 'DatabaseError';
    }
}

export interface TransactionFilters {
    year?: number;
    month?: number;
    categoryId?: number;
    type?: TransactionType;
    paymentMethod?: PaymentMethod;
}

/** SQL fragment: everything paid with a credit card stays out of the monthly budget. */
const NOT_CREDIT = "t.payment_method <> 'credit'";

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Get transactions with optional filters, joined with category info */
export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
    try {
        const db = await getDb();
        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (filters.year !== undefined && filters.month !== undefined) {
            const monthStr = String(filters.month).padStart(2, '0');
            const prefix = `${filters.year}-${monthStr}`;
            conditions.push("t.date LIKE ?");
            params.push(`${prefix}%`);
        } else if (filters.year !== undefined) {
            conditions.push("t.date LIKE ?");
            params.push(`${filters.year}%`);
        }

        if (filters.categoryId !== undefined) {
            conditions.push('t.category_id = ?');
            params.push(filters.categoryId);
        }

        if (filters.type !== undefined) {
            conditions.push('t.type = ?');
            params.push(filters.type);
        }

        if (filters.paymentMethod !== undefined) {
            conditions.push('t.payment_method = ?');
            params.push(filters.paymentMethod);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        return await db.getAllAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon,
               c.color as category_color, c.type as category_type
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        ${where}
        ORDER BY t.date DESC, t.createdAt DESC
      `, params);
    } catch (error) {
        throw new DatabaseError('Failed to fetch transactions', error as Error);
    }
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
    try {
        const db = await getDb();
        return await db.getFirstAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon,
               c.color as category_color, c.type as category_type
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.id = ?
      `, [id]);
    } catch (error) {
        throw new DatabaseError(`Failed to fetch transaction ${id}`, error as Error);
    }
}

/**
 * Aggregate totals for a given month. Expenses paid with a credit card are
 * returned separately in `credit` and never summed into `expense`.
 */
export async function getMonthTotals(year: number, month: number): Promise<MonthTotals> {
    try {
        const db = await getDb();
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;

        const rows = await db.getAllAsync<{ type: string; is_credit: number; total: number }>(
            `SELECT type,
                    CASE WHEN payment_method = 'credit' THEN 1 ELSE 0 END as is_credit,
                    SUM(amount) as total
             FROM transactions
             WHERE date LIKE ?
             GROUP BY type, is_credit`,
            [`${prefix}%`]
        );

        const total = (type: string, credit: boolean) =>
            rows.find(r => r.type === type && Number(r.is_credit) === (credit ? 1 : 0))?.total ?? 0;

        return {
            income: total('income', false),
            expense: total('expense', false),
            credit: total('expense', true),
        };
    } catch (error) {
        throw new DatabaseError(`Failed to fetch month totals for ${year}-${month}`, error as Error);
    }
}

/** Aggregate expense totals grouped by category for a given month (excludes credit card). */
export async function getMonthExpenseByCategory(
    year: number,
    month: number
): Promise<Array<{ category_id: number; total: number }>> {
    try {
        const db = await getDb();
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;

        return await db.getAllAsync<{ category_id: number; total: number }>(
            `SELECT category_id, SUM(amount) as total
         FROM transactions
         WHERE date LIKE ? AND type = 'expense' AND payment_method <> 'credit'
         GROUP BY category_id`,
            [`${prefix}%`]
        );
    } catch (error) {
        throw new DatabaseError(`Failed to fetch expense by category for ${year}-${month}`, error as Error);
    }
}

/**
 * Credit card spending for a month, grouped by category.
 * Used by the dashboard card and the reports screen only.
 */
export async function getCreditCardTotals(year: number, month: number): Promise<CreditCardTotals> {
    try {
        const db = await getDb();
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;

        const byCategory = await db.getAllAsync<{
            category_id: number; name: string; icon: string; color: string; total: number;
        }>(
            `SELECT c.id as category_id, c.name, c.icon, c.color, SUM(t.amount) as total
             FROM transactions t
             JOIN categories c ON c.id = t.category_id
             WHERE t.date LIKE ? AND t.type = 'expense' AND t.payment_method = 'credit'
             GROUP BY c.id
             ORDER BY total DESC`,
            [`${prefix}%`]
        );

        return {
            total: byCategory.reduce((sum, row) => sum + row.total, 0),
            byCategory,
        };
    } catch (error) {
        throw new DatabaseError(`Failed to fetch credit card totals for ${year}-${month}`, error as Error);
    }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface TransactionInput {
    amount: number;
    type: TransactionType;
    category_id: number;
    date: string;
    description?: string;
    /** Defaults to 'cash' when omitted. */
    payment_method?: PaymentMethod;
}

export async function createTransaction(data: TransactionInput): Promise<number> {
    try {
        const db = await getDb();
        const now = new Date().toISOString();
        const result = await db.runAsync(
            `INSERT INTO transactions (amount, type, category_id, date, description, payment_method, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [data.amount, data.type, data.category_id, data.date, data.description ?? '', data.payment_method ?? 'cash', now]
        );
        return result.lastInsertRowId;
    } catch (error) {
        throw new DatabaseError('Failed to create transaction', error as Error);
    }
}

export async function updateTransaction(
    id: number,
    data: Partial<TransactionInput>
): Promise<void> {
    try {
        const db = await getDb();
        const fields: string[] = [];
        const values: (string | number)[] = [];

        if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount); }
        if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
        if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
        if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
        if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
        if (data.payment_method !== undefined) { fields.push('payment_method = ?'); values.push(data.payment_method); }

        if (fields.length === 0) return;
        values.push(id);

        await db.runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    } catch (error) {
        throw new DatabaseError(`Failed to update transaction ${id}`, error as Error);
    }
}

export async function deleteTransaction(id: number): Promise<void> {
    try {
        const db = await getDb();
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    } catch (error) {
        throw new DatabaseError(`Failed to delete transaction ${id}`, error as Error);
    }
}

export interface YearMonthTotal {
    month: number;
    year: number;
    income: number;
    /** Expenses paid with cash or debit */
    expense: number;
    /** Expenses paid with credit card (outside the budget) */
    credit: number;
}

export async function getYearTotals(year: number): Promise<YearMonthTotal[]> {
    try {
        const db = await getDb();
        const prefix = `${year}`;
        const rows = await db.getAllAsync<{ month: number; type: string; is_credit: number; total: number }>(
            `SELECT CAST(strftime('%m', date) AS INTEGER) as month, type,
                    CASE WHEN payment_method = 'credit' THEN 1 ELSE 0 END as is_credit,
                    SUM(amount) as total
         FROM transactions
         WHERE date LIKE ?
         GROUP BY month, type, is_credit
         ORDER BY month`,
            [`${prefix}%`]
        );

        const result: YearMonthTotal[] = [];
        for (let m = 1; m <= 12; m++) {
            const monthRows = rows.filter(r => Number(r.month) === m);
            const total = (type: string, credit: boolean) =>
                monthRows.find(r => r.type === type && Number(r.is_credit) === (credit ? 1 : 0))?.total ?? 0;

            result.push({
                month: m,
                year,
                income: total('income', false),
                expense: total('expense', false),
                credit: total('expense', true),
            });
        }
        return result;
    } catch (error) {
        throw new DatabaseError(`Failed to fetch year totals for ${year}`, error as Error);
    }
}

import { getDb } from './database';
import type { Transaction, TransactionType } from '../types';

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
}

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

/** Aggregate total by type for a given month */
export async function getMonthTotals(year: number, month: number): Promise<{ income: number; expense: number }> {
    try {
        const db = await getDb();
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;

        const rows = await db.getAllAsync<{ type: string; total: number }>(
            `SELECT type, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY type`,
            [`${prefix}%`]
        );

        const income = rows.find(r => r.type === 'income')?.total ?? 0;
        const expense = rows.find(r => r.type === 'expense')?.total ?? 0;
        return { income, expense };
    } catch (error) {
        throw new DatabaseError(`Failed to fetch month totals for ${year}-${month}`, error as Error);
    }
}

/** Aggregate expense totals grouped by category for a given month */
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
         WHERE date LIKE ? AND type = 'expense'
         GROUP BY category_id`,
            [`${prefix}%`]
        );
    } catch (error) {
        throw new DatabaseError(`Failed to fetch expense by category for ${year}-${month}`, error as Error);
    }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createTransaction(
    data: Omit<Transaction, 'id' | 'createdAt' | 'category'>
): Promise<number> {
    try {
        const db = await getDb();
        const now = new Date().toISOString();
        const result = await db.runAsync(
            `INSERT INTO transactions (amount, type, category_id, date, description, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
            [data.amount, data.type, data.category_id, data.date, data.description ?? '', now]
        );
        return result.lastInsertRowId;
    } catch (error) {
        throw new DatabaseError('Failed to create transaction', error as Error);
    }
}

export async function updateTransaction(
    id: number,
    data: Partial<Omit<Transaction, 'id' | 'createdAt' | 'category'>>
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

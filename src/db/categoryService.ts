import { getDb } from './database';
import type { Category, BudgetTemplate, TransactionType } from '../types';

export class DatabaseError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = 'DatabaseError';
    }
}

// ─── Categories ──────────────────────────────────────────────────────────────

/** Fetch all categories, optionally filtered by type */
export async function getCategories(type?: TransactionType): Promise<Category[]> {
    try {
        const db = await getDb();
        if (type) {
            return await db.getAllAsync<Category>(
                'SELECT * FROM categories WHERE type = ? ORDER BY name ASC',
                [type]
            );
        }
        return await db.getAllAsync<Category>(
            'SELECT * FROM categories ORDER BY type ASC, name ASC'
        );
    } catch (error) {
        throw new DatabaseError('Failed to fetch categories', error as Error);
    }
}

export async function getCategoryById(id: number): Promise<Category | null> {
    try {
        const db = await getDb();
        return await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
    } catch (error) {
        throw new DatabaseError(`Failed to fetch category ${id}`, error as Error);
    }
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<number> {
    try {
        const db = await getDb();
        const now = new Date().toISOString();
        
        const result = await db.runAsync(
            `INSERT INTO categories (name, type, icon, color, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [data.name, data.type, data.icon, data.color, now]
        );
        
        return result.lastInsertRowId;
    } catch (error) {
        throw new DatabaseError('Failed to create category', error as Error);
    }
}

export async function updateCategory(id: number, data: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> {
    try {
        const db = await getDb();
        
        await db.withTransactionAsync(async () => {
            const fields: string[] = [];
            const values: (string | number)[] = [];

            if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
            if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
            if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
            if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }

            if (fields.length === 0) return;

            values.push(id);
            await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
        });
    } catch (error) {
        throw new DatabaseError(`Failed to update category ${id}`, error as Error);
    }
}

export async function deleteCategory(id: number): Promise<void> {
    try {
        const db = await getDb();
        await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    } catch (error) {
        throw new DatabaseError(`Failed to delete category ${id}`, error as Error);
    }
}

// ─── Budget Template ─────────────────────────────────────────────────────────

/** Get all template entries joined with their category */
export async function getBudgetTemplate(): Promise<BudgetTemplate[]> {
    try {
        const db = await getDb();
        return await db.getAllAsync<BudgetTemplate>(`
        SELECT bt.*, c.name, c.type, c.icon, c.color
        FROM budget_templates bt
        JOIN categories c ON c.id = bt.category_id
        ORDER BY c.type ASC, c.name ASC
      `);
    } catch (error) {
        throw new DatabaseError('Failed to fetch budget template', error as Error);
    }
}

/** Upsert a template amount for a given category */
export async function setTemplateAmount(categoryId: number, amount: number): Promise<void> {
    try {
        const db = await getDb();
        
        await db.withTransactionAsync(async () => {
            const existing = await db.getFirstAsync<{ id: number }>(
                'SELECT id FROM budget_templates WHERE category_id = ?',
                [categoryId]
            );
            
            if (existing) {
                await db.runAsync(
                    'UPDATE budget_templates SET amount = ? WHERE category_id = ?',
                    [amount, categoryId]
                );
            } else {
                await db.runAsync(
                    'INSERT INTO budget_templates (category_id, amount) VALUES (?, ?)',
                    [categoryId, amount]
                );
            }
        });
    } catch (error) {
        throw new DatabaseError(`Failed to set template amount for category ${categoryId}`, error as Error);
    }
}

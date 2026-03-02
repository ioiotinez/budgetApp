import { getDb } from './database';
import type { MonthlyBudget, DeviationItem, Category, GlobalDeviation } from '../types';

export class DatabaseError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = 'DatabaseError';
    }
}

// ─── Monthly Budget CRUD ──────────────────────────────────────────────────────

/** Get all categories with their budget for a given month (including categories with 0 budget) */
export async function getAllCategoriesWithBudget(year: number, month: number): Promise<MonthlyBudget[]> {
    try {
        const db = await getDb();
        return await db.getAllAsync<MonthlyBudget>(`
            SELECT 
                COALESCE(mb.id, c.id * 10000 + ?) as id,
                ? as year,
                ? as month,
                c.id as category_id,
                COALESCE(mb.amount, 0) as amount,
                c.name,
                c.type,
                c.icon,
                c.color
            FROM categories c
            LEFT JOIN monthly_budgets mb ON mb.category_id = c.id AND mb.year = ? AND mb.month = ?
            ORDER BY c.type ASC, c.name ASC
        `, [month, year, month, year, month]);
    } catch (error) {
        throw new DatabaseError(`Failed to fetch all categories with budget for ${year}-${month}`, error as Error);
    }
}

/** Get all budget rows for a given month, joined with category */
export async function getMonthlyBudgets(year: number, month: number): Promise<MonthlyBudget[]> {
    try {
        const db = await getDb();
        return await db.getAllAsync<MonthlyBudget>(`
        SELECT mb.*, c.name, c.type, c.icon, c.color
        FROM monthly_budgets mb
        JOIN categories c ON c.id = mb.category_id
        WHERE mb.year = ? AND mb.month = ?
        ORDER BY c.type ASC, c.name ASC
      `, [year, month]);
    } catch (error) {
        throw new DatabaseError(`Failed to fetch monthly budgets for ${year}-${month}`, error as Error);
    }
}

/** Upsert a single monthly budget entry */
export async function setMonthlyBudget(
    year: number,
    month: number,
    categoryId: number,
    amount: number
): Promise<void> {
    try {
        const db = await getDb();
        await db.runAsync(
            `INSERT OR REPLACE INTO monthly_budgets (year, month, category_id, amount)
             VALUES (?, ?, ?, ?)`,
            [year, month, categoryId, amount]
        );
    } catch (error) {
        throw new DatabaseError(`Failed to set monthly budget for ${year}-${month}`, error as Error);
    }
}

/**
 * Initialize a monthly budget from the template.
 * Skips categories that already have a budget row for that month.
 * Initializes with amount = 0 so user can edit each category manually.
 */
export async function initMonthFromTemplate(year: number, month: number): Promise<void> {
    try {
        const db = await getDb();
        
        const categories = await db.getAllAsync<{ id: number }>('SELECT id FROM categories');
        
        if (categories.length === 0) {
            console.warn('No categories found to initialize budgets');
            return;
        }
        
        for (const cat of categories) {
            await db.runAsync(
                'INSERT OR IGNORE INTO monthly_budgets (year, month, category_id, amount) VALUES (?, ?, ?, 0)',
                [year, month, cat.id]
            );
        }
    } catch (error) {
        throw new DatabaseError(`Failed to initialize month ${year}-${month} from template`, error as Error);
    }
}

/**
 * Initialize a monthly budget by copying from the previous month.
 * Falls back to template if no previous-month data exists.
 */
export async function initMonthFromPrevious(year: number, month: number): Promise<void> {
    try {
        const db = await getDb();
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

        const prevCount = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM monthly_budgets WHERE year = ? AND month = ?',
            [prevYear, prevMonth]
        );

        if (!prevCount || prevCount.count === 0) {
            await initMonthFromTemplate(year, month);
            return;
        }

        await db.runAsync(`
          INSERT OR REPLACE INTO monthly_budgets (year, month, category_id, amount)
          SELECT ?, ?, category_id, amount
          FROM monthly_budgets
          WHERE year = ? AND month = ?
        `, [year, month, prevYear, prevMonth]);
    } catch (error) {
        throw new DatabaseError(`Failed to initialize month ${year}-${month} from previous month`, error as Error);
    }
}

/** Check whether a month has been initialized */
export async function isMonthInitialized(year: number, month: number): Promise<boolean> {
    try {
        const db = await getDb();
        const result = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM monthly_budgets WHERE year = ? AND month = ?',
            [year, month]
        );
        return (result?.count ?? 0) > 0;
    } catch (error) {
        throw new DatabaseError(`Failed to check if month ${year}-${month} is initialized`, error as Error);
    }
}

/** Remove a category from the monthly budget (deletes the row) */
export async function removeCategoryFromBudget(year: number, month: number, categoryId: number): Promise<void> {
    try {
        const db = await getDb();
        await db.runAsync(
            'DELETE FROM monthly_budgets WHERE year = ? AND month = ? AND category_id = ?',
            [year, month, categoryId]
        );
    } catch (error) {
        throw new DatabaseError(`Failed to remove category ${categoryId} from budget ${year}-${month}`, error as Error);
    }
}

// ─── Deviation Calculation ────────────────────────────────────────────────────

/**
 * Computes deviation data for each expense category in a given month.
 * Compares the budgeted amount against actual spending.
 */
export async function getDeviations(year: number, month: number): Promise<DeviationItem[]> {
    try {
        const db = await getDb();
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;

        const rows = await db.getAllAsync<{
            category_id: number;
            name: string;
            icon: string;
            color: string;
            type: string;
            createdAt: string;
            budgeted: number;
            actual: number;
        }>(`
          SELECT
            c.id as category_id, c.name, c.icon, c.color, c.type,
            c.createdAt,
            COALESCE(mb.amount, 0) as budgeted,
            COALESCE(SUM(t.amount), 0) as actual
          FROM categories c
          LEFT JOIN monthly_budgets mb
            ON mb.category_id = c.id AND mb.year = ? AND mb.month = ?
          LEFT JOIN transactions t
            ON t.category_id = c.id AND t.date LIKE ? AND t.type = 'expense'
          WHERE c.type = 'expense'
          GROUP BY c.id
          ORDER BY c.name ASC
        `, [year, month, `${prefix}%`]);

        return rows.map(row => {
            const percentage = row.budgeted > 0 ? (row.actual / row.budgeted) * 100 : (row.actual > 0 ? 100 : 0);
            const status = percentage > 100 ? 'over' : percentage >= 80 ? 'warning' : 'ok';

            const category: Category = {
                id: row.category_id,
                name: row.name,
                type: 'expense',
                icon: row.icon,
                color: row.color,
                createdAt: row.createdAt,
            };

            return {
                category,
                budgeted: row.budgeted,
                actual: row.actual,
                percentage,
                status,
            } as DeviationItem;
        });
    } catch (error) {
        throw new DatabaseError(`Failed to fetch deviations for ${year}-${month}`, error as Error);
    }
}

// ─── Global Deviations (Income vs Expense) ───────────────────────────────────────

/**
 * Gets total budgeted vs actual for income and expense categories.
 */
export async function getGlobalDeviations(year: number, month: number): Promise<GlobalDeviation[]> {
    try {
        const db = await getDb();
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;

        // Get budgeted amounts by type
        const budgetedRows = await db.getAllAsync<{ type: string; budgeted: number }>(`
            SELECT c.type, COALESCE(SUM(mb.amount), 0) as budgeted
            FROM categories c
            LEFT JOIN monthly_budgets mb ON mb.category_id = c.id AND mb.year = ? AND mb.month = ?
            GROUP BY c.type
        `, [year, month]);

        // Get actual amounts by type
        const actualRows = await db.getAllAsync<{ type: string; actual: number }>(`
            SELECT type, COALESCE(SUM(amount), 0) as actual
            FROM transactions
            WHERE date LIKE ?
            GROUP BY type
        `, [`${prefix}%`]);

        const budgetedByType = {
            income: budgetedRows.find(r => r.type === 'income')?.budgeted ?? 0,
            expense: budgetedRows.find(r => r.type === 'expense')?.budgeted ?? 0,
        };

        const actualByType = {
            income: actualRows.find(r => r.type === 'income')?.actual ?? 0,
            expense: actualRows.find(r => r.type === 'expense')?.actual ?? 0,
        };

        const result: GlobalDeviation[] = [
            {
                type: 'income',
                budgeted: budgetedByType.income,
                actual: actualByType.income,
                percentage: budgetedByType.income > 0 
                    ? (actualByType.income / budgetedByType.income) * 100 
                    : (actualByType.income > 0 ? 100 : 0),
            },
            {
                type: 'expense',
                budgeted: budgetedByType.expense,
                actual: actualByType.expense,
                percentage: budgetedByType.expense > 0 
                    ? (actualByType.expense / budgetedByType.expense) * 100 
                    : (actualByType.expense > 0 ? 100 : 0),
            },
        ];

        return result;
    } catch (error) {
        throw new DatabaseError(`Failed to fetch global deviations for ${year}-${month}`, error as Error);
    }
}

import { getDb } from './database';
import { DatabaseError } from './transactionService';
import type { RecurringRule, RecurringFrequency, TransactionType } from '../types';

export { DatabaseError } from './transactionService';

export async function getRecurringRules(activeOnly = false): Promise<RecurringRule[]> {
    try {
        const db = await getDb();
        const where = activeOnly ? 'WHERE r.active = 1' : '';
        return await db.getAllAsync<RecurringRule>(`
        SELECT r.*, c.name as category_name, c.icon as category_icon,
               c.color as category_color, c.type as category_type
        FROM recurring_rules r
        JOIN categories c ON c.id = r.category_id
        ${where}
        ORDER BY r.createdAt DESC
      `);
    } catch (error) {
        throw new DatabaseError('Failed to fetch recurring rules', error as Error);
    }
}

export async function getRecurringRuleById(id: number): Promise<RecurringRule | null> {
    try {
        const db = await getDb();
        return await db.getFirstAsync<RecurringRule>(`
        SELECT r.*, c.name as category_name, c.icon as category_icon,
               c.color as category_color, c.type as category_type
        FROM recurring_rules r
        JOIN categories c ON c.id = r.category_id
        WHERE r.id = ?
      `, [id]);
    } catch (error) {
        throw new DatabaseError(`Failed to fetch recurring rule ${id}`, error as Error);
    }
}

export async function createRecurringRule(
    data: Omit<RecurringRule, 'id' | 'createdAt' | 'category' | 'category_name' | 'category_icon' | 'category_color' | 'category_type'>
): Promise<number> {
    try {
        const db = await getDb();
        const now = new Date().toISOString();
        const result = await db.runAsync(
            `INSERT INTO recurring_rules (amount, type, category_id, description, frequency, start_date, end_date, last_generated_date, active, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.amount, data.type, data.category_id, data.description, data.frequency,
             data.start_date, data.end_date ?? null, data.last_generated_date ?? null, data.active ? 1 : 0, now]
        );
        return result.lastInsertRowId;
    } catch (error) {
        throw new DatabaseError('Failed to create recurring rule', error as Error);
    }
}

export async function updateRecurringRule(
    id: number,
    data: Partial<Omit<RecurringRule, 'id' | 'createdAt' | 'category' | 'category_name' | 'category_icon' | 'category_color' | 'category_type'>>
): Promise<void> {
    try {
        const db = await getDb();
        const fields: string[] = [];
        const values: (string | number)[] = [];

        if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount); }
        if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
        if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
        if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
        if (data.frequency !== undefined) { fields.push('frequency = ?'); values.push(data.frequency); }
        if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
        if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
        if (data.last_generated_date !== undefined) { fields.push('last_generated_date = ?'); values.push(data.last_generated_date); }
        if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active ? 1 : 0); }

        if (fields.length === 0) return;
        values.push(id);

        await db.runAsync(`UPDATE recurring_rules SET ${fields.join(', ')} WHERE id = ?`, values);
    } catch (error) {
        throw new DatabaseError(`Failed to update recurring rule ${id}`, error as Error);
    }
}

export async function deleteRecurringRule(id: number): Promise<void> {
    try {
        const db = await getDb();
        await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
    } catch (error) {
        throw new DatabaseError(`Failed to delete recurring rule ${id}`, error as Error);
    }
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

function addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getNextDueDate(rule: RecurringRule, fromDate: Date): Date {
    const start = new Date(rule.start_date + 'T00:00:00');
    const lastGen = rule.last_generated_date ? new Date(rule.last_generated_date + 'T00:00:00') : null;

    const reference = lastGen && lastGen >= start ? lastGen : new Date(start);

    let next = new Date(reference);

    switch (rule.frequency) {
        case 'weekly':
            next = addDays(next, 7);
            break;
        case 'biweekly':
            next = addDays(next, 14);
            break;
        case 'monthly':
            next = addMonths(next, 1);
            break;
        case 'yearly':
            next = addYears(next, 1);
            break;
    }

    if (next < fromDate) {
        const diffTime = fromDate.getTime() - next.getTime();
        let periodsToAdd = 1;
        switch (rule.frequency) {
            case 'weekly':
                periodsToAdd = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
                next = addDays(lastGen || start, (periodsToAdd + 1) * 7);
                break;
            case 'biweekly':
                periodsToAdd = Math.ceil(diffTime / (14 * 24 * 60 * 60 * 1000));
                next = addDays(lastGen || start, (periodsToAdd + 1) * 14);
                break;
            case 'monthly':
                periodsToAdd = Math.ceil(diffTime / (30 * 24 * 60 * 60 * 1000));
                next = addMonths(lastGen || start, periodsToAdd + 1);
                break;
            case 'yearly':
                periodsToAdd = Math.ceil(diffTime / (365 * 24 * 60 * 60 * 1000));
                next = addYears(lastGen || start, periodsToAdd + 1);
                break;
        }
    }

    return next;
}

export function getPendingRecurring(
    rules: RecurringRule[],
    year: number,
    month: number
): Array<{ rule: RecurringRule; dueDate: string; amount: number }> {
    const pending: Array<{ rule: RecurringRule; dueDate: string; amount: number }> = [];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    for (const rule of rules) {
        if (!rule.active) continue;

        const endDate = rule.end_date ? new Date(rule.end_date + 'T00:00:00') : null;
        if (endDate && endDate < monthStart) continue;

        const nextDue = getNextDueDate(rule, monthStart);
        const lastGen = rule.last_generated_date ? new Date(rule.last_generated_date + 'T00:00:00') : null;

        if (nextDue >= monthStart && nextDue <= monthEnd) {
            const dueDateStr = toISODate(nextDue);
            if (!lastGen || dueDateStr > rule.last_generated_date!) {
                pending.push({
                    rule,
                    dueDate: dueDateStr,
                    amount: rule.amount,
                });
            }
        }
    }

    return pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

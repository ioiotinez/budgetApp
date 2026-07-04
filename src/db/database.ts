import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { CREATE_TABLES_SQL, DEFAULT_CATEGORIES } from './schema';

var dbInstance: any = null;
let _webStorage: any = null;

const USE_SQLITE_IN_WEB = false;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (Platform.OS === 'web' && !USE_SQLITE_IN_WEB) {
        if (dbInstance) return dbInstance;

        if (!_webStorage) {
            const saved = localStorage.getItem('budget_app_data');
            if (saved) {
                _webStorage = JSON.parse(saved);
            } else {
                _webStorage = {
                    categories: [...DEFAULT_CATEGORIES.map((c: any, i: number) => ({ ...c, id: i + 1, createdAt: new Date().toISOString() }))],
                    budget_templates: [],
                    transactions: [],
                    monthly_budgets: [],
                    recurring_rules: [],
                    settings: [],
                };
                localStorage.setItem('budget_app_data', JSON.stringify(_webStorage));
            }
        }

        const storage = _webStorage;
        dbInstance = {
            execAsync: async (sql: string) => {
                console.log('[WEB MOCK] execAsync:', sql);
                const sqlLower = sql.toLowerCase();
                if (sqlLower.includes('delete from transactions')) storage.transactions = [];
                if (sqlLower.includes('delete from monthly_budgets')) storage.monthly_budgets = [];
                if (sqlLower.includes('delete from budget_templates')) storage.budget_templates = [];
                if (sqlLower.includes('delete from recurring_rules')) storage.recurring_rules = [];
                if (sqlLower.includes('delete from categories')) storage.categories = [];
                localStorage.setItem('budget_app_data', JSON.stringify(storage));
            },
            runAsync: async (sql: string, params: any[] = []) => {
                const sqlLower = sql.toLowerCase();
                const save = () => localStorage.setItem('budget_app_data', JSON.stringify(storage));
                const saveAndReturn = (result: any) => { save(); return result; };

                // Handle Categories
                if (sqlLower.includes('categories') && (sqlLower.includes('insert') || sqlLower.includes('replace'))) {
                    // Check if ID is provided (as in restore) or auto-generated
                    let id, name, type, icon, color, createdAt;
                    if (sqlLower.includes('(id,')) {
                        [id, name, type, icon, color, createdAt] = params;
                    } else {
                        id = storage.categories.length > 0 ? Math.max(...storage.categories.map((c: any) => c.id)) + 1 : 1;
                        [name, type, icon, color, createdAt] = params;
                    }

                    const catData = { id, name, type, icon, color, createdAt };
                    const idx = storage.categories.findIndex((c: any) => c.id == id);
                    if (idx !== -1) storage.categories[idx] = catData;
                    else storage.categories.push(catData);

                    return saveAndReturn({ lastInsertRowId: id, changes: 1 });
                }

                if (sqlLower.includes('update categories')) {
                    const id = params[params.length - 1];
                    const idx = storage.categories.findIndex((c: any) => c.id == id);
                    if (idx !== -1) {
                        const setClause = sqlLower.split('set')[1].split('where')[0];
                        const fields = setClause.split(',').map(f => f.trim().split(' ')[0]);
                        fields.forEach((field, i) => { if (storage.categories[idx].hasOwnProperty(field)) storage.categories[idx][field] = params[i]; });
                    }
                    return saveAndReturn({ lastInsertRowId: id, changes: 1 });
                }

                // Handle Templates
                if (sqlLower.includes('budget_templates') && (sqlLower.includes('insert') || sqlLower.includes('replace') || sqlLower.includes('update'))) {
                    // INSERT OR REPLACE INTO budget_templates (id, category_id, amount) VALUES (?, ?, ?)
                    if (sqlLower.includes('(id,')) {
                        const [id, catId, amount] = params;
                        const idx = storage.budget_templates.findIndex((t: any) => t.id == id);
                        if (idx !== -1) {
                            storage.budget_templates[idx].category_id = catId;
                            storage.budget_templates[idx].amount = amount;
                        } else {
                            storage.budget_templates.push({ id, category_id: catId, amount });
                        }
                    } else {
                        const catId = sqlLower.includes('insert') ? params[0] : params[1];
                        const amount = sqlLower.includes('insert') ? params[1] : params[0];
                        const idx = storage.budget_templates.findIndex((t: any) => t.category_id == catId);
                        if (idx !== -1) storage.budget_templates[idx].amount = amount;
                        else storage.budget_templates.push({ id: storage.budget_templates.length + 1, category_id: catId, amount });
                    }
                    return saveAndReturn({ lastInsertRowId: 1, changes: 1 });
                }

                // Handle Monthly Budgets
                if (sqlLower.includes('monthly_budgets') && (sqlLower.includes('insert') || sqlLower.includes('replace'))) {
                    if (sqlLower.includes('select')) {
                        const year = params[0];
                        const month = params[1];
                        let sourceData: any[] = [];
                        if (sqlLower.includes('from categories')) {
                            sourceData = storage.categories.map((c: any) => ({ category_id: c.id, amount: 0 }));
                        } else if (sqlLower.includes('from budget_templates')) {
                            sourceData = storage.budget_templates.map((t: any) => ({ category_id: t.category_id, amount: t.amount }));
                        } else if (sqlLower.includes('from monthly_budgets')) {
                            const prevYear = params[2];
                            const prevMonth = params[3];
                            sourceData = storage.monthly_budgets.filter((mb: any) => mb.year == prevYear && mb.month == prevMonth);
                        }
                        sourceData.forEach((t: any) => {
                            const idx = storage.monthly_budgets.findIndex((mb: any) => mb.year == year && mb.month == month && mb.category_id == t.category_id);
                            if (idx !== -1) storage.monthly_budgets[idx].amount = t.amount;
                            else storage.monthly_budgets.push({ id: storage.monthly_budgets.length + 1, year, month, category_id: t.category_id, amount: t.amount });
                        });
                        return saveAndReturn({ lastInsertRowId: 1, changes: sourceData.length });
                    }

                    // Standard INSERT/REPLACE: (id, year, month, category_id, amount)
                    if (sqlLower.includes('(id,')) {
                        const [id, year, month, catId, amount] = params;
                        const idx = storage.monthly_budgets.findIndex((mb: any) => mb.id == id);
                        if (idx !== -1) {
                            Object.assign(storage.monthly_budgets[idx], { year, month, category_id: catId, amount });
                        } else {
                            storage.monthly_budgets.push({ id, year, month, category_id: catId, amount });
                        }
                    } else {
                        const year = params[0];
                        const month = params[1];
                        const catId = params[2];
                        const amount = params[3];
                        const idx = storage.monthly_budgets.findIndex((mb: any) => mb.year == year && mb.month == month && mb.category_id == catId);
                        if (idx !== -1) storage.monthly_budgets[idx].amount = amount;
                        else storage.monthly_budgets.push({ id: storage.monthly_budgets.length + 1, year, month, category_id: catId, amount });
                    }
                    return saveAndReturn({ lastInsertRowId: 1, changes: 1 });
                }

                // Handle Recurring Rules
                if (sqlLower.includes('recurring_rules') && (sqlLower.includes('insert') || sqlLower.includes('replace') || sqlLower.includes('update'))) {
                    if (sqlLower.includes('(id,')) {
                        const [id, amount, type, catId, description, frequency, startDate, endDate, lastGen, active, createdAt] = params;
                        const idx = storage.recurring_rules.findIndex((r: any) => r.id == id);
                        const ruleData: any = { id, amount, type, category_id: catId, description, frequency, start_date: startDate, end_date: endDate, last_generated_date: lastGen, active, createdAt };
                        if (idx !== -1) storage.recurring_rules[idx] = ruleData;
                        else storage.recurring_rules.push(ruleData);
                    } else {
                        const newId = storage.recurring_rules.length > 0 ? Math.max(...storage.recurring_rules.map((r: any) => r.id)) + 1 : 1;
                        const [amount, type, catId, description, frequency, startDate, endDate, lastGen, active, createdAt] = params;
                        storage.recurring_rules.push({
                            id: newId, amount, type, category_id: catId, description, frequency,
                            start_date: startDate, end_date: endDate, last_generated_date: lastGen, active, createdAt,
                        });
                    }
                    return saveAndReturn({ lastInsertRowId: 1, changes: 1 });
                }

                if (sqlLower.includes('update recurring_rules')) {
                    const id = params[params.length - 1];
                    const idx = storage.recurring_rules.findIndex((r: any) => r.id == id);
                    if (idx !== -1) {
                        const setClause = sqlLower.split('set')[1].split('where')[0];
                        const fields = setClause.split(',').map(f => f.trim().split('=')[0].trim());
                        let pIdx = 0;
                        fields.forEach((field: string) => {
                            if (storage.recurring_rules[idx].hasOwnProperty(field)) {
                                storage.recurring_rules[idx][field] = params[pIdx++];
                            }
                        });
                    }
                    return saveAndReturn({ lastInsertRowId: id, changes: 1 });
                }

                // Handle Transactions
                if (sqlLower.includes('transactions') && (sqlLower.includes('insert') || sqlLower.includes('replace'))) {
                    let txData;
                    if (sqlLower.includes('(id,')) {
                        const [id, amount, type, catId, date, desc, createdAt] = params;
                        txData = { id, amount, type, category_id: catId, date, description: desc, createdAt };
                    } else {
                        const newId = storage.transactions.length > 0 ? Math.max(...storage.transactions.map((t: any) => t.id)) + 1 : 1;
                        txData = { id: newId, amount: params[0], type: params[1], category_id: params[2], date: params[3], description: params[4], createdAt: params[5] };
                    }

                    const idx = storage.transactions.findIndex((t: any) => t.id == txData.id);
                    if (idx !== -1) storage.transactions[idx] = txData;
                    else storage.transactions.push(txData);

                    return saveAndReturn({ lastInsertRowId: txData.id, changes: 1 });
                }

                return saveAndReturn({ lastInsertRowId: 1, changes: 0 });
            },
            getFirstAsync: async (sql: string, params: any[] = []) => {
                const sqlLower = sql.toLowerCase();
                if (sqlLower.includes('count(*) from categories')) return { count: storage.categories.length };
                if (sqlLower.includes('count(*) from monthly_budgets')) {
                    return { count: storage.monthly_budgets.filter((mb: any) => mb.year == params[0] && mb.month == params[1]).length };
                }
                if (sqlLower.includes('count(*) from budget_templates')) return { count: storage.budget_templates.length };
                if (sqlLower.includes('from categories where id = ?')) return storage.categories.find((c: any) => c.id == params[0]) || null;
                if (sqlLower.includes('from settings where key = ?')) return storage.settings.find((s: any) => s.key == params[0]) || null;
                return null;
            },
            getAllAsync: async (sql: string, params: any[] = []) => {
                console.log('[WEB MOCK] getAllAsync:', sql, 'params:', params);
                const sqlLower = sql.toLowerCase();

                // 1. Deviations (Check this FIRST because it has joins that could match other tables)
                if (sqlLower.includes('from categories c') && sqlLower.includes('left join monthly_budgets mb')) {
                    const year = params[0]; const month = params[1]; const prefix = params[2].replace('%', '');
                    return storage.categories.filter((c: any) => c.type == 'expense').map((c: any) => {
                        const mb = storage.monthly_budgets.find((b: any) => b.category_id == c.id && b.year == year && b.month == month);
                        const actual = storage.transactions.filter((t: any) => t.category_id == c.id && t.date.startsWith(prefix) && t.type == 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
                        return { category_id: c.id, name: c.name, icon: c.icon, color: c.color, type: c.type, budgeted: mb ? mb.amount : 0, actual: actual };
                    }).sort((a: any, b: any) => a.name.localeCompare(b.name));
                }

                // 2. Transactions
                if (sqlLower.includes('from transactions')) {
                    if (sqlLower.includes('sum(amount)')) {
                        const prefix = params[0].replace('%', '');
                        const filtered = storage.transactions.filter((t: any) => t.date.startsWith(prefix));
                        return [{ type: 'income', total: filtered.filter((t: any) => t.type == 'income').reduce((acc: number, t: any) => acc + t.amount, 0) },
                        { type: 'expense', total: filtered.filter((t: any) => t.type == 'expense').reduce((acc: number, t: any) => acc + t.amount, 0) }];
                    }
                    let results = [...storage.transactions];

                    // The order of params in transactionService.ts is:
                    // 1. date LIKE ? (if year/month provided)
                    // 2. category_id = ? (if categoryId provided)
                    // 3. type = ? (if type provided)
                    let pIdx = 0;
                    if (sqlLower.includes('date like ?')) {
                        const val = params[pIdx++];
                        if (val) results = results.filter((t: any) => t.date.startsWith(val.toString().replace('%', '')));
                    }
                    if (sqlLower.includes('category_id = ?')) {
                        const val = params[pIdx++];
                        if (val !== undefined) results = results.filter((t: any) => t.category_id == val);
                    }
                    if (sqlLower.includes('t.type = ?')) {
                        const val = params[pIdx++];
                        if (val !== undefined) results = results.filter((t: any) => t.type == val);
                    }

                    return results.map((t: any) => {
                        const cat = storage.categories.find((c: any) => c.id == t.category_id);
                        return { ...t, category_name: cat?.name, category_icon: cat?.icon, category_color: cat?.color, category_type: cat?.type };
                    }).sort((a, b) => b.date.localeCompare(a.date));
                }

                // 3. Monthly Budgets
                if (sqlLower.includes('from monthly_budgets')) {
                    if (sqlLower.includes('select distinct year, month')) {
                        const seen = new Set<string>();
                        const results: { year: number; month: number }[] = [];
                        storage.monthly_budgets.forEach((mb: any) => {
                            const key = `${mb.year}-${mb.month}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                results.push({ year: mb.year, month: mb.month });
                            }
                        });
                        return results;
                    }

                    return storage.monthly_budgets.filter((mb: any) => mb.year == params[0] && mb.month == params[1]).map((mb: any) => {
                        const cat = storage.categories.find((c: any) => c.id == mb.category_id);
                        // Make sure to merge {cat} followed by {mb} so budget ID wins
                        return { ...cat, ...mb };
                    });
                }

                // 3.5. Recurring Rules
                if (sqlLower.includes('from recurring_rules')) {
                    let results = [...(storage.recurring_rules || [])];
                    if (params.length > 0) {
                        if (sqlLower.includes('active = ?')) {
                            results = results.filter((r: any) => r.active == params[0]);
                        }
                    }
                    return results.map((r: any) => {
                        const cat = storage.categories.find((c: any) => c.id == r.category_id);
                        return { ...r, category_name: cat?.name, category_icon: cat?.icon, category_color: cat?.color, category_type: cat?.type };
                    }).sort((a: any, b: any) => a.createdAt - b.createdAt);
                }

                // 4. Categories
                if (sqlLower.includes('from categories')) {
                    return params.length > 0 ? storage.categories.filter((c: any) => c.type == params[0]) : storage.categories;
                }

                // 5. Templates
                if (sqlLower.includes('from budget_templates')) {
                    return storage.budget_templates.map((t: any) => {
                        const cat = storage.categories.find((c: any) => c.id == t.category_id);
                        return { ...t, ...cat };
                    });
                }

                return [];
            },
        } as any;
        return dbInstance;
    }

    if (dbInstance) return dbInstance;
    dbInstance = await SQLite.openDatabaseAsync('budget.db');
    await dbInstance.execAsync(CREATE_TABLES_SQL);
    await seedDefaultCategories(dbInstance);
    return dbInstance;
}

async function seedDefaultCategories(db: SQLite.SQLiteDatabase): Promise<void> {
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
    if (result && result.count === 0) {
        const now = new Date().toISOString();
        
        await db.withTransactionAsync(async () => {
            for (const cat of DEFAULT_CATEGORIES) {
                await db.runAsync(
                    `INSERT INTO categories (name, type, icon, color, createdAt) VALUES (?, ?, ?, ?, ?)`,
                    [cat.name, cat.type, cat.icon, cat.color, now]
                );
            }
        });
    }
}

export async function executeRaw(sql: string): Promise<void> {
    const db = await getDb();
    await db.execAsync(sql);
}

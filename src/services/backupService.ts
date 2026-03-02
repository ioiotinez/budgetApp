import { Platform } from 'react-native';
import {
    documentDirectory,
    writeAsStringAsync,
    readAsStringAsync,
    EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../db/database';
import { getCategories, getBudgetTemplate } from '../db/categoryService';
import { getMonthlyBudgets } from '../db/budgetService';
import { getTransactions } from '../db/transactionService';
import type { BackupData, Category, BudgetTemplate, MonthlyBudget, Transaction } from '../types';

// ─── Local Export (via Share sheet) ──────────────────────────────────────────

/** Collect all data from SQLite into the backup shape */
export async function collectAllData(): Promise<BackupData> {
    const db = await getDb();
    const categories = await getCategories();
    const template = await getBudgetTemplate();
    const transactions = await getTransactions();

    // Get all unique year/month pairs in any monthly_budgets row
    const periods = await db.getAllAsync<{ year: number; month: number }>(
        'SELECT DISTINCT year, month FROM monthly_budgets ORDER BY year, month'
    );

    let budgets: MonthlyBudget[] = [];
    for (const p of periods) {
        const rows = await getMonthlyBudgets(p.year, p.month);
        budgets = budgets.concat(rows);
    }

    // Get all settings
    const settingsRows = await db.getAllAsync<{ key: string; value: string }>(
        'SELECT key, value FROM settings'
    );
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
        settings[row.key] = row.value;
    }

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        categories,
        templates: template,
        budgets,
        transactions,
        settings,
    };
}

/** Export data to a local JSON file and open share sheet */
export async function exportLocal(): Promise<void> {
    const data = await collectAllData();
    const json = JSON.stringify(data, null, 2);
    const fileName = `budgetapp_backup_${new Date().toISOString().slice(0, 10)}.json`;

    if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        return;
    }

    const fileUri = (documentDirectory ?? '') + fileName;

    await writeAsStringAsync(fileUri, json, {
        encoding: EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Exportar respaldo BudgetApp',
        });
    }
}

// ─── Import / Restore ─────────────────────────────────────────────────────────

/** Pick a local JSON file and parse it as BackupData */
export async function pickLocalBackup(): Promise<BackupData | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    let content: string;
    if (Platform.OS === 'web') {
        const response = await fetch(result.assets[0].uri);
        content = await response.text();
    } else {
        content = await readAsStringAsync(result.assets[0].uri);
    }

    return JSON.parse(content) as BackupData;
}

/**
 * Restore data from a BackupData object into SQLite.
 * Strategy: REPLACE INTO for all records (upsert by id).
 * This preserves local records not in the backup when using ON CONFLICT IGNORE.
 */
export async function restoreFromBackup(data: BackupData, merge = false): Promise<void> {
    const db = await getDb();

    await db.execAsync('BEGIN TRANSACTION');
    try {
        // If not merging, clear existing data first
        if (!merge) {
            await db.execAsync(`
        DELETE FROM transactions;
        DELETE FROM monthly_budgets;
        DELETE FROM budget_templates;
        DELETE FROM categories;
      `);
        }

        // Restore categories
        for (const cat of data.categories) {
            await db.runAsync(
                `INSERT OR REPLACE INTO categories (id, name, type, icon, color, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.createdAt]
            );
        }

        // Restore templates
        for (const t of data.templates) {
            await db.runAsync(
                'INSERT OR REPLACE INTO budget_templates (id, category_id, amount) VALUES (?, ?, ?)',
                [t.id, t.category_id, t.amount]
            );
        }

        // Restore budgets
        for (const b of data.budgets) {
            await db.runAsync(
                `INSERT OR REPLACE INTO monthly_budgets (id, year, month, category_id, amount)
         VALUES (?, ?, ?, ?, ?)`,
                [b.id, b.year, b.month, b.category_id, b.amount]
            );
        }

        // Restore transactions
        for (const tx of data.transactions) {
            await db.runAsync(
                `INSERT OR REPLACE INTO transactions (id, amount, type, category_id, date, description, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [tx.id, tx.amount, tx.type, tx.category_id, tx.date, tx.description ?? '', tx.createdAt]
            );
        }

        // Restore settings
        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await db.runAsync(
                    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    [key, value]
                );
            }
        }

        await db.execAsync('COMMIT');
    } catch (e) {
        await db.execAsync('ROLLBACK');
        throw e;
    }
}


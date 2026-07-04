import { create } from 'zustand';
import {
    getRecurringRules,
    getRecurringRuleById,
    createRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
    getPendingRecurring,
} from '../db/recurringService';
import { createTransaction } from '../db/transactionService';
import type { RecurringRule, PendingRecurring } from '../types';

interface RecurringState {
    rules: RecurringRule[];
    pending: PendingRecurring[];
    isLoading: boolean;
    error: string | null;

    loadRules: () => Promise<void>;
    loadPending: (year: number, month: number) => Promise<void>;
    addRule: (data: Parameters<typeof createRecurringRule>[0]) => Promise<void>;
    editRule: (id: number, data: Parameters<typeof updateRecurringRule>[1]) => Promise<void>;
    removeRule: (id: number) => Promise<void>;
    confirmPending: (pending: PendingRecurring) => Promise<void>;
    skipPending: (pending: PendingRecurring) => Promise<void>;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
    rules: [],
    pending: [],
    isLoading: false,
    error: null,

    loadRules: async () => {
        set({ isLoading: true, error: null });
        try {
            const rules = await getRecurringRules();
            set({ rules, isLoading: false });
        } catch (e) {
            set({ error: String(e), isLoading: false });
        }
    },

    loadPending: async (year, month) => {
        try {
            const rules = await getRecurringRules(true);
            const pending = getPendingRecurring(rules, year, month);
            set({ pending });
        } catch (e) {
            set({ error: String(e) });
        }
    },

    addRule: async (data) => {
        await createRecurringRule(data);
        await get().loadRules();
    },

    editRule: async (id, data) => {
        await updateRecurringRule(id, data);
        await get().loadRules();
    },

    removeRule: async (id) => {
        await deleteRecurringRule(id);
        await get().loadRules();
    },

    confirmPending: async (pendingItem) => {
        await createTransaction({
            amount: pendingItem.amount,
            type: pendingItem.rule.type,
            category_id: pendingItem.rule.category_id,
            date: pendingItem.dueDate,
            description: pendingItem.rule.description,
        });
        await updateRecurringRule(pendingItem.rule.id, {
            last_generated_date: pendingItem.dueDate,
        });
        const remaining = get().pending.filter(
            p => p.rule.id !== pendingItem.rule.id || p.dueDate !== pendingItem.dueDate
        );
        set({ pending: remaining });
    },

    skipPending: async (pendingItem) => {
        await updateRecurringRule(pendingItem.rule.id, {
            last_generated_date: pendingItem.dueDate,
        });
        const remaining = get().pending.filter(
            p => p.rule.id !== pendingItem.rule.id || p.dueDate !== pendingItem.dueDate
        );
        set({ pending: remaining });
    },
}));

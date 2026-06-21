import { create } from 'zustand';
import {
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getMonthTotals,
    type TransactionFilters,
} from '../db/transactionService';
import type { Transaction, TransactionType } from '../types';

interface TransactionState {
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    filters: TransactionFilters;
    monthTotals: { income: number; expense: number };

    // Actions
    setFilters: (filters: TransactionFilters) => void;
    loadTransactions: (filters?: TransactionFilters) => Promise<void>;
    loadMonthTotals: (year: number, month: number) => Promise<void>;
    addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'category'>) => Promise<void>;
    editTransaction: (id: number, data: Partial<Omit<Transaction, 'id' | 'createdAt' | 'category'>>) => Promise<void>;
    removeTransaction: (id: number) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
    transactions: [],
    isLoading: false,
    error: null,
    filters: {},
    monthTotals: { income: 0, expense: 0 },

    setFilters: (filters) => set({ filters }),

    loadTransactions: async (filters) => {
        set({ isLoading: true, error: null });
        try {
            const activeFilters = filters ?? get().filters;
            const transactions = await getTransactions(activeFilters);
            set({ transactions, isLoading: false });
        } catch (e) {
            set({ error: String(e), isLoading: false });
        }
    },

    loadMonthTotals: async (year, month) => {
        const totals = await getMonthTotals(year, month);
        set({ monthTotals: totals });
    },

    addTransaction: async (data) => {
        await createTransaction(data);
        const year = parseInt(data.date.substring(0, 4));
        const month = parseInt(data.date.substring(5, 7));
        await get().loadTransactions({ year, month });
        await get().loadMonthTotals(year, month);
    },

    editTransaction: async (id, data) => {
        await updateTransaction(id, data);
        await get().loadTransactions();
    },

    removeTransaction: async (id) => {
        await deleteTransaction(id);
        await get().loadTransactions();
    },
}));

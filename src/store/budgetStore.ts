import { create } from 'zustand';
import {
    getAllCategoriesWithBudget,
    setMonthlyBudget,
    initMonthFromPrevious,
    isMonthInitialized,
    getDeviations,
    removeCategoryFromBudget,
    getGlobalDeviations,
} from '../db/budgetService';
import type { MonthlyBudget, DeviationItem, GlobalDeviation } from '../types';

interface BudgetState {
    budgets: MonthlyBudget[];
    deviations: DeviationItem[];
    globalDeviations: GlobalDeviation[];
    currentYear: number;
    currentMonth: number;
    isLoading: boolean;

    setCurrentPeriod: (year: number, month: number) => void;
    loadBudgets: (year?: number, month?: number) => Promise<void>;
    loadDeviations: (year?: number, month?: number) => Promise<void>;
    loadGlobalDeviations: (year?: number, month?: number) => Promise<void>;
    setBudgetAmount: (categoryId: number, amount: number) => Promise<void>;
    initFromPreviousMonth: (year?: number, month?: number) => Promise<void>;
    removeCategory: (categoryId: number) => Promise<void>;
    checkAndInitCurrentMonth: () => Promise<void>;
}

const now = new Date();
const defaultYear = now.getFullYear();
const defaultMonth = now.getMonth() + 1; // 1-indexed

export const useBudgetStore = create<BudgetState>((set, get) => ({
    budgets: [],
    deviations: [],
    globalDeviations: [],
    currentYear: defaultYear,
    currentMonth: defaultMonth,
    isLoading: false,

    setCurrentPeriod: (year, month) => set({ currentYear: Number(year), currentMonth: Number(month) }),

    loadBudgets: async (year, month) => {
        const y = year ?? get().currentYear;
        const m = month ?? get().currentMonth;
        set({ isLoading: true });
        const budgets = await getAllCategoriesWithBudget(y, m);
        set({ budgets, isLoading: false });
    },

    loadDeviations: async (year, month) => {
        const y = year ?? get().currentYear;
        const m = month ?? get().currentMonth;
        const deviations = await getDeviations(y, m);
        set({ deviations });
    },

    loadGlobalDeviations: async (year, month) => {
        const y = year ?? get().currentYear;
        const m = month ?? get().currentMonth;
        const globalDeviations = await getGlobalDeviations(y, m);
        set({ globalDeviations });
    },

    setBudgetAmount: async (categoryId, amount) => {
        const { currentYear, currentMonth } = get();

        set(state => ({
            budgets: state.budgets.map(b =>
                b.category_id == categoryId ? { ...b, amount } : b
            )
        }));

        try {
            await setMonthlyBudget(currentYear, currentMonth, categoryId, amount);
            await get().loadBudgets(currentYear, currentMonth);
            await get().loadDeviations(currentYear, currentMonth);
        } catch (error) {
            console.error('Error al guardar presupuesto:', error);
            await get().loadBudgets(currentYear, currentMonth);
        }
    },

    initFromPreviousMonth: async (year?: number, month?: number) => {
        const y = year ?? get().currentYear;
        const m = month ?? get().currentMonth;
        await initMonthFromPrevious(y, m);
        await get().loadBudgets(y, m);
    },

    removeCategory: async (categoryId) => {
        const { currentYear, currentMonth } = get();

        set(state => ({
            budgets: state.budgets.filter(b => b.category_id != categoryId)
        }));

        try {
            await removeCategoryFromBudget(currentYear, currentMonth, categoryId);
            await get().loadBudgets(currentYear, currentMonth);
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            await get().loadBudgets(currentYear, currentMonth);
        }
    },

    checkAndInitCurrentMonth: async () => {
        const { currentYear, currentMonth } = get();
        const initialized = await isMonthInitialized(currentYear, currentMonth);
        if (!initialized) {
            await initMonthFromPrevious(currentYear, currentMonth);
        }
        await get().loadBudgets();
        await get().loadDeviations();
    },
}));

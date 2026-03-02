import { create } from 'zustand';
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getBudgetTemplate,
    setTemplateAmount,
} from '../db/categoryService';
import type { Category, BudgetTemplate, TransactionType } from '../types';

interface CategoryState {
    categories: Category[];
    template: BudgetTemplate[];
    isLoading: boolean;

    loadCategories: (type?: TransactionType) => Promise<void>;
    loadTemplate: () => Promise<void>;
    addCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
    editCategory: (id: number, data: Partial<Omit<Category, 'id' | 'createdAt'>>) => Promise<void>;
    removeCategory: (id: number) => Promise<void>;
    updateTemplateAmount: (categoryId: number, amount: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
    categories: [],
    template: [],
    isLoading: false,

    loadCategories: async (type) => {
        set({ isLoading: true });
        const categories = await getCategories(type);
        set({ categories, isLoading: false });
    },

    loadTemplate: async () => {
        const template = await getBudgetTemplate();
        set({ template });
    },

    addCategory: async (data) => {
        await createCategory(data);
        await get().loadCategories();
        await get().loadTemplate();
    },

    editCategory: async (id, data) => {
        await updateCategory(id, data);
        await get().loadCategories();
    },

    removeCategory: async (id) => {
        await deleteCategory(id);
        await get().loadCategories();
        await get().loadTemplate();
    },

    updateTemplateAmount: async (categoryId, amount) => {
        await setTemplateAmount(categoryId, amount);
        await get().loadTemplate();
    },
}));

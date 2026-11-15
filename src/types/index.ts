// ─── Core Domain Types ──────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

/** How an expense was paid. `credit` is excluded from budget and balance totals. */
export type PaymentMethod = 'cash' | 'debit' | 'credit';

export interface Category {
    id: number;
    name: string;
    type: TransactionType;
    /** Emoji or icon name */
    icon: string;
    /** Hex color string */
    color: string;
    createdAt: string;
}

export interface BudgetTemplate {
    id: number;
    category_id: number;
    amount: number;
    // Joined from categories
    category?: Category;
}

export interface MonthlyBudget {
    id: number;
    year: number;
    month: number;
    category_id: number;
    amount: number;
    // Joined from categories
    name?: string;
    type?: TransactionType;
    icon?: string;
    color?: string;
    category?: Category;
}

export interface Transaction {
    id: number;
    amount: number;
    type: TransactionType;
    category_id: number;
    date: string; // ISO date string: 'YYYY-MM-DD'
    description?: string;
    payment_method: PaymentMethod;
    createdAt: string;
    // Joined
    category?: Category;
    category_name?: string;
    category_icon?: string;
    category_color?: string;
    category_type?: TransactionType;
}

// ─── Derived / Report Types ──────────────────────────────────────────────────

export interface DeviationItem {
    category: Category;
    budgeted: number;
    actual: number;
    /** 0–100+ percent */
    percentage: number;
    /** ok = <80%, warning = 80-100%, over = >100% */
    status: 'ok' | 'warning' | 'over';
}

export interface GlobalDeviation {
    type: 'income' | 'expense';
    budgeted: number;
    actual: number;
    percentage: number;
}

// ─── Recurring Transactions ───────────────────────────────────────────────

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringRule {
    id: number;
    amount: number;
    type: TransactionType;
    category_id: number;
    description: string;
    frequency: RecurringFrequency;
    start_date: string;
    end_date?: string;
    last_generated_date?: string;
    active: boolean;
    createdAt: string;
    category?: Category;
    category_name?: string;
    category_icon?: string;
    category_color?: string;
    category_type?: TransactionType;
}

export interface PendingRecurring {
    rule: RecurringRule;
    dueDate: string;
    amount: number;
}

// ─── Credit Card ─────────────────────────────────────────────────────────────

/** Totals for one month split by whether the money already left the budget. */
export interface MonthTotals {
    income: number;
    /** Expenses paid with cash or debit (they consume the monthly budget) */
    expense: number;
    /** Expenses paid with credit card (tracked separately, outside the budget) */
    credit: number;
}

export interface CreditCardCategoryTotal {
    category_id: number;
    name: string;
    icon: string;
    color: string;
    total: number;
}

export interface CreditCardTotals {
    total: number;
    byCategory: CreditCardCategoryTotal[];
}

export interface BackupData {
    version: number;
    exportedAt: string;
    categories: Category[];
    templates: BudgetTemplate[];
    budgets: MonthlyBudget[];
    transactions: Transaction[];
    recurringRules?: RecurringRule[];
    settings?: Record<string, string>;
}


// ─── Navigation Types ────────────────────────────────────────────────────────

export type RootTabParamList = {
    Dashboard: undefined;
    Transactions: undefined;
    Reports: undefined;
    Settings: undefined;
};

export type TransactionStackParamList = {
    TransactionList: undefined;
    AddEditTransaction: { transactionId?: number };
};

export type SettingsStackParamList = {
    SettingsHome: undefined;
    Categories: undefined;
    BudgetSetup: { year: number; month: number };
    RecurringRules: undefined;
    AddEditRecurring: { ruleId?: number };
};

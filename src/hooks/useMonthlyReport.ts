import { useMemo } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { useCategoryStore } from '../store/categoryStore';

/**
 * Computes chart-ready data for the current transaction set.
 * Call after loadTransactions() has been called for the desired month.
 */
export function useMonthlyReport() {
    const transactions = useTransactionStore(s => s.transactions);
    const monthTotals = useTransactionStore(s => s.monthTotals);
    const categories = useCategoryStore(s => s.categories);

    /** Pie chart data: expense total per category */
    const expenseByCategory = useMemo(() => {
        const map = new Map<number, number>();
        for (const tx of transactions) {
            if (tx.type === 'expense') {
                map.set(tx.category_id, (map.get(tx.category_id) ?? 0) + tx.amount);
            }
        }
        return Array.from(map.entries())
            .map(([categoryId, total]) => {
                const cat = categories.find(c => c.id === categoryId);
                return {
                    label: cat?.name ?? 'Otro',
                    value: total,
                    color: cat?.color ?? '#94a3b8',
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [transactions, categories]);

    /** Income by category */
    const incomeByCategory = useMemo(() => {
        const map = new Map<number, number>();
        for (const tx of transactions) {
            if (tx.type === 'income') {
                map.set(tx.category_id, (map.get(tx.category_id) ?? 0) + tx.amount);
            }
        }
        return Array.from(map.entries())
            .map(([categoryId, total]) => {
                const cat = categories.find(c => c.id === categoryId);
                return {
                    label: cat?.name ?? 'Otro',
                    value: total,
                    color: cat?.color ?? '#94a3b8',
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [transactions, categories]);

    const balance = monthTotals.income - monthTotals.expense;

    return {
        totalIncome: monthTotals.income,
        totalExpenses: monthTotals.expense,
        balance,
        expenseByCategory,
        incomeByCategory,
    };
}

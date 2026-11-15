import { useMemo } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import type { YearMonthTotal } from '../db/transactionService';

export interface ProjectionData {
    monthsWithData: number;
    avgIncome: number;
    avgExpense: number;
    avgBalance: number;
    projectionMonths: Array<{
        month: number;
        year: number;
        projectedIncome: number;
        projectedExpense: number;
        projectedBalance: number;
    }>;
}

export function useAnnualReport(yearTotals: YearMonthTotal[]) {
    const currentYear = new Date().getFullYear();

    const annualTotals = useMemo(() => {
        return yearTotals.map(m => ({
            ...m,
            balance: m.income - m.expense,
        }));
    }, [yearTotals]);

    const totalIncome = useMemo(
        () => yearTotals.reduce((sum, m) => sum + m.income, 0),
        [yearTotals]
    );

    const totalExpenses = useMemo(
        () => yearTotals.reduce((sum, m) => sum + m.expense, 0),
        [yearTotals]
    );

    const totalCredit = useMemo(
        () => yearTotals.reduce((sum, m) => sum + (m.credit ?? 0), 0),
        [yearTotals]
    );

    const totalBalance = totalIncome - totalExpenses;

    const projection: ProjectionData | null = useMemo(() => {
        const monthsWithData = yearTotals.filter(m => m.income > 0 || m.expense > 0);
        if (monthsWithData.length === 0) return null;

        const count = monthsWithData.length;
        const avgIncome = totalIncome / count;
        const avgExpense = totalExpenses / count;
        const avgBalance = totalBalance / count;

        const currentMonth = new Date().getMonth() + 1;
        const projectionMonths: ProjectionData['projectionMonths'] = [];
        
        for (let i = 1; i <= 6; i++) {
            let m = currentMonth + i;
            let y = currentYear;
            if (m > 12) {
                m -= 12;
                y += 1;
            }
            projectionMonths.push({
                month: m,
                year: y,
                projectedIncome: Math.round(avgIncome),
                projectedExpense: Math.round(avgExpense),
                projectedBalance: Math.round(avgBalance),
            });
        }

        return {
            monthsWithData: count,
            avgIncome: Math.round(avgIncome),
            avgExpense: Math.round(avgExpense),
            avgBalance: Math.round(avgBalance),
            projectionMonths,
        };
    }, [yearTotals, totalIncome, totalExpenses, totalBalance, currentYear]);

    return {
        annualTotals,
        totalIncome,
        totalExpenses,
        totalCredit,
        totalBalance,
        projection,
    };
}

import { useCallback } from 'react';
import { useBudgetStore } from '../store/budgetStore';
import { prevMonth, nextMonth } from '../utils/formatters';

export function usePeriodNavigation() {
    const { currentYear, currentMonth, setCurrentPeriod } = useBudgetStore();

    const goToPrev = useCallback(() => {
        const p = prevMonth(currentYear, currentMonth);
        setCurrentPeriod(p.year, p.month);
    }, [currentYear, currentMonth, setCurrentPeriod]);

    const goToNext = useCallback(() => {
        const n = nextMonth(currentYear, currentMonth);
        setCurrentPeriod(n.year, n.month);
    }, [currentYear, currentMonth, setCurrentPeriod]);

    return { goToPrev, goToNext };
}

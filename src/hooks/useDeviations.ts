import { useMemo } from 'react';
import { useBudgetStore } from '../store/budgetStore';
import type { DeviationItem } from '../types';

/**
 * Returns filtered deviation lists for the current month.
 * Memoized to avoid re-computation on every render.
 */
export function useDeviations() {
    const deviations = useBudgetStore(s => s.deviations);

    const over = useMemo(
        () => deviations.filter(d => d.status === 'over'),
        [deviations]
    );

    const warning = useMemo(
        () => deviations.filter(d => d.status === 'warning'),
        [deviations]
    );

    const ok = useMemo(
        () => deviations.filter(d => d.status === 'ok'),
        [deviations]
    );

    const hasAlerts = over.length > 0 || warning.length > 0;

    return { deviations, over, warning, ok, hasAlerts };
}

import { useEffect } from 'react';
import { useRecurringStore } from '../store/recurringStore';

export function usePendingRecurring(year: number, month: number) {
    const { pending, loadPending } = useRecurringStore();

    useEffect(() => {
        loadPending(year, month);
    }, [year, month, loadPending]);

    return { pending, reload: () => loadPending(year, month) };
}

import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Currency ─────────────────────────────────────────────────────────────────

/** Placeholder shown instead of amounts when the user hides them (privacy mode). */
export const MASKED_AMOUNT = '••••••';

/**
 * Format a number as currency.
 * Uses Argentine peso sign by default; adjust locale/currency to taste.
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

/** Format an amount, or return the mask when amounts are hidden. */
export function formatAmount(amount: number, visible: boolean): string {
    return visible ? formatCurrency(amount) : MASKED_AMOUNT;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/** Format an ISO date string (YYYY-MM-DD) to a display string */
export function formatDate(isoDate: string): string {
    try {
        return format(parseISO(isoDate), 'd MMM yyyy', { locale: es });
    } catch {
        return isoDate;
    }
}

/** Format a month number and year as "Febrero 2026" */
export function formatMonthYear(year: number, month: number): string {
    const d = new Date(year, month - 1, 1);
    return format(d, 'MMMM yyyy', { locale: es });
}

/** Return today's date as ISO string (YYYY-MM-DD) */
export function todayISO(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

// ─── Percentage ───────────────────────────────────────────────────────────────

// ─── Month navigation helpers ─────────────────────────────────────────────────

export function prevMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 12) return { year: year + 1, month: 1 };
    return { year, month: month + 1 };
}

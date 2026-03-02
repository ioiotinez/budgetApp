import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Currency ─────────────────────────────────────────────────────────────────

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

/** Format a raw number with thousands separator, no currency symbol */
export function formatNumber(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
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

/** Return an ISO string for a given JS Date */
export function toISO(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

// ─── Percentage ───────────────────────────────────────────────────────────────

export function formatPercent(value: number): string {
    return `${Math.round(value)}%`;
}

// ─── Month navigation helpers ─────────────────────────────────────────────────

export function prevMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 12) return { year: year + 1, month: 1 };
    return { year, month: month + 1 };
}

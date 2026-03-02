import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

// ─── Palette ──────────────────────────────────────────────────────────────────
// Primary: Teal-500  (#14b8a6)
// Secondary: Indigo-400  (#818cf8)
// Error: Rose-500  (#f43f5e)

const TEAL = '#14b8a6';
const TEAL_CONTAINER = '#ccfbf1';
const INDIGO = '#818cf8';
const INDIGO_CONTAINER = '#e0e7ff';
const ROSE = '#f43f5e';
const ROSE_CONTAINER = '#ffe4e6';

const DARK_SURFACE = '#0F172A';        // Slate-900
const DARK_SURFACE_VARIANT = '#1E293B'; // Slate-800
const DARK_ON_SURFACE = '#E2E8F0';     // Slate-200

const LIGHT_SURFACE = '#F8FAFC';       // Slate-50
const LIGHT_SURFACE_VARIANT = '#F1F5F9'; // Slate-100

export const AppLightTheme: MD3Theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: TEAL,
        primaryContainer: TEAL_CONTAINER,
        secondary: INDIGO,
        secondaryContainer: INDIGO_CONTAINER,
        error: ROSE,
        errorContainer: ROSE_CONTAINER,
        background: LIGHT_SURFACE,
        surface: '#FFFFFF',
        surfaceVariant: LIGHT_SURFACE_VARIANT,
        onSurface: '#1E293B',
        onSurfaceVariant: '#64748B',
        outline: '#CBD5E1',
    },
};

export const AppDarkTheme: MD3Theme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: TEAL,
        primaryContainer: '#134e4a',
        secondary: INDIGO,
        secondaryContainer: '#312e81',
        error: ROSE,
        errorContainer: '#881337',
        background: DARK_SURFACE,
        surface: DARK_SURFACE_VARIANT,
        surfaceVariant: '#263548',
        onSurface: DARK_ON_SURFACE,
        onSurfaceVariant: '#94A3B8',
        outline: '#334155',
    },
};

// ─── Semantic Color Helpers ───────────────────────────────────────────────────

export const deviationColors = {
    ok: '#10b981',       // Emerald-500
    warning: '#f59e0b', // Amber-500
    over: '#ef4444',    // Red-500
} as const;

export const incomeColor = '#10b981'; // Emerald-500
export const expenseColor = '#f43f5e'; // Rose-500

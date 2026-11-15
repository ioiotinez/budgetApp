import * as SQLite from 'expo-sqlite';

/**
 * SQL schema DDL — run once on first launch (or after migrations).
 * All tables are created with IF NOT EXISTS for safety.
 */
export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
    icon        TEXT    NOT NULL DEFAULT '💰',
    color       TEXT    NOT NULL DEFAULT '#14b8a6',
    createdAt   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budget_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount      REAL    NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS monthly_budgets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    year        INTEGER NOT NULL,
    month       INTEGER NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount      REAL    NOT NULL DEFAULT 0,
    UNIQUE(year, month, category_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    date        TEXT    NOT NULL,
    description TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','debit','credit')),
    createdAt   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);
  CREATE INDEX IF NOT EXISTS idx_monthly_budgets_year_month ON monthly_budgets(year, month);
  CREATE INDEX IF NOT EXISTS idx_budget_templates_category ON budget_templates(category_id);

  CREATE TABLE IF NOT EXISTS recurring_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    description TEXT    NOT NULL DEFAULT '',
    frequency   TEXT    NOT NULL CHECK(frequency IN ('weekly','biweekly','monthly','yearly')),
    start_date  TEXT    NOT NULL,
    end_date    TEXT,
    last_generated_date TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    createdAt   TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_recurring_rules_active ON recurring_rules(active);
`;

/** Predefined categories to seed on first launch */
export const DEFAULT_CATEGORIES = [
  { name: 'Sueldo', type: 'income', icon: '💼', color: '#10b981' },
  { name: 'Inversiones', type: 'income', icon: '📈', color: '#3b82f6' },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#8b5cf6' },
  { name: 'Otros ingresos', type: 'income', icon: '🎁', color: '#f59e0b' },
  { name: 'Hipoteca/Alquiler', type: 'expense', icon: '🏠', color: '#ef4444' },
  { name: 'Alimentación', type: 'expense', icon: '🛒', color: '#f97316' },
  { name: 'Transporte', type: 'expense', icon: '🚗', color: '#eab308' },
  { name: 'Salud', type: 'expense', icon: '🏥', color: '#ec4899' },
  { name: 'Ocio', type: 'expense', icon: '🎬', color: '#a855f7' },
  { name: 'Educación', type: 'expense', icon: '📚', color: '#06b6d4' },
  { name: 'Ropa', type: 'expense', icon: '👕', color: '#84cc16' },
  { name: 'Servicios', type: 'expense', icon: '💡', color: '#64748b' },
  { name: 'Restaurantes', type: 'expense', icon: '🍽️', color: '#f43f5e' },
  { name: 'Viajes', type: 'expense', icon: '✈️', color: '#0ea5e9' },
  { name: 'Otros gastos', type: 'expense', icon: '📦', color: '#78716c' },
] as const;

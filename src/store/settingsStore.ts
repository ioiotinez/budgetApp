import { create } from 'zustand';
import { getDb } from '../db/database';

interface SettingsState {
    darkMode: boolean;

    // Actions
    toggleDarkMode: () => void;
    loadSettings: () => Promise<void>;
}

const SETTING_KEYS = {
    DARK_MODE: 'dark_mode',
};

async function saveSetting(key: string, value: string) {
    const db = await getDb();
    await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
    );
}

async function getSetting(key: string): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [key]
    );
    return row?.value ?? null;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    darkMode: false,

    loadSettings: async () => {
        const darkMode = await getSetting(SETTING_KEYS.DARK_MODE);
        set({
            darkMode: darkMode === 'true',
        });
    },

    toggleDarkMode: () => {
        const newVal = !get().darkMode;
        saveSetting(SETTING_KEYS.DARK_MODE, String(newVal));
        set({ darkMode: newVal });
    },
}));


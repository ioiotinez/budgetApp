import { create } from 'zustand';
import { getDb } from '../db/database';

interface SettingsState {
    darkMode: boolean;
    amountsVisible: boolean;

    // Actions
    toggleDarkMode: () => void;
    toggleAmountsVisibility: () => void;
    loadSettings: () => Promise<void>;
}

const SETTING_KEYS = {
    DARK_MODE: 'dark_mode',
    AMOUNTS_VISIBLE: 'amounts_visible',
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
    amountsVisible: true,

    loadSettings: async () => {
        const darkMode = await getSetting(SETTING_KEYS.DARK_MODE);
        const amountsVisible = await getSetting(SETTING_KEYS.AMOUNTS_VISIBLE);
        set({
            darkMode: darkMode === 'true',
            // Default to visible unless the user explicitly hid amounts before.
            amountsVisible: amountsVisible !== 'false',
        });
    },

    toggleDarkMode: () => {
        const newVal = !get().darkMode;
        saveSetting(SETTING_KEYS.DARK_MODE, String(newVal));
        set({ darkMode: newVal });
    },

    toggleAmountsVisibility: () => {
        const newVal = !get().amountsVisible;
        saveSetting(SETTING_KEYS.AMOUNTS_VISIBLE, String(newVal));
        set({ amountsVisible: newVal });
    },
}));


import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDb } from './src/db/database';
import { AppLightTheme, AppDarkTheme } from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { useSettingsStore } from './src/store/settingsStore';

/**
 * Root component.
 *
 * Initialization order:
 * 1. Open SQLite DB (creates tables + seeds categories on first run)
 * 2. Load persisted settings (theme, Google auth token)
 * 3. Render app with the correct Paper theme
 */
function AppContent() {
  const [ready, setReady] = useState(false);
  const { darkMode, loadSettings } = useSettingsStore();

  useEffect(() => {
    (async () => {
      // Initialize DB — runs migrations & seeds on first launch
      await getDb();
      await loadSettings();
      setReady(true);
    })();
  }, []);

  if (!ready) return <View style={styles.splash} />;

  const theme = darkMode ? AppDarkTheme : AppLightTheme;

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <AppNavigator />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#0F172A' },
});

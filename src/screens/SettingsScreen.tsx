import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
    Text, Surface, useTheme, Button, Divider, List, ActivityIndicator, Switch, TextInput,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSettingsStore } from '../store/settingsStore';
import { useBudgetStore } from '../store/budgetStore';
import {
    exportLocal, pickLocalBackup, restoreFromBackup,
} from '../services/backupService';
import { formatMonthYear } from '../utils/formatters';
import type { SettingsStackParamList } from '../types';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;

export default function SettingsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<Nav>();

    const {
        darkMode, loadSettings, toggleDarkMode, creditCardLimit, setCreditCardLimit,
    } = useSettingsStore();

    const { currentYear, currentMonth } = useBudgetStore();

    const [busyExport, setBusyExport] = useState(false);
    const [busyImport, setBusyImport] = useState(false);
    const [limitInput, setLimitInput] = useState('');

    useEffect(() => { loadSettings(); }, []);

    useEffect(() => {
        setLimitInput(creditCardLimit > 0 ? String(creditCardLimit) : '');
    }, [creditCardLimit]);

    const saveCreditCardLimit = () => {
        const parsed = parseFloat(limitInput.replace(',', '.'));
        setCreditCardLimit(Number.isFinite(parsed) ? parsed : 0);
    };

    const handleExportLocal = async () => {
        setBusyExport(true);
        try { await exportLocal(); }
        catch (e) { Alert.alert('Error', String(e)); }
        finally { setBusyExport(false); }
    };

    const handleImportLocal = async () => {
        const data = await pickLocalBackup();
        if (!data) return;
        Alert.alert(
            'Restaurar datos',
            '¿Reemplazar todos los datos actuales o fusionar con los del archivo?',
            [
                {
                    text: 'Reemplazar', onPress: async () => {
                        setBusyImport(true);
                        try { await restoreFromBackup(data, false); Alert.alert('✅ Datos restaurados'); }
                        catch (e) { Alert.alert('Error', String(e)); }
                        finally { setBusyImport(false); }
                    }
                },
                {
                    text: 'Fusionar', onPress: async () => {
                        setBusyImport(true);
                        try { await restoreFromBackup(data, true); Alert.alert('✅ Datos fusionados'); }
                        catch (e) { Alert.alert('Error', String(e)); }
                        finally { setBusyImport(false); }
                    }
                },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={styles.scroll}
        >
            {/* ── Presupuesto ── */}
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                PRESUPUESTO
            </Text>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
                <List.Item
                    title="Categorías"
                    description="Administrar categorías de ingresos y gastos"
                    left={() => <View style={styles.listIconContainer}><Text style={styles.listIcon}>🏷️</Text></View>}
                    onPress={() => navigation.navigate('Categories')}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
                <Divider />
                <List.Item
                    title="Presupuesto mensual"
                    description={`Configurar ${formatMonthYear(currentYear, currentMonth)}`}
                    left={() => <View style={styles.listIconContainer}><Text style={styles.listIcon}>📅</Text></View>}
                    onPress={() => navigation.navigate('BudgetSetup', { year: currentYear, month: currentMonth })}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
            </Surface>

            {/* ── Tarjeta de crédito ── */}
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                TARJETA DE CRÉDITO
            </Text>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
                <View style={styles.limitContainer}>
                    <TextInput
                        label="Límite mensual"
                        value={limitInput}
                        onChangeText={setLimitInput}
                        onBlur={saveCreditCardLimit}
                        onSubmitEditing={saveCreditCardLimit}
                        keyboardType="decimal-pad"
                        mode="outlined"
                        left={<TextInput.Affix text="$" />}
                        placeholder="Sin límite"
                    />
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                        Los gastos con tarjeta no descuentan del presupuesto mensual. Se avisa al 80 % y al superar el límite.
                    </Text>
                </View>
            </Surface>

            {/* ── Transacciones Recurrentes ── */}
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                TRANSACCIONES RECURRENTES
            </Text>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
                <List.Item
                    title="Reglas recurrentes"
                    description="Administrar transacciones que se repiten"
                    left={() => <View style={styles.listIconContainer}><Text style={styles.listIcon}>🔄</Text></View>}
                    onPress={() => navigation.navigate('RecurringRules')}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
            </Surface>

            {/* ── Apariencia ── */}
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                APARIENCIA
            </Text>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
                <List.Item
                    title="Modo Oscuro"
                    left={() => <View style={styles.listIconContainer}><Text style={styles.listIcon}>🌙</Text></View>}
                    right={() => (
                        <Switch
                            value={darkMode}
                            onValueChange={toggleDarkMode}
                            color={theme.colors.primary}
                        />
                    )}
                    titleStyle={{ color: theme.colors.onSurface }}
                />
            </Surface>

            {/* ── Respaldo local ── */}
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                RESPALDO LOCAL (JSON)
            </Text>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
                <List.Item
                    title="Exportar JSON"
                    description="Compartir archivo de respaldo"
                    left={() => <View style={styles.listIconContainer}><Text style={styles.listIcon}>📤</Text></View>}
                    onPress={handleExportLocal}
                    disabled={busyExport}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
                <Divider />
                <List.Item
                    title="Importar JSON"
                    description="Restaurar o fusionar desde archivo"
                    left={() => <View style={styles.listIconContainer}><Text style={styles.listIcon}>📥</Text></View>}
                    onPress={handleImportLocal}
                    disabled={busyImport}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
            </Surface>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 60 },
    sectionLabel: { marginBottom: 6, letterSpacing: 0.8 },
    card: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
    listIconContainer: { marginLeft: 12, marginRight: 8, justifyContent: 'center' },
    listIcon: { fontSize: 22 },
    limitContainer: { padding: 16 },
});


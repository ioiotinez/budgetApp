import React, { useEffect, useCallback, useMemo } from 'react';
import {
    View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import {
    Text, Surface, useTheme, FAB, Badge, Chip, IconButton,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useTransactionStore } from '../store/transactionStore';
import { useBudgetStore } from '../store/budgetStore';
import { useCategoryStore } from '../store/categoryStore';
import { useRecurringStore } from '../store/recurringStore';
import { useDeviations } from '../hooks/useDeviations';
import { usePeriodNavigation } from '../hooks/usePeriodNavigation';
import { SummaryCard } from '../components/SummaryCard';
import { DeviationRow } from '../components/DeviationRow';
import { PendingRecurringBanner } from '../components/PendingRecurringBanner';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import { deviationColors, incomeColor, expenseColor } from '../theme/theme';
import type { RootTabParamList } from '../types';

type Nav = BottomTabNavigationProp<RootTabParamList, 'Dashboard'>;

export default function DashboardScreen() {
    const theme = useTheme();
    const navigation = useNavigation<Nav>();

    const { currentYear, currentMonth, checkAndInitCurrentMonth, loadDeviations, loadGlobalDeviations } =
        useBudgetStore();
    const { monthTotals, loadMonthTotals } = useTransactionStore();
    const { loadCategories } = useCategoryStore();
    const { loadPending } = useRecurringStore();
    const { deviations, over, warning, hasAlerts } = useDeviations();
    const { globalDeviations } = useBudgetStore();
    const { goToPrev, goToNext } = usePeriodNavigation();

    const reload = useCallback(async () => {
        await loadCategories();
        await checkAndInitCurrentMonth();
        await loadMonthTotals(currentYear, currentMonth);
        await loadDeviations(currentYear, currentMonth);
        await loadGlobalDeviations(currentYear, currentMonth);
        await loadPending(currentYear, currentMonth);
    }, [currentYear, currentMonth, loadCategories, checkAndInitCurrentMonth, loadMonthTotals, loadDeviations, loadGlobalDeviations, loadPending]);

    useFocusEffect(useCallback(() => { reload(); }, [reload]));

    const balance = useMemo(() => monthTotals.income - monthTotals.expense, [monthTotals]);
    const balanceColor = useMemo(() => balance >= 0 ? incomeColor : expenseColor, [balance]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
            >
                {/* ── Period header ── */}
                <View style={styles.periodRow}>
                    <IconButton icon="chevron-left" onPress={goToPrev} />
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                        {formatMonthYear(currentYear, currentMonth)}
                    </Text>
                    <IconButton icon="chevron-right" onPress={goToNext} />
                </View>

                {/* ── Summary cards ── */}
                <View style={styles.cardsRow}>
                    <SummaryCard label="Ingresos" value={monthTotals.income} color={incomeColor} />
                    <SummaryCard label="Gastos" value={monthTotals.expense} color={expenseColor} />
                </View>

                {/* ── Pending Recurring ── */}
                <PendingRecurringBanner onConfirm={reload} />

                {/* ── Global Deviations ── */}
                {globalDeviations.length > 0 && globalDeviations.some(g => g.budgeted > 0) && (
                    <Surface style={[styles.globalDevBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginBottom: 12, fontWeight: '700' }}>
                            Desviación vs Presupuestado
                        </Text>
                        {globalDeviations.map(gd => {
                            const isIncome = gd.type === 'income';
                            const isOver = isIncome ? gd.percentage < 100 : gd.percentage > 100;
                            const devColor = isOver ? expenseColor : incomeColor;
                            const label = isIncome ? 'Ingresos' : 'Gastos';
                            const icon = isIncome ? '📈' : '📊';
                            const statusLabel = isIncome 
                                ? (gd.percentage < 100 ? 'UNDER' : 'OK')
                                : (gd.percentage > 100 ? 'OVER' : 'OK');

                            return (
                                <View key={gd.type} style={styles.globalDevRow}>
                                    <Text style={styles.globalDevIcon}>{icon}</Text>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.globalDevHeader}>
                                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                                                {label}
                                            </Text>
                                            <Chip 
                                                compact 
                                                mode="flat"
                                                style={{ backgroundColor: devColor + '20' }}
                                                textStyle={{ color: devColor, fontSize: 11, fontWeight: '700' }}
                                            >
                                                {statusLabel} {Math.round(gd.percentage)}%
                                            </Chip>
                                        </View>
                                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                            Presupuestado: {formatCurrency(gd.budgeted)} → Real: {formatCurrency(gd.actual)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </Surface>
                )}

                <Surface style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Balance</Text>
                    <Text variant="headlineMedium" style={{ color: balanceColor, fontWeight: '800' }}>
                        {formatCurrency(balance)}
                    </Text>
                </Surface>

                {/* ── Deviation alerts ── */}
                {hasAlerts && (
                    <Surface style={[styles.alertBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginBottom: 8, fontWeight: '700' }}>
                            ⚠️ Alertas de presupuesto
                        </Text>
                        {over.map(d => (
                            <DeviationRow key={d.category.id} item={d} />
                        ))}
                        {warning.map(d => (
                            <DeviationRow key={d.category.id} item={d} />
                        ))}
                    </Surface>
                )}

                {/* ── Quick category overview ── */}
                <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Resumen por categoría
                </Text>
                {deviations.length === 0 ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                        Sin presupuesto configurado para este mes.
                    </Text>
                ) : (
                    deviations.map(d => (
                        <Surface key={d.category.id} style={[styles.devCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
                            <View style={styles.devRow}>
                                <Text style={styles.devIcon}>{d.category.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.devNameRow}>
                                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                                            {d.category.name}
                                        </Text>
                                        <Text variant="labelSmall" style={{ color: deviationColors[d.status] }}>
                                            {Math.round(d.percentage)}%
                                        </Text>
                                    </View>
                                    <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                {
                                                    width: `${Math.min(d.percentage, 100)}%`,
                                                    backgroundColor: deviationColors[d.status],
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                        {formatCurrency(d.actual)} / {formatCurrency(d.budgeted)}
                                    </Text>
                                </View>
                            </View>
                        </Surface>
                    ))
                )}
            </ScrollView>

            {/* ── FAB ── */}
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="white"
                onPress={() =>
                    navigation.navigate('Transactions', { screen: 'AddEditTransaction', params: {} } as any)
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 96, maxWidth: 600, alignSelf: 'center', width: '100%' },
    periodRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    summaryCard: {
        flex: 1, borderRadius: 16, padding: 16,
    },
    balanceCard: {
        borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20,
    },
    alertBox: {
        borderRadius: 16, padding: 16, marginBottom: 16,
    },
    alertRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 4,
    },
    sectionLabel: { marginBottom: 8, fontWeight: '600' },
    devCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
    devRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    devIcon: { fontSize: 22, marginTop: 2 },
    devNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    fab: { position: 'absolute', right: 20, bottom: 24, borderRadius: 16 },
    globalDevBox: { borderRadius: 16, padding: 16, marginBottom: 16 },
    globalDevRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    globalDevIcon: { fontSize: 20, marginTop: 2 },
    globalDevHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
});

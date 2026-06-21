import React, { useCallback, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme, IconButton, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import { useTransactionStore } from '../store/transactionStore';
import { useCategoryStore } from '../store/categoryStore';
import { useBudgetStore } from '../store/budgetStore';
import { useMonthlyReport } from '../hooks/useMonthlyReport';
import { useAnnualReport } from '../hooks/useAnnualReport';
import { formatCurrency, formatMonthYear, prevMonth, nextMonth } from '../utils/formatters';
import { incomeColor, expenseColor } from '../theme/theme';
import { getYearTotals, type YearMonthTotal } from '../db/transactionService';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
    const theme = useTheme();
    const { currentYear, currentMonth, setCurrentPeriod } = useBudgetStore();
    const { loadTransactions, loadMonthTotals } = useTransactionStore();
    const { loadCategories } = useCategoryStore();
    const { totalIncome, totalExpenses, balance, expenseByCategory } = useMonthlyReport();
    const [reportType, setReportType] = useState('monthly');
    const [yearTotals, setYearTotals] = useState<YearMonthTotal[]>([]);

    useFocusEffect(useCallback(() => {
        loadCategories();
        loadTransactions({ year: currentYear, month: currentMonth });
        loadMonthTotals(currentYear, currentMonth);
    }, [currentYear, currentMonth]));

    useEffect(() => {
        getYearTotals(currentYear).then(setYearTotals);
    }, [currentYear]);

    const { annualTotals, totalIncome: annualIncome, totalExpenses: annualExpenses, totalBalance, projection } = useAnnualReport(yearTotals);

    const bgColor = theme.colors.background;

    const goToPrev = () => {
        const p = prevMonth(currentYear, currentMonth);
        setCurrentPeriod(p.year, p.month);
    };
    const goToNext = () => {
        const n = nextMonth(currentYear, currentMonth);
        setCurrentPeriod(n.year, n.month);
    };

    const balanceColor = balance >= 0 ? incomeColor : expenseColor;

    const goToPrevYear = () => setCurrentPeriod(currentYear - 1, currentMonth);
    const goToNextYear = () => setCurrentPeriod(currentYear + 1, currentMonth);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={styles.scroll}
        >
            <SegmentedButtons
                value={reportType}
                onValueChange={setReportType}
                buttons={[
                    { value: 'monthly', label: 'Mensual' },
                    { value: 'annual', label: 'Anual' },
                ]}
                style={styles.segmented}
            />

            {reportType === 'monthly' ? (
                <>
                    {/* Period header */}
                    <View style={styles.periodRow}>
                        <IconButton icon="chevron-left" onPress={goToPrev} />
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                            {formatMonthYear(currentYear, currentMonth)}
                        </Text>
                        <IconButton icon="chevron-right" onPress={goToNext} />
                    </View>

                    {/* Summary row */}
                    <View style={styles.summaryRow}>
                        <StatCard label="Ingresos" value={totalIncome} color={incomeColor} theme={theme} />
                        <StatCard label="Gastos" value={totalExpenses} color={expenseColor} theme={theme} />
                        <StatCard label="Balance" value={balance} color={balanceColor} theme={theme} />
                    </View>

                    {/* Category breakdown list */}
                    {expenseByCategory.length > 0 && (
                        <>
                            <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                                Detalle por categoría
                            </Text>
                            <Surface style={[styles.listCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
                                {expenseByCategory.map((item, idx) => (
                                    <View
                                        key={item.label}
                                        style={[
                                            styles.listRow,
                                            idx < expenseByCategory.length - 1 && {
                                                borderBottomWidth: 1, borderBottomColor: theme.colors.outline,
                                            },
                                        ]}
                                    >
                                        <View style={[styles.listDot, { backgroundColor: item.color }]} />
                                        <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>
                                            {item.label}
                                        </Text>
                                        <Text variant="bodyMedium" style={{ color: expenseColor, fontWeight: '700' }}>
                                            {formatCurrency(item.value)}
                                        </Text>
                                        <Text
                                            variant="labelSmall"
                                            style={{ color: theme.colors.onSurfaceVariant, width: 40, textAlign: 'right' }}
                                        >
                                            {totalExpenses > 0 ? `${Math.round((item.value / totalExpenses) * 100)}%` : '0%'}
                                        </Text>
                                    </View>
                                ))}
                            </Surface>
                        </>
                    )}
                </>
            ) : (
                <>
                    {/* Annual view */}
                    <View style={styles.periodRow}>
                        <IconButton icon="chevron-left" onPress={goToPrevYear} />
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                            {currentYear}
                        </Text>
                        <IconButton icon="chevron-right" onPress={goToNextYear} />
                    </View>

                    {/* Annual summary */}
                    <View style={styles.summaryRow}>
                        <StatCard label="Ingresos" value={annualIncome} color={incomeColor} theme={theme} />
                        <StatCard label="Gastos" value={annualExpenses} color={expenseColor} theme={theme} />
                        <StatCard label="Balance" value={totalBalance} color={totalBalance >= 0 ? incomeColor : expenseColor} theme={theme} />
                    </View>

                    {/* Monthly breakdown */}
                    <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                        Detalle por mes
                    </Text>
                    <Surface style={[styles.listCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
                        {annualTotals.map((m, idx) => (
                            <View
                                key={m.month}
                                style={[
                                    styles.listRow,
                                    idx < annualTotals.length - 1 && {
                                        borderBottomWidth: 1, borderBottomColor: theme.colors.outline,
                                    },
                                ]}
                            >
                                <Text variant="bodyMedium" style={{ width: 40, color: theme.colors.onSurface }}>
                                    {MONTH_NAMES[m.month - 1]}
                                </Text>
                                <Text variant="bodyMedium" style={{ flex: 1, color: incomeColor }}>
                                    {formatCurrency(m.income)}
                                </Text>
                                <Text variant="bodyMedium" style={{ color: expenseColor }}>
                                    {formatCurrency(m.expense)}
                                </Text>
                                <Text variant="bodyMedium" style={{ color: m.balance >= 0 ? incomeColor : expenseColor, width: 70, textAlign: 'right' }}>
                                    {formatCurrency(m.balance)}
                                </Text>
                            </View>
                        ))}
                    </Surface>

                    {/* Projection section */}
                    {projection && (
                        <>
                            <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                                Proyección
                            </Text>
                            <Surface style={[styles.listCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
                                <View style={[styles.listRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.outline }]}>
                                    <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>
                                        Promedio ({projection.monthsWithData} meses)
                                    </Text>
                                    <Text variant="bodyMedium" style={{ color: incomeColor }}>
                                        {formatCurrency(projection.avgIncome)}
                                    </Text>
                                    <Text variant="bodyMedium" style={{ color: expenseColor }}>
                                        {formatCurrency(projection.avgExpense)}
                                    </Text>
                                </View>
                                {projection.projectionMonths.map((p, idx) => (
                                    <View
                                        key={`${p.year}-${p.month}`}
                                        style={[
                                            styles.listRow,
                                            idx < projection.projectionMonths.length - 1 && {
                                                borderBottomWidth: 1, borderBottomColor: theme.colors.outline,
                                            },
                                        ]}
                                    >
                                        <Text variant="bodyMedium" style={{ width: 70, color: theme.colors.onSurfaceVariant }}>
                                            {MONTH_NAMES[p.month - 1]} {p.year.toString().slice(2)}
                                        </Text>
                                        <Text variant="bodyMedium" style={{ flex: 1, color: incomeColor, opacity: 0.7 }}>
                                            {formatCurrency(p.projectedIncome)}
                                        </Text>
                                        <Text variant="bodyMedium" style={{ color: expenseColor, opacity: 0.7 }}>
                                            {formatCurrency(p.projectedExpense)}
                                        </Text>
                                        <Text variant="bodyMedium" style={{ color: p.projectedBalance >= 0 ? incomeColor : expenseColor, width: 70, textAlign: 'right', opacity: 0.7 }}>
                                            {formatCurrency(p.projectedBalance)}
                                        </Text>
                                    </View>
                                ))}
                            </Surface>
                        </>
                    )}
                </>
            )}
        </ScrollView>
    );
}

function StatCard({ label, value, color, theme }: {
    label: string; value: number; color: string; theme: any;
}) {
    return (
        <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
            <Text variant="labelLarge" style={{ color, fontWeight: '700', marginTop: 2 }}>
                {formatCurrency(value)}
            </Text>
        </Surface>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 60, maxWidth: 600, alignSelf: 'center', width: '100%' },
    segmented: { marginBottom: 16 },
    periodRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
    },
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 12, padding: 12 },
    sectionLabel: { fontWeight: '700', marginBottom: 8, marginTop: 4 },
    listCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
    listRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    },
    listDot: { width: 10, height: 10, borderRadius: 5 },
    empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Surface, useTheme, Chip } from 'react-native-paper';

import { formatAmount, formatCurrency } from '../utils/formatters';
import { deviationColors, expenseColor, creditCardColor } from '../theme/theme';
import type { CreditCardCategoryTotal } from '../types';

interface CreditCardSummaryCardProps {
    total: number;
    byCategory: CreditCardCategoryTotal[];
    /** Monthly limit. 0 means "not configured". */
    limit: number;
    visible?: boolean;
}

/**
 * Credit card spending for the period. These amounts are tracked outside the
 * monthly budget: they never change income/expense totals, they only warn when
 * the configured monthly limit is approached or exceeded.
 */
export function CreditCardSummaryCard({ total, byCategory, limit, visible = true }: CreditCardSummaryCardProps) {
    const theme = useTheme();

    const hasLimit = limit > 0;
    const percentage = hasLimit ? (total / limit) * 100 : 0;
    const status: 'ok' | 'warning' | 'over' = !hasLimit || percentage < 80
        ? 'ok'
        : percentage > 100 ? 'over' : 'warning';
    const statusColor = status === 'ok' ? creditCardColor : deviationColors[status];

    const statusLabel = !hasLimit
        ? null
        : status === 'over' ? 'Límite superado' : status === 'warning' ? 'Cerca del límite' : 'Dentro del límite';

    return (
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.header}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    💳 Tarjeta de crédito
                </Text>
                {statusLabel && (
                    <Chip
                        compact
                        mode="flat"
                        style={{ backgroundColor: statusColor + '20' }}
                        textStyle={{ color: statusColor, fontSize: 11, fontWeight: '700' }}
                    >
                        {statusLabel}
                    </Chip>
                )}
            </View>

            <Text
                variant="headlineSmall"
                style={{ color: visible ? statusColor : theme.colors.onSurfaceVariant, fontWeight: '700' }}
                accessibilityLabel={visible ? `Tarjeta de crédito: ${formatCurrency(total)}` : 'Tarjeta de crédito: oculto'}
            >
                {formatAmount(total, visible)}
            </Text>

            {hasLimit ? (
                <>
                    <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <View
                            style={[
                                styles.fill,
                                {
                                    width: `${Math.min(percentage, 100)}%`,
                                    backgroundColor: statusColor,
                                },
                            ]}
                        />
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        {Math.round(percentage)}% de {formatAmount(limit, visible)}
                    </Text>
                </>
            ) : (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Sin límite configurado · Ajustes → Límite de tarjeta
                </Text>
            )}

            {byCategory.length > 0 && (
                <View style={styles.breakdown}>
                    {byCategory.map(item => (
                        <View key={item.category_id} style={styles.row}>
                            <Text style={styles.icon}>{item.icon}</Text>
                            <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurface }}>
                                {item.name}
                            </Text>
                            <Text variant="bodySmall" style={{ color: expenseColor, fontWeight: '600' }}>
                                {formatAmount(item.total, visible)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </Surface>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 16, padding: 16, marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
    fill: { height: 6, borderRadius: 3 },
    breakdown: { marginTop: 12, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    icon: { fontSize: 16 },
});

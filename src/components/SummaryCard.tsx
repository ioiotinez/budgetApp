import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';

import { formatCurrency } from '../utils/formatters';
import { incomeColor, expenseColor } from '../theme/theme';

interface SummaryCardProps {
    label: string;
    value: number;
    color: string;
}

export function SummaryCard({ label, value, color }: SummaryCardProps) {
    const theme = useTheme();

    return (
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
            <Text variant="titleLarge" style={{ color, fontWeight: '700', marginTop: 4 }}>
                {formatCurrency(value)}
            </Text>
        </Surface>
    );
}

const styles = StyleSheet.create({
    summaryCard: {
        flex: 1, borderRadius: 16, padding: 16,
    },
});

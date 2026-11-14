import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';

import { formatAmount } from '../utils/formatters';

interface SummaryCardProps {
    label: string;
    value: number;
    color: string;
    visible?: boolean;
}

export function SummaryCard({ label, value, color, visible = true }: SummaryCardProps) {
    const theme = useTheme();
    const valueColor = visible ? color : theme.colors.onSurfaceVariant;
    const valueText = formatAmount(value, visible);

    return (
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
            <Text
                variant="titleLarge"
                style={{ color: valueColor, fontWeight: '700', marginTop: 4 }}
                accessibilityLabel={visible ? `${label}: ${valueText}` : `${label}: oculto`}
            >
                {valueText}
            </Text>
        </Surface>
    );
}

const styles = StyleSheet.create({
    summaryCard: {
        flex: 1, borderRadius: 16, padding: 16,
    },
});

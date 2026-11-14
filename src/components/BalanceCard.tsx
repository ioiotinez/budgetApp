import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Surface, useTheme, IconButton } from 'react-native-paper';

import { formatAmount } from '../utils/formatters';
import { incomeColor, expenseColor } from '../theme/theme';

interface BalanceCardProps {
    value: number;
    visible: boolean;
    onToggleVisibility: () => void;
}

/**
 * Monthly balance card with a privacy toggle, like banking apps do for
 * account balances. The toggle hides every headline amount on the dashboard
 * (balance, income and expenses); hidden values are masked and turn neutral so
 * neither the sign (positive/negative) nor the income/expense colors leak.
 */
export function BalanceCard({ value, visible, onToggleVisibility }: BalanceCardProps) {
    const theme = useTheme();
    const amountColor = !visible
        ? theme.colors.onSurfaceVariant
        : value >= 0
            ? incomeColor
            : expenseColor;
    const amountText = formatAmount(value, visible);

    return (
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.header}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    Balance
                </Text>
                <IconButton
                    icon={visible ? 'eye-outline' : 'eye-off-outline'}
                    iconColor={theme.colors.onSurfaceVariant}
                    size={20}
                    onPress={onToggleVisibility}
                    accessibilityLabel={visible ? 'Ocultar importes' : 'Mostrar importes'}
                    style={styles.toggle}
                />
            </View>
            <Text
                variant="headlineMedium"
                style={[styles.amount, { color: amountColor }]}
                accessibilityLabel={visible ? `Balance: ${amountText}` : 'Balance oculto'}
            >
                {amountText}
            </Text>
        </Surface>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggle: { margin: 0, marginRight: -10 },
    amount: { textAlign: 'center', fontWeight: '800', marginTop: 4 },
});

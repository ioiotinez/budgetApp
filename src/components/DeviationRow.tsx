import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';

import { deviationColors } from '../theme/theme';
import type { DeviationItem } from '../types';

interface DeviationRowProps {
    item: DeviationItem;
}

export function DeviationRow({ item }: DeviationRowProps) {
    const theme = useTheme();
    const color = deviationColors[item.status];

    return (
        <View style={styles.alertRow}>
            <Text style={{ marginRight: 6 }}>{item.category.icon}</Text>
            <Text style={{ flex: 1, color: theme.colors.onSurface }}>{item.category.name}</Text>
            <Chip compact textStyle={{ fontSize: 11 }} style={{ backgroundColor: color + '22' }}>
                <Text style={{ color, fontWeight: '700' }}>{Math.round(item.percentage)}%</Text>
            </Chip>
        </View>
    );
}

const styles = StyleSheet.create({
    alertRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 4,
    },
});

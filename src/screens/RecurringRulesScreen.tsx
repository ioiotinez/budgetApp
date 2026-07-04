import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Surface, useTheme, FAB, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useRecurringStore } from '../store/recurringStore';
import { formatCurrency } from '../utils/formatters';
import type { RecurringRule, SettingsStackParamList } from '../types';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'RecurringRules'>;

const FREQ_LABELS: Record<string, string> = {
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    yearly: 'Anual',
};

export default function RecurringRulesScreen() {
    const theme = useTheme();
    const navigation = useNavigation<Nav>();
    const { rules, loadRules, removeRule } = useRecurringStore();
    const [deleteDialog, setDeleteDialog] = useState<RecurringRule | null>(null);

    useFocusEffect(useCallback(() => { loadRules(); }, [loadRules]));

    const renderItem = ({ item }: { item: RecurringRule }) => (
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <View style={styles.cardLeft}>
                <Text style={styles.icon}>{item.category_icon ?? '💰'}</Text>
                <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                        {item.category_name}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {item.description || FREQ_LABELS[item.frequency]}
                    </Text>
                    <View style={styles.tags}>
                        <Surface style={[styles.freqTag, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {FREQ_LABELS[item.frequency]}
                            </Text>
                        </Surface>
                        {!item.active && (
                            <Surface style={[styles.freqTag, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
                                <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                                    Inactiva
                                </Text>
                            </Surface>
                        )}
                    </View>
                </View>
            </View>
            <View style={styles.cardRight}>
                <Text
                    variant="titleSmall"
                    style={{
                        color: item.type === 'income' ? '#10b981' : '#f43f5e',
                        fontWeight: '700',
                    }}
                >
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
                <View style={styles.actions}>
                    <IconButton
                        icon="pencil-outline"
                        size={18}
                        iconColor={theme.colors.onSurfaceVariant}
                        onPress={() => navigation.navigate('AddEditRecurring', { ruleId: item.id })}
                    />
                    <IconButton
                        icon="trash-can-outline"
                        size={18}
                        iconColor={theme.colors.onSurfaceVariant}
                        onPress={() => setDeleteDialog(item)}
                    />
                </View>
            </View>
        </Surface>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <FlatList
                data={rules}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={{ fontSize: 32, textAlign: 'center' }}>🔄</Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                            No tenés transacciones recurrentes configuradas.
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
                            Tocá el botón + para crear una.
                        </Text>
                    </View>
                }
            />

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="white"
                onPress={() => navigation.navigate('AddEditRecurring', {})}
            />

            <Portal>
                <Dialog visible={!!deleteDialog} onDismiss={() => setDeleteDialog(null)} style={{ borderRadius: 20 }}>
                    <Dialog.Title>Eliminar regla</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            ¿Estás seguro de eliminar esta regla recurrente? Las transacciones ya generadas no se verán afectadas.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialog(null)}>Cancelar</Button>
                        <Button
                            mode="contained"
                            onPress={() => {
                                if (deleteDialog) removeRule(deleteDialog.id);
                                setDeleteDialog(null);
                            }}
                            style={{ backgroundColor: theme.colors.error }}
                        >
                            Eliminar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { padding: 16, paddingBottom: 96 },
    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, marginBottom: 8,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    cardRight: { alignItems: 'flex-end', gap: 4 },
    icon: { fontSize: 24 },
    tags: { flexDirection: 'row', gap: 4, marginTop: 4 },
    freqTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actions: { flexDirection: 'row' },
    empty: { alignItems: 'center', marginTop: 80 },
    fab: { position: 'absolute', right: 20, bottom: 24, borderRadius: 16 },
});

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme, Button, Portal, Dialog } from 'react-native-paper';

import { useRecurringStore } from '../store/recurringStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { PendingRecurring } from '../types';

interface Props {
    onConfirm?: () => void;
}

export function PendingRecurringBanner({ onConfirm }: Props) {
    const theme = useTheme();
    const { pending, confirmPending, skipPending } = useRecurringStore();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<PendingRecurring | null>(null);

    if (pending.length === 0) return null;

    const handleConfirm = async (item: PendingRecurring) => {
        const key = `${item.rule.id}-${item.dueDate}`;
        setBusyId(key);
        await confirmPending(item);
        setBusyId(null);
        setConfirmDialog(null);
        onConfirm?.();
    };

    const handleSkip = async (item: PendingRecurring) => {
        const key = `${item.rule.id}-${item.dueDate}`;
        setBusyId(key);
        await skipPending(item);
        setBusyId(null);
    };

    return (
        <>
            <Surface style={[styles.banner, { backgroundColor: theme.colors.surface }]} elevation={2}>
                <Text variant="titleSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                    🔄 Transacciones pendientes de confirmar
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                    {pending.length} transacción{pending.length !== 1 ? 'es' : ''} para revisar
                </Text>

                {pending.map(item => {
                    const key = `${item.rule.id}-${item.dueDate}`;
                    const isLoading = busyId === key;
                    return (
                        <View key={key} style={[styles.row, { borderBottomColor: theme.colors.outline }]}>
                            <View style={styles.rowInfo}>
                                <View style={styles.rowHeader}>
                                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                        {item.rule.category_icon} {item.rule.category_name}
                                    </Text>
                                    <Text
                                        variant="bodyMedium"
                                        style={{
                                            color: item.rule.type === 'income' ? '#10b981' : '#f43f5e',
                                            fontWeight: '700',
                                        }}
                                    >
                                        {item.rule.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                                    </Text>
                                </View>
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {item.rule.description} · {formatDate(item.dueDate)}
                                </Text>
                            </View>
                            <View style={styles.rowActions}>
                                <Button
                                    mode="text"
                                    compact
                                    onPress={() => handleSkip(item)}
                                    disabled={isLoading}
                                    textColor={theme.colors.onSurfaceVariant}
                                    style={styles.actionBtn}
                                >
                                    Saltar
                                </Button>
                                <Button
                                    mode="contained"
                                    compact
                                    onPress={() => setConfirmDialog(item)}
                                    loading={isLoading}
                                    disabled={isLoading}
                                    style={styles.confirmBtn}
                                    contentStyle={{ paddingHorizontal: 12 }}
                                >
                                    Confirmar
                                </Button>
                            </View>
                        </View>
                    );
                })}
            </Surface>

            <Portal>
                <Dialog visible={!!confirmDialog} onDismiss={() => setConfirmDialog(null)} style={{ borderRadius: 20 }}>
                    <Dialog.Title>Confirmar transacción</Dialog.Title>
                    <Dialog.Content>
                        {confirmDialog && (
                            <>
                                <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                                    Se creará una transacción con los siguientes datos:
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text variant="labelMedium">Categoría:</Text>
                                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                                        {confirmDialog.rule.category_icon} {confirmDialog.rule.category_name}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text variant="labelMedium">Monto:</Text>
                                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                                        {formatCurrency(confirmDialog.amount)}
                                    </Text>
                                </View>
                                {confirmDialog.rule.description && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text variant="labelMedium">Descripción:</Text>
                                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                                            {confirmDialog.rule.description}
                                        </Text>
                                    </View>
                                )}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text variant="labelMedium">Fecha:</Text>
                                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                                        {formatDate(confirmDialog.dueDate)}
                                    </Text>
                                </View>
                            </>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmDialog(null)}>Cancelar</Button>
                        <Button
                            mode="contained"
                            onPress={() => confirmDialog && handleConfirm(confirmDialog)}
                        >
                            Confirmar y guardar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
}

const styles = StyleSheet.create({
    banner: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    title: {
        fontWeight: '700',
        marginBottom: 2,
    },
    row: {
        flexDirection: 'column',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    rowInfo: {
        gap: 2,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    actionBtn: {
        borderRadius: 8,
    },
    confirmBtn: {
        borderRadius: 8,
    },
});

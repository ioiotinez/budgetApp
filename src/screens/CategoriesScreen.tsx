import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import {
    Text, Surface, useTheme, FAB, Chip, Divider, IconButton, Dialog, Portal,
    TextInput, Button, SegmentedButtons,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import { useCategoryStore } from '../store/categoryStore';
import type { Category, TransactionType } from '../types';

// Preset color palette
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#f97316',
    '#ec4899', '#a855f7', '#06b6d4', '#84cc16', '#64748b', '#f43f5e'];
const ICONS = ['💼', '📈', '💻', '🎁', '🏠', '🛒', '🚗', '🏥', '🎬', '📚', '👕', '💡', '🍽️', '✈️', '📦', '💰'];

const DEFAULT_FORM = { name: '', type: 'expense' as TransactionType, icon: '💰', color: '#14b8a6' };

export default function CategoriesScreen() {
    const theme = useTheme();
    const { categories, addCategory, editCategory, removeCategory, loadCategories } = useCategoryStore();

    const [dialogVisible, setDialogVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [catToDelete, setCatToDelete] = useState<Category | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);

    useFocusEffect(useCallback(() => { loadCategories(); }, []));

    const openAdd = () => { setForm(DEFAULT_FORM); setEditingId(null); setDialogVisible(true); };
    const openEdit = (cat: Category) => {
        setForm({
            name: cat.name, type: cat.type, icon: cat.icon,
            color: cat.color,
        });
        setEditingId(cat.id);
        setDialogVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;

        try {
            const data = {
                name: form.name.trim(),
                type: form.type,
                icon: form.icon,
                color: form.color,
            };

            if (editingId) {
                await editCategory(editingId, data);
            } else {
                await addCategory(data);
            }
            setDialogVisible(false);
        } catch (error) {
            console.error('Error saving category:', error);
        }
    };

    const handleDelete = (cat: Category) => {
        setCatToDelete(cat);
        setDeleteDialogVisible(true);
    };

    const confirmDelete = async () => {
        if (catToDelete) {
            await removeCategory(catToDelete.id);
            setDeleteDialogVisible(false);
            setCatToDelete(null);
        }
    };

    const renderItem = ({ item }: { item: Category }) => (
        <Surface style={[styles.catRow, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <Text style={styles.catIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {item.name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Chip
                        compact
                        style={{ backgroundColor: item.color + '33', paddingVertical: 0 }}
                        textStyle={{ fontSize: 11, fontWeight: '600', color: item.color, lineHeight: 16 }}
                    >
                        {item.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </Chip>
                </View>
            </View>
            <IconButton icon="pencil-outline" size={18} iconColor={theme.colors.primary} onPress={() => openEdit(item)} />
            <IconButton icon="trash-can-outline" size={18} iconColor="#ef4444" onPress={() => handleDelete(item)} />
        </Surface>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <FlatList
                data={categories}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <Divider />}
                contentContainerStyle={styles.list}
            />

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="white"
                onPress={openAdd}
            />

            <Portal>
                <Dialog key={dialogVisible ? editingId : 'add'} visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ borderRadius: 20 }}>
                    <Dialog.Title>{editingId ? 'Editar categoría' : 'Nueva categoría'}</Dialog.Title>
                    <Dialog.Content>
                        <ScrollView style={{ maxHeight: 400 }}>
                            <TextInput
                                label="Nombre de la categoría"
                                value={form.name}
                                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                                mode="outlined"
                                style={styles.dialogInput}
                            />

                            <Text variant="labelLarge" style={{ marginBottom: 6, marginTop: 8, color: theme.colors.onSurface }}>
                                Tipo de categoría
                            </Text>
                            <SegmentedButtons
                                value={form.type}
                                onValueChange={v => setForm(f => ({ ...f, type: v as TransactionType }))}
                                buttons={[
                                    { value: 'expense', label: 'Gasto' },
                                    { value: 'income', label: 'Ingreso' },
                                ]}
                                style={{ marginBottom: 12, height: 40 }}
                            />

                            <Text variant="labelLarge" style={{ marginBottom: 6, marginTop: 4, color: theme.colors.onSurface }}>
                                Ícono
                            </Text>
                            <View style={styles.iconGrid}>
                                {ICONS.map(ic => (
                                    <Text
                                        key={ic}
                                        style={[styles.iconOpt, form.icon === ic && styles.iconSelected]}
                                        onPress={() => setForm(f => ({ ...f, icon: ic }))}
                                    >
                                        {ic}
                                    </Text>
                                ))}
                            </View>

                            <Text variant="labelLarge" style={{ marginBottom: 6, marginTop: 8, color: theme.colors.onSurface }}>
                                Color
                            </Text>
                            <View style={styles.colorGrid}>
                                {COLORS.map(col => (
                                    <View
                                        key={col}
                                        style={[styles.colorDot, { backgroundColor: col },
                                        form.color === col && { borderWidth: 3, borderColor: theme.colors.onSurface }]}
                                        onTouchEnd={() => setForm(f => ({ ...f, color: col }))}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
                        <Button mode="contained" onPress={handleSave} style={{ borderRadius: 8 }}>
                            Guardar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
                {/* Deletion Dialog */}
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ borderRadius: 20 }}>
                    <Dialog.Title>Eliminar categoría</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            ¿Seguro querés eliminar "{catToDelete?.name}"? Se eliminarán también todos los presupuestos y movimientos asociados.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)}>Cancelar</Button>
                        <Button mode="contained" onPress={confirmDelete} style={{ backgroundColor: '#ef4444', borderRadius: 8 }}>
                            Eliminar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal >
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { paddingHorizontal: 12, paddingBottom: 80 },
    catRow: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4,
    },
    catIcon: { fontSize: 24, marginRight: 10 },
    fab: { position: 'absolute', right: 20, bottom: 24, borderRadius: 16 },
    dialogInput: { marginBottom: 8 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
    iconOpt: { fontSize: 24, padding: 4, borderRadius: 6 },
    iconSelected: { backgroundColor: '#14b8a622', borderRadius: 6 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    colorDot: { width: 28, height: 28, borderRadius: 14 },
});

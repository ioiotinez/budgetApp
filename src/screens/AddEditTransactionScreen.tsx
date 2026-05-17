import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import {
    Text, TextInput, Button, useTheme, SegmentedButtons, Surface,
} from 'react-native-paper';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTransactionStore } from '../store/transactionStore';
import { useCategoryStore } from '../store/categoryStore';
import { todayISO } from '../utils/formatters';
import type { TransactionStackParamList, TransactionType, Category } from '../types';

type Nav = NativeStackNavigationProp<TransactionStackParamList, 'AddEditTransaction'>;
type Route = RouteProp<TransactionStackParamList, 'AddEditTransaction'>;

export default function AddEditTransactionScreen() {
    const theme = useTheme();
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const editId = route.params?.transactionId;

    const { transactions, addTransaction, editTransaction } = useTransactionStore();
    const { categories, loadCategories } = useCategoryStore();

    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [date, setDate] = useState(todayISO());
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    // Prefill when editing (run once on mount or when editId changes)
    useEffect(() => {
        if (editId) {
            const tx = transactions.find(t => t.id === editId);
            if (tx) {
                setType(tx.type);
                setAmount(String(tx.amount));
                setCategoryId(tx.category_id);
                setDate(tx.date);
                setDescription(tx.description ?? '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId]);

    const filteredCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);

    const validate = () => {
        const e: Record<string, string> = {};
        const cleanAmount = amount.replace(',', '.');
        if (!amount || isNaN(parseFloat(cleanAmount)) || parseFloat(cleanAmount) <= 0)
            e.amount = 'Ingresá un monto válido';
        if (!categoryId) e.category = 'Seleccioná una categoría';
        if (!date) e.date = 'Ingresá una fecha';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        const cleanAmount = amount.replace(',', '.');
        const data = {
            amount: parseFloat(cleanAmount),
            type,
            category_id: categoryId!,
            date,
            description: description.trim(),
        };
        try {
            if (editId) {
                await editTransaction(editId, data);
            } else {
                await addTransaction(data);
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            setSaving(false);
            return;
        }
        setSaving(false);
        setAmount('');
        setDescription('');
        setCategoryId(null);
        setDate(todayISO());
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('TransactionList');
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Type toggle */}
                <SegmentedButtons
                    value={type}
                    onValueChange={v => { setType(v as TransactionType); setCategoryId(null); }}
                    buttons={[
                        { value: 'expense', label: 'Gasto', icon: 'cash-minus' },
                        { value: 'income', label: 'Ingreso', icon: 'cash-plus' },
                    ]}
                    style={styles.segmented}
                />

                {/* Amount */}
                <TextInput
                    label="Monto *"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    mode="outlined"
                    error={!!errors.amount}
                    style={styles.input}
                    left={<TextInput.Affix text="$" />}
                />
                {errors.amount && <Text style={styles.error}>{errors.amount}</Text>}

                {/* Date */}
                <TextInput
                    label="Fecha (YYYY-MM-DD) *"
                    value={date}
                    onChangeText={setDate}
                    mode="outlined"
                    error={!!errors.date}
                    style={styles.input}
                    left={<TextInput.Icon icon="calendar" />}
                />
                {errors.date && <Text style={styles.error}>{errors.date}</Text>}

                {/* Description */}
                <TextInput
                    label="Descripción (opcional)"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    style={styles.input}
                    multiline
                    numberOfLines={2}
                />

                {/* Category picker */}
                <Text variant="labelLarge" style={[styles.catLabel, { color: theme.colors.onSurface }]}>
                    Categoría *
                </Text>
                {errors.category && <Text style={styles.error}>{errors.category}</Text>}
                <View style={styles.catGrid}>
                    {filteredCategories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.catChip,
                                {
                                    backgroundColor: categoryId === cat.id ? cat.color + '33' : theme.colors.surface,
                                    borderColor: categoryId === cat.id ? cat.color : theme.colors.outline,
                                    borderWidth: 1.5,
                                },
                            ]}
                            onPress={() => setCategoryId(cat.id)}
                        >
                            <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                            <Text
                                variant="labelSmall"
                                style={{ color: categoryId === cat.id ? cat.color : theme.colors.onSurface, marginTop: 2 }}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Save button */}
                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.saveBtn}
                    contentStyle={{ paddingVertical: 6 }}
                >
                    {editId ? 'Guardar cambios' : 'Registrar transacción'}
                </Button>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: 20, paddingBottom: 60 },
    segmented: { marginBottom: 20 },
    input: { marginBottom: 4 },
    error: { color: '#ef4444', fontSize: 12, marginBottom: 8 },
    catLabel: { marginTop: 12, marginBottom: 8 },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    catChip: {
        borderRadius: 10, padding: 10, alignItems: 'center',
        minWidth: 72, flexBasis: '22%',
    },
    saveBtn: { borderRadius: 12, marginTop: 8 },
});

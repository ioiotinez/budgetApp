import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, SegmentedButtons, Switch } from 'react-native-paper';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useRecurringStore } from '../store/recurringStore';
import { useCategoryStore } from '../store/categoryStore';
import { todayISO } from '../utils/formatters';
import type { SettingsStackParamList, TransactionType, RecurringFrequency, Category } from '../types';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'AddEditRecurring'>;
type Route = RouteProp<SettingsStackParamList, 'AddEditRecurring'>;

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
];

export default function AddEditRecurringScreen() {
    const theme = useTheme();
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const editId = route.params?.ruleId;

    const { rules, addRule, editRule } = useRecurringStore();
    const { categories, loadCategories } = useCategoryStore();

    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
    const [startDate, setStartDate] = useState(todayISO());
    const [endDate, setEndDate] = useState('');
    const [active, setActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        if (editId) {
            const rule = rules.find(r => r.id === editId);
            if (rule) {
                setType(rule.type);
                setAmount(String(rule.amount));
                setCategoryId(rule.category_id);
                setDescription(rule.description);
                setFrequency(rule.frequency);
                setStartDate(rule.start_date);
                setEndDate(rule.end_date ?? '');
                setActive(rule.active);
            }
        }
    }, [editId, rules]);

    const filteredCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);

    const validate = () => {
        const e: Record<string, string> = {};
        const cleanAmount = amount.replace(',', '.');
        if (!amount || isNaN(parseFloat(cleanAmount)) || parseFloat(cleanAmount) <= 0)
            e.amount = 'Ingresá un monto válido';
        if (!categoryId) e.category = 'Seleccioná una categoría';
        if (!startDate) e.startDate = 'Ingresá una fecha de inicio';
        if (endDate && endDate < startDate) e.endDate = 'La fecha de fin debe ser posterior al inicio';
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
            description: description.trim(),
            frequency,
            start_date: startDate,
            end_date: endDate || undefined,
            last_generated_date: undefined,
            active,
        };
        try {
            if (editId) {
                await editRule(editId, data);
            } else {
                await addRule(data);
            }
        } catch (error) {
            console.error('Error saving recurring rule:', error);
            setSaving(false);
            return;
        }
        setSaving(false);
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('RecurringRules');
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

                {/* Frequency */}
                <Text variant="labelLarge" style={[styles.freqLabel, { color: theme.colors.onSurface }]}>
                    Frecuencia *
                </Text>
                <SegmentedButtons
                    value={frequency}
                    onValueChange={v => setFrequency(v as RecurringFrequency)}
                    buttons={FREQ_OPTIONS}
                    style={styles.segmented}
                />

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

                {/* Start date */}
                <TextInput
                    label="Fecha de inicio *"
                    value={startDate}
                    onChangeText={setStartDate}
                    mode="outlined"
                    error={!!errors.startDate}
                    style={styles.input}
                    left={<TextInput.Icon icon="calendar" />}
                />
                {errors.startDate && <Text style={styles.error}>{errors.startDate}</Text>}

                {/* End date (optional) */}
                <TextInput
                    label="Fecha de fin (opcional)"
                    value={endDate}
                    onChangeText={setEndDate}
                    mode="outlined"
                    error={!!errors.endDate}
                    style={styles.input}
                    left={<TextInput.Icon icon="calendar-end" />}
                />
                {errors.endDate && <Text style={styles.error}>{errors.endDate}</Text>}

                {/* Active toggle */}
                <View style={[styles.activeRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Regla activa</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {active ? 'Las transacciones se generarán automáticamente' : 'La regla está pausada'}
                        </Text>
                    </View>
                    <Switch
                        value={active}
                        onValueChange={setActive}
                        color={theme.colors.primary}
                    />
                </View>

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
                    {editId ? 'Guardar cambios' : 'Crear regla recurrente'}
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
    freqLabel: { marginBottom: 8 },
    catLabel: { marginTop: 12, marginBottom: 8 },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    catChip: {
        borderRadius: 10, padding: 10, alignItems: 'center',
        minWidth: 72, flexBasis: '22%',
    },
    activeRow: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, padding: 14, marginBottom: 20, gap: 12,
    },
    saveBtn: { borderRadius: 12, marginTop: 8 },
});

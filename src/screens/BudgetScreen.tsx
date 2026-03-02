import React, { useCallback, useState, useMemo, memo } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import {
    Text, Surface, useTheme, Button, TextInput, Divider, IconButton, ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { useBudgetStore } from '../store/budgetStore';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import type { SettingsStackParamList, MonthlyBudget } from '../types';

type Route = RouteProp<SettingsStackParamList, 'BudgetSetup'>;

interface BudgetRowProps {
    item: MonthlyBudget;
    isEditing: boolean;
    editValue: string;
    onStartEdit: () => void;
    onEditValueChange: (value: string) => void;
    onSaveEdit: () => void;
    onRemove: () => void;
    theme: any;
}

const BudgetRow = memo(function BudgetRow({ 
    item, 
    isEditing, 
    editValue, 
    onStartEdit, 
    onEditValueChange, 
    onSaveEdit, 
    onRemove,
    theme 
}: BudgetRowProps) {
    const categoryName = item.name ?? 'Categoría';
    const categoryIcon = item.icon ?? '💰';
    const categoryColor = item.color ?? theme.colors.primary;
    
    return (
        <View style={styles.budgetRow}>
            <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
                <Text style={styles.budgetIcon}>{categoryIcon}</Text>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                    {categoryName}
                </Text>
            </View>
            {isEditing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TextInput
                        value={editValue}
                        onChangeText={onEditValueChange}
                        keyboardType="decimal-pad"
                        mode="outlined"
                        dense
                        style={{ width: 100, height: 40, backgroundColor: theme.colors.surface }}
                        autoFocus
                        blurOnSubmit={false}
                        onSubmitEditing={onSaveEdit}
                        returnKeyType="done"
                    />
                    <IconButton
                        icon="check-bold"
                        mode="contained"
                        containerColor={theme.colors.primary}
                        iconColor="white"
                        size={20}
                        onPress={onSaveEdit}
                    />
                </View>
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity onPress={onStartEdit} style={styles.amountContainer}>
                        <Text
                            variant="titleSmall"
                            style={{ color: theme.colors.primary, fontWeight: '700' }}
                        >
                            {formatCurrency(item.amount)}
                        </Text>
                        <IconButton icon="pencil-outline" size={16} iconColor={theme.colors.onSurfaceVariant} style={{ margin: 0 }} />
                    </TouchableOpacity>
                    <IconButton
                        icon="close"
                        size={18}
                        iconColor={theme.colors.error}
                        onPress={onRemove}
                    />
                </View>
            )}
        </View>
    );
});

export default function BudgetScreen() {
    const theme = useTheme();
    const route = useRoute<Route>();
    const navigation = useNavigation();
    const year = Number(route.params.year);
    const month = Number(route.params.month);

    const { budgets, loadBudgets, loadDeviations, setBudgetAmount, initFromPreviousMonth, setCurrentPeriod, isLoading, removeCategory } =
        useBudgetStore();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [copyingFromPrevious, setCopyingFromPrevious] = useState(false);

    useFocusEffect(useCallback(() => {
        setCurrentPeriod(year, month);
        loadBudgets(year, month);
        loadDeviations(year, month);
    }, [year, month, setCurrentPeriod, loadBudgets, loadDeviations]));

    const incomeBudgets = useMemo(() => 
        budgets.filter(b => b.type === 'income'),
        [budgets]
    );
    const expenseBudgets = useMemo(() => 
        budgets.filter(b => b.type === 'expense'),
        [budgets]
    );

    const startEdit = useCallback((b: MonthlyBudget) => {
        setEditingId(b.id);
        setEditValue(String(b.amount));
    }, []);

    const saveEdit = useCallback(async (b: MonthlyBudget, currentValue: string) => {
        let cleanVal = currentValue.trim();
        if (cleanVal.includes('.') && cleanVal.includes(',')) {
            cleanVal = cleanVal.replace(/\./g, '');
        }
        cleanVal = cleanVal.replace(',', '.');

        const val = parseFloat(cleanVal);
        if (isNaN(val) || val < 0) {
            Alert.alert('Error', 'Por favor ingresá un monto válido');
            setEditingId(null);
            return;
        }
        
        try {
            await setBudgetAmount(b.category_id, val);
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar el presupuesto');
        }
        setEditingId(null);
    }, [setBudgetAmount]);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditValue('');
    }, []);

    const handleCopyFromPrevious = () => {
        Alert.alert(
            'Copiar del mes anterior',
            `¿Querés copiar los presupuestos de ${formatMonthYear(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Copiar', 
                    onPress: async () => {
                        setCopyingFromPrevious(true);
                        try {
                            await initFromPreviousMonth(year, month);
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo copiar el presupuesto');
                        } finally {
                            setCopyingFromPrevious(false);
                        }
                    }
                },
            ]
        );
    };

    const handleRemoveCategory = (b: MonthlyBudget) => {
        const categoryName = b.name ?? 'esta categoría';
        Alert.alert(
            'Quitar categoría',
            `¿Querés quitar "${categoryName}" del presupuesto de este mes?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Quitar', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeCategory(b.category_id);
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo quitar la categoría');
                        }
                    }
                },
            ]
        );
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const renderBudgetSection = (title: string, items: MonthlyBudget[], color: string) => {
        if (items.length === 0) return null;
        
        const total = items.reduce((sum, b) => sum + b.amount, 0);
        
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text variant="labelLarge" style={[styles.sectionLabel, { color }]}>
                        {title}
                    </Text>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Total: {formatCurrency(total)}
                    </Text>
                </View>
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={0}>
                    {items.map((b, i) => (
                        <React.Fragment key={b.id}>
                            {i > 0 && <Divider />}
                            <BudgetRow 
                                item={b}
                                isEditing={editingId === b.id}
                                editValue={editingId === b.id ? editValue : ''}
                                onStartEdit={() => startEdit(b)}
                                onEditValueChange={setEditValue}
                                onSaveEdit={() => saveEdit(b, editValue)}
                                onRemove={() => handleRemoveCategory(b)}
                                theme={theme}
                            />
                        </React.Fragment>
                    ))}
                </Surface>
            </View>
        );
    };

    if (isLoading || copyingFromPrevious) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurface }}>
                    {copyingFromPrevious ? 'Copiando presupuesto...' : 'Cargando...'}
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <View style={styles.headerTitle}>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                        Presupuesto
                    </Text>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatMonthYear(year, month)}
                    </Text>
                </View>
                <IconButton
                    icon="close"
                    size={24}
                    onPress={handleGoBack}
                />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scroll}
            >
                {budgets.length === 0 ? (
                    <Surface style={[styles.emptyBox, { backgroundColor: theme.colors.surface }]} elevation={0}>
                        <Text style={styles.emptyIcon}>📊</Text>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, textAlign: 'center', marginBottom: 8 }}>
                            Sin presupuesto configurado
                        </Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
                            Asigná montos a tus categorías de gastos e ingresos.
                        </Text>
                        <Button
                            mode="contained"
                            onPress={handleCopyFromPrevious}
                            style={{ borderRadius: 10 }}
                            icon="content-copy"
                        >
                            Copiar del mes anterior
                        </Button>
                    </Surface>
                ) : (
                    <>
                        {renderBudgetSection('Ingresos esperados', incomeBudgets, '#10b981')}
                        {renderBudgetSection('Gastos presupuestados', expenseBudgets, '#ef4444')}
                        
                        <View style={styles.actions}>
                            <Button
                                mode="outlined"
                                onPress={handleCopyFromPrevious}
                                style={{ borderRadius: 10 }}
                                icon="content-copy"
                            >
                                Copiar del mes anterior
                            </Button>
                        </View>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 60, maxWidth: 600, alignSelf: 'center', width: '100%' },
    header: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8,
    },
    headerTitle: { flex: 1 },
    sectionLabel: { marginBottom: 8, marginTop: 4, letterSpacing: 0.5 },
    card: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
    emptyBox: { borderRadius: 14, padding: 28, alignItems: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    budgetRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12,
    },
    budgetIcon: { fontSize: 22 },
    iconContainer: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    amountContainer: {
        flexDirection: 'row', alignItems: 'center',
    },
    section: { marginBottom: 8 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, marginTop: 4,
    },
    actions: { marginTop: 8, marginBottom: 20 },
    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
    },
});

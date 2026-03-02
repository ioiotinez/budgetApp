import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
    View, FlatList, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import {
    Text, Surface, useTheme, Chip, Divider, IconButton, Searchbar, Portal, Dialog, Button,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTransactionStore } from '../store/transactionStore';
import { useCategoryStore } from '../store/categoryStore';
import { useBudgetStore } from '../store/budgetStore';
import { usePeriodNavigation } from '../hooks/usePeriodNavigation';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatCurrency, formatDate, formatMonthYear } from '../utils/formatters';
import { incomeColor, expenseColor } from '../theme/theme';
import type { Transaction, TransactionStackParamList } from '../types';

type Nav = NativeStackNavigationProp<TransactionStackParamList, 'TransactionList'>;

export default function TransactionsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<Nav>();

    const { transactions, loadTransactions, removeTransaction, error } = useTransactionStore();
    const { categories, loadCategories } = useCategoryStore();
    const { currentYear, currentMonth } = useBudgetStore();
    const { goToPrev, goToNext } = usePeriodNavigation();

    const [search, setSearch] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

    const reload = useCallback(async () => {
        await loadCategories();
        await loadTransactions({
            year: currentYear,
            month: currentMonth,
            categoryId: selectedCategoryId || undefined
        });
    }, [currentYear, currentMonth, selectedCategoryId, loadCategories, loadTransactions]);

    useFocusEffect(useCallback(() => { reload(); }, [reload]));

    // Asegurar recarga cuando cambian los filtros
    useEffect(() => {
        reload();
    }, [selectedCategoryId, currentYear, currentMonth]);

    const filtered = useMemo(() => transactions.filter(tx => {
        const searchLower = search.toLowerCase();
        const txDesc = (tx.description || '').toLowerCase();
        const catName = (tx.category_name || '').toLowerCase();

        return !search || txDesc.includes(searchLower) || catName.includes(searchLower);
    }), [transactions, search]);

    const renderItem = ({ item }: { item: Transaction }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('AddEditTransaction', { transactionId: item.id })}
        >
            <Surface style={[styles.txCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
                <View style={styles.txLeft}>
                    <Text style={styles.txIcon}>{item.category_icon ?? '💰'}</Text>
                    <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                            {item.category_name ?? 'Otro'}
                        </Text>
                        {item.description ? (
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {item.description}
                            </Text>
                        ) : null}
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {formatDate(item.date)}
                        </Text>
                    </View>
                </View>
                <View style={styles.txRight}>
                    <Text
                        variant="titleSmall"
                        style={{
                            color: item.type === 'income' ? incomeColor : expenseColor,
                            fontWeight: '700',
                            marginRight: 8,
                        }}
                    >
                        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                    </Text>
                    <IconButton
                        icon="trash-can-outline"
                        size={18}
                        iconColor={theme.colors.onSurfaceVariant}
                        onPress={() => {
                            setTxToDelete(item);
                            setDeleteDialogVisible(true);
                        }}
                    />
                </View>
            </Surface>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Period navigator */}
            <View style={[styles.periodRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
                <IconButton icon="chevron-left" onPress={goToPrev} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {formatMonthYear(currentYear, currentMonth)}
                </Text>
                <IconButton icon="chevron-right" onPress={goToNext} />
            </View>

            <ErrorBanner message={error || ''} />

            {/* Search */}
            <Searchbar
                placeholder="Buscar descripción o categoría..."
                value={search}
                onChangeText={setSearch}
                style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
                inputStyle={{ color: theme.colors.onSurface }}
            />

            {/* Category Filter */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    <Chip
                        selected={selectedCategoryId === null}
                        onPress={() => setSelectedCategoryId(null)}
                        style={styles.chip}
                        compact
                        mode="outlined"
                    >
                        Todos
                    </Chip>
                    {categories.map(cat => (
                        <Chip
                            key={cat.id}
                            selected={selectedCategoryId === cat.id}
                            onPress={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
                            style={styles.chip}
                            compact
                            mode="outlined"
                            icon={cat.icon}
                        >
                            {cat.name}
                        </Chip>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <Divider horizontalInset />}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <IconButton icon="alert-circle-outline" size={48} iconColor={theme.colors.onSurfaceVariant} />
                        <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                            No hay movimientos para este filtro.
                        </Text>
                    </View>
                }
            />

            <Portal>
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ borderRadius: 20 }}>
                    <Dialog.Title>Eliminar transacción</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)}>Cancelar</Button>
                        <Button
                            mode="contained"
                            onPress={() => {
                                if (txToDelete) {
                                    removeTransaction(txToDelete.id);
                                    setDeleteDialogVisible(false);
                                    setTxToDelete(null);
                                }
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
    periodRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 1,
    },
    searchbar: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderRadius: 12, elevation: 0, height: 48 },
    filterContainer: { marginBottom: 8 },
    chipScroll: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
    chip: { borderRadius: 20 },
    list: { paddingHorizontal: 16, paddingBottom: 80 },
    txCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, backgroundColor: 'transparent',
    },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    txRight: { flexDirection: 'row', alignItems: 'center' },
    txIcon: { fontSize: 24 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    empty: { textAlign: 'center', fontSize: 16, opacity: 0.7 },
});


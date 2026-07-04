import { View, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AddEditTransactionScreen from '../screens/AddEditTransactionScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import BudgetScreen from '../screens/BudgetScreen';
import RecurringRulesScreen from '../screens/RecurringRulesScreen';
import AddEditRecurringScreen from '../screens/AddEditRecurringScreen';

import type {
    RootTabParamList,
    TransactionStackParamList,
    SettingsStackParamList,
} from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const TransactionStack = createNativeStackNavigator<TransactionStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

// ─── Sub-stacks ───────────────────────────────────────────────────────────────

function TransactionsNavigator() {
    const theme = useTheme();
    return (
        <TransactionStack.Navigator
            initialRouteName="TransactionList"
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
                headerShadowVisible: false,
            }}
        >
            <TransactionStack.Screen
                name="TransactionList"
                component={TransactionsScreen}
                options={{ title: 'Transacciones' }}
            />
            <TransactionStack.Screen
                name="AddEditTransaction"
                component={AddEditTransactionScreen}
                options={({ route }) => ({
                    title: route.params?.transactionId ? 'Editar transacción' : 'Nueva transacción',
                })}
            />
        </TransactionStack.Navigator>
    );
}

function SettingsNavigator() {
    const theme = useTheme();
    return (
        <SettingsStack.Navigator
            initialRouteName="SettingsHome"
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
                headerShadowVisible: false,
            }}
        >
            <SettingsStack.Screen
                name="SettingsHome"
                component={SettingsScreen}
                options={{ title: 'Configuración' }}
            />
            <SettingsStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{ title: 'Categorías' }}
            />
            <SettingsStack.Screen
                name="BudgetSetup"
                component={BudgetScreen}
                options={{ title: 'Presupuesto mensual' }}
            />
            <SettingsStack.Screen
                name="RecurringRules"
                component={RecurringRulesScreen}
                options={{ title: 'Transacciones recurrentes' }}
            />
            <SettingsStack.Screen
                name="AddEditRecurring"
                component={AddEditRecurringScreen}
                options={({ route }) => ({
                    title: route.params?.ruleId ? 'Editar regla' : 'Nueva regla recurrente',
                })}
            />
        </SettingsStack.Navigator>
    );
}

// ─── Root Tab Navigator ───────────────────────────────────────────────────────

export default function AppNavigator() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const tabBarHeight = Platform.OS === 'ios' ? 88 : 68 + insets.bottom;

    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: theme.colors.surface,
                        borderTopColor: theme.colors.outline,
                        borderTopWidth: 1,
                        elevation: 0,
                        height: tabBarHeight,
                        paddingBottom: Platform.OS === 'ios' ? insets.bottom : insets.bottom + 8,
                        paddingTop: 8,
                    },
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
                    tabBarIcon: ({ color, size, focused }) => {
                        const icons: Record<string, string> = {
                            Dashboard: '🏠',
                            Transactions: '💸',
                            Reports: '📊',
                            Settings: '⚙️',
                        };
                        return (
                            <TabIcon
                                emoji={icons[route.name] ?? '●'}
                                focused={focused}
                                color={color}
                            />
                        );
                    },
                })}
            >
                <Tab.Screen
                    name="Dashboard"
                    component={DashboardScreen}
                    options={{ title: 'Inicio' }}
                />
                <Tab.Screen
                    name="Transactions"
                    component={TransactionsNavigator}
                    options={{ title: 'Movimientos' }}
                    listeners={({ navigation }: { navigation: any }) => ({
                        tabPress: (e: any) => {
                            e.preventDefault();
                            navigation.navigate('Transactions', { screen: 'TransactionList' });
                        },
                    })}
                />
                <Tab.Screen
                    name="Reports"
                    component={ReportsScreen}
                    options={{ title: 'Reportes' }}
                />
                <Tab.Screen
                    name="Settings"
                    component={SettingsNavigator}
                    options={{ title: 'Config' }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}

// Simple emoji-based tab icon
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean; color: string }) {
    return (
        <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.6 }}>
            {emoji}
        </Text>
    );
}

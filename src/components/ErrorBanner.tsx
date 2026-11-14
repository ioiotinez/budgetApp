import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';

interface ErrorBannerProps {
    message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
    const theme = useTheme();

    if (!message) return null;

    return (
        <Surface style={[styles.container, { backgroundColor: theme.colors.errorContainer }]} elevation={2}>
            <Text style={[styles.text, { color: theme.colors.onErrorContainer }]}>
                {message}
            </Text>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
    },
    text: {
        fontSize: 14,
    },
});

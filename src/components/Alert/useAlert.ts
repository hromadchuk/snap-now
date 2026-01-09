'use client';

import { useCallback, useState } from 'react';

interface AlertState {
    message: string;
    type?: 'error' | 'success' | 'info';
    actionLabel?: string;
    onAction?: () => void;
}

export function useAlert() {
    const [alert, setAlert] = useState<AlertState | null>(null);

    const showAlert = useCallback(
        (message: string, type?: 'error' | 'success' | 'info', actionLabel?: string, onAction?: () => void) => {
            setAlert({ message, type, actionLabel, onAction });
        },
        [],
    );

    const hideAlert = useCallback(() => {
        setAlert(null);
    }, []);

    return {
        alert,
        showAlert,
        hideAlert,
    };
}

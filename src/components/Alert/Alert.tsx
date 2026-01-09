'use client';

import { useI18n } from '@/contexts/I18nContext';

import styles from './Alert.module.css';

interface AlertProps {
    message: string;
    type?: 'error' | 'success' | 'info';
    onClose: () => void;
    actionLabel?: string;
    onAction?: () => void;
}

export function Alert({ message, type = 'error', onClose, actionLabel, onAction }: AlertProps) {
    const { t } = useI18n();

    const handleAction = () => {
        if (onAction) {
            onAction();
        }
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.alert} onClick={(e) => e.stopPropagation()}>
                <div className={styles.content}>
                    <div className={`${styles.icon} ${styles[type]}`}>
                        {type === 'error' && '⚠️'}
                        {type === 'success' && '✓'}
                        {type === 'info' && 'ℹ️'}
                    </div>
                    <p className={styles.message}>{message}</p>
                </div>
                <div className={styles.actions}>
                    {actionLabel && onAction ? (
                        <>
                            <button className={styles.cancelButton} onClick={onClose}>
                                {t('common.cancel')}
                            </button>
                            <button className={styles.actionButton} onClick={handleAction}>
                                {actionLabel}
                            </button>
                        </>
                    ) : (
                        <button className={styles.closeButton} onClick={onClose}>
                            {t('common.close')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

import styles from './EmptyState.module.css';

interface EmptyStateProps {
    message: string;
    className?: string;
}

export function EmptyState({ message, className }: EmptyStateProps) {
    return <div className={`${styles.container} ${className || ''}`}>{message}</div>;
}

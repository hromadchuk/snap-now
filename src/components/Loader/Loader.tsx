'use client';

import { useEffect, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';

import { getCssVar } from '@/lib/utils/client.utils';

import styles from './Loader.module.css';

export function Loader() {
    const [accentColor, setAccentColor] = useState('#6ab2f2');

    useEffect(() => {
        setAccentColor(getCssVar('--app-primary-color'));
    }, []);

    return (
        <div className={styles.wrapper}>
            <IconLoader2 size={48} color={accentColor} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
    );
}

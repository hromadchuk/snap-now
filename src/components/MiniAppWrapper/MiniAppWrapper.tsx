'use client';

import { ReactNode, useEffect, useState } from 'react';
import { backButton, init, miniApp, retrieveRawInitData, swipeBehavior, viewport } from '@tma.js/sdk-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { usePathname, useRouter } from 'next/navigation';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Loader } from '@/components/Loader/Loader';
import { I18nProvider, useI18n } from '@/contexts/I18nContext';
import { appController } from '@/controllers/app.controller';
import { initMockDevData } from '@/lib/dev';
import { useAsyncEffect } from '@/lib/hooks/useAsyncEffect';
import { getCssVar, setSessionStorage } from '@/lib/utils/client.utils';
import { isDev } from '@/lib/utils/common.utils';

import styles from './MiniAppWrapper.module.css';

dayjs.extend(relativeTime);

export interface IMiniAppWrapperProps {
    children: ReactNode;
}

function MiniAppContent({ children }: IMiniAppWrapperProps) {
    const [isReady, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { updateLocale } = useI18n();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (isDev) {
            initMockDevData();
        }

        init();

        miniApp.mount();
        viewport.mount();
        swipeBehavior.mount();
        backButton.mount();
        backButton.onClick(() => {
            router.push('/home');
        });

        viewport.bindCssVars();

        swipeBehavior.disableVertical();

        miniApp.setHeaderColor(getCssVar('--app-secondary-bg-color'));
        miniApp.setBgColor(getCssVar('--app-bg-color'));
        miniApp.setBottomBarColor(getCssVar('--app-bg-color'));
    }, []);

    useAsyncEffect(async () => {
        const initData = retrieveRawInitData();
        const data = await appController.init(initData!);
        if ('error' in data) {
            setError(data.error);
            return;
        }

        setSessionStorage('init', data);
        updateLocale(data.languageCode);

        setReady(true);
    }, []);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (pathname === '/' || pathname === '/home') {
            backButton.hide();
        } else {
            backButton.show();
        }
    }, [isReady, pathname]);

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <EmptyState message={error} />
            </div>
        );
    }

    if (isReady) {
        return <div className="app-container">{children}</div>;
    }

    return <Loader />;
}

export function MiniAppWrapper({ children }: IMiniAppWrapperProps) {
    return (
        <I18nProvider>
            <MiniAppContent>{children}</MiniAppContent>
        </I18nProvider>
    );
}

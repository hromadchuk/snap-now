'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { getLocale, getTranslations, Locale, pluralize as pluralizeI18n, t, Translations } from '@/lib/i18n/i18n';
import { getSessionStorage } from '@/lib/utils/client.utils';
import { AppResponses } from '@/types/api/app.types';

interface I18nContextValue {
    locale: Locale;
    translations: Translations;
    t: (key: string) => string;
    pluralize: (count: number, keyBase: string) => string;
    updateLocale: (languageCode?: string) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>('en');
    const [translations, setTranslations] = useState<Translations>(getTranslations('en'));

    const updateLocale = useCallback((languageCode?: string) => {
        const userLocale = getLocale(languageCode);
        const userTranslations = getTranslations(userLocale);

        setLocale(userLocale);
        setTranslations(userTranslations);
    }, []);

    useEffect(() => {
        const initData = getSessionStorage<AppResponses['init'] | null>('init');
        updateLocale(initData?.languageCode);
    }, [updateLocale]);

    const translate = (key: string) => t(translations, key);
    const pluralize = (count: number, keyBase: string) => pluralizeI18n(count, locale, translations, keyBase);

    return (
        <I18nContext.Provider value={{ locale, translations, t: translate, pluralize, updateLocale }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);

    if (!context) {
        throw new Error('useI18n must be used within I18nProvider');
    }

    return context;
}

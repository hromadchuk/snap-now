import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';

export type Locale = 'en' | 'ru';

export type Translations = typeof enTranslations;

const translations: Record<Locale, Translations> = {
    en: enTranslations,
    ru: ruTranslations,
};

export function getLocale(languageCode?: string): Locale {
    return languageCode === 'ru' ? 'ru' : 'en';
}

export function getTranslations(locale: Locale): Translations {
    return translations[locale];
}

export function t(translationData: Translations, key: string): string {
    const keys = key.split('.');
    let value: Translations | string | unknown = translationData;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = (value as Record<string, unknown>)[k];
        } else {
            return key;
        }
    }

    return typeof value === 'string' ? value : key;
}

export function getLocalizedError(errorKey: string, languageCode: string): string {
    const locale = getLocale(languageCode);
    const translationData = getTranslations(locale);

    return t(translationData, errorKey);
}

export function getLocalizedText(key: string, languageCode: string): string {
    const locale = getLocale(languageCode);
    const translationData = getTranslations(locale);

    return t(translationData, key);
}

export function pluralize(count: number, locale: Locale, translationData: Translations, keyBase: string): string {
    if (locale === 'ru') {
        const mod10 = count % 10;
        const mod100 = count % 100;

        if (mod10 === 1 && mod100 !== 11) {
            return t(translationData, `${keyBase}.one`);
        }

        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            return t(translationData, `${keyBase}.few`);
        }

        return t(translationData, `${keyBase}.many`);
    }

    return count === 1 ? t(translationData, `${keyBase}.one`) : t(translationData, `${keyBase}.many`);
}

import 'client-only';

import { AppResponses } from '@/types/api/app.types';

type TMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiRequest<T>(
    method: TMethod,
    endpoint: string,
    body?: object | FormData,
    queryParams?: Record<string, string | number | boolean>,
): Promise<T | { error: string }> {
    const initData = getSessionStorage<AppResponses['init'] | null>('init');

    let url = `/api/${endpoint}`;
    if (queryParams) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
            params.append(key, String(value));
        });
        url += `?${params.toString()}`;
    }

    const isFormData = body instanceof FormData;
    const config: RequestInit = {
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(initData?.token && { token: initData.token }),
        },
        method,
    };

    if (body) {
        if (isFormData) {
            config.body = body;
        } else {
            config.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Api error');
        }

        return data as T;
    } catch (error) {
        console.error('API Error:', error);

        return {
            error: error instanceof Error ? error.message : 'Unexpected error',
        };
    }
}

export function getCssVar(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function setSessionStorage(name: string, value: string | number | object | string[] | number[] | object[]) {
    return sessionStorage.setItem(name, JSON.stringify(value));
}

export function getSessionStorage<T>(name: string) {
    const value = sessionStorage.getItem(name);

    if (value) {
        return JSON.parse(value) as T;
    }

    return null;
}

export function isMobileTelegramPlatform(platform: string | undefined): boolean {
    if (!platform) {
        return false;
    }

    return ['android', 'android_x', 'ios', 'unigram'].includes(platform);
}

export function formatTimeLeft(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

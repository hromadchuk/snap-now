'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getSessionStorage } from '@/lib/utils/client.utils';
import { AppResponses } from '@/types/api/app.types';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        const initData = getSessionStorage<AppResponses['init'] | null>('init');
        if (!initData || 'error' in initData) {
            router.replace('/home');
            return;
        }

        const targetPath = initData.chatId ? `/room/${initData.chatId}` : '/home';
        router.replace(targetPath);
    }, [router]);

    return null;
}

import 'server-only';

import { bot } from '@/lib/telegram/bot';
import { getCache, setCache } from '@/lib/utils/cache.utils';
import { isDev } from '@/lib/utils/common.utils';

export function getPhotoSignedUrl(blobUrl: string): string {
    if (blobUrl.startsWith('https://') || blobUrl.startsWith('http://')) {
        try {
            const url = new URL(blobUrl);
            if (url.pathname) {
                return url.pathname;
            }
        } catch {
            console.error('Error getting photo signed url', blobUrl);
        }
    }

    return blobUrl;
}

export async function getChatPhotoFromTelegram(smallFileId: string): Promise<string | undefined> {
    try {
        const cacheKey = `photo:${smallFileId}`;
        const cached = await getCache<string>(cacheKey);
        if (cached) {
            return cached;
        }

        const file = await bot.api.getFile(smallFileId);
        if (!file.file_path) {
            return undefined;
        }

        const token = process.env.TELEGRAM_BOT_TOKEN;
        const fileUrl = isDev
            ? `https://api.telegram.org/file/bot${token}/test/${file.file_path}`
            : `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        await setCache(cacheKey, base64, 60 * 24);

        return base64;
    } catch (error) {
        console.error('[Utils] Failed to get chat photo:', error);
        return undefined;
    }
}

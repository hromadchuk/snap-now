import 'server-only';

import { bot } from '@/lib/telegram/bot';
import { getCache, setCache } from '@/lib/utils/cache.utils';
import { DEV_CHAT } from '@/lib/utils/common.utils';
import { toDbChatId } from '@/lib/utils/server.utils';

export async function sendToDevChat(message: string): Promise<void> {
    try {
        await bot.api.sendMessage(DEV_CHAT, message);
    } catch (error) {
        console.error('[Server] Failed to send message to DEV_CHAT:', error);
    }
}

export async function getChatMemberStatus(chatId: number, userId: number) {
    const cacheKey = `chat-member-status:${chatId}:${userId}`;
    const cached = await getCache<string>(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        const dbChatId = toDbChatId(chatId);
        const chatMember = await bot.api.getChatMember(dbChatId, userId);

        await setCache(cacheKey, chatMember.status, 5);

        return chatMember.status;
    } catch (error) {
        console.error('[Telegram Utils] Error checking chat membership:', error);
    }

    return 'unknown';
}

export async function isChatMember(chatId: number, userId: number): Promise<boolean> {
    const status = await getChatMemberStatus(chatId, userId);
    const validStatuses = ['member', 'administrator', 'creator'];
    return validStatuses.includes(status);
}

import 'server-only';

import { Bot, webhookCallback } from 'grammy';
import { ObjectId } from 'mongodb';

import { getLocale, getLocalizedText, getTranslations, pluralize } from '@/lib/i18n/i18n';
import { generateNotificationsForToday } from '@/lib/notifications/generate-today';
import { ChatsRepository, MomentsRepository, NotificationsRepository } from '@/lib/repositories';
import { BOT_USERNAME, isDev } from '@/lib/utils/common.utils';
import { toDbChatId } from '@/lib/utils/server.utils';
import { IChatsRepository } from '@/types/repositories/chats.repository';

const botConfig = {
    client: {
        environment: (isDev ? 'test' : 'prod') as 'test' | 'prod',
    },
};

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!, botConfig);

async function updateChatMemberCount(chatId: number, api: typeof bot.api): Promise<void> {
    try {
        const memberCount = await api.getChatMemberCount(chatId);
        const collection = await ChatsRepository();

        await collection.updateOne(
            { _id: chatId },
            {
                $set: {
                    memberCount,
                    updatedAt: new Date(),
                },
            },
        );

        console.log('[Bot] Chat member count updated:', chatId, memberCount);
    } catch (error) {
        console.error('[Bot] Failed to update chat member count:', error);
    }
}

bot.command('start', async (ctx) => {
    const languageCode = ctx.from?.language_code || 'en';
    const helloText = getLocalizedText('bot.hello', languageCode);
    const descriptionText = getLocalizedText('bot.startDescription', languageCode);
    const message = `${helloText}\n\n${descriptionText}`;

    const startParam = ctx.match;
    const startappUrl = startParam
        ? `https://t.me/${BOT_USERNAME}?startapp=${startParam}`
        : `https://t.me/${BOT_USERNAME}?startapp`;

    await ctx.reply(message, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: getLocalizedText('bot.openApp', languageCode),
                        url: startappUrl,
                    },
                ],
                [
                    {
                        text: getLocalizedText('bot.addToGroup', languageCode),
                        url: `https://t.me/${BOT_USERNAME}?startgroup=`,
                    },
                ],
            ],
        },
    });
});

bot.command('test_moment', async (ctx) => {
    const ALLOWED_USER_ID = 44221708;
    const userId = ctx.from?.id;

    if (userId !== ALLOWED_USER_ID) {
        await ctx.reply('Access denied');
        return;
    }

    const chatId = ctx.chat.id;
    const dbChatId = toDbChatId(chatId);

    try {
        const chatsCollection = await ChatsRepository();
        const chat = await chatsCollection.findOne(
            { _id: dbChatId },
            { projection: { _id: 1, languageCode: 1, minutesTakePhoto: 1 } },
        );

        if (!chat) {
            await ctx.reply('Chat not found in database');
            return;
        }

        const minutesTakePhoto = chat.minutesTakePhoto;
        const languageCode = getLocale(chat.languageCode);
        const translationData = getTranslations(languageCode);
        const minutesWord = pluralize(minutesTakePhoto, languageCode, translationData, 'room.minutes');
        const messageTemplate = getLocalizedText('bot.notificationReminder', languageCode);
        const message = `[TEST] ${messageTemplate
            .replace('{minutes}', minutesTakePhoto.toString())
            .replace('{minutesWord}', minutesWord)}`;
        const openAppText = getLocalizedText('bot.openApp', languageCode);

        const replyMarkup = {
            inline_keyboard: [
                [
                    {
                        text: openAppText,
                        url: `https://t.me/${BOT_USERNAME}?startapp=${Math.abs(dbChatId)}`,
                    },
                ],
            ],
        };

        const momentsCollection = await MomentsRepository();

        await Promise.all([
            bot.api.sendMessage(dbChatId, message, {
                reply_markup: replyMarkup,
            }),
            momentsCollection.insertOne({
                chatId: dbChatId,
                notificationId: new ObjectId().toString(),
                photos: [],
                createdAt: new Date(),
            }),
        ]);
    } catch (error) {
        console.error('[Bot] Test moment error:', error);
        await ctx.reply(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

bot.on('message:new_chat_members', async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const botId = ctx.me.id;
    const chatId = ctx.chat.id;
    const chatType = ctx.chat.type;
    const isBotAdded = newMembers.some((member) => member.id === botId);
    if (!isBotAdded) {
        return;
    }

    const chatInfo = await ctx.api.getChat(chatId);
    const collection = await ChatsRepository();
    const languageCode = ctx.from?.language_code || 'en';

    const chatData: Partial<IChatsRepository> = {
        _id: chatId,
        type: chatType as IChatsRepository['type'],
        active: true,
        languageCode,
        updatedAt: new Date(),
    };

    if (chatInfo) {
        if ('title' in chatInfo) {
            chatData.title = chatInfo.title;
        }

        if ('username' in chatInfo && chatInfo.username) {
            chatData.username = chatInfo.username;
        }

        if ('description' in chatInfo && chatInfo.description) {
            chatData.description = chatInfo.description;
        }

        if ('member_count' in chatInfo && typeof chatInfo.member_count === 'number') {
            chatData.memberCount = chatInfo.member_count;
        }

        if ('photo' in chatInfo && chatInfo.photo) {
            chatData.photo = {
                smallFileId: chatInfo.photo.small_file_id,
                smallFileUniqueId: chatInfo.photo.small_file_unique_id,
                bigFileId: chatInfo.photo.big_file_id,
                bigFileUniqueId: chatInfo.photo.big_file_unique_id,
            };
        }
    }

    const updateData: Partial<IChatsRepository> = {
        type: chatData.type,
        active: true,
        addedAt: new Date(),
        updatedAt: new Date(),
    };

    if (chatData.title) {
        updateData.title = chatData.title;
    }

    if (chatData.username) {
        updateData.username = chatData.username;
    }

    if (chatData.description) {
        updateData.description = chatData.description;
    }

    if (chatData.memberCount !== undefined) {
        updateData.memberCount = chatData.memberCount;
    }

    if (chatData.photo) {
        updateData.photo = chatData.photo;
    }

    const result = await collection.findOneAndUpdate(
        { _id: chatId },
        {
            $setOnInsert: {
                _id: chatId,
                firstAddedAt: new Date(),
                languageCode: chatData.languageCode,
                notificationsPerDay: 1,
                notificationTimeRange: {
                    from: 10,
                    to: 20,
                },
                minutesTakePhoto: 3,
            },
            $set: updateData,
        },
        {
            upsert: true,
            returnDocument: 'after',
            projection: { notificationsPerDay: 1, notificationTimeRange: 1, languageCode: 1 },
        },
    );

    if (result) {
        await generateNotificationsForToday(chatId, result.notificationsPerDay, result.notificationTimeRange, true);

        const openAppText = getLocalizedText('bot.openApp', result.languageCode);

        const replyMarkup = {
            inline_keyboard: [
                [
                    {
                        text: openAppText,
                        url: `https://t.me/${BOT_USERNAME}?startapp=${Math.abs(chatId)}`,
                    },
                ],
            ],
        };

        await ctx.reply(getLocalizedText('bot.thanksForAdding', result.languageCode), {
            reply_markup: replyMarkup,
        });
    }

    const isGroupOrSupergroup = chatType === 'group' || chatType === 'supergroup';
    if (isGroupOrSupergroup) {
        await updateChatMemberCount(chatId, ctx.api);
    }
});

bot.on('message:new_chat_photo', async (ctx) => {
    const newChatPhoto = ctx.message.new_chat_photo;
    const chatId = ctx.chat.id;

    if (!newChatPhoto || newChatPhoto.length === 0) {
        return;
    }

    try {
        const collection = await ChatsRepository();

        const smallPhoto = newChatPhoto[0];
        const bigPhoto = newChatPhoto[newChatPhoto.length - 1];

        const photoData = {
            smallFileId: smallPhoto.file_id,
            smallFileUniqueId: smallPhoto.file_unique_id,
            bigFileId: bigPhoto.file_id,
            bigFileUniqueId: bigPhoto.file_unique_id,
        };

        await collection.updateOne(
            { _id: chatId },
            {
                $set: {
                    photo: photoData,
                    updatedAt: new Date(),
                },
            },
        );

        console.log('[Bot] Chat photo updated:', chatId);
    } catch (error) {
        console.error('[Bot] Failed to update chat photo:', error);
    }
});

bot.on('message:delete_chat_photo', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
        const collection = await ChatsRepository();

        await collection.updateOne(
            { _id: chatId },
            {
                $unset: {
                    photo: 1,
                },
                $set: {
                    updatedAt: new Date(),
                },
            },
        );

        console.log('[Bot] Chat photo deleted:', chatId);
    } catch (error) {
        console.error('[Bot] Failed to delete chat photo:', error);
    }
});

bot.on('message:new_chat_title', async (ctx) => {
    const newChatTitle = ctx.message.new_chat_title;
    const chatId = ctx.chat.id;

    if (!newChatTitle) {
        return;
    }

    try {
        const collection = await ChatsRepository();

        await collection.updateOne(
            { _id: chatId },
            {
                $set: {
                    title: newChatTitle,
                    updatedAt: new Date(),
                },
            },
        );

        console.log('[Bot] Chat title updated:', chatId, newChatTitle);
    } catch (error) {
        console.error('[Bot] Failed to update chat title:', error);
    }
});

bot.on('message:left_chat_member', async (ctx) => {
    const leftMember = ctx.message.left_chat_member;
    const botId = ctx.me.id;
    const chatId = ctx.chat.id;
    const chatType = ctx.chat.type;

    if (leftMember.id === botId) {
        try {
            const notificationsCollection = await NotificationsRepository();

            await notificationsCollection.deleteMany({
                chatId,
                status: 'pending',
            });
        } catch (error) {
            console.error('[Bot] Failed to update chat active status:', error);
        }
    } else {
        const isGroupOrSupergroup = chatType === 'group' || chatType === 'supergroup';
        if (isGroupOrSupergroup) {
            await updateChatMemberCount(chatId, ctx.api);
        }
    }
});

export const webhook = webhookCallback(bot, 'std/http');

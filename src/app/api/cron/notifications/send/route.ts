import 'server-only';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { getLocale, getLocalizedText, getTranslations, pluralize } from '@/lib/i18n/i18n';
import { MomentsRepository, NotificationsRepository } from '@/lib/repositories';
import { bot } from '@/lib/telegram/bot';
import { BOT_USERNAME } from '@/lib/utils/common.utils';
import { ApiResponse } from '@/lib/utils/server.utils';

export async function GET(): Promise<ApiResponse<{ sent: number }>> {
    const notificationsCollection = await NotificationsRepository();
    const momentsCollection = await MomentsRepository();

    const pendingNotifications = await notificationsCollection
        .aggregate<{
            _id: string;
            chatId: number;
            scheduledTime: Date;
            chat?: { languageCode?: string; minutesTakePhoto: number };
        }>([
            {
                $match: {
                    status: 'pending',
                    scheduledTime: { $lte: new Date() },
                },
            },
            {
                $limit: 100,
            },
            {
                $lookup: {
                    from: 'chats',
                    localField: 'chatId',
                    foreignField: '_id',
                    as: 'chat',
                },
            },
            {
                $unwind: {
                    path: '$chat',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    chatId: 1,
                    scheduledTime: 1,
                    'chat.languageCode': 1,
                    'chat.minutesTakePhoto': 1,
                },
            },
        ])
        .toArray();

    if (pendingNotifications.length === 0) {
        return NextResponse.json({
            sent: 0,
        });
    }

    let sentCount = 0;

    for (const notification of pendingNotifications) {
        console.log('notification', notification);
        try {
            if (!notification.chat) {
                console.error('Chat notification not found', notification);
                continue;
            }

            const languageCode = getLocale(notification.chat.languageCode);
            const translationData = getTranslations(languageCode);
            const minutesWord = pluralize(
                notification.chat.minutesTakePhoto,
                languageCode,
                translationData,
                'room.minutes',
            );
            const messageTemplate = getLocalizedText('bot.notificationReminder', languageCode);
            const message = messageTemplate
                .replace('{minutes}', notification.chat.minutesTakePhoto.toString())
                .replace('{minutesWord}', minutesWord);

            const openAppText = getLocalizedText('bot.openApp', languageCode);

            const replyMarkup = {
                inline_keyboard: [
                    [
                        {
                            text: openAppText,
                            url: `https://t.me/${BOT_USERNAME}?startapp=${Math.abs(notification.chatId)}`,
                        },
                    ],
                ],
            };

            await bot.api.sendMessage(notification.chatId, message, {
                reply_markup: replyMarkup,
            });

            const sentAt = new Date();
            await Promise.all([
                notificationsCollection.updateOne(
                    { _id: notification._id },
                    {
                        $set: {
                            status: 'sent',
                            sentAt,
                        },
                    },
                ),
                momentsCollection.insertOne({
                    chatId: notification.chatId,
                    notificationId: notification._id!.toString(),
                    photos: [],
                    createdAt: sentAt,
                }),
            ]);

            sentCount++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            await notificationsCollection.updateOne(
                { _id: notification._id },
                {
                    $set: {
                        status: 'failed',
                        error: errorMessage,
                    },
                },
            );

            console.error(`Failed to send notification ${notification._id}:`, error);
        }
    }

    return NextResponse.json({
        sent: sentCount,
    });
}

import 'server-only';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { generateNotificationsForToday } from '@/lib/notifications/generate-today';
import { ChatsRepository } from '@/lib/repositories';
import { ApiResponse } from '@/lib/utils/server.utils';

export async function GET(): Promise<ApiResponse<{ generated: number }>> {
    const chatsCollection = await ChatsRepository();

    const activeChats = await chatsCollection
        .find(
            {
                active: true,
            },
            {
                projection: {
                    _id: 1,
                    notificationsPerDay: 1,
                    notificationTimeRange: 1,
                },
            },
        )
        .toArray();

    let totalGenerated = 0;

    for (const chat of activeChats) {
        const count = await generateNotificationsForToday(
            chat._id,
            chat.notificationsPerDay,
            chat.notificationTimeRange,
            false,
        );
        totalGenerated += count;
    }

    return NextResponse.json({
        generated: totalGenerated,
    });
}

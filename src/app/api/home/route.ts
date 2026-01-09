import { NextRequest, NextResponse } from 'next/server';

import { PhotosRepository } from '@/lib/repositories';
import { getChatPhotoFromTelegram } from '@/lib/utils/blob.utils';
import { ApiResponse, getContext } from '@/lib/utils/server.utils';
import { AppResponses } from '@/types/api/app.types';

export async function GET(request: NextRequest): Promise<ApiResponse<AppResponses['home']>> {
    const { userId } = getContext(request);

    const photosCollection = await PhotosRepository();
    const chatsWithPhotosData = await photosCollection
        .aggregate<{
            chatId: number;
            photosCount: number;
            chat?: { _id: number; title?: string; photo?: { smallFileId: string } };
        }>([
            { $match: { userId } },
            {
                $group: {
                    _id: '$chatId',
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'chats',
                    localField: '_id',
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
                    chatId: '$_id',
                    photosCount: '$count',
                    'chat._id': 1,
                    'chat.title': 1,
                    'chat.photo.smallFileId': 1,
                },
            },
        ])
        .toArray();

    if (chatsWithPhotosData.length === 0) {
        return NextResponse.json({
            hasPhotos: false,
            chatsWithPhotos: [],
        });
    }

    const chatsWithPhotos = await Promise.all(
        chatsWithPhotosData.map(async ({ chatId, photosCount, chat }) => {
            const photoBase64 = chat?.photo?.smallFileId
                ? await getChatPhotoFromTelegram(chat.photo.smallFileId)
                : undefined;

            return {
                chatId: Math.abs(chatId),
                title: chat?.title || 'Unknown chat',
                photoBase64,
                photosCount,
            };
        }),
    );

    chatsWithPhotos.sort((a, b) => b.photosCount - a.photosCount);

    return NextResponse.json({
        hasPhotos: chatsWithPhotos.length > 0,
        chatsWithPhotos,
    });
}

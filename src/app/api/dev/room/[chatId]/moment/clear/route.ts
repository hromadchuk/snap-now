import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { MomentsRepository, PhotosRepository } from '@/lib/repositories';
import { ApiResponse, getContext, toDbChatId } from '@/lib/utils/server.utils';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> },
): Promise<ApiResponse<{ success: boolean }>> {
    const { userId } = getContext(request);
    const resolvedParams = await params;
    const chatId = resolvedParams.chatId ? parseInt(resolvedParams.chatId, 10) : undefined;

    if (!chatId) {
        return NextResponse.json({
            error: 'Chat ID is required',
        });
    }

    const momentsCollection = await MomentsRepository();
    const photosCollection = await PhotosRepository();
    const dbChatId = toDbChatId(chatId);

    const lastMoment = await momentsCollection.findOne(
        { chatId: dbChatId },
        { projection: { _id: 1, photos: 1, createdAt: 1 }, sort: { createdAt: -1 } },
    );

    if (!lastMoment || !lastMoment._id) {
        return NextResponse.json({
            error: 'No moments found',
        });
    }

    const userPhoto = lastMoment.photos.find((photo) => photo.userId === userId);
    if (userPhoto && ObjectId.isValid(userPhoto.photoId)) {
        const photoId = new ObjectId(userPhoto.photoId);
        await photosCollection.deleteOne({ _id: photoId });
    }

    await momentsCollection.updateOne(
        { _id: lastMoment._id },
        {
            $pull: { photos: { userId } },
            $set: { createdAt: new Date() },
        },
    );

    return NextResponse.json({
        success: true,
    });
}

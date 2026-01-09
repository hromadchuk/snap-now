import { put } from '@vercel/blob';
import { randomBytes } from 'crypto';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { ChatsRepository, MomentsRepository, PhotosRepository, UsersRepository } from '@/lib/repositories';
import { bot } from '@/lib/telegram/bot';
import { ApiResponse, getContext, toDbChatId } from '@/lib/utils/server.utils';
import { isChatMember, sendToDevChat } from '@/lib/utils/telegram.utils';
import { RoomResponses } from '@/types/api/room.types';
import { IMomentPhoto } from '@/types/repositories/moments.repository';

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg'];
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function validatePhotoFormat(buffer: Buffer, mimeType: string) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return 'Invalid file type. Only JPEG images are allowed';
    }

    if (buffer.length < 3) {
        return 'File is too small to be a valid image';
    }

    const isJpeg = buffer.subarray(0, 3).equals(JPEG_SIGNATURE);

    if (!isJpeg) {
        return 'Invalid image format. File signature does not match JPEG';
    }

    return null;
}

function validatePhotoSize(buffer: Buffer) {
    if (!buffer || buffer.length === 0) {
        return 'Photo data is empty';
    }

    if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
        const maxSizeMB = (MAX_PHOTO_SIZE_BYTES / (1024 * 1024)).toFixed(1);

        return `Photo size exceeds maximum allowed size of ${maxSizeMB}MB`;
    }

    return null;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> },
): Promise<ApiResponse<RoomResponses['uploadPhoto']>> {
    try {
        const { userId } = getContext(request);
        const resolvedParams = await params;
        const chatId = resolvedParams.chatId ? parseInt(resolvedParams.chatId, 10) : undefined;

        if (!chatId) {
            return NextResponse.json({
                error: 'Chat ID is required',
            });
        }

        const isMember = await isChatMember(chatId, userId);
        if (!isMember) {
            return NextResponse.json({
                error: 'You must be a member of this chat',
            });
        }

        const formData = await request.formData();
        const momentIdStr = formData.get('momentId');
        const photoFile = formData.get('photo');

        if (!momentIdStr || typeof momentIdStr !== 'string') {
            return NextResponse.json({
                error: 'Moment ID is required',
            });
        }

        if (!photoFile || !(photoFile instanceof File)) {
            return NextResponse.json({
                error: 'Photo file is required',
            });
        }

        const arrayBuffer = await photoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const formatValidationError = validatePhotoFormat(buffer, photoFile.type);
        if (formatValidationError) {
            return NextResponse.json({
                error: formatValidationError,
            });
        }

        const sizeValidationError = validatePhotoSize(buffer);
        if (sizeValidationError) {
            return NextResponse.json({
                error: sizeValidationError,
            });
        }

        const momentsCollection = await MomentsRepository();
        const dbChatId = toDbChatId(chatId);

        if (!ObjectId.isValid(momentIdStr)) {
            return NextResponse.json({
                error: 'Invalid moment ID',
            });
        }

        const momentId = new ObjectId(momentIdStr);
        const moment = await momentsCollection.findOne(
            {
                _id: momentId,
                chatId: dbChatId,
            },
            { projection: { _id: 1, photos: 1, createdAt: 1 } },
        );

        if (!moment) {
            return NextResponse.json({
                error: 'Moment not found',
            });
        }

        const chatsCollection = await ChatsRepository();
        const chat = await chatsCollection.findOne({ _id: dbChatId }, { projection: { _id: 1, minutesTakePhoto: 1 } });

        if (!chat) {
            return NextResponse.json({
                error: 'Chat not found',
            });
        }

        const now = Date.now();
        const createdAt = moment.createdAt.getTime();
        const diff = now - createdAt;
        const minutesTakePhoto = chat.minutesTakePhoto;
        // 10 seconds buffer for long request
        const timeLimit = (minutesTakePhoto * 60 + 10) * 1000;

        if (diff >= timeLimit) {
            return NextResponse.json({
                // eslint-disable-next-line max-len
                error: `Time limit exceeded. You can only upload photos within ${minutesTakePhoto} minutes after the moment was created`,
            });
        }

        if (moment.photos && moment.photos.some((photo: IMomentPhoto) => photo.userId === userId)) {
            return NextResponse.json({
                error: 'You have already uploaded a photo for this moment',
            });
        }

        const timestamp = Date.now();
        const randomId = randomBytes(32).toString('base64url');
        const filename = `moments/photo-${timestamp}-${randomId}.jpg`;
        const blob = await put(filename, buffer, {
            access: 'public',
            contentType: 'image/jpeg',
        });

        const photosCollection = await PhotosRepository();
        const photoDoc = await photosCollection.insertOne({
            data: blob.url,
            userId,
            chatId: dbChatId,
            momentId,
            createdAt: new Date(),
        });

        const photoId = photoDoc.insertedId.toString();
        const updateResult = await momentsCollection.updateOne(
            { _id: momentId, chatId: dbChatId },
            {
                $push: {
                    photos: {
                        userId,
                        photoId,
                    },
                },
            },
        );

        if (updateResult.matchedCount === 0) {
            console.warn('[Room Photo] Moment not found:', momentIdStr);
        }

        const photosCount = await photosCollection.countDocuments({ userId });
        const usersCollection = await UsersRepository();
        await usersCollection.updateOne(
            { _id: userId },
            {
                $set: { photosCount },
            },
        );

        if (photosCount === 1) {
            try {
                const starBalance = await bot.api.getMyStarBalance();
                if (starBalance && starBalance.amount > 15) {
                    await bot.api.sendGift(userId, '5170233102089322756');
                    console.log(
                        // eslint-disable-next-line max-len
                        `[Room Photo] Gift sent to user ${userId} for first photo (star balance: ${starBalance.amount})`,
                    );
                    await sendToDevChat(
                        `Gift sent to user ${userId} for first photo (star balance: ${starBalance.amount})`,
                    );
                }
            } catch (error) {
                console.error(`[Room Photo] Failed to check star balance or send gift to user ${userId}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            photoId,
        });
    } catch (error) {
        console.error('[Room Photo] Error:', error);
        return NextResponse.json({
            error: 'Failed to upload photo',
        });
    }
}

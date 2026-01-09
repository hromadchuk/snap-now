import { Filter, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { generateNotificationsForToday } from '@/lib/notifications/generate-today';
import { ChatsRepository, MomentsRepository } from '@/lib/repositories';
import { getChatPhotoFromTelegram, getPhotoSignedUrl } from '@/lib/utils/blob.utils';
import { ApiResponse, getContext, toDbChatId } from '@/lib/utils/server.utils';
import { getChatMemberStatus, isChatMember } from '@/lib/utils/telegram.utils';
import { RoomRequests, RoomResponses } from '@/types/api/room.types';
import { IChatsRepository } from '@/types/repositories/chats.repository';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> },
): Promise<ApiResponse<RoomResponses['get']>> {
    const { userId } = getContext(request);
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const offset = parseInt(searchParams.get('offset') || '0', 10);
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

    const collection = await ChatsRepository();
    const dbChatId = toDbChatId(chatId);
    const chat = await collection.findOne(
        { _id: dbChatId },
        {
            projection: {
                title: 1,
                photo: 1,
                minutesTakePhoto: 1,
                notificationsPerDay: 1,
                notificationTimeRange: 1,
                languageCode: 1,
            },
        },
    );

    if (!chat) {
        return NextResponse.json({
            error: 'Chat not found',
        });
    }

    const getPhoto = (): Promise<string | undefined> => {
        if (!chat.photo?.smallFileId) {
            return Promise.resolve(undefined);
        }

        return getChatPhotoFromTelegram(chat.photo.smallFileId);
    };

    const getTotalMomentsCount = async (): Promise<number> => {
        try {
            const momentsCollection = await MomentsRepository();

            const query: { chatId: number; createdAt?: { $gte: Date } } = { chatId: dbChatId };
            const totalCount = await momentsCollection.countDocuments(query);

            return totalCount;
        } catch (error) {
            console.error('[Room] Failed to get total moments count:', error);
            return 0;
        }
    };

    const getMoments = async (): Promise<
        Array<{
            _id?: string;
            photos: Array<{ userId: number; photo: string }>;
            photosCount: number;
            createdAt: string;
        }>
    > => {
        try {
            const momentsCollection = await MomentsRepository();
            const now = Date.now();
            const minutesTakePhoto = chat.minutesTakePhoto;
            const timeLimit = minutesTakePhoto * 60 * 1000;
            const timeLimitAgo = new Date(now - timeLimit);

            type AggregationResult = {
                _id: ObjectId;
                createdAt: Date;
                photos: Array<{ userId: number; photoId: string }>;
                photoDocs: Array<{ _id: ObjectId; data: string; createdAt?: Date }>;
                users: Array<{ _id: number; firstName: string; lastName?: string; photoUrl?: string }>;
            };

            const pipeline = [
                {
                    $match: {
                        chatId: dbChatId,
                        ...(activeOnly && { createdAt: { $gte: timeLimitAgo } }),
                    },
                },
                { $sort: { createdAt: -1 } },
                { $skip: offset },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'photos',
                        let: { photoIds: '$photos.photoId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: [
                                            '$_id',
                                            {
                                                $map: {
                                                    input: '$$photoIds',
                                                    as: 'id',
                                                    in: { $toObjectId: '$$id' },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                            { $project: { data: 1, createdAt: 1 } },
                        ],
                        as: 'photoDocs',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        let: { userIds: '$photos.userId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$_id', '$$userIds'],
                                    },
                                },
                            },
                            { $project: { firstName: 1, lastName: 1, photoUrl: 1 } },
                        ],
                        as: 'users',
                    },
                },
                {
                    $project: {
                        _id: 1,
                        createdAt: 1,
                        photos: 1,
                        photoDocs: 1,
                        users: 1,
                    },
                },
            ];

            const result = await momentsCollection.aggregate<AggregationResult>(pipeline).toArray();

            const usersMap = new Map<number, { firstName: string; lastName?: string; photoUrl?: string }>();
            const photosMap = new Map<string, { data: string; createdAt?: Date }>();

            result.forEach((moment) => {
                if (moment.users) {
                    moment.users.forEach((user) => {
                        if (user._id) {
                            usersMap.set(user._id, {
                                firstName: user.firstName,
                                lastName: user.lastName,
                                photoUrl: user.photoUrl,
                            });
                        }
                    });
                }

                if (moment.photoDocs) {
                    moment.photoDocs.forEach((photoDoc) => {
                        if (photoDoc._id) {
                            photosMap.set(photoDoc._id.toString(), {
                                data: photoDoc.data,
                                createdAt: photoDoc.createdAt,
                            });
                        }
                    });
                }
            });

            return result.map((moment) => {
                const userHasPhoto = moment.photos?.some((photo: { userId: number }) => photo.userId === userId);
                if (!userHasPhoto || !moment.photos?.length) {
                    return {
                        _id: moment._id?.toString(),
                        photos: [],
                        photosCount: moment.photos?.length || 0,
                        createdAt: moment.createdAt.toISOString(),
                    };
                }

                const photos = moment.photos.map((photo) => {
                    const photoInfo = photosMap.get(photo.photoId);
                    const photoData = photoInfo?.data || '';
                    const signedUrl = getPhotoSignedUrl(photoData);
                    const user = usersMap.get(photo.userId);
                    const userName = user ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}` : undefined;
                    return {
                        userId: photo.userId,
                        photo: signedUrl,
                        userName,
                        userPhotoUrl: user?.photoUrl,
                        photoId: photo.photoId,
                        createdAt: photoInfo?.createdAt?.toISOString(),
                    };
                });

                return {
                    _id: moment._id?.toString(),
                    photos,
                    photosCount: moment.photos.length,
                    createdAt: moment.createdAt.toISOString(),
                };
            });
        } catch (error) {
            console.error('[Room] Failed to get moments:', error);
            return [];
        }
    };

    if (offset > 0) {
        const moments = await getMoments();
        return NextResponse.json({
            title: chat.title,
            photoBase64: undefined,
            moments,
            totalMoments: undefined,
            memberStatus: undefined,
            userId,
            notificationsPerDay: chat.notificationsPerDay,
            notificationTimeRange: chat.notificationTimeRange,
            languageCode: chat.languageCode,
            minutesTakePhoto: chat.minutesTakePhoto,
        });
    }

    const [photoBase64, moments, memberStatus, totalMoments] = await Promise.all([
        getPhoto(),
        getMoments(),
        getChatMemberStatus(chatId, userId),
        getTotalMomentsCount(),
    ]);

    return NextResponse.json({
        title: chat.title,
        photoBase64,
        moments,
        totalMoments,
        memberStatus,
        userId,
        notificationsPerDay: chat.notificationsPerDay,
        notificationTimeRange: chat.notificationTimeRange,
        languageCode: chat.languageCode,
        minutesTakePhoto: chat.minutesTakePhoto,
    });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> },
): Promise<ApiResponse<RoomResponses['settings']>> {
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

    const memberStatus = await getChatMemberStatus(chatId, userId);

    if (memberStatus !== 'creator' && memberStatus !== 'administrator') {
        return NextResponse.json({
            error: 'Only administrators can update settings',
        });
    }

    const body: RoomRequests['settings'] = await request.json();

    if (body.notificationsPerDay < 1 || body.notificationsPerDay > 3) {
        return NextResponse.json({
            error: 'Notifications per day must be between 1 and 3',
        });
    }

    if (body.notificationTimeRange.from < 0 || body.notificationTimeRange.from > 23) {
        return NextResponse.json({
            error: 'Time range from must be between 0 and 23',
        });
    }

    if (body.notificationTimeRange.to < 0 || body.notificationTimeRange.to > 23) {
        return NextResponse.json({
            error: 'Time range to must be between 0 and 23',
        });
    }

    if (body.notificationTimeRange.from >= body.notificationTimeRange.to) {
        return NextResponse.json({
            error: 'Time range from must be less than to',
        });
    }

    const collection = await ChatsRepository();

    const updateData: Filter<IChatsRepository> = {
        $set: {
            notificationsPerDay: body.notificationsPerDay,
            notificationTimeRange: body.notificationTimeRange,
            languageCode: body.languageCode,
            updatedAt: new Date(),
        },
    };

    await collection.updateOne({ _id: toDbChatId(chatId) }, updateData);

    await generateNotificationsForToday(chatId, body.notificationsPerDay, body.notificationTimeRange, true);

    return NextResponse.json({
        success: true,
    });
}

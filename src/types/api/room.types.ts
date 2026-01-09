import { MatchKeys } from '@/lib/utils/common.utils';

export type RoomRequests = {
    get: Record<string, never>;
    settings: {
        notificationsPerDay: number;
        notificationTimeRange: {
            from: number;
            to: number;
        };
        languageCode: string;
    };
    uploadPhoto: {
        momentId: string;
        photoData: string;
    };
    share: {};
};

export type RoomResponses = MatchKeys<
    RoomRequests,
    {
        get: {
            title?: string;
            photoBase64?: string;
            moments: Array<{
                _id?: string;
                photos: Array<{
                    userId: number;
                    photo: string;
                    userName?: string;
                    userPhotoUrl?: string;
                    photoId?: string;
                    createdAt?: string;
                }>;
                photosCount: number;
                createdAt: string;
            }>;
            totalMoments?: number;
            memberStatus?: string;
            userId?: number;
            notificationsPerDay: number;
            notificationTimeRange: {
                from: number;
                to: number;
            };
            languageCode: string;
            minutesTakePhoto: number;
        };
        settings: {
            success: boolean;
        };
        uploadPhoto: {
            success: boolean;
            photoId: string;
        };
        share: {
            path: string;
        };
    }
>;

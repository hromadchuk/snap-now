import { MatchKeys } from '@/lib/utils/common.utils';

export type AppRequests = {
    init: {
        initData: string;
    };
    home: Record<string, never>;
};

export type AppResponses = MatchKeys<
    AppRequests,
    {
        init: {
            userId: number;
            token: string;
            firstName: string;
            photo?: string;
            chatId?: number;
            languageCode: string;
        };
        home: {
            hasPhotos: boolean;
            chatsWithPhotos: Array<{
                chatId: number;
                title?: string;
                photoBase64?: string;
                photosCount: number;
            }>;
        };
    }
>;

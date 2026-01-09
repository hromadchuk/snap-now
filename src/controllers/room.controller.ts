import { apiRequest, getSessionStorage } from '@/lib/utils/client.utils';
import { AppResponses } from '@/types/api/app.types';
import { RoomRequests, RoomResponses } from '@/types/api/room.types';

export const roomController = {
    room(chatId: number, activeOnly?: boolean, offset?: number) {
        const params = new URLSearchParams();
        if (activeOnly) {
            params.append('activeOnly', 'true');
        }
        if (offset !== undefined) {
            params.append('offset', offset.toString());
        }
        const queryString = params.toString();
        const url = queryString ? `/room/${chatId}?${queryString}` : `/room/${chatId}`;
        return apiRequest<RoomResponses['get']>('GET', url);
    },
    updateRoomSettings(chatId: number, settings: RoomRequests['settings']) {
        return apiRequest<RoomResponses['settings']>('PATCH', `/room/${chatId}`, settings);
    },
    uploadPhoto(chatId: number, photo: { momentId: string; photoBlob: Blob }) {
        const formData = new FormData();
        formData.append('momentId', photo.momentId);
        formData.append('photo', photo.photoBlob, 'photo.jpg');
        return apiRequest<RoomResponses['uploadPhoto']>('POST', `/room/${chatId}/photo`, formData);
    },
    clearMoment(chatId: number) {
        return apiRequest<{ success: boolean }>('POST', `/dev/room/${chatId}/moment/clear`);
    },
    async getShareImageUrl(chatId: number, momentId: string): Promise<string> {
        const initData = getSessionStorage<AppResponses['init'] | null>('init');
        if (!initData?.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`/api/room/${chatId}/${momentId}/share`, {
            headers: {
                token: initData.token,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to get share image URL');
        }

        const data = (await response.json()) as RoomResponses['share'] | { error: string };
        if ('error' in data) {
            throw new Error(data.error);
        }

        return `${window.location.origin}${data.path}`;
    },
};

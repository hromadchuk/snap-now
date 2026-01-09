import { apiRequest } from '@/lib/utils/client.utils';
import { AppResponses } from '@/types/api/app.types';

export const appController = {
    init(initData: string) {
        return apiRequest<AppResponses['init']>('POST', '/init', {
            initData,
        });
    },
    home() {
        return apiRequest<AppResponses['home']>('GET', 'home');
    },
};

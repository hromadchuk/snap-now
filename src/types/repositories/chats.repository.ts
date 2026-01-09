export interface IChatsRepository {
    _id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    description?: string;
    memberCount?: number;
    photo?: {
        smallFileId: string;
        smallFileUniqueId: string;
        bigFileId: string;
        bigFileUniqueId: string;
    };
    active: boolean;
    languageCode: string;
    notificationsPerDay: number;
    notificationTimeRange: {
        from: number;
        to: number;
    };
    minutesTakePhoto: number;
    firstAddedAt: Date;
    addedAt: Date;
    updatedAt: Date;
}

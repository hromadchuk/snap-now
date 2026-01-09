export interface INotificationsRepository {
    _id?: string;
    chatId: number;
    scheduledTime: Date;
    status: 'pending' | 'sent' | 'failed';
    createdAt: Date;
    sentAt?: Date;
    error?: string;
}

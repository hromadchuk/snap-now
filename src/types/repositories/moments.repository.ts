import { ObjectId } from 'mongodb';

export interface IMomentPhoto {
    userId: number;
    photoId: string;
}

export interface IMomentsRepository {
    _id?: ObjectId;
    chatId: number;
    notificationId: string;
    photos: IMomentPhoto[];
    createdAt: Date;
}

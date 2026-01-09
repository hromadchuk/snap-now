import { ObjectId } from 'mongodb';

export interface IPhotosRepository {
    _id?: ObjectId;
    data: string;
    userId: number;
    chatId: number;
    momentId: ObjectId;
    createdAt: Date;
}

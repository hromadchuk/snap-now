import { Mongo } from '@/lib/mongo';
import { IChatsRepository } from '@/types/repositories/chats.repository';
import { IMomentsRepository } from '@/types/repositories/moments.repository';
import { INotificationsRepository } from '@/types/repositories/notifications.repository';
import { IPhotosRepository } from '@/types/repositories/photos.repository';
import { IUsersRepository } from '@/types/repositories/users.repository';

export const UsersRepository = () => Mongo.collection<IUsersRepository>('users');

export const ChatsRepository = () => Mongo.collection<IChatsRepository>('chats');

export const NotificationsRepository = () => Mongo.collection<INotificationsRepository>('notifications');

export const MomentsRepository = () => Mongo.collection<IMomentsRepository>('moments');

export const PhotosRepository = () => Mongo.collection<IPhotosRepository>('photos');

export async function createNotificationsIndexes() {
    const collection = await NotificationsRepository();
    await collection.createIndex({ status: 1, scheduledTime: 1 });
}

export async function createPhotosIndexes() {
    const collection = await PhotosRepository();
    await collection.createIndex({ userId: 1 });
}

export async function createAllIndexes() {
    await Promise.allSettled([createNotificationsIndexes(), createPhotosIndexes()]);
}

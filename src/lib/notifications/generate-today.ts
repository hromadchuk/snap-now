import 'server-only';

import { NotificationsRepository } from '@/lib/repositories';
import { toDbChatId } from '@/lib/utils/server.utils';

export async function generateNotificationsForToday(
    chatId: number,
    notificationsPerDay: number,
    notificationTimeRange: { from: number; to: number },
    requireMinHourCooldown = true,
) {
    try {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const fromDate = new Date(todayStart);
        fromDate.setUTCHours(notificationTimeRange.from, 0, 0, 0);

        const toDate = new Date(todayStart);
        toDate.setUTCHours(notificationTimeRange.to, 0, 0, 0);

        const now = new Date();

        if (requireMinHourCooldown) {
            const minTime = new Date(now.getTime() + 30 * 60 * 1000);
            if (fromDate < minTime) {
                fromDate.setTime(minTime.getTime());
            }
        } else if (fromDate < now) {
            fromDate.setTime(now.getTime());
        }

        const dates: Date[] = [];
        const currentDate = new Date(fromDate);

        while (currentDate <= toDate) {
            dates.push(new Date(currentDate));
            currentDate.setUTCMinutes(currentDate.getUTCMinutes() + 1);
        }

        const selectedDates: Date[] = [];
        const availableDates = [...dates];

        while (selectedDates.length < notificationsPerDay && availableDates.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableDates.length);
            const selectedDate = availableDates[randomIndex];
            selectedDates.push(new Date(selectedDate));

            const minTime = selectedDate.getTime() - 30 * 60 * 1000;
            const maxTime = selectedDate.getTime() + 30 * 60 * 1000;

            for (let i = availableDates.length - 1; i >= 0; i--) {
                const dateTime = availableDates[i].getTime();
                if (dateTime >= minTime && dateTime <= maxTime) {
                    availableDates.splice(i, 1);
                }
            }
        }

        selectedDates.sort((a, b) => a.getTime() - b.getTime());

        const notificationsCollection = await NotificationsRepository();
        await notificationsCollection.deleteMany({
            chatId: toDbChatId(chatId),
            status: 'pending',
        });

        console.log({ chatId: toDbChatId(chatId), notificationsPerDay, notificationTimeRange, selectedDates });

        const notifications = selectedDates.map((scheduledTime) => ({
            chatId: toDbChatId(chatId),
            scheduledTime,
            status: 'pending' as const,
            createdAt: new Date(),
        }));
        if (notifications.length > 0) {
            await notificationsCollection.insertMany(notifications);
        }

        return notifications.length;
    } catch (error) {
        console.error('Generate notifications for today error:', error);
    }

    return 0;
}

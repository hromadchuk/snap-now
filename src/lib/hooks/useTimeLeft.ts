'use client';

import { useEffect, useState } from 'react';

export function useTimeLeft(createdAt: string, minutesTakePhoto: number): number | null {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        const checkTime = () => {
            const created = new Date(createdAt).getTime();
            const now = Date.now();
            const diff = now - created;
            const timeLimit = minutesTakePhoto * 60 * 1000;

            if (diff < timeLimit) {
                const remaining = timeLimit - diff;
                setTimeLeft(Math.max(0, Math.floor(remaining / 1000)));
            } else {
                setTimeLeft(null);
            }
        };

        checkTime();
        const interval = setInterval(checkTime, 1000);

        return () => clearInterval(interval);
    }, [createdAt, minutesTakePhoto]);

    return timeLeft;
}

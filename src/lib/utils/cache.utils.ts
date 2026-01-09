import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function getCache<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);

    if (cached === null) {
        return null;
    }

    if (typeof cached === 'string') {
        try {
            const parsed = JSON.parse(cached);
            return parsed as T;
        } catch {
            return cached as T;
        }
    }

    return cached as T;
}

export async function setCache<T>(key: string, value: T, ttlMinutes: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, { ex: ttlMinutes * 60 });
}

export async function deleteCache(key: string): Promise<void> {
    await redis.del(key);
}

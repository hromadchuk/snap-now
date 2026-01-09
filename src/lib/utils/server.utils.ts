import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

export type ApiResponse<T> = NextResponse<T | { error: string }>;

export function toDbChatId(chatId: number): number {
    return -Math.abs(chatId);
}

export function getContext(req: NextRequest) {
    const userId = parseInt(req.headers.get('x-internal-user-id') || '');
    if (!userId) {
        throw new Error('Missing user context');
    }

    return { userId };
}

export function verifyCronAuth(request: NextRequest): boolean {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (vercelCronHeader) {
        return true;
    }

    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return false;
    }

    return authHeader === `Bearer ${cronSecret}`;
}

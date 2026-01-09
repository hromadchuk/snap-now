import { NextRequest, NextResponse } from 'next/server';

import { isDev } from '@/lib/utils/common.utils';
import { verifyJWT } from '@/lib/utils/jwt.utils';
import { verifyCronAuth } from '@/lib/utils/server.utils';

const publicEndpoints = ['/api/init', '/api/telegram/webhook', '/api/deploy/webhook'];

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path.startsWith('/api/dev/') && !isDev) {
        return NextResponse.json({ error: 'Access denied' }, { status: 404 });
    }

    if (path.startsWith('/api/cron/')) {
        if (!verifyCronAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.next();
    }

    if (publicEndpoints.includes(path) || path.startsWith('/api/share/temp/')) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get('token');
    if (!authHeader || authHeader.split('//').length !== 2) {
        return NextResponse.json({ error: 'Invalid auth' }, { status: 401 });
    }

    const payload = await verifyJWT(authHeader, process.env.TELEGRAM_BOT_TOKEN!);
    if (!payload || !payload.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const headers = new Headers(request.headers);
    headers.set('x-internal-user-id', payload.userId.toString());

    return NextResponse.next({ request: { headers } });
}

export const config = {
    matcher: ['/api/:path*'],
};

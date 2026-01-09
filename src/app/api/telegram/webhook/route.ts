import { NextRequest, NextResponse } from 'next/server';

import { webhook } from '@/lib/telegram/bot';
import { isDev } from '@/lib/utils/common.utils';

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        console.log('[Webhook] Received request');
        console.log('[Webhook] Body length:', body.length);

        if (isDev) {
            console.log('[Webhook] Body JSON:');
            try {
                const bodyJson = JSON.parse(body);
                console.log(JSON.stringify(bodyJson, null, 2));
            } catch {
                console.log(body);
            }
        }

        const req = new Request(request.url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body,
        });

        const response = await webhook(req);
        console.log('[Webhook] Response status:', response.status);

        const responseBody = await response.text();
        console.log('[Webhook] Response body:', responseBody);

        const headers = new Headers(response.headers);

        return new NextResponse(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        if (error instanceof Error) {
            console.error('[Webhook] Error message:', error.message);
            console.error('[Webhook] Error stack:', error.stack);
        }
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

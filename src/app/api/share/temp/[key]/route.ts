import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = Redis.fromEnv();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
    const resolvedParams = await params;
    const key = resolvedParams.key;
    const tempKey = `share-temp:${key}`;

    const value = await redis.get(tempKey);

    if (value === null) {
        return NextResponse.json({ status: 'not found' }, { status: 404 });
    }

    if (typeof value === 'string' && value.startsWith('data:image')) {
        const base64Data = value.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    }

    return NextResponse.json({ error: 'Invalid data' }, { status: 500 });
}

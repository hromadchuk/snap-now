import { parse, validate } from '@tma.js/init-data-node';
import { NextRequest, NextResponse } from 'next/server';

import { getLocalizedError } from '@/lib/i18n/i18n';
import { UsersRepository } from '@/lib/repositories';
import { isDev } from '@/lib/utils/common.utils';
import { generateJWT } from '@/lib/utils/jwt.utils';
import { ApiResponse } from '@/lib/utils/server.utils';
import { AppRequests, AppResponses } from '@/types/api/app.types';

export async function POST(request: NextRequest): Promise<ApiResponse<AppResponses['init']>> {
    const body: AppRequests['init'] = await request.json();

    if (!isDev) {
        validate(body.initData, process.env.TELEGRAM_BOT_TOKEN!);
    }

    const parsedData = parse(body.initData);
    const { user, start_param: startParam } = parsedData;
    if (!user) {
        return NextResponse.json({
            error: getLocalizedError('errors.invalidUser', 'en'),
        });
    }

    const collection = await UsersRepository();
    await collection.updateOne(
        {
            _id: user.id,
        },
        {
            $setOnInsert: {
                _id: user.id,
                firstVisit: new Date(),
                photosCount: 0,
            },
            $set: {
                firstName: user.first_name,
                lastName: user.last_name,
                languageCode: user.language_code,
                photoUrl: user.photo_url,
                username: user.username,
                lastVisit: new Date(),
            },
            $inc: {
                visits: 1,
            },
        },
        { upsert: true },
    );

    const chatId = startParam && /^\d+$/.test(startParam) ? parseInt(startParam, 10) : undefined;

    const token = await generateJWT(user.id, process.env.TELEGRAM_BOT_TOKEN!);

    return NextResponse.json({
        userId: user.id,
        token,
        firstName: user.first_name,
        photo: user.photo_url,
        chatId,
        languageCode: user.language_code || 'en',
    });
}

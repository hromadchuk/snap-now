import React from 'react';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { ObjectId } from 'mongodb';
import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import sharp from 'sharp';

const redis = Redis.fromEnv();

import { getLocale } from '@/lib/i18n/i18n';
import { MomentsRepository, PhotosRepository, UsersRepository } from '@/lib/repositories';
import { ApiResponse, getContext, toDbChatId } from '@/lib/utils/server.utils';
import { isChatMember } from '@/lib/utils/telegram.utils';
import { RoomResponses } from '@/types/api/room.types';

async function loadBackground(): Promise<string | null> {
    try {
        const backgroundPath = join(
            process.cwd(),
            'src',
            'app',
            'api',
            'room',
            '[chatId]',
            '[momentId]',
            'share',
            'background.png',
        );
        const backgroundBuffer = await readFile(backgroundPath);
        const base64 = backgroundBuffer.toString('base64');
        return `data:image/png;base64,${base64}`;
    } catch (error) {
        console.error('[Share Moment] Failed to load background:', error);
        return null;
    }
}

async function loadFont(fontName: string): Promise<ArrayBuffer | null> {
    try {
        const fontPath = join(process.cwd(), 'src', 'app', 'api', 'room', '[chatId]', '[momentId]', 'share', fontName);
        const fontBuffer = await readFile(fontPath);
        return fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
    } catch (error) {
        console.error(`[Share Moment] Failed to load font ${fontName}:`, error);
        return null;
    }
}

function formatDate(date: Date, locale: string): string {
    return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

async function fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SnapNow/1.0)',
        },
        cache: 'force-cache',
        next: {
            revalidate: 1800,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
}

function renderPhoto(src: string, size: number) {
    return (
        <img
            src={src}
            alt=""
            width={size}
            height={size}
            style={{
                borderRadius: 30,
                objectFit: 'cover',
            }}
        />
    );
}

async function createCollage(photoUrls: string[], createdAt: Date, locale: string): Promise<Buffer> {
    const background = await loadBackground();

    const involveFont = await loadFont('Involve-Regular.ttf');
    const noirProFont = await loadFont('NoirPro-Medium.ttf');

    const titleText = locale === 'ru' ? 'Момент дня' : 'Moment of the day';
    const dateText = formatDate(createdAt, locale);
    const photosToRender = photoUrls.slice(0, 13);
    const photoBase64s = await Promise.all(photosToRender.map((url) => fetchImageAsBase64(url)));

    const fonts: Array<{
        name: string;
        data: ArrayBuffer;
        style?: 'normal' | 'italic';
        weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    }> = [];
    if (involveFont) {
        fonts.push({
            name: 'Involve',
            data: involveFont,
            style: 'normal',
        });
    }
    if (noirProFont) {
        fonts.push({
            name: 'NoirPro',
            data: noirProFont,
            style: 'normal',
            weight: 500,
        });
    }

    const imageResponse = new ImageResponse(
        <div
            style={{
                width: 720,
                height: 1280,
                background: background ? `url(${background})` : '#1a1c28',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
            }}
        >
            {photoUrls.length === 1 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 400,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                    }}
                >
                    {renderPhoto(photoBase64s[0], 400)}
                </div>
            )}
            {photoUrls.length === 2 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 444,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 16,
                    }}
                >
                    {renderPhoto(photoBase64s[0], 320)}
                    {renderPhoto(photoBase64s[1], 320)}
                </div>
            )}
            {photoUrls.length === 3 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 290,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div style={{ display: 'flex' }}>{renderPhoto(photoBase64s[0], 300)}</div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[1], 300)}
                        {renderPhoto(photoBase64s[2], 300)}
                    </div>
                </div>
            )}
            {photoUrls.length === 4 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 290,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[0], 300)}
                        {renderPhoto(photoBase64s[1], 300)}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[2], 300)}
                        {renderPhoto(photoBase64s[3], 300)}
                    </div>
                </div>
            )}
            {photoUrls.length === 5 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 270,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div style={{ display: 'flex' }}>{renderPhoto(photoBase64s[0], 200)}</div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[1], 200)}
                        {renderPhoto(photoBase64s[2], 200)}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[3], 200)}
                        {renderPhoto(photoBase64s[4], 200)}
                    </div>
                </div>
            )}
            {photoUrls.length === 6 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 270,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div style={{ display: 'flex' }}>{renderPhoto(photoBase64s[0], 200)}</div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[1], 200)}
                        {renderPhoto(photoBase64s[2], 200)}
                        {renderPhoto(photoBase64s[3], 200)}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[4], 200)}
                        {renderPhoto(photoBase64s[5], 200)}
                    </div>
                </div>
            )}
            {photoUrls.length === 7 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 270,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div style={{ display: 'flex' }}>{renderPhoto(photoBase64s[0], 200)}</div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[1], 200)}
                        {renderPhoto(photoBase64s[2], 200)}
                        {renderPhoto(photoBase64s[3], 200)}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[4], 200)}
                        {renderPhoto(photoBase64s[5], 200)}
                        {renderPhoto(photoBase64s[6], 200)}
                    </div>
                </div>
            )}
            {photoUrls.length === 8 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 270,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex' }}>{renderPhoto(photoBase64s[0], 200)}</div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                            marginTop: 60,
                        }}
                    >
                        {renderPhoto(photoBase64s[1], 150)}
                        {renderPhoto(photoBase64s[2], 150)}
                        {renderPhoto(photoBase64s[3], 150)}
                        {renderPhoto(photoBase64s[4], 150)}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                            marginTop: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[5], 150)}
                        {renderPhoto(photoBase64s[6], 150)}
                        {renderPhoto(photoBase64s[7], 150)}
                    </div>
                </div>
            )}
            {photoUrls.length === 9 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 270,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex' }}>{renderPhoto(photoBase64s[0], 200)}</div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                            marginTop: 60,
                        }}
                    >
                        {renderPhoto(photoBase64s[1], 150)}
                        {renderPhoto(photoBase64s[2], 150)}
                        {renderPhoto(photoBase64s[3], 150)}
                        {renderPhoto(photoBase64s[4], 150)}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                            marginTop: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[5], 150)}
                        {renderPhoto(photoBase64s[6], 150)}
                        {renderPhoto(photoBase64s[7], 150)}
                        {renderPhoto(photoBase64s[8], 150)}
                    </div>
                </div>
            )}
            {photoUrls.length >= 10 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 270,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex' }}>{renderPhoto(photoBase64s[0], 200)}</div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                            marginTop: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[1], 150)}
                        {renderPhoto(photoBase64s[2], 150)}
                        {renderPhoto(photoBase64s[3], 150)}
                        {renderPhoto(photoBase64s[4], 150)}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                            marginTop: 16,
                        }}
                    >
                        {renderPhoto(photoBase64s[5], 150)}
                        {renderPhoto(photoBase64s[6], 150)}
                        {renderPhoto(photoBase64s[7], 150)}
                        {renderPhoto(photoBase64s[8], 150)}
                    </div>
                    {photoBase64s.length > 9 && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: 16,
                                marginTop: 16,
                            }}
                        >
                            {photoBase64s.slice(9, 13).map((photo) => renderPhoto(photo, 150))}
                        </div>
                    )}
                </div>
            )}
            <div
                style={{
                    position: 'absolute',
                    top: 120,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 700,
                        color: '#ff8c42',
                        textAlign: 'center',
                        fontFamily: 'Involve',
                    }}
                >
                    {titleText}
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '100%',
                        paddingLeft: 40,
                        paddingRight: 40,
                        marginTop: -2,
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: 4,
                            backgroundColor: '#ff8c42',
                            borderRadius: 2,
                        }}
                    />
                    <div
                        style={{
                            fontSize: 26,
                            fontWeight: 500,
                            color: '#8b92ab',
                            textAlign: 'center',
                            fontFamily: 'NoirPro',
                            paddingLeft: 20,
                            paddingRight: 20,
                        }}
                    >
                        {dateText}
                    </div>
                    <div
                        style={{
                            flex: 1,
                            height: 4,
                            backgroundColor: '#ff8c42',
                            borderRadius: 2,
                        }}
                    />
                </div>
            </div>
            <div
                style={{
                    position: 'absolute',
                    bottom: 110,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: '#ff8c42',
                        textAlign: 'center',
                        fontFamily: 'NoirPro',
                    }}
                >
                    Snap Now
                </div>
            </div>
        </div>,
        {
            width: 720,
            height: 1280,
            ...(fonts.length > 0 && { fonts }),
        },
    );

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return buffer;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string; momentId: string }> },
): Promise<ApiResponse<RoomResponses['share']>> {
    try {
        const { userId } = getContext(request);
        const resolvedParams = await params;
        const chatId = resolvedParams.chatId ? parseInt(resolvedParams.chatId, 10) : undefined;
        const momentIdStr = resolvedParams.momentId;

        if (!chatId) {
            return NextResponse.json({ error: 'Chat ID is required' });
        }

        if (!ObjectId.isValid(momentIdStr)) {
            return NextResponse.json({ error: 'Invalid moment ID' });
        }

        const isMember = await isChatMember(chatId, userId);
        if (!isMember) {
            return NextResponse.json({ error: 'You must be a member of this chat' });
        }

        const dbChatId = toDbChatId(chatId);
        const momentId = new ObjectId(momentIdStr);

        const momentsCollection = await MomentsRepository();
        const moment = await momentsCollection.findOne(
            {
                _id: momentId,
                chatId: dbChatId,
            },
            { projection: { _id: 1, photos: 1, createdAt: 1 } },
        );

        if (!moment) {
            return NextResponse.json({ error: 'Moment not found' });
        }

        if (!moment.photos || moment.photos.length === 0) {
            return NextResponse.json({ error: 'Moment has no photos' });
        }

        const usersCollection = await UsersRepository();
        const user = await usersCollection.findOne({ _id: userId }, { projection: { languageCode: 1 } });
        const locale = getLocale(user?.languageCode);

        const photosCollection = await PhotosRepository();
        const photoIds = moment.photos.map((photo) => new ObjectId(photo.photoId));
        const photos = await photosCollection
            .find(
                {
                    _id: { $in: photoIds },
                    chatId: dbChatId,
                    momentId,
                },
                { projection: { _id: 1, data: 1, userId: 1 } },
            )
            .toArray();

        photos.sort((a, b) => {
            if (a.userId === userId && b.userId !== userId) {
                return -1;
            }
            if (a.userId !== userId && b.userId === userId) {
                return 1;
            }
            return (a.userId || 0) - (b.userId || 0);
        });

        if (photos.length === 0) {
            return NextResponse.json({ error: 'No photos found' });
        }

        const photoUrls = photos
            .map((photo) => photo.data)
            .filter(
                (url): url is string =>
                    typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')),
            );

        if (photoUrls.length === 0) {
            return NextResponse.json({ error: 'No valid photo URLs found' });
        }

        console.log('[Share Moment] Generating new story image, loading photos:', photoUrls.length);

        const photoUrlsHash = createHash('sha256')
            .update(`${locale}|${photoUrls.sort().join('|')}`)
            .digest('hex')
            .slice(0, 16);
        const tempKey = `share-temp:${photoUrlsHash}`;
        const filePath = `/api/share/temp/${photoUrlsHash}`;

        const exists = await redis.exists(tempKey);

        if (exists === 1) {
            console.log('[Share Moment] Using existing collage from cache');
            return NextResponse.json({ path: filePath });
        }

        const collage = await createCollage(photoUrls, moment.createdAt, locale);
        console.log('[Share Moment] Collage created, size:', collage.length);

        const compressedImage = await sharp(collage).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
        const reductionPercent = ((1 - compressedImage.length / collage.length) * 100).toFixed(1);
        const logMessage =
            `[Share Moment] Image compressed: ${collage.length} -> ${compressedImage.length} bytes ` +
            `(${reductionPercent}% reduction)`;
        console.log(logMessage);

        const imageBase64 = compressedImage.toString('base64');
        const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
        await redis.set(tempKey, imageDataUrl, { ex: 300 });
        console.log('[Share Moment] Story image saved to Redis');

        return NextResponse.json({ path: filePath });
    } catch (error) {
        console.error('[Share Moment] Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate share image' });
    }
}

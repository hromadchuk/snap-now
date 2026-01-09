import 'server-only';

interface JWTPayload {
    userId: number;
    iat: number;
    exp: number;
}

const header = {
    alg: 'HS256',
    typ: 'JWT',
};
const encodedHeader = base64UrlEncode(JSON.stringify(header));

export async function generateJWT(userId: number, secret: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
        userId,
        iat: now,
        exp: now + 24 * 60 * 60,
    };

    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
    const encodedSignature = base64UrlEncode(arrayBufferToString(signature));

    return `${encodedPayload}//${encodedSignature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
    try {
        const parts = token.split('//');
        if (parts.length !== 2) {
            return null;
        }

        const [encodedPayload, encodedSignature] = parts;
        const signature = stringToArrayBuffer(base64UrlDecode(encodedSignature));
        const expectedSignature = await sign(`${encodedHeader}.${encodedPayload}`, secret);

        if (!arrayBufferEqual(signature, expectedSignature)) {
            return null;
        }
        const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            return null;
        }

        return payload;
    } catch (error) {
        console.error('JWT verification error:', error);
        return null;
    }
}

function base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return atob(padded);
}

async function sign(data: string, secret: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
    ]);

    return await crypto.subtle.sign('HMAC', key, encoder.encode(data));
}

function arrayBufferToString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
}

function stringToArrayBuffer(str: string): ArrayBuffer {
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
        view[i] = str.charCodeAt(i);
    }
    return buffer;
}

function arrayBufferEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) {
        return false;
    }

    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);

    for (let i = 0; i < viewA.length; i++) {
        if (viewA[i] !== viewB[i]) {
            return false;
        }
    }

    return true;
}

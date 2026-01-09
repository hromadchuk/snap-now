import { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono as GeistMono } from 'next/font/google';

import { MiniAppWrapper } from '@/components/MiniAppWrapper/MiniAppWrapper';

import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = GeistMono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Snap Now',
    description: 'Take a photo at random time',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable}`}>
                <MiniAppWrapper>{children}</MiniAppWrapper>
                <Analytics />
            </body>
        </html>
    );
}

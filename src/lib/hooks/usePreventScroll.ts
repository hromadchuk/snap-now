'use client';

import { useEffect, useRef } from 'react';

export function usePreventScroll(enabled: boolean, excludeSelector?: string) {
    const overlayRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const preventScroll = (e: TouchEvent | WheelEvent) => {
            if (excludeSelector) {
                const target = e.target as HTMLElement;
                if (target.closest(excludeSelector)) {
                    return;
                }
            }
            e.preventDefault();
        };

        const overlay = overlayRef.current;
        if (overlay) {
            overlay.addEventListener('touchmove', preventScroll, { passive: false });
            overlay.addEventListener('wheel', preventScroll, { passive: false });
        }

        return () => {
            if (overlay) {
                overlay.removeEventListener('touchmove', preventScroll);
                overlay.removeEventListener('wheel', preventScroll);
            }
        };
    }, [enabled, excludeSelector]);

    return overlayRef;
}

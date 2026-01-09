'use client';

import { DependencyList, useEffect } from 'react';

export function useAsyncEffect(effect: () => Promise<void | (() => void)>, deps?: DependencyList) {
    useEffect(() => {
        let isCancelled = false;
        let cleanup: (() => void) | void;

        (async () => {
            if (isCancelled) {
                return;
            }

            cleanup = await effect();
        })();

        return () => {
            isCancelled = true;
            if (cleanup && typeof cleanup === 'function') {
                cleanup();
            }
        };
    }, deps);
}

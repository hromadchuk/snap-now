'use client';

import { useCallback, useEffect, useState } from 'react';

interface CameraState {
    stream: MediaStream | null;
    isLoading: boolean;
    cameraError: string | null;
    currentDeviceId: string | null;
    availableDevices: MediaDeviceInfo[];
    isFrontCamera: boolean;
    zoomLevel: number;
    hardwareZoomSupported: boolean;
    zoomRange: { min: number; max: number; step: number };
}

export function useCamera() {
    const [state, setState] = useState<CameraState>({
        stream: null,
        isLoading: false,
        cameraError: null,
        currentDeviceId: null,
        availableDevices: [],
        isFrontCamera: false,
        zoomLevel: 1,
        hardwareZoomSupported: false,
        zoomRange: { min: 1, max: 1, step: 0.1 },
    });

    const getAvailableCameras = useCallback(async (): Promise<MediaDeviceInfo[]> => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices
                .filter((device) => device.kind === 'videoinput' && device.deviceId)
                .map((camera) => {
                    const input = camera as InputDeviceInfo;

                    return {
                        camera: input,
                        capabilities: input.getCapabilities(),
                    };
                });

            if (cameras.length > 2) {
                const frontCamera = cameras.find(({ capabilities }) => capabilities.facingMode?.includes('user'));
                const backs = cameras.filter(({ capabilities }) => capabilities?.facingMode?.includes('environment'));

                if (backs.length) {
                    backs.sort((a, b) => {
                        const aCapabilities = a.capabilities as MediaTrackCapabilities & {
                            focusDistance?: { min?: number };
                        };
                        const bCapabilities = b.capabilities as MediaTrackCapabilities & {
                            focusDistance?: { min?: number };
                        };
                        const aDist = aCapabilities?.focusDistance?.min ?? Infinity;
                        const bDist = bCapabilities?.focusDistance?.min ?? Infinity;

                        return aDist - bDist;
                    });

                    const backCamera = backs[Math.floor(backs.length / 2)] ?? null;

                    if (frontCamera && backCamera) {
                        return [frontCamera.camera, backCamera.camera];
                    }
                }
            }

            return cameras.map(({ camera }) => camera);
        } catch (error) {
            console.error('Error enumerating devices:', error);
            return [];
        }
    }, []);

    const startCamera = useCallback(
        async (deviceId?: string) => {
            try {
                setState((prev) => ({ ...prev, isLoading: true, cameraError: null }));

                let constraints: MediaStreamConstraints;
                if (deviceId) {
                    constraints = { video: { deviceId: { exact: deviceId } } };
                } else {
                    constraints = { video: { facingMode: 'user' } };
                }

                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

                if (state.stream) {
                    state.stream.getTracks().forEach((track) => track.stop());
                }

                setState((prev) => ({ ...prev, stream: mediaStream, zoomLevel: 1 }));

                const track = mediaStream.getVideoTracks()[0];
                if (track) {
                    const settings = track.getSettings();
                    const activeDeviceId = settings.deviceId;
                    const cameras = await getAvailableCameras();
                    const currentDevice = cameras.find((device) => device.deviceId === activeDeviceId);

                    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
                        zoom?: { min?: number; max?: number; step?: number };
                    };

                    let hardwareZoomSupported = false;
                    let zoomRange = { min: 1, max: 1, step: 0.1 };
                    let zoomLevel = 1;

                    if (capabilities.zoom && typeof capabilities.zoom === 'object') {
                        const zoomMin = capabilities.zoom.min ?? 1;
                        const zoomMax = capabilities.zoom.max ?? 1;
                        if (zoomMax > zoomMin) {
                            hardwareZoomSupported = true;
                            zoomRange = {
                                min: zoomMin,
                                max: zoomMax,
                                step: capabilities.zoom.step ?? 0.1,
                            };
                            zoomLevel = zoomMin;
                        }
                    }

                    const facingMode = settings.facingMode;
                    let isFrontCamera = false;

                    if (facingMode === 'user') {
                        isFrontCamera = true;
                    } else if (facingMode === 'environment') {
                        isFrontCamera = false;
                    } else {
                        const label = currentDevice?.label.toLowerCase() || '';
                        isFrontCamera = label.includes('front') || label.includes('user') || label.includes('facing');
                    }

                    setState((prev) => ({
                        ...prev,
                        currentDeviceId: activeDeviceId || null,
                        availableDevices: cameras,
                        isFrontCamera,
                        hardwareZoomSupported,
                        zoomRange,
                        zoomLevel,
                        isLoading: false,
                    }));
                } else {
                    setState((prev) => ({ ...prev, isLoading: false }));
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                const err = error as DOMException;
                setState((prev) => ({
                    ...prev,
                    cameraError: err.message || String(error),
                    isLoading: false,
                }));
            }
        },
        [state.stream, getAvailableCameras],
    );

    const stopCamera = useCallback(() => {
        if (state.stream) {
            state.stream.getTracks().forEach((track) => track.stop());
            setState((prev) => ({ ...prev, stream: null }));
        }
    }, [state.stream]);

    const switchCamera = useCallback(async () => {
        if (state.availableDevices.length < 2) {
            return;
        }

        const currentIndex = state.availableDevices.findIndex((device) => device.deviceId === state.currentDeviceId);
        let nextIndex: number;
        if (currentIndex >= 0) {
            nextIndex = (currentIndex + 1) % state.availableDevices.length;
        } else {
            nextIndex = 0;
        }
        const nextDevice = state.availableDevices[nextIndex];

        if (!nextDevice?.deviceId) {
            return;
        }

        await startCamera(nextDevice.deviceId);
    }, [state.availableDevices, state.currentDeviceId, startCamera]);

    const applyZoom = useCallback(
        async (newZoom: number) => {
            const clampedZoom = Math.max(state.zoomRange.min, Math.min(state.zoomRange.max, newZoom));
            setState((prev) => ({ ...prev, zoomLevel: clampedZoom }));

            if (!state.stream) {
                return;
            }

            const track = state.stream.getVideoTracks()[0];
            if (!track) {
                return;
            }

            if (state.hardwareZoomSupported) {
                try {
                    await track.applyConstraints({
                        zoom: clampedZoom,
                    } as unknown as MediaTrackConstraints);
                } catch (error) {
                    console.error('Error applying zoom:', error);
                }
            }
        },
        [state.stream, state.zoomRange, state.hardwareZoomSupported],
    );

    useEffect(() => {
        return () => {
            if (state.stream) {
                state.stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [state.stream]);

    return {
        ...state,
        startCamera,
        stopCamera,
        switchCamera,
        applyZoom,
    };
}

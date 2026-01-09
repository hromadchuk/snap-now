'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconArrowsExchange, IconClock, IconX } from '@tabler/icons-react';

import { useI18n } from '@/contexts/I18nContext';
import { useCamera } from '@/lib/hooks/useCamera';
import { useLockBodyScroll } from '@/lib/hooks/useLockBodyScroll';
import { usePreventScroll } from '@/lib/hooks/usePreventScroll';
import { capturePhotoFromVideo } from '@/lib/utils/camera.utils';
import { formatTimeLeft, getCssVar } from '@/lib/utils/client.utils';

import styles from './CameraView.module.css';

interface CameraViewProps {
    timeLeft: number;
    onClose: () => void;
    onCapture: (photoBlob: Blob) => Promise<void>;
    onTimerCapture: () => void;
    timerCountdown: number | null;
    isSending: boolean;
}

export function CameraView({
    timeLeft,
    onClose,
    onCapture,
    onTimerCapture,
    timerCountdown,
    isSending,
}: CameraViewProps) {
    const { t } = useI18n();
    const {
        stream,
        isLoading,
        cameraError,
        availableDevices,
        isFrontCamera,
        zoomLevel,
        hardwareZoomSupported,
        zoomRange,
        startCamera,
        switchCamera,
        applyZoom,
    } = useCamera();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [iconColor, setIconColor] = useState('#ffffff');

    useLockBodyScroll(Boolean(stream));
    const cameraOverlayRef = usePreventScroll(Boolean(stream), '.zoomControl, input[type="range"]');

    useEffect(() => {
        setIconColor(getCssVar('--app-primary-color'));
    }, []);

    useEffect(() => {
        if (!stream) {
            startCamera();
        }
    }, [stream, startCamera]);

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        applyZoom(newZoom);
    };

    const capturePhoto = (): Promise<Blob | null> => {
        if (!videoRef.current) {
            return Promise.resolve(null);
        }

        return capturePhotoFromVideo({
            video: videoRef.current,
            isFrontCamera,
        });
    };

    const handleCapture = async () => {
        const photoBlob = await capturePhoto();
        if (!photoBlob) {
            return;
        }
        await onCapture(photoBlob);
    };

    if (typeof window === 'undefined') {
        return null;
    }

    if (cameraError && !stream && !isSending) {
        return createPortal(
            <div ref={cameraOverlayRef as React.RefObject<HTMLDivElement>} className={styles.cameraOverlay}>
                <div className={styles.cameraOverlayContent}>
                    <button
                        className={styles.cameraCloseButton}
                        onClick={onClose}
                        title={t('room.closeCamera') || 'Close'}
                    >
                        <IconX size={24} color="#ffffff" />
                    </button>
                    <div className={styles.cameraError}>
                        <span className={styles.cameraErrorText}>{cameraError}</span>
                        <button onClick={() => startCamera()} disabled={isLoading} className={styles.retryButton}>
                            {isLoading ? t('room.loading') : t('room.retry')}
                        </button>
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    if (!stream || isSending) {
        return null;
    }

    return createPortal(
        <div ref={cameraOverlayRef as React.RefObject<HTMLDivElement>} className={styles.cameraOverlay}>
            <div className={styles.cameraOverlayContent}>
                <button className={styles.cameraCloseButton} onClick={onClose} title={t('room.closeCamera') || 'Close'}>
                    <IconX size={24} color="#ffffff" />
                </button>
                {timeLeft !== null && timeLeft > 0 && (
                    <div className={styles.cameraTimer}>
                        <span className={styles.cameraTimerLabel}>{t('room.timeLeft')}</span>
                        <span className={styles.cameraTimerValue}>{formatTimeLeft(timeLeft)}</span>
                    </div>
                )}
                <div className={styles.cameraPreview}>
                    <video
                        ref={videoRef}
                        className={styles.cameraVideo}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            transform: isFrontCamera ? 'scaleX(-1)' : 'none',
                        }}
                    />
                    {hardwareZoomSupported && (
                        <div className={styles.zoomControl}>
                            <input
                                type="range"
                                min={zoomRange.min}
                                max={zoomRange.max}
                                step={zoomRange.step}
                                value={zoomLevel}
                                onChange={handleZoomChange}
                                className={styles.zoomSlider}
                            />
                        </div>
                    )}
                    <div className={styles.cameraControls}>
                        {availableDevices.length >= 2 && (
                            <button
                                onClick={switchCamera}
                                disabled={isLoading || timerCountdown !== null}
                                className={styles.switchCameraButton}
                                title={t('room.switchCamera')}
                            >
                                <IconArrowsExchange size={20} color={iconColor} />
                            </button>
                        )}
                        <button
                            onClick={onTimerCapture}
                            disabled={isSending || isLoading || timeLeft <= 6}
                            className={styles.timerPhotoButton}
                            title={timerCountdown === null ? t('room.timerPhoto') : `${timerCountdown}`}
                        >
                            {timerCountdown === null ? (
                                <IconClock size={20} color={iconColor} />
                            ) : (
                                <span className={styles.timerCountdown}>{timerCountdown}</span>
                            )}
                        </button>
                        <button
                            onClick={handleCapture}
                            disabled={isSending || isLoading || timerCountdown !== null}
                            className={styles.sendPhotoButton}
                        >
                            {isSending ? t('room.sending') : t('room.sendPhoto')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

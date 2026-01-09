'use client';

import { useEffect, useRef, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';

import { CameraView } from '@/components/CameraView/CameraView';
import { useI18n } from '@/contexts/I18nContext';
import { roomController } from '@/controllers/room.controller';
import { capturePhotoFromVideo } from '@/lib/utils/camera.utils';
import { formatTimeLeft, getCssVar } from '@/lib/utils/client.utils';
import { RoomResponses } from '@/types/api/room.types';

import styles from './ActiveMomentCard.module.css';

interface ActiveMomentCardProps {
    moment: RoomResponses['get']['moments'][0];
    timeLeft: number;
    onPhotoSent: () => Promise<void>;
    chatId?: number;
}

export function ActiveMomentCard({ moment, timeLeft, onPhotoSent, chatId }: ActiveMomentCardProps) {
    const { t } = useI18n();
    const [isSending, setIsSending] = useState(false);
    const [photoSent, setPhotoSent] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [timerCountdown, setTimerCountdown] = useState<number | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleTakePhoto = () => {
        setShowCamera(true);
    };

    const handleCloseCamera = () => {
        setShowCamera(false);
    };

    const handleSendPhoto = async (photoBlob: Blob) => {
        if (!chatId) {
            return;
        }

        setIsSending(true);
        try {
            const response = await roomController.uploadPhoto(chatId, {
                momentId: moment._id!,
                photoBlob,
            });

            if ('error' in response) {
                console.error('Failed to upload photo:', response.error);
                setIsSending(false);
            } else {
                console.log('Photo uploaded successfully:', response.photoId);
                setPhotoSent(true);
                setShowCamera(false);
                await onPhotoSent();
                setIsSending(false);
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            setIsSending(false);
        }
    };

    const handleTimerPhoto = () => {
        if (timerCountdown !== null) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            setTimerCountdown(null);
            return;
        }

        setTimerCountdown(5);
    };

    useEffect(() => {
        if (timerCountdown === null) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            return undefined;
        }

        if (timerCountdown === 0) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            setTimerCountdown(null);

            const sendTimerPhoto = async () => {
                const video = document.querySelector('video') as HTMLVideoElement | null;
                if (!video) {
                    return;
                }

                const videoElement = video;
                const videoStream = videoElement.srcObject as MediaStream | null;
                const track = videoStream?.getVideoTracks()[0];
                const settings = track?.getSettings();
                const facingMode = settings?.facingMode;
                const shouldMirror =
                    facingMode === 'user' ||
                    (facingMode === undefined && videoElement.style.transform.includes('scaleX(-1)'));

                const blob = await capturePhotoFromVideo({
                    video,
                    isFrontCamera: shouldMirror,
                });

                if (blob) {
                    await handleSendPhoto(blob);
                }
            };

            sendTimerPhoto();
            return undefined;
        }

        timerIntervalRef.current = setInterval(() => {
            setTimerCountdown((prev) => {
                if (prev === null) {
                    return null;
                }
                if (prev <= 1) {
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [timerCountdown]);

    if (photoSent && !isSending) {
        return null;
    }

    return (
        <>
            <div className={styles.activeMomentCard}>
                <div className={styles.activeMomentHeader}>
                    <div className={styles.activeMomentIcon}>📸</div>
                    <div className={styles.activeMomentTitle}>{t('room.activeMoment')}</div>
                </div>
                <div className={`${styles.activeMomentTimer} ${showCamera ? styles.activeMomentTimerCompact : ''}`}>
                    <span className={styles.activeMomentTimerLabel}>{t('room.timeLeft')}</span>
                    <span className={styles.activeMomentTimerValue}>{formatTimeLeft(timeLeft)}</span>
                </div>
                {isSending && (
                    <div className={styles.sendingLoader}>
                        <IconLoader2
                            size={32}
                            color={getCssVar('--app-primary-text-color')}
                            style={{ animation: 'spin 1s linear infinite' }}
                        />
                        <span className={styles.sendingText}>{t('room.sending')}</span>
                    </div>
                )}
                {!showCamera && !isSending && (
                    <button onClick={handleTakePhoto} className={styles.activeMomentButton}>
                        {t('room.takePhoto')}
                    </button>
                )}
            </div>
            {showCamera && (
                <CameraView
                    timeLeft={timeLeft}
                    onClose={handleCloseCamera}
                    onCapture={handleSendPhoto}
                    onTimerCapture={handleTimerPhoto}
                    timerCountdown={timerCountdown}
                    isSending={isSending}
                />
            )}
        </>
    );
}

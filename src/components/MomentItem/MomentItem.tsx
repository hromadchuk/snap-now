'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconBrandVk, IconLoader2, IconPhoto, IconShare } from '@tabler/icons-react';
import { openLink, shareStory, useLaunchParams } from '@tma.js/sdk-react';
import Image from 'next/image';

import { Alert, PhotoViewer, useAlert } from '@/components';
import { useI18n } from '@/contexts/I18nContext';
import { roomController } from '@/controllers/room.controller';
import { useTimeLeft } from '@/lib/hooks/useTimeLeft';
import { formatTimeLeft, getCssVar, isMobileTelegramPlatform } from '@/lib/utils/client.utils';
import { BOT_USERNAME } from '@/lib/utils/common.utils';
import { RoomResponses } from '@/types/api/room.types';

import styles from './MomentItem.module.css';

interface MomentItemProps {
    moment: RoomResponses['get']['moments'][0];
    chatId?: number;
    minutesTakePhoto: number;
    momentNumber?: number;
}

export function MomentItem({ moment, chatId, minutesTakePhoto, momentNumber }: MomentItemProps) {
    const { t, pluralize, locale } = useI18n();
    const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
    const [iconColor, setIconColor] = useState('#6ab2f2');
    const [isMounted, setIsMounted] = useState(false);
    const timeLeft = useTimeLeft(moment.createdAt, minutesTakePhoto);
    const [isSharing, setIsSharing] = useState(false);
    const { alert: alertState, showAlert, hideAlert } = useAlert();
    const launchParamsData = useLaunchParams();

    useEffect(() => {
        setIconColor(getCssVar('--app-hint-color'));
        setIsMounted(true);
    }, []);

    const date = new Date(moment.createdAt);
    const formattedDate = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const isCompletedEmpty = timeLeft === null && moment.photosCount === 0;
    const isCompletedWithoutUserPhoto = timeLeft === null && moment.photos.length === 0 && moment.photosCount > 0;

    const handleShare = async () => {
        if (!moment._id || !chatId || isSharing) {
            return;
        }
        setIsSharing(true);
        try {
            const fullUrl = await roomController.getShareImageUrl(chatId, moment._id);
            shareStory(fullUrl, {
                text: t('room.shareText'),
                widgetLink: {
                    url: `https://t.me/${BOT_USERNAME}`,
                    name: 'Snap Now',
                },
            });
        } catch (error) {
            console.error('Failed to share moment:', error);
            showAlert(error instanceof Error ? error.message : 'Failed to share moment', 'error');
        } finally {
            setIsSharing(false);
        }
    };

    const handleShareVk = async () => {
        if (!moment._id || !chatId || isSharing) {
            return;
        }
        setIsSharing(true);
        try {
            const fullUrl = await roomController.getShareImageUrl(chatId, moment._id);
            const storyData = {
                background_type: 'image',
                url: fullUrl,
            };
            const storyDataJson = JSON.stringify(storyData);
            const storyDataBase64 = btoa(storyDataJson);
            const vkStoryUrl = `https://vk.com/new_story?storybox=${storyDataBase64}`;
            openLink(vkStoryUrl, {
                tryInstantView: false,
            });
        } catch (error) {
            console.error('Failed to generate share image:', error);
            showAlert(error instanceof Error ? error.message : 'Failed to generate share image', 'error');
        } finally {
            setIsSharing(false);
        }
    };

    const renderMomentHeader = () => {
        if (isCompletedEmpty) {
            return (
                <div className={styles.momentHeaderCompact}>
                    <div className={styles.momentInfoCompact}>
                        <div className={styles.momentDateRowCompact}>
                            <div className={styles.momentDateCompact}>{formattedDate}</div>
                            <div className={styles.momentTimeCompact}>{formattedTime}</div>
                            {momentNumber !== undefined && (
                                <span className={styles.momentNumberCompact}>#{momentNumber}</span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (isCompletedWithoutUserPhoto) {
            return (
                <div className={styles.momentHeaderCompact}>
                    <div className={styles.momentInfoCompact}>
                        <div className={styles.momentDateRowCompact}>
                            <div className={styles.momentDateCompact}>{formattedDate}</div>
                            <div className={styles.momentTimeCompact}>{formattedTime}</div>
                            {momentNumber !== undefined && (
                                <span className={styles.momentNumberCompact}>#{momentNumber}</span>
                            )}
                        </div>
                    </div>
                    <div className={styles.momentPhotosCompact}>
                        <span className={styles.momentPhotosLabelCompact}>
                            {pluralize(moment.photosCount, 'room.photo')}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.momentHeader}>
                <div className={styles.momentIcon}>📸</div>
                <div className={styles.momentInfo}>
                    <div className={styles.momentDateRow}>
                        <div className={styles.momentDate}>
                            {formattedDate}
                            {momentNumber !== undefined && (
                                <span className={styles.momentNumber}> #{momentNumber}</span>
                            )}
                        </div>
                        <div className={styles.momentTime}>{formattedTime}</div>
                    </div>
                    {timeLeft !== null && timeLeft > 0 && (
                        <div className={styles.momentTimer}>
                            {t('room.timeLeft')}: {formatTimeLeft(timeLeft)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            className={`${styles.momentItem} ${
                isCompletedEmpty ? styles.momentItemCompletedEmpty : ''
            } ${isCompletedWithoutUserPhoto ? styles.momentItemCompletedWithoutUserPhoto : ''}`}
        >
            {renderMomentHeader()}
            {moment.photosCount > 0 && (
                <div
                    className={`${styles.momentThumbnails} ${
                        isCompletedWithoutUserPhoto ? styles.momentThumbnailsCompact : ''
                    }`}
                >
                    {moment.photos.length > 0 &&
                        moment.photos.map((photo, index) => (
                            <div
                                key={index}
                                className={`${styles.momentThumbnailCard} ${
                                    isCompletedWithoutUserPhoto ? styles.momentThumbnailCardCompact : ''
                                }`}
                                onClick={() => setViewingPhotoIndex(index)}
                            >
                                <Image
                                    src={photo.photo}
                                    alt={`Photo ${index + 1}`}
                                    width={isCompletedWithoutUserPhoto ? 48 : 80}
                                    height={isCompletedWithoutUserPhoto ? 48 : 80}
                                    className={styles.momentThumbnail}
                                    unoptimized
                                />
                                {photo.userName && (
                                    <div className={styles.momentThumbnailOverlay}>
                                        {photo.userPhotoUrl && (
                                            <Image
                                                src={photo.userPhotoUrl}
                                                alt={photo.userName}
                                                width={16}
                                                height={16}
                                                className={styles.momentThumbnailAuthorAvatar}
                                                unoptimized
                                            />
                                        )}
                                        <span className={styles.momentThumbnailAuthorName} title={photo.userName}>
                                            {photo.userName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    {moment.photos.length === 0 &&
                        Array.from({ length: moment.photosCount }).map((_, index) => (
                            <div
                                key={index}
                                className={`${styles.momentThumbnailPlaceholder} ${
                                    isCompletedWithoutUserPhoto ? styles.momentThumbnailPlaceholderCompact : ''
                                }`}
                            >
                                <IconPhoto size={isCompletedWithoutUserPhoto ? 20 : 32} color={iconColor} />
                            </div>
                        ))}
                </div>
            )}
            {moment.photos.length > 0 && moment._id && chatId && (
                <div className={styles.momentShareButtonsContainer}>
                    <button
                        className={styles.momentShareButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleShare();
                        }}
                        title={t('room.shareToStory')}
                        disabled={isSharing}
                    >
                        {isSharing ? (
                            <>
                                <IconLoader2 size={18} color="#ffffff" className={styles.momentShareButtonLoader} />
                                <span>{t('room.sharing')}</span>
                            </>
                        ) : (
                            <>
                                <IconShare size={18} color="#ffffff" />
                                <span>{t('room.shareToStory')}</span>
                            </>
                        )}
                    </button>
                    {locale === 'ru' && isMobileTelegramPlatform(launchParamsData.tgWebAppPlatform) && (
                        <button
                            className={styles.momentShareVkButton}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShareVk();
                            }}
                            title="ВКонтакте"
                            disabled={isSharing}
                        >
                            {isSharing ? (
                                <IconLoader2 size={18} color="#ffffff" className={styles.momentShareButtonLoader} />
                            ) : (
                                <IconBrandVk size={18} color="#ffffff" />
                            )}
                        </button>
                    )}
                </div>
            )}
            {viewingPhotoIndex !== null && (
                <PhotoViewer
                    photos={moment.photos.map((photo) => ({
                        photoId: photo.photoId,
                        photo: photo.photo,
                        userId: photo.userId,
                        userName: photo.userName,
                        userPhotoUrl: photo.userPhotoUrl,
                        createdAt: photo.createdAt,
                    }))}
                    initialIndex={viewingPhotoIndex}
                    onClose={() => setViewingPhotoIndex(null)}
                    chatId={chatId}
                />
            )}
            {alertState &&
                isMounted &&
                createPortal(
                    <Alert
                        message={alertState.message}
                        type={alertState.type}
                        onClose={hideAlert}
                        actionLabel={alertState.actionLabel}
                        onAction={alertState.onAction}
                    />,
                    document.body,
                )}
        </div>
    );
}

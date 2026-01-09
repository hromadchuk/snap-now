'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconSettings } from '@tabler/icons-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

import { EmptyState, Loader } from '@/components';
import { ActiveMomentCard } from '@/components/ActiveMomentCard/ActiveMomentCard';
import { MomentItem } from '@/components/MomentItem/MomentItem';
import { useI18n } from '@/contexts/I18nContext';
import { roomController } from '@/controllers/room.controller';
import ruIcon from '@/icons/RU.svg';
import usIcon from '@/icons/US.svg';
import { useTimeLeft } from '@/lib/hooks/useTimeLeft';
import { getCssVar } from '@/lib/utils/client.utils';
import { RoomResponses } from '@/types/api/room.types';

import commonStyles from '../../common.module.css';
import styles from '../styles.module.css';

function isActiveMoment(
    moment: RoomResponses['get']['moments'][0],
    userId: number | undefined,
    minutesTakePhoto: number,
): boolean {
    const createdAt = new Date(moment.createdAt).getTime();
    const now = Date.now();
    const diff = now - createdAt;
    const timeLimit = minutesTakePhoto * 60 * 1000;
    const isRecent = diff < timeLimit;

    if (!isRecent) {
        return false;
    }

    if (userId && moment.photos.some((photo) => photo.userId === userId)) {
        return false;
    }

    return true;
}

export default function Room() {
    const params = useParams();
    const chatId = params.chatId ? parseInt(params.chatId as string, 10) : undefined;
    const { t, pluralize } = useI18n();
    const [data, setData] = useState<RoomResponses['get'] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notificationsPerDay, setNotificationsPerDay] = useState(1);
    const [timeFrom, setTimeFrom] = useState(10);
    const [timeTo, setTimeTo] = useState(20);
    const [languageCode, setLanguageCode] = useState('en');
    const [minutesTakePhoto, setMinutesTakePhoto] = useState(0);
    const [saving, setSaving] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [clearingMoment, setClearingMoment] = useState(false);

    const activeMoment = data?.moments?.find((moment) => isActiveMoment(moment, data.userId, minutesTakePhoto));
    const activeMomentTimeLeft = useTimeLeft(activeMoment?.createdAt || '', minutesTakePhoto);

    const refreshData = useCallback(async () => {
        if (!chatId) {
            return;
        }
        const response = await roomController.room(chatId, false, 0);
        if ('error' in response) {
            setError(response.error);
        } else {
            setData(response);
            setNotificationsPerDay(response.notificationsPerDay);
            setTimeFrom(response.notificationTimeRange.from);
            setTimeTo(response.notificationTimeRange.to);
            setLanguageCode(response.languageCode);
            setMinutesTakePhoto(response.minutesTakePhoto);
            setHasMore(response.moments.length === 10);
        }
    }, [chatId]);

    const refreshActiveMoments = useCallback(async () => {
        if (!data || !chatId) {
            return;
        }

        const response = await roomController.room(chatId, true);
        if ('error' in response) {
            return;
        }

        setData((prevData) => {
            if (!prevData) {
                return prevData;
            }

            const activeMomentIds = new Set(response.moments.map((moment) => moment._id!));

            const updatedMoments = [
                ...response.moments,
                ...(prevData.moments || []).filter((moment) => !activeMomentIds.has(moment._id!)),
            ].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });

            return {
                ...prevData,
                moments: updatedMoments,
            };
        });
    }, [data, chatId]);

    useEffect(() => {
        if (!chatId) {
            setLoading(false);
            setError('Chat ID is required');
            return;
        }
        roomController.room(chatId, false, 0).then((response) => {
            setLoading(false);
            if ('error' in response) {
                setError(response.error);
            } else {
                setData(response);
                setNotificationsPerDay(response.notificationsPerDay);
                setTimeFrom(response.notificationTimeRange.from);
                setTimeTo(response.notificationTimeRange.to);
                setLanguageCode(response.languageCode);
                setMinutesTakePhoto(response.minutesTakePhoto);
                setHasMore(response.moments.length === 10);
            }
        });
    }, [chatId]);

    useEffect(() => {
        if (!data?.moments) {
            return undefined;
        }

        const currentActiveMoment = data.moments.find((moment) =>
            isActiveMoment(moment, data.userId, minutesTakePhoto),
        );

        const otherMoments = data.moments.filter((moment) => moment._id !== currentActiveMoment?._id) || [];

        const hasActiveTimers = otherMoments.some((moment) => {
            const createdAt = new Date(moment.createdAt).getTime();
            const now = Date.now();
            const diff = now - createdAt;
            const timeLimit = minutesTakePhoto * 60 * 1000;
            return diff < timeLimit;
        });

        if (!hasActiveTimers) {
            return undefined;
        }

        const interval = setInterval(() => {
            refreshActiveMoments();
        }, 2000);

        return () => clearInterval(interval);
    }, [data?.moments, refreshActiveMoments, minutesTakePhoto]);

    const loadMoreMoments = useCallback(async () => {
        if (!chatId || !data || loadingMore || !hasMore) {
            return;
        }

        setLoadingMore(true);
        const currentOffset = data.moments?.length || 0;
        const response = await roomController.room(chatId, false, currentOffset);

        if ('error' in response) {
            setLoadingMore(false);
            return;
        }

        const newMoments = response.moments || [];

        setData((prevData) => {
            if (!prevData) {
                return prevData;
            }

            const existingMomentIds = new Set((prevData.moments || []).map((moment) => moment._id!));
            const uniqueNewMoments = newMoments.filter((moment) => !existingMomentIds.has(moment._id!));

            return {
                ...prevData,
                moments: [...(prevData.moments || []), ...uniqueNewMoments],
            };
        });

        setHasMore(newMoments.length === 10);
        setLoadingMore(false);
    }, [chatId, data, loadingMore, hasMore]);

    const handleSave = async () => {
        if (!data) {
            return;
        }

        if (!chatId) {
            return;
        }

        setSaving(true);
        const response = await roomController.updateRoomSettings(chatId, {
            notificationsPerDay,
            notificationTimeRange: {
                from: timeFrom,
                to: timeTo,
            },
            languageCode,
        });
        setSaving(false);

        if ('error' in response) {
            setError(response.error);
        } else {
            setData({
                ...data,
                notificationsPerDay,
                notificationTimeRange: {
                    from: timeFrom,
                    to: timeTo,
                },
                languageCode,
            });
            setSettingsExpanded(false);
        }
    };

    if (loading) {
        return (
            <div className={commonStyles.container}>
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className={commonStyles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('room.title')}</h1>
                    <p className={styles.subtitle}>{t('room.subtitle')}</p>
                </div>
                <div className={styles.emptyState}>
                    <EmptyState message={error} />
                </div>
            </div>
        );
    }

    if (!data || (!data.title && !data.photoBase64)) {
        return (
            <div className={commonStyles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('room.title')}</h1>
                    <p className={styles.subtitle}>{t('room.subtitle')}</p>
                </div>
                <div className={styles.emptyState}>
                    <EmptyState message={t('room.emptyState')} />
                </div>
            </div>
        );
    }

    const isAdmin = data.memberStatus === 'creator' || data.memberStatus === 'administrator';
    const otherMoments = data.moments?.filter((moment) => moment._id !== activeMoment?._id) || [];
    const isDevRoom = chatId === 5033155318;

    const handleClearMoment = async () => {
        if (!chatId || clearingMoment) {
            return;
        }

        setClearingMoment(true);
        try {
            const response = await roomController.clearMoment(chatId);
            if ('error' in response) {
                console.error('Failed to clear moment:', response.error);
            } else {
                await refreshData();
            }
        } catch (err) {
            console.error('Error clearing moment:', err);
        } finally {
            setClearingMoment(false);
        }
    };

    return (
        <div className={commonStyles.container}>
            <div className={styles.chatCard}>
                {data.photoBase64 && (
                    <Image
                        src={data.photoBase64}
                        alt={data.title || 'Chat'}
                        width={64}
                        height={64}
                        className={styles.chatPhoto}
                        unoptimized
                    />
                )}
                <div className={styles.chatInfo}>
                    <h2 className={styles.chatTitle}>{data.title || t('room.unknownChat')}</h2>
                    <div className={styles.chatNotificationsInfo}>
                        <span className={styles.chatNotificationItem}>
                            {data.notificationsPerDay} {pluralize(data.notificationsPerDay, 'room.moment')}{' '}
                            {t('room.perDay')}, {data.notificationTimeRange.from}:00 - {data.notificationTimeRange.to}
                            :00 UTC
                        </span>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        type="button"
                        onClick={() => setSettingsExpanded(!settingsExpanded)}
                        className={styles.settingsButton}
                    >
                        <IconSettings size={24} color={getCssVar('--app-hint-color')} />
                    </button>
                )}
            </div>
            {isDevRoom && (
                <button onClick={handleClearMoment} disabled={clearingMoment} className={styles.devClearButton}>
                    {clearingMoment ? t('room.loading') : 'Clear Moment (Dev)'}
                </button>
            )}
            {isAdmin && settingsExpanded && (
                <div className={styles.settingsCard}>
                    <div className={styles.settingsContent}>
                        <div className={styles.settingsField}>
                            <label className={styles.settingsLabel}>{t('room.notificationsPerDay')}</label>
                            <div className={styles.radioGroup}>
                                {[1, 2, 3].map((value) => (
                                    <label key={value} className={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            name="notificationsPerDay"
                                            value={value}
                                            checked={notificationsPerDay === value}
                                            onChange={(e) => setNotificationsPerDay(Number(e.target.value))}
                                            className={styles.radioInput}
                                        />
                                        <span className={styles.radioText}>{value}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className={styles.settingsField}>
                            <div className={styles.settingsLabelRow}>
                                <label className={styles.settingsLabel}>{t('room.timeRange')}</label>
                                <span className={styles.utcNote}>{t('room.utcNote')}</span>
                            </div>
                            <div className={styles.rangeSliderContainer}>
                                <div
                                    className={styles.rangeSliderWrapper}
                                    style={
                                        {
                                            '--from': timeFrom,
                                            '--to': timeTo,
                                        } as React.CSSProperties
                                    }
                                >
                                    <input
                                        type="range"
                                        min="0"
                                        max="23"
                                        value={timeFrom}
                                        onChange={(e) => {
                                            const newFrom = Number(e.target.value);
                                            if (newFrom < timeTo) {
                                                setTimeFrom(newFrom);
                                            }
                                        }}
                                        className={styles.rangeSlider}
                                        style={{
                                            zIndex: timeFrom > timeTo - 2 ? 2 : 1,
                                        }}
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max="23"
                                        value={timeTo}
                                        onChange={(e) => {
                                            const newTo = Number(e.target.value);
                                            if (newTo > timeFrom) {
                                                setTimeTo(newTo);
                                            }
                                        }}
                                        className={styles.rangeSlider}
                                        style={{
                                            zIndex: timeTo < timeFrom + 2 ? 2 : 1,
                                        }}
                                    />
                                </div>
                                <div className={styles.rangeValues}>
                                    <span className={styles.rangeValue}>{timeFrom}:00</span>
                                    <span className={styles.rangeValue}>{timeTo}:00</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.settingsInfoField}>
                            <span className={styles.settingsInfoLabel}>{t('room.minutesTakePhoto')}:</span>
                            <span className={styles.settingsInfoValue}>
                                {minutesTakePhoto} {pluralize(minutesTakePhoto, 'room.minutes')}
                            </span>
                        </div>
                        <div className={styles.settingsField}>
                            <label className={styles.settingsLabel}>{t('room.language')}</label>
                            <div className={styles.languageGroup}>
                                <label className={styles.languageLabel}>
                                    <input
                                        type="radio"
                                        name="languageCode"
                                        value="en"
                                        checked={languageCode === 'en'}
                                        onChange={(e) => setLanguageCode(e.target.value)}
                                        className={styles.radioInput}
                                    />
                                    <Image
                                        src={usIcon}
                                        alt="English"
                                        width={24}
                                        height={24}
                                        className={styles.languageIcon}
                                    />
                                    <span className={styles.radioText}>English</span>
                                </label>
                                <label className={styles.languageLabel}>
                                    <input
                                        type="radio"
                                        name="languageCode"
                                        value="ru"
                                        checked={languageCode === 'ru'}
                                        onChange={(e) => setLanguageCode(e.target.value)}
                                        className={styles.radioInput}
                                    />
                                    <Image
                                        src={ruIcon}
                                        alt="Russian"
                                        width={24}
                                        height={24}
                                        className={styles.languageIcon}
                                    />
                                    <span className={styles.radioText}>Русский</span>
                                </label>
                            </div>
                        </div>
                        <button onClick={handleSave} disabled={saving} className={styles.saveButton}>
                            {saving ? t('room.saving') : t('room.save')}
                        </button>
                    </div>
                </div>
            )}
            {activeMoment && activeMomentTimeLeft !== null && activeMomentTimeLeft > 0 && (
                <ActiveMomentCard
                    moment={activeMoment}
                    timeLeft={activeMomentTimeLeft}
                    onPhotoSent={refreshData}
                    chatId={chatId}
                />
            )}
            {otherMoments.length > 0 ? (
                <>
                    <div className={styles.momentsSection}>
                        <div className={styles.momentsTitleRow}>
                            <h3 className={styles.momentsTitle}>{t('room.momentsTitle')}</h3>
                            {data.totalMoments !== undefined && (
                                <span className={styles.momentsCount}>
                                    {data.totalMoments} {pluralize(data.totalMoments, 'room.moment')}
                                </span>
                            )}
                        </div>
                        <div className={styles.momentsList}>
                            {otherMoments.map((moment, index) => {
                                let momentNumber: number | undefined;
                                if (data.totalMoments !== undefined) {
                                    const activeMomentOffset = activeMoment ? 1 : 0;
                                    momentNumber = data.totalMoments - index - activeMomentOffset;
                                }
                                return (
                                    <MomentItem
                                        key={moment._id!}
                                        moment={moment}
                                        chatId={chatId}
                                        minutesTakePhoto={minutesTakePhoto}
                                        momentNumber={momentNumber}
                                    />
                                );
                            })}
                        </div>
                        {hasMore && (
                            <button onClick={loadMoreMoments} disabled={loadingMore} className={styles.loadMoreButton}>
                                {loadingMore ? t('room.loading') : t('room.showMore')}
                            </button>
                        )}
                    </div>
                </>
            ) : (
                !activeMoment && (
                    <div className={styles.momentsSection}>
                        <div className={styles.noMoments}>{t('room.noMoments')}</div>
                    </div>
                )
            )}
        </div>
    );
}

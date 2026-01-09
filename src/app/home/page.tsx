'use client';

import { useEffect, useState } from 'react';
import { openLink, openTelegramLink, useLaunchParams } from '@tma.js/sdk-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Loader } from '@/components';
import { useI18n } from '@/contexts/I18nContext';
import { appController } from '@/controllers/app.controller';
import { isMobileTelegramPlatform } from '@/lib/utils/client.utils';
import { BOT_USERNAME, DEVELOPER_USERNAME } from '@/lib/utils/common.utils';
import { AppResponses } from '@/types/api/app.types';

import commonStyles from '../common.module.css';
import styles from './styles.module.css';

function Header() {
    const { t } = useI18n();

    return (
        <div className={styles.header}>
            <h1 className={styles.title}>{t('home.title')}</h1>
            <p className={styles.subtitle}>{t('home.subtitle')}</p>
        </div>
    );
}

function EarlyStageSection() {
    const { t } = useI18n();
    const launchParamsData = useLaunchParams();
    const isMobile = isMobileTelegramPlatform(launchParamsData.tgWebAppPlatform);

    const handleContactDeveloper = () => {
        const url = `https://t.me/${DEVELOPER_USERNAME}`;
        if (isMobile) {
            openTelegramLink(url);
        } else {
            openLink(url);
        }
    };

    return (
        <div className={`${styles.welcomeSection} ${styles.contactSection}`}>
            <div className={styles.earlyStageContent}>
                <h3 className={styles.earlyStageTitle}>{t('home.earlyStage.title')}</h3>
                <p className={styles.earlyStageDescription}>{t('home.earlyStage.description')}</p>
                <button className={styles.contactButton} onClick={handleContactDeveloper}>
                    {t('home.earlyStage.contactButton')}
                </button>
            </div>
        </div>
    );
}

export default function Home() {
    const { t, pluralize } = useI18n();
    const router = useRouter();
    const launchParamsData = useLaunchParams();
    const [chatsData, setChatsData] = useState<AppResponses['home']['chatsWithPhotos']>([]);
    const [loading, setLoading] = useState(true);

    const isMobile = isMobileTelegramPlatform(launchParamsData.tgWebAppPlatform);

    useEffect(() => {
        const checkPhotos = async () => {
            const response = await appController.home();
            if ('error' in response) {
                console.error('Failed to check photos:', response.error);
                setLoading(false);
                return;
            }
            setChatsData(response.chatsWithPhotos);
            setLoading(false);
        };

        checkPhotos();
    }, []);

    const handleAddToGroup = () => {
        const url = `https://t.me/${BOT_USERNAME}?startgroup=`;
        if (isMobile) {
            openTelegramLink(url);
        } else {
            openLink(url);
        }
    };

    if (loading) {
        return (
            <div className={commonStyles.container}>
                <Loader />
            </div>
        );
    }

    if (chatsData.length > 0) {
        return (
            <div className={commonStyles.container}>
                <Header />

                <div className={styles.welcomeSection}>
                    <button className={`${styles.addButton} ${styles.addButtonOnly}`} onClick={handleAddToGroup}>
                        {t('bot.addToGroup')}
                    </button>
                    <p className={styles.addButtonHint}>{t('home.addToGroupHint')}</p>
                </div>

                <div className={styles.welcomeSection}>
                    <h2 className={styles.sectionTitle}>{t('home.chatsWithPhotos')}</h2>
                    <div className={styles.chatsList}>
                        {chatsData.map((chat) => (
                            <div
                                key={chat.chatId}
                                className={styles.chatItem}
                                onClick={() => router.push(`/room/${chat.chatId}`)}
                            >
                                <div className={styles.chatPhoto}>
                                    {chat.photoBase64 ? (
                                        <Image
                                            src={chat.photoBase64}
                                            alt={chat.title || ''}
                                            width={56}
                                            height={56}
                                            className={styles.chatPhotoImage}
                                            unoptimized
                                        />
                                    ) : (
                                        <div className={styles.chatPhotoPlaceholder}>
                                            {(chat.title || t('room.unknownChat')).charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.chatInfo}>
                                    <div className={styles.chatTitle}>{chat.title || t('room.unknownChat')}</div>
                                    <div className={styles.chatPhotosCount}>
                                        {chat.photosCount} {pluralize(chat.photosCount, 'room.photo')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <EarlyStageSection />
            </div>
        );
    }

    return (
        <div className={commonStyles.container}>
            <Header />

            <div className={styles.welcomeSection}>
                <h2 className={styles.welcomeTitle}>{t('home.welcome')}</h2>
                <p className={styles.description}>{t('home.description')}</p>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('home.howToUse')}</h2>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>1</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>{t('home.step1.title')}</h3>
                            <p className={styles.stepDescription}>{t('home.step1.description')}</p>
                            <button className={styles.addButton} onClick={handleAddToGroup}>
                                {t('bot.addToGroup')}
                            </button>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>2</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>{t('home.step2.title')}</h3>
                            <p className={styles.stepDescription}>{t('home.step2.description')}</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>3</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>{t('home.step3.title')}</h3>
                            <p className={styles.stepDescription}>{t('home.step3.description')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <EarlyStageSection />
        </div>
    );
}

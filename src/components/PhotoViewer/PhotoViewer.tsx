'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

import { useLockBodyScroll } from '@/lib/hooks/useLockBodyScroll';
import { usePreventScroll } from '@/lib/hooks/usePreventScroll';

import styles from './PhotoViewer.module.css';

export interface PhotoViewerPhoto {
    photoId?: string;
    photo: string;
    userId?: number;
    userName?: string;
    userPhotoUrl?: string;
    createdAt?: string;
}

interface PhotoViewerProps {
    photos: PhotoViewerPhoto[];
    initialIndex: number;
    onClose: () => void;
    chatId?: number;
}

export function PhotoViewer({ photos, initialIndex, onClose }: PhotoViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useLockBodyScroll(true);
    const overlayRef = usePreventScroll(true);

    useEffect(() => {
        if (currentIndex >= photos.length) {
            if (photos.length > 0) {
                setCurrentIndex(Math.max(0, photos.length - 1));
            } else {
                onClose();
            }
        }
    }, [photos.length, currentIndex, onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
            } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
                setCurrentIndex(currentIndex + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentIndex, photos.length, onClose]);

    if (photos.length === 0 || !photos[currentIndex]) {
        return null;
    }

    const currentPhoto = photos[currentIndex];

    if (typeof window === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            ref={overlayRef as React.RefObject<HTMLDivElement>}
            className={styles.photoViewerOverlay}
            onClick={onClose}
        >
            <div className={styles.photoViewerContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.photoViewerClose} onClick={onClose}>
                    ×
                </button>
                {currentIndex > 0 && (
                    <button
                        className={styles.photoViewerPrev}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(currentIndex - 1);
                        }}
                    >
                        ‹
                    </button>
                )}
                <Image
                    src={photos[currentIndex].photo}
                    alt={`Photo ${currentIndex + 1}`}
                    width={800}
                    height={800}
                    className={styles.photoViewerImage}
                    unoptimized
                />
                {currentIndex < photos.length - 1 && (
                    <button
                        className={styles.photoViewerNext}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(currentIndex + 1);
                        }}
                    >
                        ›
                    </button>
                )}
                <div className={styles.photoViewerCounter}>
                    {currentIndex + 1} / {photos.length}
                </div>
                {photos[currentIndex].userName && (
                    <div className={styles.photoViewerAuthor}>
                        {photos[currentIndex].userPhotoUrl && (
                            <Image
                                src={photos[currentIndex].userPhotoUrl}
                                alt={photos[currentIndex].userName}
                                width={24}
                                height={24}
                                className={styles.photoViewerAuthorAvatar}
                                unoptimized
                            />
                        )}
                        <span>{photos[currentIndex].userName}</span>
                    </div>
                )}
                {currentPhoto.createdAt && (
                    <div className={styles.photoViewerDate}>
                        {new Date(currentPhoto.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

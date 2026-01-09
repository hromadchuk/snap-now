export interface CapturePhotoOptions {
    video: HTMLVideoElement;
    isFrontCamera?: boolean;
    quality?: number;
}

export function capturePhotoFromVideo(options: CapturePhotoOptions): Promise<Blob | null> {
    const { video, isFrontCamera = false, quality = 0.9 } = options;

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            resolve(null);
            return;
        }

        const size = Math.min(video.videoWidth, video.videoHeight);
        const x = (video.videoWidth - size) / 2;
        const y = (video.videoHeight - size) / 2;

        canvas.width = size;
        canvas.height = size;

        if (isFrontCamera) {
            ctx.translate(size, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, x, y, size, size, 0, 0, size, size);

        canvas.toBlob(
            (blob) => {
                resolve(blob);
            },
            'image/jpeg',
            quality,
        );
    });
}

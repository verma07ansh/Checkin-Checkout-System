import QRCode from 'qrcode';
import { uploadImage } from './image-hosting';
import { Event, EventUser } from '../types';

export async function generateEventPass(event: Event, user: EventUser): Promise<string> {
    try {
        // 1. Generate QR Data (Format: eventId_userId)
        const qrData = `${event.id}_${user.id}`;

        // Generate QR Code as Data URL
        const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: event.qrPosition.size,
            margin: 1,
            errorCorrectionLevel: 'H',
            color: {
                dark: event.qrPosition.color || '#000000',
                light: event.qrPosition.bgColor || '#00000000' // transparent if not set
            }
        });

        // 2. Load Images
        const templateImg = await loadImage(event.passTemplateURL);
        const qrImg = await loadImage(qrDataUrl);

        // 3. Draw on Canvas
        const canvas = document.createElement('canvas');
        canvas.width = templateImg.width;
        canvas.height = templateImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        // Draw Template
        ctx.drawImage(templateImg, 0, 0);

        // Draw QR Code
        ctx.drawImage(qrImg, event.qrPosition.x, event.qrPosition.y, event.qrPosition.size, event.qrPosition.size);

        // Draw Name if configured
        if (event.namePosition) {
            ctx.fillStyle = event.namePosition.color;
            ctx.font = `${event.namePosition.size}px ${event.namePosition.font || 'Arial'}`;
            ctx.textBaseline = 'top'; // Matches HTML/CSS positioning usually

            // Handle Rotation
            ctx.save();
            ctx.translate(event.namePosition.x, event.namePosition.y);
            ctx.rotate((event.namePosition.rotation || 0) * Math.PI / 180);
            ctx.fillText(user.name, 0, 0);
            ctx.restore();
        }

        // 4. Convert to Blob
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to create blob for pass');

        // 5. Upload to Firebase Storage
        // 5. Upload to FreeImage.host
        const file = new File([blob], `${event.id}_${user.id}.png`, { type: 'image/png' });
        const downloadURL = await uploadImage(file);
        return downloadURL;

    } catch (error) {
        console.error(`Pass generation failed for user ${user.id}`, error);
        throw error;
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Essential for Canvas export
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { uploadImage } from '../../../../lib/image-hosting';
import { Upload, Save, Trash2 } from 'lucide-react';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [passImage, setPassImage] = useState<File | null>(null);
    const [passPreview, setPassPreview] = useState<string | null>(null);
    const [originalPassUrl, setOriginalPassUrl] = useState<string | null>(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [scale, setScale] = useState(1);

    // QR Position State
    const [qrX, setQrX] = useState(50);
    const [qrY, setQrY] = useState(50);
    const [qrSize, setQrSize] = useState(250);
    const [qrRotation, setQrRotation] = useState(0);

    // Name Position State
    const [nameX, setNameX] = useState(50);
    const [nameY, setNameY] = useState(350);
    const [nameSize, setNameSize] = useState(30);
    const [nameColor, setNameColor] = useState('#000000');
    const [nameFont, setNameFont] = useState('Arial');
    const [nameRotation, setNameRotation] = useState(0);

    // Dragging State
    const [isDragging, setIsDragging] = useState<'qr' | 'name' | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;
            try {
                const docRef = doc(db, 'events', eventId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setName(data.name || '');
                    setDate(data.date || '');
                    setTime(data.time || '');
                    setDescription(data.description || '');
                    if (data.passTemplateURL) {
                        setPassPreview(data.passTemplateURL);
                        setOriginalPassUrl(data.passTemplateURL);
                    }
                    if (data.qrPosition) {
                        setQrX(data.qrPosition.x || 50);
                        setQrY(data.qrPosition.y || 50);
                        setQrSize(data.qrPosition.size || 250);
                        setQrRotation(data.qrPosition.rotation || 0);
                    }
                    if (data.namePosition) {
                        setNameX(data.namePosition.x || 50);
                        setNameY(data.namePosition.y || 350);
                        setNameSize(data.namePosition.size || 30);
                        setNameColor(data.namePosition.color || '#000000');
                        setNameFont(data.namePosition.font || 'Arial');
                        setNameRotation(data.namePosition.rotation || 0);
                    }
                } else {
                    alert('Event not found');
                    router.push('/admin/events');
                }
            } catch (error) {
                console.error("Error fetching event:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchEvent();
    }, [eventId, router]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPassImage(file);
            setPassPreview(URL.createObjectURL(file));
        }
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        // Only center if it's a NEW image upload, otherwise keep existing coordinates
        // Actually, logic is tricky here. If user uploads NEW image, we should probably reset/center?
        // Let's assume on new image upload (passImage is not null) we center.
        if (passImage) {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            setQrX(Math.round((naturalWidth - qrSize) / 2));
            setQrY(Math.round((naturalHeight - qrSize) / 2));
            setNameX(Math.round((naturalWidth - 200) / 2));
            setNameY(Math.round((naturalHeight) / 2 + 100));
        }
        setImgLoaded(true);
        updateScale();
    };

    const updateScale = () => {
        if (imageRef.current) {
            const currentScale = imageRef.current.clientWidth / imageRef.current.naturalWidth;
            if (!isNaN(currentScale) && currentScale > 0) {
                setScale(currentScale);
            }
        }
    };

    useEffect(() => {
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const handleMouseDown = (e: React.MouseEvent, type: 'qr' | 'name') => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(type);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !imageRef.current) return;

        // Use the current scale state or calculate it fresh if needed (state is safer for consistency)

        const scale = imageRef.current.clientWidth / imageRef.current.naturalWidth;
        const rect = imageRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        if (isDragging === 'qr') {
            const newX = (offsetX / scale) - (qrSize / 2);
            const newY = (offsetY / scale) - (qrSize / 2);
            setQrX(Math.round(newX));
            setQrY(Math.round(newY));
        } else if (isDragging === 'name') {
            // For text, assume center origin for simpler dragging feeling, or top-left
            // Implementing approximate center dragging for text
            const newX = (offsetX / scale);
            const newY = (offsetY / scale);
            setNameX(Math.round(newX));
            setNameY(Math.round(newY));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(null);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !date) {
            alert('Please fill all required fields.');
            return;
        }

        setLoading(true);
        try {
            let passTemplateURL = originalPassUrl;

            // Upload new image if selected
            if (passImage) {
                setUploading(true);
                try {
                    passTemplateURL = await uploadImage(passImage);
                } catch (err) {
                    console.error("Upload failed", err);
                    alert("Image upload failed.");
                    setUploading(false);
                    setLoading(false);
                    return;
                }
                setUploading(false);
            }

            if (!passTemplateURL) {
                alert('Pass template is required.');
                setLoading(false);
                return;
            }

            await updateDoc(doc(db, 'events', eventId), {
                name,
                date,
                time,
                description,
                passTemplateURL,
                qrPosition: {
                    x: Number(qrX),
                    y: Number(qrY),
                    size: Number(qrSize),
                    rotation: Number(qrRotation)
                },
                namePosition: {
                    x: Number(nameX),
                    y: Number(nameY),
                    size: Number(nameSize),
                    color: nameColor,
                    font: nameFont,
                    rotation: Number(nameRotation)
                },
                updatedAt: serverTimestamp()
            });

            router.push('/admin/events');
        } catch (error) {
            console.error("Error updating event", error);
            alert("Failed to update event.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center text-gray-500">Loading event details...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>EDIT EVENT</h1>
                <p className="text-gray-600">Update event details and pass configuration.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Details */}
                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
                    <h2 className="text-2xl font-bold border-b-2 border-dashed border-gray-300 pb-2">EVENT DETAILS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="font-bold">Event Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-50 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="font-bold">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-50 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="font-bold">Time</label>
                            <input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-50 outline-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="font-bold">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-50 outline-none h-32"
                        ></textarea>
                    </div>
                </div>

                {/* Pass Template & Customization */}
                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
                    <h2 className="text-2xl font-bold border-b-2 border-dashed border-gray-300 pb-2">PASS TEMPLATE</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Settings */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="font-bold flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    Change Template (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="w-full border-2 border-black p-2 font-mono"
                                />
                                <p className="text-xs text-gray-500">Leave empty to keep current image</p>
                            </div>

                            {passPreview && (
                                <>
                                    <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-300">
                                        <h3 className="font-bold text-sm uppercase">QR Code Position</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">X Offset</label>
                                                <input
                                                    type="number"
                                                    value={qrX}
                                                    onChange={e => setQrX(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Y Offset</label>
                                                <input
                                                    type="number"
                                                    value={qrY}
                                                    onChange={e => setQrY(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Size</label>
                                                <input
                                                    type="number"
                                                    value={qrSize}
                                                    onChange={e => setQrSize(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Rotation (deg)</label>
                                                <input
                                                    type="number"
                                                    value={qrRotation}
                                                    onChange={e => setQrRotation(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-300">
                                        <h3 className="font-bold text-sm uppercase">User Name Position</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">X Offset</label>
                                                <input
                                                    type="number"
                                                    value={nameX}
                                                    onChange={e => setNameX(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Y Offset</label>
                                                <input
                                                    type="number"
                                                    value={nameY}
                                                    onChange={e => setNameY(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Font Size (px)</label>
                                                <input
                                                    type="number"
                                                    value={nameSize}
                                                    onChange={e => setNameSize(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Color</label>
                                                <input
                                                    type="color"
                                                    value={nameColor}
                                                    onChange={e => setNameColor(e.target.value)}
                                                    className="w-full border-2 border-black p-1 h-10 cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Font Family</label>
                                                <select
                                                    value={nameFont}
                                                    onChange={e => setNameFont(e.target.value)}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                >
                                                    <option value="Arial">Arial</option>
                                                    <option value="Times New Roman">Times New Roman</option>
                                                    <option value="Courier New">Courier New</option>
                                                    <option value="Verdana">Verdana</option>
                                                    <option value="Georgia">Georgia</option>
                                                    <option value="Impact">Impact</option>
                                                    <option value="Tahoma">Tahoma</option>
                                                    <option value="Trebuchet MS">Trebuchet MS</option>
                                                    <option value="Segoe UI">Segoe UI</option>
                                                    <option value="Roboto">Roboto</option>
                                                    <option value="Helvetica">Helvetica</option>
                                                    <option value="Gill Sans">Gill Sans</option>
                                                    <option value="Brush Script MT">Brush Script MT</option>
                                                    <option value="Comic Sans MS">Comic Sans MS</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold">Rotation (deg)</label>
                                                <input
                                                    type="number"
                                                    value={nameRotation}
                                                    onChange={e => setNameRotation(Number(e.target.value))}
                                                    className="w-full border-2 border-black p-2 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Preview */}
                        <div className={`relative border-2 ${passPreview ? 'border-black bg-white' : 'border-gray-300 bg-gray-100 min-h-[400px]'} flex items-center justify-center overflow-hidden`}
                            ref={containerRef}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {passPreview ? (
                                <div className="relative inline-block">
                                    <img
                                        ref={imageRef}
                                        src={passPreview}
                                        alt="Preview"
                                        onLoad={handleImageLoad}
                                        className="max-w-full h-auto object-contain mx-auto pointer-events-none select-none"
                                    />
                                    {imgLoaded && (
                                        <>
                                            <div
                                                onMouseDown={(e) => handleMouseDown(e, 'qr')}
                                                className="absolute cursor-move border-4 border-blue-500 bg-blue-500/20 flex items-center justify-center group z-10"
                                                style={{
                                                    left: `${qrX * scale}px`,
                                                    top: `${qrY * scale}px`,
                                                    width: `${qrSize * scale}px`,
                                                    height: `${qrSize * scale}px`,
                                                    transform: `rotate(${qrRotation}deg)`,
                                                    transformOrigin: 'center center'
                                                }}
                                            >
                                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Example" alt="QR" className="w-full h-full opacity-80 pointer-events-none" />
                                            </div>

                                            <div
                                                onMouseDown={(e) => handleMouseDown(e, 'name')}
                                                className="absolute cursor-move border-2 border-green-500 bg-green-500/20 whitespace-nowrap group z-20"
                                                style={{
                                                    left: `${nameX * scale}px`,
                                                    top: `${nameY * scale}px`,
                                                    fontSize: `${nameSize * scale}px`,
                                                    color: nameColor,
                                                    fontFamily: nameFont,
                                                    transform: `rotate(${nameRotation}deg)`,
                                                    transformOrigin: 'left top',
                                                    lineHeight: 1,
                                                    padding: '4px'
                                                }}
                                            >
                                                John Doe
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-gray-400 font-mono text-sm text-center">
                                    No image available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 font-bold border-2 border-transparent hover:border-black transition-colors"
                    >
                        CANCEL
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white px-8 py-3 font-bold hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'SAVING...' : (
                            <>
                                <Save className="w-5 h-5" />
                                SAVE CHANGES
                            </>
                        )}
                    </button>
                </div>
            </form >
        </div >
    );
}

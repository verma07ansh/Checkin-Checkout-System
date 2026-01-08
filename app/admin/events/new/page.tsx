'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadImage } from '../../../lib/image-hosting';
import { Upload, Save } from 'lucide-react';

export default function CreateEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [passImage, setPassImage] = useState<File | null>(null);
    const [passPreview, setPassPreview] = useState<string | null>(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [scale, setScale] = useState(1);

    // QR Position State
    const [qrX, setQrX] = useState(50);
    const [qrY, setQrY] = useState(50);
    const [qrSize, setQrSize] = useState(250); // Increased default for visibility
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPassImage(file);
            setPassPreview(URL.createObjectURL(file));
        }
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        // Center the QR code
        setQrX(Math.round((naturalWidth - qrSize) / 2));
        setQrY(Math.round((naturalHeight - qrSize) / 2));
        setNameX(Math.round((naturalWidth - 200) / 2));
        setNameY(Math.round((naturalHeight) / 2 + 100));
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

        // Calculate Scale Factor
        // Current Display Width / Natural Width
        // const scale = imageRef.current.clientWidth / imageRef.current.naturalWidth; // use state

        // Mouse Text? No, we need position relative to image
        const rect = imageRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // Convert to Original Coordinates
        // This centers the box on the mouse?
        if (isDragging === 'qr') {
            const newX = (offsetX / scale) - (qrSize / 2);
            const newY = (offsetY / scale) - (qrSize / 2);
            setQrX(Math.round(newX));
            setQrY(Math.round(newY));
        } else if (isDragging === 'name') {
            const newX = (offsetX / scale);
            const newY = (offsetY / scale);
            setNameX(Math.round(newX));
            setNameY(Math.round(newY));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(null);
    };

    // Global toggle for mouse up to prevent getting stuck
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
        if (!name || !date || !passImage) {
            alert('Please fill all required fields and upload a pass template.');
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Image to FreeImage.host
            let passTemplateURL = '';
            if (passImage) {
                setUploading(true);
                try {
                    passTemplateURL = await uploadImage(passImage);
                    console.log("Image uploaded successfully:", passTemplateURL);
                } catch (err) {
                    console.error("Upload failed", err);
                    alert("Image upload failed. Please check API Key.");
                    setUploading(false);
                    setLoading(false);
                    return;
                }
                setUploading(false);
            }

            console.log("Submitting Event Data:", {
                name,
                date,
                passTemplateURL,
                qrPosition: { x: qrX, y: qrY, size: qrSize, rotation: qrRotation }
            });

            // 2. Create Event Doc
            await addDoc(collection(db, 'events'), {
                name,
                date,
                time,
                description,
                status: 'active',
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
                createdAt: serverTimestamp()
            });

            router.push('/admin/events');
        } catch (error) {
            console.error("Error creating event", error);
            alert("Failed to create event.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>CREATE NEW EVENT</h1>
                <p className="text-gray-600">Configure event details and pass template.</p>
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
                                placeholder="e.g. Annual Tech Summit"
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
                            placeholder="Event details..."
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
                                    Upload Template (PNG/JPG)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="w-full border-2 border-black p-2 font-mono"
                                    required
                                />
                                <p className="text-xs text-gray-500">Recommended size: 1080x1920px</p>
                            </div>

                            {passPreview && (
                                <>
                                    <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-300">
                                        <h3 className="font-bold text-sm uppercase">QR Code Position (Original px)</h3>
                                        <p className="text-xs text-blue-600 font-bold">Drag the QR box on the preview to position it!</p>
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
                                                <label className="text-xs font-bold">Size (square)</label>
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
                                    Upload an image to preview
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
                                CREATE EVENT
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

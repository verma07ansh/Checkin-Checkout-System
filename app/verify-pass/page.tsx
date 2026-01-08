'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../lib/firebase';
import { Loader2, CheckCircle, XCircle, Download, Scan, Ticket, AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';

function VerifyPassContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const eventId = searchParams.get('eventId');
    const router = useRouter();

    // State
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [passURL, setPassURL] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [eventName, setEventName] = useState('');
    const [verifiedUser, setVerifiedUser] = useState<{ name: string, email: string, eventName: string, eventDate: string } | null>(null);
    const [userName, setUserName] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (eventId) {
            getDoc(doc(db, 'events', eventId)).then(snap => {
                if (snap.exists()) setEventName(snap.data().name);
            });
        }
    }, [eventId]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !eventId || !email) {
            setErrorMsg('Missing required information.');
            setStatus('error'); // Set status to error for the user verification flow
            return;
        }

        setStatus('verifying');
        setErrorMsg('');

        try {
            const usersRef = collection(db, 'events', eventId, 'users');
            const q = query(usersRef, where('verificationToken', '==', token));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setStatus('error');
                setErrorMsg('Invalid token. This pass may differ or does not exist.');
                return;
            }

            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();

            if (userData.email.toLowerCase() !== email.toLowerCase()) {
                setStatus('error');
                setErrorMsg('Email does not match the record for this token.');
                return;
            }

            if (!userData.passURL) {
                setStatus('error');
                setErrorMsg('Pass has not been generated yet. Please contact the organizer.');
                return;
            }

            setPassURL(userData.passURL);
            setUserName(userData.name || 'User');
            setStatus('success');

        } catch (error) {
            console.error("Verification failed", error);
            setStatus('error');
            setErrorMsg('Verification system error. Please try again.');
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const startTime = Date.now();
        try {
            const response = await fetch(passURL);
            const blob = await response.blob();

            // Ensure minimum 1.5 seconds animation
            const elapsed = Date.now() - startTime;
            if (elapsed < 1500) {
                await new Promise(resolve => setTimeout(resolve, 1500 - elapsed));
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const safeEventName = (eventName || 'Event').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const safeUserName = (userName || 'User').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            a.download = `Event-Pass-${safeEventName}-${safeUserName}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed', error);
            window.open(passURL, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleScan = async (detectedCodes: any[]) => {
        if (detectedCodes && detectedCodes.length > 0) {
            const code = detectedCodes[0].rawValue;

            // Format: eventId_userId
            if (code.includes('_') && !code.includes('/')) {
                const [scanEventId, scanUserId] = code.split('_');

                setStatus('verifying');
                try {
                    const userSnap = await getDoc(doc(db, 'events', scanEventId, 'users', scanUserId));
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        let eName = eventName;
                        let eDate = '';

                        const evSnap = await getDoc(doc(db, 'events', scanEventId));
                        if (evSnap.exists()) {
                            const evData = evSnap.data();
                            eName = evData.name;
                            if (evData.date) {
                                const d = new Date(evData.date);
                                if (!isNaN(d.getTime())) {
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const year = d.getFullYear();
                                    eDate = `${day}-${month}-${year}`;
                                } else {
                                    eDate = evData.date;
                                }
                            }
                        }

                        setVerifiedUser({ name: uData.name, email: uData.email, eventName: eName, eventDate: eDate });
                        setStatus('success');
                    } else {
                        setStatus('error');
                        setErrorMsg("Invalid Pass: User not found.");
                    }
                } catch (err) {
                    console.error(err);
                    setStatus('error');
                    setErrorMsg("Scan Verification Failed");
                }
                return;
            }

            // Legacy URL handling
            try {
                if (code.includes('/verify-pass')) {
                    const url = new URL(code);
                    const newToken = url.searchParams.get('token');
                    const newEventId = url.searchParams.get('eventId');

                    if (newToken && newEventId) {
                        router.push(`/verify-pass?token=${newToken}&eventId=${newEventId}`);
                    }
                } else {
                    // Not a valid format (neither eventId_userId nor URL)
                    setStatus('error');
                    setErrorMsg("Invalid QR Code Format");
                }
            } catch (e) {
                console.error("Scan Error", e);
                setStatus('error');
                setErrorMsg("Scan Verification Failed");
            }
        }
    };

    // --- SCANNER VIEW (Guard / Kiosk Mode) ---
    if (!token || !eventId) {
        // Shared Home Button
        const HomeButton = () => (
            <div className="w-full max-w-md flex justify-start mb-6">
                <Link href="/" className="bg-white border-4 border-black px-4 py-3 font-bold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    <span>Back to Home</span>
                </Link>
            </div>
        );

        if (status === 'success' && verifiedUser) {
            return (
                <div className="min-h-screen bg-green-400 p-6 flex flex-col items-center justify-center font-sans animate-in fade-in duration-300">
                    <HomeButton />
                    <div className="max-w-md w-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                        {/* Cutouts on the division line */}
                        <div className="absolute left-0 top-1/2 w-6 h-12 bg-green-400 border-r-4 border-black rounded-r-full transform -translate-y-[calc(50%-1.6rem)] -translate-x-1 z-20"></div>
                        <div className="absolute right-0 top-1/2 w-6 h-12 bg-green-400 border-l-4 border-black rounded-l-full transform -translate-y-[calc(50%-1.6rem)] translate-x-1 z-20"></div>

                        <div className="p-8 pb-12 text-center border-b-4 border-black border-dashed relative z-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 border-4 border-black rounded-full mb-4">
                                <CheckCircle className="w-12 h-12 text-green-600" strokeWidth={3} />
                            </div>
                            <h1 className="text-4xl font-black mb-1 tracking-tighter uppercase">ACCESS GRANTED</h1>
                            <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">Verification Successful</p>
                        </div>

                        <div className="p-8 pt-12 space-y-6 bg-yellow-50">
                            <div>
                                <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Attendee</span>
                                <span className="font-mono text-xl font-bold block border-b-2 border-black pb-1">{verifiedUser.name}</span>
                            </div>
                            <div>
                                <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Email</span>
                                <span className="font-mono text-sm font-bold block border-b-2 border-black pb-1 break-all">{verifiedUser.email}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Event</span>
                                    <span className="font-bold block text-sm leading-tight">{verifiedUser.eventName}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1">Date</span>
                                    <span className="font-mono font-bold block text-sm">{verifiedUser.eventDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t-4 border-black border-dashed z-20 relative">
                            <button
                                onClick={() => { setStatus('idle'); setVerifiedUser(null); }}
                                className="w-full bg-black text-white py-4 font-black text-lg hover:bg-gray-800 hover:translate-x-1 hover:translate-y-1 transition-all uppercase flex items-center justify-center gap-3"
                            >
                                <Scan className="w-6 h-6" />
                                SCAN NEXT
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (status === 'error') {
            return (
                <div className="min-h-screen bg-red-500 p-6 flex flex-col items-center justify-center font-sans animate-in shake duration-300">
                    <HomeButton />
                    <div className="max-w-md w-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">

                        {/* Cutouts for Error State */}
                        <div className="absolute left-0 top-[45%] w-6 h-12 bg-red-500 border-r-4 border-black rounded-r-full transform -translate-x-1 z-20"></div>
                        <div className="absolute right-0 top-[45%] w-6 h-12 bg-red-500 border-l-4 border-black rounded-l-full translate-x-1 z-20"></div>

                        <div className="p-8 pb-12 text-center bg-red-100 border-b-4 border-black border-dashed relative z-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-white border-4 border-black rounded-full mb-6">
                                <XCircle className="w-12 h-12 text-red-600" strokeWidth={3} />
                            </div>
                            <h1 className="text-4xl font-black text-red-600 uppercase tracking-tighter leading-none mb-2">ACCESS<br />DENIED</h1>
                            <p className="font-bold text-black uppercase tracking-widest text-xs">Verification Failed</p>
                        </div>

                        <div className="p-8 pt-12 text-center bg-white min-h-[160px] flex flex-col items-center justify-center">
                            <div className="bg-red-50 border-4 border-red-500 p-4 transform -rotate-2 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                                <p className="text-lg font-black text-red-600 uppercase leading-tight">
                                    {errorMsg || "Unknown Error"}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t-4 border-black border-dashed relative z-20">
                            <button
                                onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                                className="w-full bg-black text-white py-4 font-black text-lg hover:bg-gray-800 transition-all uppercase flex items-center justify-center gap-2"
                            >
                                <Scan className="w-6 h-6" />
                                SCAN NEXT
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // DEFAULT SCANNER
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <HomeButton />
                <div className="max-w-md w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden flex flex-col h-[80vh]">
                    <div className="p-6 bg-yellow-300 border-b-4 border-black flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">Scanner</h1>
                            <p className="text-xs font-bold text-black/60 uppercase">Ready to scan passes</p>
                        </div>
                        <Scan className="w-8 h-8" />
                    </div>

                    <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                        <Scanner
                            onScan={handleScan}
                            allowMultiple={true}
                            styles={{
                                container: { width: '100%', height: '100%' },
                                video: { objectFit: 'cover' }
                            }}
                        />

                        {/* Overlay Guidelines */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-4 border-white/80 rounded-lg relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-8 border-l-8 border-yellow-400 -mt-2 -ml-2"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-8 border-r-8 border-yellow-400 -mt-2 -mr-2"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-8 border-l-8 border-yellow-400 -mb-2 -ml-2"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-8 border-r-8 border-yellow-400 -mb-2 -mr-2"></div>

                                {status === 'verifying' && (
                                    <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all">
                                        <Loader2 className="w-16 h-16 text-yellow-400 animate-spin drop-shadow-lg" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white border-t-4 border-black text-center">
                        <p className="font-mono text-xs uppercase text-gray-500">
                            Align QR code within the frame
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- USER VERIFICATION (Link Clicked) ---
    return (
        <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md flex justify-start mb-6">
                <Link href="/" className="bg-white border-4 border-black px-4 py-3 font-bold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    <span>Back to Home</span>
                </Link>
            </div>
            {status === 'error' ? (
                // Error Screen
                <div className="max-w-md w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative animate-in shake duration-300">
                    <div className="p-8 text-center bg-red-100 border-b-4 border-black">
                        <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" strokeWidth={3} />
                        <h1 className="text-4xl font-black text-red-600 uppercase tracking-tighter mb-2">VERIFICATION<br />FAILED</h1>
                    </div>
                    <div className="p-8 text-center">
                        <div className="bg-red-50 border-4 border-red-500 p-4 transform -rotate-1 skew-x-1 mb-8">
                            <p className="font-bold text-red-700 uppercase">{errorMsg}</p>
                        </div>
                        <button
                            onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                            className="w-full bg-black text-white py-4 font-black text-lg hover:bg-gray-800 transition-all uppercase"
                        >
                            TRY AGAIN
                        </button>
                    </div>
                </div>
            ) : (
                // Normal / Success Screen
                <div className={`
                    max-w-md w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] 
                    transition-all duration-300 relative overflow-hidden
                    ${(status === 'success') ? "bg-green-50" : ""}
                `}>


                    <div className="p-8 text-center relative z-10">
                        {eventName && (
                            <div className="inline-block bg-black text-white px-3 py-1 font-bold text-xs uppercase tracking-wider mb-6 rotate-1">
                                {eventName}
                            </div>
                        )}

                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 leading-none">
                            {status === 'success' ? 'PASS VERIFIED' : 'VERIFY PASS'}
                        </h1>
                        <p className="font-mono text-sm text-gray-500 font-bold uppercase">
                            {status === 'success' ? 'Ticket Validated Successfully' : 'Secure Verification Portal'}
                        </p>
                    </div>

                    {status === 'idle' || status === 'verifying' ? (
                        <div className="p-8 pt-0 space-y-6">
                            <form onSubmit={handleVerify} className="space-y-6 relative z-10">
                                <div className="space-y-2 text-left">
                                    <label className="font-black text-sm uppercase flex items-center justify-between">
                                        <span>Confirm Email</span>
                                        <span className="text-[10px] bg-gray-200 px-1 border border-black text-gray-600">REQUIRED</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full border-4 border-black p-4 font-mono text-center font-bold text-lg bg-gray-50 focus:bg-yellow-50 focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                                        placeholder="name@example.com"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === 'verifying'}
                                    className="w-full bg-black text-white border-2 border-transparent py-4 font-black text-xl hover:bg-gray-900 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100 transition-all uppercase shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]"
                                >
                                    {status === 'verifying' ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            PROCESSING...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-3">
                                            <Ticket className="w-6 h-6" />
                                            GET MY PASS
                                        </div>
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="p-8 pt-0 animate-in slide-in-from-bottom-10 fade-in duration-500">
                            {/* Improved Cutouts for Success State */}
                            <div className="absolute left-0 top-1/2 w-6 h-12 bg-white border-r-4 border-black rounded-r-full transform -translate-y-[calc(50%+4rem)] -translate-x-1 z-20"></div>
                            <div className="absolute right-0 top-1/2 w-6 h-12 bg-white border-l-4 border-black rounded-l-full transform -translate-y-[calc(50%+4rem)] translate-x-1 z-20"></div>

                            {/* Cutout Line */}
                            <div className="border-t-4 border-black border-dashed my-6 relative"></div>

                            <div className="bg-white border-4 border-black p-6 mb-8 text-center shadow-[4px_4px_0px_0px_#22c55e]">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" strokeWidth={3} />
                                <h2 className="text-2xl font-black uppercase mb-2">You are ready!</h2>
                                <p className="text-gray-600 text-sm font-bold">Your pass has been generated is ready for download.</p>
                            </div>

                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className={`w-full bg-green-400 text-black border-4 border-black py-4 font-black text-lg transition-all uppercase flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDownloading ? 'opacity-70 cursor-wait' : 'hover:bg-green-500 hover:-translate-y-1'}`}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        DOWNLOADING...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-6 h-6" strokeWidth={3} />
                                        DOWNLOAD TICKET
                                    </>
                                )}
                            </button>
                        </div>
                    )}


                </div>
            )}
        </div>
    );
}



export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="font-black text-2xl uppercase animate-pulse">Loading System...</div></div>}>
            <VerifyPassContent />
        </Suspense>
    );
}

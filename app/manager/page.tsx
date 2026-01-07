'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Event } from '../types';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, CheckCircle, XCircle } from 'lucide-react';

export default function ManagerDashboard() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'check-out' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [scannedUser, setScannedUser] = useState<any>(null);
    const [attendanceCount, setAttendanceCount] = useState(0);

    const [confirmState, setConfirmState] = useState<{
        userData: any;
        attData: any;
        eventId: string;
        userId: string;
    } | null>(null);

    // Fetch Active Events
    useEffect(() => {
        const q = query(collection(db, 'events'), where('status', '==', 'active'));
        getDocs(q).then(snap => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(data);
            if (data.length > 0) setSelectedEventId(data[0].id);
        });
    }, []);

    // Listen to Attendance Count
    useEffect(() => {
        if (!selectedEventId) return;

        const q = query(collection(db, 'attendance', selectedEventId, 'users'));
        const unsubscribe = onSnapshot(q, (snap) => {
            // Filter checked in (no checkOutTime)
            const active = snap.docs.filter(d => !d.data().checkOutTime).length;
            setAttendanceCount(active);
        });
        return () => unsubscribe();
    }, [selectedEventId]);

    const handleScan = async (text: string) => {
        if (!text || status === 'processing' || confirmState || !selectedEventId) return;

        // Dedupe same scan in short time?
        if (text === scanResult) return;

        setScanResult(text);
        setStatus('processing');

        try {
            // Format: eventId_userId
            const [eventId, userId] = text.split('_');

            if (eventId !== selectedEventId) {
                // throw new Error("Pass belongs to a different event.");
                // Soft error? Or just alert?
                setStatus('error');
                setStatusMessage("Pass belongs to a different event!");
                setTimeout(() => {
                    setStatus('idle');
                    setScanResult(null);
                }, 2500);
                return;
            }

            if (!userId) {
                throw new Error("Invalid format");
            }

            // Verify User exists
            const userRef = doc(db, 'events', eventId, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                throw new Error("User not found.");
            }
            const userData = userSnap.data();

            // Check Attendance Status
            const attendanceRef = doc(db, 'attendance', eventId, 'users', userId);
            const attendanceSnap = await getDoc(attendanceRef);
            const attData = attendanceSnap.exists() ? attendanceSnap.data() : null;

            // Open Confirmation Modal
            setConfirmState({
                userData,
                attData,
                eventId,
                userId
            });
            setStatus('idle'); // Stop processing spinner, waiting for input

        } catch (error: any) {
            console.error("Scan Error", error);
            setStatus('error');
            setStatusMessage(error.message || "Scan failed.");
            setTimeout(() => {
                setStatus('idle');
                setScanResult(null);
            }, 2000);
        }
    };

    const handleAction = async (action: 'check-in' | 'check-out') => {
        if (!confirmState) return;
        const { eventId, userId, userData } = confirmState;
        const attendanceRef = doc(db, 'attendance', eventId, 'users', userId);

        try {
            if (action === 'check-in') {
                await setDoc(attendanceRef, {
                    ...userData,
                    checkInTime: serverTimestamp(),
                    checkOutTime: null
                });
                setStatus('success');
                setStatusMessage(`Welcome, ${userData.name}!`);
            } else {
                await updateDoc(attendanceRef, {
                    checkOutTime: serverTimestamp()
                });
                setStatus('check-out');
                setStatusMessage(`Goodbye, ${userData.name}!`);
            }
        } catch (err) {
            console.error("Action Failed", err);
            alert("Action failed to save.");
        } finally {
            setConfirmState(null);
            setTimeout(() => {
                setStatus('idle');
                setScanResult(null);
            }, 1500);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-orange-500 text-white p-6 border-b-4 border-black -m-6 mb-6">
                <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>SCANNER</h1>
                <p>Ensure correct event is selected.</p>
            </div>

            {/* Event Selector */}
            <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full border-4 border-black p-4 text-xl font-bold bg-white"
            >
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                {events.length === 0 && <option value="">No Active Events</option>}
            </select>

            {/* Attendance Counter */}
            <div className="bg-black text-white p-6 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
                <div className="text-6xl font-black" style={{ fontFamily: "'Space Mono', monospace" }}>{attendanceCount}</div>
                <div className="text-sm font-bold uppercase tracking-widest text-gray-400">Checked In Now</div>
            </div>

            {/* Scanner Area */}
            <div className="border-4 border-black bg-black p-1 relative overflow-hidden h-[400px] flex items-center justify-center">
                {selectedEventId ? (
                    <div className="w-full h-full relative">
                        {/* Only scan if we are not confirming or processing */}
                        {!confirmState && (
                            <Scanner
                                onScan={(result) => {
                                    if (result && result.length > 0) handleScan(result[0].rawValue);
                                }}
                            />
                        )}
                    </div>
                ) : (
                    <div className="text-white font-bold">Please select an event</div>
                )}

                {/* Status Overlay */}
                {status !== 'idle' && status !== 'processing' && (
                    <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-200 ${status === 'error' ? 'bg-red-500/90 text-white' :
                        status === 'check-out' ? 'bg-blue-500/90 text-white' : 'bg-green-500/90 text-white'
                        }`}>
                        {status === 'error' ? <XCircle className="w-24 h-24 mb-4" /> : <CheckCircle className="w-24 h-24 mb-4" />}
                        <div className="text-3xl font-black mb-2">{statusMessage}</div>
                    </div>
                )}
            </div>

            {/* Manual Confirmation Modal */}
            {confirmState && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md p-6 border-4 border-black shadow-[8px_8px_0px_0px_white] animate-in slide-in-from-bottom-10 space-y-6">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black uppercase">{confirmState.userData.name}</h2>
                            <p className="font-mono text-gray-600">{confirmState.userData.email}</p>
                            <div className="inline-block px-3 py-1 bg-gray-100 font-bold border-2 border-black text-xs">
                                CURRENT STATUS: {confirmState.attData?.checkInTime && !confirmState.attData?.checkOutTime ? 'CHECKED IN' : 'OUT'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleAction('check-in')}
                                className="bg-green-500 text-white p-4 font-black text-xl hover:bg-green-600 border-4 border-transparent hover:border-black transition-all"
                            >
                                CHECK IN
                            </button>
                            <button
                                onClick={() => handleAction('check-out')}
                                className="bg-red-500 text-white p-4 font-black text-xl hover:bg-red-600 border-4 border-transparent hover:border-black transition-all"
                            >
                                CHECK OUT
                            </button>
                        </div>

                        <button
                            onClick={() => { setConfirmState(null); setStatus('idle'); setScanResult(null); }}
                            className="w-full py-2 font-bold text-gray-500 hover:text-black"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

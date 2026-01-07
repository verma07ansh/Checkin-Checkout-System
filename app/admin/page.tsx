'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Users } from 'lucide-react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Link from 'next/link';

export default function AdminDashboard() {
    const [eventCount, setEventCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Approximate count
                const coll = collection(db, 'events');
                const snapshot = await getCountFromServer(coll);
                setEventCount(snapshot.data().count);
            } catch (error) {
                console.error("Error fetching stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>DASHBOARD OVERVIEW</h1>
                <p className="text-gray-600">Welcome to the event management command center.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border-4 border-black p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <Calendar className="w-12 h-12" />
                        <span className="text-5xl font-black">{loading ? '...' : eventCount}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Events</h2>
                    <p className="text-gray-600 mb-6">Active and past events in the system.</p>
                    <Link href="/admin/events" className="inline-block bg-black text-white px-6 py-3 font-bold hover:bg-gray-800 transition-colors">
                        MANAGE EVENTS
                    </Link>
                </div>

                <div className="border-4 border-black p-8 bg-orange-500 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Users & Attendees</h2>
                    <p className="mb-6 opacity-90">Manage registrations and generating passes.</p>
                    <Link href="/admin/events" className="inline-block bg-white text-black px-6 py-3 font-bold hover:bg-gray-100 transition-colors">
                        VIEW VIA EVENTS
                    </Link>
                </div>
            </div>
        </div>
    );
}

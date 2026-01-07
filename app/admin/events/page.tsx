'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Event } from '../../types';
import { formatTime } from '../../lib/utils';
import { CheckCircle, Clock, Plus, Users, ExternalLink, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

    const handleDeleteClick = (event: Event) => {
        setEventToDelete(event);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;

        try {
            await deleteDoc(doc(db, 'events', eventToDelete.id));
            setEvents(events.filter(e => e.id !== eventToDelete.id));
            toast.success(`Event "${eventToDelete.name}" deleted successfully.`);
        } catch (error) {
            console.error("Error deleting event", error);
            toast.error("Failed to delete event.");
        } finally {
            setDeleteModalOpen(false);
            setEventToDelete(null);
        }
    };

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const q = query(collection(db, 'events'), orderBy('date', 'desc'));
                const snapshot = await getDocs(q);
                const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
                setEvents(eventsData);
            } catch (error) {
                console.error("Error fetching events", error);
                toast.error("Failed to load events.");
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>EVENTS MANAGEMENT</h1>
                    <p className="text-gray-600">Create and manage your organization's events.</p>
                </div>
                <Link href="/admin/events/new" className="flex items-center gap-2 bg-black text-white px-6 py-3 font-bold hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                    <Plus className="w-5 h-5" />
                    CREATE EVENT
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading events...</div>
            ) : events.length === 0 ? (
                <div className="text-center py-24 bg-white border-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-bold text-gray-400 mb-4">NO EVENTS FOUND</h3>
                    <Link href="/admin/events/new" className="text-blue-600 font-bold underline">Create your first event</Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {events.map((event) => (
                        <div key={event.id} className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-bold tracking-tight">{event.name}</h3>
                                    <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider border-2 ${event.status === 'active' ? 'bg-green-100 text-green-800 border-green-800' : 'bg-gray-100 text-gray-800 border-gray-800'}`}>
                                        {event.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-gray-600 font-mono">
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {new Date(event.date).toLocaleDateString('en-GB')} {event.time ? `at ${formatTime(event.time)}` : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Link
                                    href={`/admin/events/${event.id}/users`}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border-2 border-black font-bold hover:bg-gray-50 text-sm"
                                >
                                    <Users className="w-4 h-4" />
                                    MANAGE USERS
                                </Link>
                                <a
                                    href={event.passTemplateURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative p-2 border-2 border-black hover:bg-gray-100 transition-all duration-200 hover:scale-110 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1 bg-black text-white text-sm font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-10">
                                        View Template
                                    </span>
                                </a>
                                <Link
                                    href={`/admin/events/${event.id}/edit`}
                                    className="group relative p-2 border-2 border-black hover:bg-gray-100 transition-all duration-200 hover:scale-110 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <Edit className="w-5 h-5" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1 bg-black text-white text-sm font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-10">
                                        Edit Event
                                    </span>
                                </Link>
                                <button
                                    onClick={() => handleDeleteClick(event)}
                                    className="group relative p-2 border-2 border-black hover:bg-red-50 text-red-600 transition-all duration-200 hover:scale-110 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1 bg-black text-white text-sm font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-10">
                                        Delete Event
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="DELETE EVENT"
                message={`Are you sure you want to delete "${eventToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
                confirmText="DELETE EVENT"
                isDangerous={true}
            />
        </div>
    );
}

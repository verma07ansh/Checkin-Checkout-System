'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { generateEventPass } from '../../../../lib/pass-generator';
import { sendPassEmail } from '../../../../lib/email';
import { Event, EventUser } from '../../../../types';
import { UserPlus, FileSpreadsheet, QrCode, Mail, Trash2, Loader2, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../../components/ConfirmModal';
import * as XLSX from 'xlsx';

export default function EventUsersPage() {
    const { id: eventId } = useParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [users, setUsers] = useState<EventUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [previewPass, setPreviewPass] = useState<string | null>(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
        confirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    // Add User Form State
    const [newUser, setNewUser] = useState({ name: '', email: '', branch: '', year: '', section: '' });

    useEffect(() => {
        if (!eventId) return;
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            // Fetch Event
            const eventSnap = await getDoc(doc(db, 'events', eventId as string));
            if (eventSnap.exists()) {
                setEvent({ id: eventSnap.id, ...eventSnap.data() } as Event);
            }

            // Fetch Users
            fetchUsers();
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        const usersColl = collection(db, 'events', eventId as string, 'users');
        const userSnaps = await getDocs(usersColl);

        // Fetch Attendance
        const attColl = collection(db, 'attendance', eventId as string, 'users');
        const attSnaps = await getDocs(attColl);
        const attMap = new Map();
        attSnaps.forEach(doc => attMap.set(doc.id, doc.data()));

        const userData = userSnaps.docs.map(doc => {
            const att = attMap.get(doc.id);
            return {
                id: doc.id,
                ...doc.data(),
                checkInTime: att?.checkInTime ? new Date(att.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                checkOutTime: att?.checkOutTime ? new Date(att.checkOutTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
            } as EventUser & { checkInTime: string; checkOutTime: string };
        });
        setUsers(userData);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'events', eventId as string, 'users'), {
                ...newUser,
                passURL: '',
                qrCode: '',
                emailSent: false,
                verificationToken: crypto.randomUUID()
            });
            setNewUser({ name: '', email: '', branch: '', year: '', section: '' });
            setShowAddForm(false);
            fetchUsers();
            toast.success("User added successfully");
        } catch (error) {
            console.error("Error adding user", error);
            toast.error("Failed to add user.");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as any[];

            const batch = writeBatch(db);
            const usersRef = collection(db, 'events', eventId as string, 'users');

            data.forEach((row) => {
                if (row.Name && row.Email) {
                    const docRef = doc(usersRef);
                    batch.set(docRef, {
                        name: row.Name,
                        email: row.Email,
                        branch: row.Branch || '',
                        year: row.Year || '',
                        section: row.Section || '',
                        passURL: '',
                        headerImage: '',
                        emailSent: false,
                        verificationToken: crypto.randomUUID()
                    });
                }
            });

            await batch.commit();
            fetchUsers();
            toast.success(`Imported ${data.length} users.`);
        };
        reader.readAsBinaryString(file);
    };

    const executeGeneratePasses = async () => {
        if (!event) return;
        setProcessing(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const user of users) {
                const currentConfigHash = JSON.stringify({
                    t: event.passTemplateURL,
                    q: event.qrPosition,
                    n: event.namePosition
                });

                // Check if pass needs regeneration
                if (user.passURL && user.passConfigHash === currentConfigHash) {
                    console.log(`Skipping generation for ${user.email} - Pass up to date`);
                    continue; // Skip if pass exists and config hasn't changed
                }

                // Fallback for legacy passes (check only template URL if hash missing)
                if (user.passURL && !user.passConfigHash && user.passTemplateURL === event.passTemplateURL) {
                    // Assume up to date if template URL matches and no hash (legacy behavior, but we might want to force regen once? 
                    // No, let's force regen if hash is missing to be safe given user's request)
                    // Actually, if we want to support the user's request "if user had been generated a previous pass pls fix that", 
                    // we should probably regenerate if the hash is missing to ensure new fields (name) are applied.
                    // checks below will force regen if hash is missing because undefined !== string
                }

                try {
                    const passURL = await generateEventPass(event!, user);

                    await updateDoc(doc(db, 'events', eventId as string, 'users', user.id), {
                        passURL: passURL,
                        passTemplateURL: event.passTemplateURL, // Legacy
                        passConfigHash: currentConfigHash // New
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Failed for ${user.email}`, err);
                    failCount++;
                }
            }
            if (successCount === 0 && failCount === 0) {
                toast.success("All passes are already up to date.");
            } else {
                toast.success(`Generation Complete.\nGenerated: ${successCount}\nFailed: ${failCount}`, { duration: 5000 });
            }
            fetchUsers();
        } catch (error) {
            console.error("Batch generation error", error);
            toast.error("An error occurred during generation.");
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateClick = () => {
        if (!event || users.length === 0) return;

        const currentConfigHash = JSON.stringify({
            t: event.passTemplateURL,
            q: event.qrPosition,
            n: event.namePosition
        });

        const pendingUsers = users.filter(u => !u.passURL || u.passConfigHash !== currentConfigHash).length;
        const message = pendingUsers === 0
            ? "All users have up-to-date passes. Regenerate anyway?"
            : `Generate passes for ${pendingUsers} users? (${users.length - pendingUsers} already up-to-date)`;

        setConfirmModal({
            isOpen: true,
            title: 'GENERATE PASSES',
            message: message,
            confirmText: 'GENERATE',
            onConfirm: executeGeneratePasses
        });
    };

    const executeSendEmails = async () => {
        if (!event) return;
        setProcessing(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const user of users) {
                if (!user.passURL) continue;
                if (user.emailSent) continue; // Skip if email already sent

                try {
                    await sendPassEmail(event!, user);

                    await updateDoc(doc(db, 'events', eventId as string, 'users', user.id), {
                        emailSent: true
                    });
                    successCount++;

                    // Add delay to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    console.error(`Failed to send email to ${user.email}`, err);
                    failCount++;
                }
            }
            toast.success(`Emails Sent.\nSuccess: ${successCount}\nFailed: ${failCount}`);
            fetchUsers();
        } catch (error) {
            console.error("Batch email error", error);
            toast.error("An error occurred during email sending.");
        } finally {
            setProcessing(false);
        }
    };

    const handleSendEmailsClick = () => {
        if (!event || users.length === 0) return;

        const pendingEmails = users.filter(u => u.passURL && !u.emailSent).length;
        const message = pendingEmails === 0
            ? "All eligible users have already received emails."
            : `Send emails to ${pendingEmails} users? (${users.length - pendingEmails} already sent or no pass)`;

        setConfirmModal({
            isOpen: true,
            title: 'SEND EMAILS',
            message: message,
            confirmText: 'SEND EMAILS',
            onConfirm: executeSendEmails
        });
    };

    const handleDeleteUserClick = (user: EventUser) => {
        setConfirmModal({
            isOpen: true,
            title: 'DELETE USER',
            message: `Are you sure you want to delete ${user.name}? This cannot be undone.`,
            isDangerous: true,
            confirmText: 'DELETE',
            onConfirm: () => executeDeleteUser(user.id)
        });
    };

    const executeDeleteUser = async (userId: string) => {
        try {
            await deleteDoc(doc(db, 'events', eventId as string, 'users', userId));
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user', error);
            toast.error('Failed to delete user');
        }
    };

    const handleExportExcel = async () => {
        if (!event || users.length === 0) return;
        setProcessing(true);

        try {
            // Fetch Attendance Data
            const attColl = collection(db, 'attendance', eventId as string, 'users');
            const attSnaps = await getDocs(attColl);
            const attendanceMap = new Map();
            attSnaps.forEach(doc => {
                attendanceMap.set(doc.id, doc.data());
            });

            // Merge Data
            const exportData = users.map(user => {
                const att = attendanceMap.get(user.id);
                const checkIn = att?.checkInTime ? new Date(att.checkInTime.seconds * 1000).toLocaleString() : '-';
                const checkOut = att?.checkOutTime ? new Date(att.checkOutTime.seconds * 1000).toLocaleString() : '-';

                return {
                    "Name": user.name,
                    "Email": user.email,
                    "Branch": user.branch,
                    "Year": user.year,
                    "Section": user.section,
                    "Check In": checkIn,
                    "Check Out": checkOut,
                    "Status": att?.checkInTime ? (att?.checkOutTime ? 'Completed' : 'Checked In') : 'Absent'
                };
            });

            // Generate Sheet
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");

            // Download
            XLSX.writeFile(wb, `${event.name}_Attendance_Report.xlsx`);

        } catch (error) {
            console.error("Export Error", error);
            toast.error("Failed to export.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!event) return <div className="p-8">Event not found</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter uppercase" style={{ fontFamily: "'Space Mono', monospace" }}>{event.name}</h1>
                    <p className="text-gray-600 font-mono text-sm">{users.length} Registered Attendees</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <label className="flex items-center gap-2 bg-white border-2 border-black px-4 py-2 font-bold hover:bg-gray-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                        <FileSpreadsheet className="w-4 h-4" />
                        IMPORT CSV
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button
                        onClick={handleExportExcel}
                        disabled={processing}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 font-bold hover:bg-green-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] text-sm disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        EXPORT EXCEL
                    </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] text-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        ADD USER
                    </button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-4 p-4 bg-yellow-50 border-2 border-yellow-500 items-center">
                <span className="font-bold uppercase text-yellow-800 text-sm">Actions:</span>
                <button
                    onClick={handleGenerateClick}
                    disabled={processing}
                    className="flex items-center gap-2 px-3 py-1 bg-white border-2 border-black font-bold text-xs hover:bg-gray-100 disabled:opacity-50 disabled:cursor-wait"
                >
                    {processing && !loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                    GENERATE PASSES
                </button>
                <button
                    onClick={handleSendEmailsClick}
                    disabled={processing}
                    className="flex items-center gap-2 px-3 py-1 bg-white border-2 border-black font-bold text-xs hover:bg-gray-100 disabled:opacity-50"
                >
                    <Mail className="w-3 h-3" />
                    SEND EMAILS
                </button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
                <form onSubmit={handleAddUser} className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 animate-in slide-in-from-top-4">
                    <h3 className="font-bold mb-4">Add New Attendee</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <input placeholder="Name" className="border-2 border-black p-2" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                        <input placeholder="Email" type="email" className="border-2 border-black p-2" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                        <input placeholder="Branch" className="border-2 border-black p-2" value={newUser.branch} onChange={e => setNewUser({ ...newUser, branch: e.target.value })} />
                        <input placeholder="Year" className="border-2 border-black p-2" value={newUser.year} onChange={e => setNewUser({ ...newUser, year: e.target.value })} />
                        <input placeholder="Section" className="border-2 border-black p-2" value={newUser.section} onChange={e => setNewUser({ ...newUser, section: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 font-bold">Cancel</button>
                        <button type="submit" className="bg-black text-white px-6 py-2 font-bold">Save User</button>
                    </div>
                </form>
            )}

            {/* Users Table */}
            <div className="bg-white border-4 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black text-white">
                        <tr>
                            <th className="p-4 font-black uppercase text-sm tracking-wider">Name</th>
                            <th className="p-4 font-black uppercase text-sm tracking-wider">Email</th>
                            <th className="p-4 font-black uppercase text-sm tracking-wider">Details</th>
                            <th className="p-4 font-black uppercase text-sm tracking-wider">Check In</th>
                            <th className="p-4 font-black uppercase text-sm tracking-wider">Check Out</th>
                            <th className="p-4 font-black uppercase text-sm tracking-wider">Pass Status</th>
                            <th className="p-4 font-black uppercase text-sm tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold">{user.name}</td>
                                <td className="p-4 font-mono text-sm text-gray-600">{user.email}</td>
                                <td className="p-4 text-sm">
                                    {user.branch} {user.year && `- ${user.year}`} {user.section && `(${user.section})`}
                                </td>
                                <td className="p-4 font-mono text-xs font-bold text-blue-600">
                                    {(user as any).checkInTime || '-'}
                                </td>
                                <td className="p-4 font-mono text-xs font-bold text-red-600">
                                    {(user as any).checkOutTime || '-'}
                                </td>
                                <td className="p-4 space-y-1">
                                    {user.passURL ? (
                                        <button
                                            onClick={() => setPreviewPass(user.passURL)}
                                            className="inline-block text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-full hover:underline hover:cursor-pointer"
                                        >
                                            VIEW PASS
                                        </button>
                                    ) : (
                                        <span className="inline-block text-gray-400 font-bold text-xs bg-gray-100 px-2 py-1 rounded-full">PENDING</span>
                                    )}
                                    {user.emailSent && (
                                        <div className="text-xs text-blue-600 font-bold">EMAIL SENT</div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => handleDeleteUserClick(user)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Delete User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">No users added yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Preview Modal */}
            {previewPass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200" onClick={() => setPreviewPass(null)}>
                    <div className="relative max-w-lg w-full bg-white p-2 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewPass(null)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img src={previewPass} alt="Pass Preview" className="w-full h-auto" />
                        <div className="mt-2 text-center">
                            <a
                                href={previewPass}
                                download
                                className="inline-block bg-black text-white px-6 py-2 font-bold hover:bg-gray-800 text-sm"
                            >
                                DOWNLOAD PASS
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* Generic Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.confirmText}
            />
        </div >
    );
}

'use client';

import React from 'react';
import RoleGuard from '../components/RoleGuard';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
    const { logout } = useAuth();

    return (
        <RoleGuard allowedRoles={['manager']}>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white border-b-4 border-black p-4 flex justify-between items-center sticky top-0 z-10">
                    <h1 className="text-xl font-black tracking-tighter">MANAGER PORTAL</h1>
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-2 font-bold px-4 py-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </header>
                <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </RoleGuard>
    );
}

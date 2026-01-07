'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RoleGuard from '../components/RoleGuard';
import { LayoutDashboard, Calendar, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout } = useAuth();

    const navItems = [
        { href: '/admin', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/events', label: 'Events', icon: Calendar },
        // Users might be sub-resource of events, but maybe global user list too? 
        // Requirement: "User Management" under Admin.
        // Also "Add Users Form", "User list table". 
        // Let's assume global user management or event-specific. Prompt says "Add Users Form... Event Management".
        // It says "3.2 User Management" separate from "3.1 Event Management".
        // But the structure implies users belong to events "eventUsers".
        // Let's keep a top level for now or per event.
    ];

    return (
        <RoleGuard allowedRoles={['admin']}>
            <div className="flex min-h-screen bg-gray-50">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r-4 border-black hidden md:flex flex-col">
                    <div className="p-6 border-b-4 border-black">
                        <h2 className="text-2xl font-black tracking-tighter">ADMIN DASHBOARD</h2>
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 font-bold border-2 transition-all ${isActive
                                            ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]'
                                            : 'bg-white text-black border-transparent hover:border-black hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="p-4 border-t-4 border-black">
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-3 px-4 py-3 font-bold text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </RoleGuard>
    );
}

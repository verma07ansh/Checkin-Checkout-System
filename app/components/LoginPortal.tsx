'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPortal() {
    const { login, currentUser } = useAuth();
    const router = useRouter();

    const handleLogin = async (targetRole: 'admin' | 'manager') => {
        // If already logged in, check role
        if (currentUser) {
            if (currentUser.role === targetRole || currentUser.role === 'admin') {
                // Admin can access manager checks potentially? Requirement says redirects based on role.
                // Let's stick to strict role check or redirect based on user role.
                if (currentUser.role === 'admin') router.push('/admin');
                else if (currentUser.role === 'manager') router.push('/manager');
                else toast.error('You are logged in but do not have the required permissions.');
                return;
            } else {
                // Wrong role logged in
                toast.error(`Logged in as ${currentUser.role}, but tried to access ${targetRole}. Please logout first.`);
                return;
            }
        }

        try {
            const user = await login();
            if (user) {
                if (user.role === 'admin') router.push('/admin');
                else if (user.role === 'manager') router.push('/manager');
                else {
                    // New user or user without role. 
                    // System requirements imply "Role stored in Firestore".
                    // If they don't have a role, maybe we deny or default?
                    // "Users - Store admin and manager profiles with roles"
                    toast.error('Access Denied: You do not have an operational role assigned.');
                }
            }
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 py-12">
            <div className="text-center space-y-4 max-w-2xl px-4">
                <h1 className="text-5xl font-black tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>
                    EVENT MANAGEMENT
                </h1>
                <p className="text-xl text-gray-600">
                    Secure check-in/check-out system. Select your portal to continue.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                {/* Manager Portal */}
                <button
                    onClick={() => handleLogin('manager')}
                    className="group flex flex-col items-center p-12 border-4 border-black bg-white hover:bg-orange-500 hover:text-white transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                >
                    <CheckSquare className="w-24 h-24 mb-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                    <h2 className="text-3xl font-bold mb-2 tracking-tight">MANAGER</h2>
                    <p className="text-center opacity-80">Access scanner & attendance</p>
                </button>

                {/* Admin Portal */}
                <button
                    onClick={() => handleLogin('admin')}
                    className="group flex flex-col items-center p-12 border-4 border-black bg-white hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                >
                    <Shield className="w-24 h-24 mb-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                    <h2 className="text-3xl font-bold mb-2 tracking-tight">ADMIN</h2>
                    <p className="text-center opacity-80">Manage events & users</p>
                </button>
            </div>

            <div className="mt-12 text-sm text-gray-500 font-mono">
                Authorized Personnel Only
            </div>
        </div>
    );
}

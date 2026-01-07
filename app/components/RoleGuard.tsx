'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: ('admin' | 'manager')[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!currentUser) {
                router.push('/');
            } else if (currentUser.role !== 'admin' && !allowedRoles.includes(currentUser.role as any)) {
                // Determine fallback
                if (currentUser.role === 'manager') router.push('/manager');
                else router.push('/');
            }
        }
    }, [currentUser, loading, router, allowedRoles]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-black" />
            </div>
        );
    }

    if (!currentUser || (currentUser.role !== 'admin' && !allowedRoles.includes(currentUser.role as any))) {
        return null; // Or custom 403 page
    }

    return <>{children}</>;
}

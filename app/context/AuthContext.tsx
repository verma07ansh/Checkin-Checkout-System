'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
    currentUser: User | null;
    login: () => Promise<User | null>; // Returns the user object for redirection logic
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                await fetchUserData(firebaseUser);
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUserData = async (firebaseUser: FirebaseUser) => {
        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            let userData: User = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Anonymous',
                email: firebaseUser.email || '',
                role: 'user' // Default to user
            };

            if (userSnap.exists()) {
                const data = userSnap.data();
                userData = { ...userData, ...data } as User;
            } else {
                await setDoc(userRef, userData);
            }

            setCurrentUser(userData);
            return userData;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const login = async (): Promise<User | null> => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return await fetchUserData(result.user);
        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                console.log('Sign-in popup was closed by the user.');
                return null;
            }
            console.error("Error signing in with Google", error);
            alert("Failed to sign in. Please try again.");
            return null;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setCurrentUser(null);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

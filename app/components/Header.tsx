'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';
import logo from '@/public/logo.png';

export default function Header() {
    const { currentUser, logout, login } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="border-b-4 border-black py-4 px-8 bg-white relative z-50">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
                <Link href="/">
                    <div className="cursor-pointer">
                        <Image src={logo} alt="logo" width={150} height={150} />
                    </div>
                </Link>
                <div className="flex items-center gap-4">
                    {currentUser ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`flex items-center justify-center w-12 h-12 border-2 border-black transition-all ${isMenuOpen ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                            >
                                <User className="w-6 h-6" />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="text-right border-b-2 border-dashed border-gray-300 pb-3">
                                        <div className="font-black text-lg uppercase tracking-tight break-words text-black" style={{ fontFamily: "'Space Mono', monospace" }}>{currentUser.name}</div>
                                        <div className="text-xs text-gray-600 font-bold truncate" style={{ fontFamily: "'Space Mono', monospace" }}>{currentUser.email}</div>
                                        <div className="text-xs text-orange-600 font-bold uppercase mt-1" style={{ fontFamily: "'Space Mono', monospace" }}>Role: {currentUser.role}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full border-2 border-black py-3 text-sm font-black hover:bg-black hover:text-white transition-all uppercase text-center"
                                        style={{ fontFamily: "'Space Mono', monospace" }}
                                    >
                                        SIGN OUT
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => login()}
                            className="border-2 border-black px-6 py-2 font-bold hover:bg-black hover:text-white transition-colors"
                        >
                            SIGN IN
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
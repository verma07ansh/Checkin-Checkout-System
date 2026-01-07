'use client';

import React from 'react';
import { TriangleAlert, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div
                className="bg-white border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 text-red-600">
                        {isDangerous && <TriangleAlert className="w-8 h-8" />}
                        <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-gray-100 p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-gray-600 font-mono mb-8 text-sm leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 font-bold border-2 border-transparent hover:bg-gray-100"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

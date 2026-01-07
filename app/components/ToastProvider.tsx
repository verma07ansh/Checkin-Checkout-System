'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                className: 'font-sans font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                style: {
                    borderRadius: '0',
                    background: '#fff',
                    color: '#000',
                },
                success: {
                    iconTheme: {
                        primary: '#000',
                        secondary: '#fff',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                },
            }}
        />
    );
}

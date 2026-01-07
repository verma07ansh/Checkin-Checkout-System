'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-orange-500 border-b-4 border-black">
            <h1 className="text-9xl font-black mb-4 tracking-tighter text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
                404
            </h1>
            <h2 className="text-4xl font-bold mb-8 tracking-tight" style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
                Page Not Found.
            </h2>
            <p className="text-xl max-w-lg mb-12 font-medium">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <Link
                href="/"
                className="px-8 py-4 bg-black text-white text-lg font-bold hover:bg-white hover:text-black transition-colors duration-200 uppercase tracking-wider"
                style={{ fontFamily: "'Space Mono', monospace" }}
            >
                Return Home
            </Link>
        </div>
    );
}

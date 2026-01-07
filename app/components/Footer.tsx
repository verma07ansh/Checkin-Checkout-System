import React from 'react';
import Image from 'next/image';
import logo from '@/public/logo.png';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-12 px-8 bg-black text-white border-t-4 border-black font-sans">
            <div className="max-w-6xl mx-auto text-center">
                <div className="flex justify-center mb-8">
                    <Image src={logo} alt="Event Manager Logo" width={120} height={120} className="invert bg-transparent" />
                </div>
                <h2 className="text-3xl font-black mb-6 tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>LET'S CONNECT</h2>
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <a
                        href="mailto:verma.07ansh@gmail.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-2 border-white px-6 py-3 font-bold hover:bg-white hover:text-black transition-colors inline-block"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                        MAIL
                    </a>
                    <a
                        href="https://www.instagram.com/verma_07ansh/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-2 border-white px-6 py-3 font-bold hover:bg-white hover:text-black transition-colors inline-block"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                        INSTAGRAM
                    </a>
                    <a
                        href="https://github.com/verma07ansh"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-2 border-white px-6 py-3 font-bold hover:bg-white hover:text-black transition-colors inline-block"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                        GITHUB
                    </a>
                    <a
                        href="https://x.com/VERMA07ANSH"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-2 border-white px-6 py-3 font-bold hover:bg-white hover:text-black transition-colors inline-block"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                        TWITTER
                    </a>
                    <a
                        href="https://www.linkedin.com/in/ansh-verma-37504b2b7/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-2 border-white px-6 py-3 font-bold hover:bg-white hover:text-black transition-colors inline-block"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                        LINKEDIN
                    </a>
                </div>
                <p className="text-sm mb-4" style={{ fontFamily: "'Space Mono', monospace" }}>© {currentYear} EVENT MANAGER • ALL RIGHTS RESERVED</p>
                <p className="text-white text-[clamp(14px,3vw,18px)] tracking-wide flex items-center justify-center w-full text-center gap-1">
                    Made with <span className="text-red-500">❤️</span> by{" "}
                    <a
                        href="https://github.com/verma07ansh"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer relative inline-block text-white border-b border-white hover:font-bold hover:border-b-2 transition-all duration-300"
                    >
                        Ansh Verma
                    </a>
                </p>
            </div>
        </footer>
    );
}

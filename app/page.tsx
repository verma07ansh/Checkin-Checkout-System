import React from 'react';
import Link from 'next/link';
import { Scan, ShieldCheck, ArrowDown } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-black selection:text-white">
      {/* Hero Section */}
      <div className="h-[85vh] flex flex-col items-center justify-center relative p-6 border-b-4 border-black">
        <div className="max-w-4xl text-center space-y-8 z-10">
          <div className="inline-block border-2 border-black bg-white px-4 py-1.5 font-bold text-sm tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            OFFICIAL CHECK-IN SYSTEM
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
            EVENT<br />MANAGER
          </h1>
          <p className="text-xl md:text-2xl font-medium text-neutral-600 max-w-2xl mx-auto">
            Secure, fast, and reliable entry management for all your events.
          </p>
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] -z-0"></div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 animate-bounce">
          <ArrowDown className="w-8 h-8" />
        </div>
      </div>

      {/* Verify Section */}
      <div id="verify" className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-yellow-50">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
            <Scan className="w-10 h-10" />
          </div>

          <h2 className="text-4xl font-black tracking-tighter">VERIFY PASS</h2>
          <p className="text-lg text-neutral-600 font-medium">
            Scan attendee passes to instantly verify validity and check them in.
          </p>

          <Link
            href="/verify-pass"
            className="group block w-full bg-black text-white py-6 text-xl font-bold tracking-widest hover:bg-neutral-800 transition-all shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 relative overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Scan className="w-6 h-6 group-hover:scale-110 transition-transform" />
              START SCANNING
            </div>
          </Link>

          <div className="pt-12 grid grid-cols-2 gap-4 text-left">
            <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <ShieldCheck className="w-8 h-8 mb-2" />
              <div className="font-bold">Secure</div>
              <div className="text-xs text-gray-500">Real-time validation</div>
            </div>
            <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="font-bold text-xl mb-1">⚡</div>
              <div className="font-bold">Fast</div>
              <div className="text-xs text-gray-500">Instant results</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
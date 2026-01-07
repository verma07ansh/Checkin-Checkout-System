import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './context/AuthContext'

import Header from './components/Header'
import Footer from './components/Footer'
import ToastProvider from './components/ToastProvider'


export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'Event Check-in Manager – Secure Entry System',
    template: '%s | Event Manager',
  },
  description: 'Official Event Manager and Check-in System. Secure, fast, and reliable entry management with real-time QR code validation for E-Cell events.',
  keywords: ['Event Management', 'Check-in System', 'QR Scanner', 'Entry Control', 'E-Cell', 'Secure Entry'],
  authors: [{ name: 'E-Cell Team' }],
  openGraph: {
    title: 'Event Check-in Manager – Secure Entry System',
    description: 'Secure, fast, and reliable entry management with real-time QR code validation for E-Cell events.',
    siteName: 'Event Check-in Manager',
    images: [
      {
        url: '/E-cell Logo.svg',
        width: 800,
        height: 600,
        alt: 'E-Cell Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Event Check-in Manager – Secure Entry System',
    description: 'Secure, fast, and reliable entry management with real-time QR code validation for E-Cell events.',
    images: ['/E-cell Logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=EB+Garamond:ital@0;1&family=Space+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
        <AuthProvider>

          <Header />
          <ToastProvider />
          {children}
          <Footer />


        </AuthProvider>
      </body>
    </html>
  )
}
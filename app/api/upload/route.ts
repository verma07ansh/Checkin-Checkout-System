
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const API_KEY = process.env.NEXT_PUBLIC_FREEIMAGE_API_KEY || '6d207e02198a847aa98d0a2a901485a5'; // Fallback to provided key if env missing during dev
        const API_URL = 'https://freeimage.host/api/1/upload';

        const uploadData = new FormData();
        uploadData.append('key', API_KEY);
        uploadData.append('action', 'upload');
        uploadData.append('source', file);
        uploadData.append('format', 'json');

        const response = await fetch(API_URL, {
            method: 'POST',
            body: uploadData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('FreeImage Proxy Error:', response.status, errorText);
            return NextResponse.json({ error: `Upload failed: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Proxy Internal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

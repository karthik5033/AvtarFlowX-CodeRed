import { NextResponse } from 'next/server';

const DID_API_URL = 'https://api.d-id.com';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.DID_API_KEY || process.env['D-ID_KEY'] || '';
        const authHeader = apiKey.startsWith('Basic ') ? apiKey : `Basic ${Buffer.from(apiKey).toString('base64')}`;
        const { streamId, sessionId, candidate, sdpMid, sdpMLineIndex } = await req.json();

        if (!streamId || !sessionId || !candidate) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const didBody: any = {
            candidate,
            sdpMid,
            sdpMLineIndex
        };
        if (sessionId) didBody.session_id = sessionId;

        const response = await fetch(`${DID_API_URL}/talks/streams/${streamId}/ice`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(didBody),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('D-ID ICE Candidate Error:', error);
            return NextResponse.json({ error: 'Failed to send ICE candidate', details: error }, { status: response.status });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('ICE Candidate Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

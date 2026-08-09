import { NextResponse } from 'next/server';

const CLOUDFLARE_CALLS_APP_ID = process.env.CLOUDFLARE_CALLS_APP_ID;
const CLOUDFLARE_CALLS_APP_TOKEN = process.env.CLOUDFLARE_CALLS_APP_TOKEN;
const BASE_URL = `https://rtc.live.cloudflare.com/v1/apps/${CLOUDFLARE_CALLS_APP_ID}`;

export async function POST(request: Request) {
  try {
    const { action, sessionId, trackId, tracks, sdp } = await request.json();

    if (!CLOUDFLARE_CALLS_APP_ID || !CLOUDFLARE_CALLS_APP_TOKEN) {
      return NextResponse.json({
        configured: false,
        error: 'Cloudflare Calls API keys (CLOUDFLARE_CALLS_APP_ID, CLOUDFLARE_CALLS_APP_TOKEN) are not set in .env.local',
      });
    }

    const headers = {
      'Authorization': `Bearer ${CLOUDFLARE_CALLS_APP_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // 1. Create a new Cloudflare Calls WebRTC Session
    if (action === 'create-session') {
      const res = await fetch(`${BASE_URL}/sessions/new`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ error: `Cloudflare API error: ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ configured: true, sessionId: data.sessionId, sessionDescription: data.sessionDescription });
    }

    // 2. Publish local track to Cloudflare Calls SFU
    if (action === 'new-track') {
      if (!sessionId || !trackId) {
        return NextResponse.json({ error: 'sessionId and trackId are required.' }, { status: 400 });
      }

      const res = await fetch(`${BASE_URL}/sessions/${sessionId}/tracks/new`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tracks: [{ trackName: trackId }],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ error: `Cloudflare Track error: ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ configured: true, ...data });
    }

    // 3. Pull remote tracks from Cloudflare Calls SFU
    if (action === 'pull-tracks') {
      if (!sessionId || !Array.isArray(tracks)) {
        return NextResponse.json({ error: 'sessionId and tracks array are required.' }, { status: 400 });
      }

      const res = await fetch(`${BASE_URL}/sessions/${sessionId}/tracks/new`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tracks,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ error: `Cloudflare Pull error: ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ configured: true, ...data });
    }

    // 4. Renegotiate Session SDP with Cloudflare Calls
    if (action === 'renegotiate') {
      if (!sessionId || !sdp) {
        return NextResponse.json({ error: 'sessionId and sdp are required.' }, { status: 400 });
      }

      const res = await fetch(`${BASE_URL}/sessions/${sessionId}/renegotiate`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          sessionDescription: sdp,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ error: `Cloudflare Renegotiate error: ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ configured: true, ...data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Cloudflare Calls Route Error:', error);
    return NextResponse.json({ error: error?.message || 'Server Error' }, { status: 500 });
  }
}

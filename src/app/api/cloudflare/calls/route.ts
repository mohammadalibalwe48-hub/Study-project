import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type CallsBody = {
  action?: 'create-session' | 'new-track' | 'pull-tracks' | 'renegotiate';
  sessionId?: string;
  trackId?: string;
  mid?: string;
  tracks?: Array<{ location: 'remote'; sessionId: string; trackName: string }>;
  sdp?: RTCSessionDescriptionInit;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const appId = process.env.CLOUDFLARE_CALLS_APP_ID;
  const appToken = process.env.CLOUDFLARE_CALLS_APP_TOKEN;
  if (!appId || !appToken) return jsonError('Cloudflare Calls is not configured on the server.', 503);

  try {
    const body = await request.json() as CallsBody;
    const baseUrl = `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(appId)}`;
    const headers = { Authorization: `Bearer ${appToken}`, 'Content-Type': 'application/json' };

    const forward = async (path: string, method: 'POST' | 'PUT', payload?: object) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
        cache: 'no-store',
      });
      const text = await response.text();
      let data: Record<string, unknown> = {};
      try { data = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { data = { details: text }; }
      if (!response.ok) {
        console.error('Cloudflare Calls API rejected request:', response.status, data);
        return NextResponse.json({ error: 'Cloudflare Calls rejected the request.', errorCode: data.errorCode, details: data }, { status: response.status });
      }
      return NextResponse.json({ configured: true, ...data });
    };

    if (body.action === 'create-session') return forward('/sessions/new', 'POST');
    if (!body.sessionId) return jsonError('sessionId is required.', 400);
    const sessionPath = `/sessions/${encodeURIComponent(body.sessionId)}`;

    if (body.action === 'new-track') {
      if (!body.trackId || !body.sdp) return jsonError('trackId and sdp are required.', 400);
      return forward(`${sessionPath}/tracks/new`, 'POST', {
        sessionDescription: body.sdp,
        tracks: [{ location: 'local', mid: body.mid, trackName: body.trackId }],
      });
    }

    if (body.action === 'pull-tracks') {
      if (!body.tracks?.length) return jsonError('tracks are required.', 400);
      return forward(`${sessionPath}/tracks/new`, 'POST', {
        ...(body.sdp ? { sessionDescription: body.sdp } : {}),
        tracks: body.tracks,
      });
    }

    if (body.action === 'renegotiate') {
      if (!body.sdp) return jsonError('sdp is required.', 400);
      return forward(`${sessionPath}/renegotiate`, 'PUT', { sessionDescription: body.sdp });
    }

    return jsonError('Invalid action.', 400);
  } catch (error) {
    console.error('Cloudflare Calls route failed:', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected server error.', 500);
  }
}

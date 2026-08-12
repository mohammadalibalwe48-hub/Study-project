import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type CallsBody = {
  action?: 'create-session' | 'new-track' | 'pull-tracks' | 'renegotiate' | 'close-tracks' | 'get-ice-servers';
  sessionId?: string;
  trackId?: string;
  mid?: string;
  tracks?: Array<{ location: 'local' | 'remote'; sessionId?: string; trackName?: string; mid?: string }>;
  sdp?: RTCSessionDescriptionInit;
};

const REQUEST_TIMEOUT_MS = 8000;

let iceServersCache: { iceServers: RTCIceServer[]; expiresAt: number } | null = null;

const fallbackIceServers: RTCIceServer[] = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function fetchJson(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try { data = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { data = { details: text }; }
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function getIceServers(): Promise<RTCIceServer[]> {
  if (iceServersCache && iceServersCache.expiresAt > Date.now()) return iceServersCache.iceServers;

  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const keySecret = process.env.CLOUDFLARE_TURN_KEY_SECRET;

  try {
    if (!keyId || !keySecret) throw new Error('TURN key is not configured.');
    const result = await fetchJson(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${keySecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
    });
    if (!result.response.ok) throw new Error('TURN credential generation failed.');
    const generated = (result.data as { iceServers?: RTCIceServer[] }).iceServers || fallbackIceServers;
    const servers: RTCIceServer[] = generated
      .map((server) => ({ ...server, urls: server.urls.filter((url) => !/:53([?/]|$)/.test(url)) }))
      .filter((server) => server.urls.length > 0);
    iceServersCache = { iceServers: servers, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
    return servers;
  } catch (error) {
    console.error('TURN credentials failed, falling back to STUN:', error);
    return fallbackIceServers;
  }
}

export async function POST(request: Request) {
  const appId = process.env.CLOUDFLARE_CALLS_APP_ID;
  const appToken = process.env.CLOUDFLARE_CALLS_APP_TOKEN;
  if (!appId || !appToken) return jsonError('Cloudflare Calls is not configured on the server.', 503);

  try {
    if (request.method !== 'POST') return jsonError('Method not allowed.', 405);

    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json() as CallsBody;

      if (body.action === 'get-ice-servers') {
        const iceServers = await getIceServers();
        return NextResponse.json({ configured: true, iceServers });
      }
    } else {
      return jsonError('Content-Type must be application/json.', 415);
    }

    const body = await request.json() as CallsBody;
    const baseUrl = `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(appId)}`;
    const headers = { Authorization: `Bearer ${appToken}`, 'Content-Type': 'application/json' };

    const forward = async (path: string, method: 'POST' | 'PUT', payload?: object) => {
      const { response, data } = await fetchJson(`${baseUrl}${path}`, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });
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

    if (body.action === 'close-tracks') {
      if (!body.tracks?.length) return jsonError('tracks are required.', 400);
      return forward(`${sessionPath}/tracks/close`, 'PUT', { tracks: body.tracks });
    }

    return jsonError('Invalid action.', 400);
  } catch (error) {
    console.error('Cloudflare Calls route failed:', error);
    return jsonError(error instanceof Error ? error.message : 'Unexpected server error.', 500);
  }
}
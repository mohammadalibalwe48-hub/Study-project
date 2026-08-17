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

const REQUEST_TIMEOUT_MS = 12_000;
const ALLOWED_ACTIONS = new Set<NonNullable<CallsBody['action']>>([
  'create-session',
  'new-track',
  'pull-tracks',
  'renegotiate',
  'close-tracks',
  'get-ice-servers',
]);

let iceServersCache: { iceServers: RTCIceServer[]; expiresAt: number } | null = null;

const fallbackIceServers: RTCIceServer[] = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
];

function jsonError(message: string, status: number, errorCode?: string) {
  return NextResponse.json(
    { error: message, ...(errorCode ? { errorCode } : {}) },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

function getEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function getCloudflareError(data: Record<string, unknown>, status: number) {
  const nestedError = data.error && typeof data.error === 'object'
    ? data.error as Record<string, unknown>
    : null;
  const code = String(data.errorCode || nestedError?.errorCode || nestedError?.code || `cloudflare_${status}`);
  const description = data.errorDescription || nestedError?.errorDescription || nestedError?.message;
  return {
    code,
    message: typeof description === 'string'
      ? `Cloudflare Calls rejected the request: ${description}`
      : `Cloudflare Calls rejected the request (${status}).`,
  };
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

  const keyId = getEnvironmentValue('CLOUDFLARE_TURN_KEY_ID');
  const keySecret = getEnvironmentValue('CLOUDFLARE_TURN_KEY_SECRET');

  try {
    if (!keyId || !keySecret) throw new Error('TURN key is not configured.');
    const result = await fetchJson(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${keySecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86_400 }),
    });
    if (!result.response.ok) {
      const failure = getCloudflareError(result.data, result.response.status);
      throw new Error(failure.message);
    }

    const generated = (result.data as { iceServers?: RTCIceServer[] }).iceServers;
    if (!Array.isArray(generated) || generated.length === 0) {
      throw new Error('Cloudflare TURN returned no ICE servers.');
    }

    // Keep username and credential: removing them turns every TURN URL into an unusable server.
    const servers = generated.filter((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((url) => typeof url === 'string' && url.length > 0);
    });
    if (servers.length === 0) throw new Error('Cloudflare TURN returned invalid ICE servers.');

    iceServersCache = { iceServers: servers, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
    return servers;
  } catch (error) {
    console.warn('TURN credentials failed; using STUN-only fallback:', error);
    return fallbackIceServers;
  }
}

export async function POST(request: Request) {
  const appId = getEnvironmentValue('CLOUDFLARE_CALLS_APP_ID');
  const appToken = getEnvironmentValue('CLOUDFLARE_CALLS_APP_TOKEN');
  if (!appId || !appToken) {
    return jsonError('Cloudflare Calls credentials are missing on the server.', 503, 'cloudflare_not_configured');
  }

  try {
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return jsonError('Content-Type must be application/json.', 415, 'invalid_content_type');
    }

    // A Request body is a one-use stream. Parse it exactly once and reuse the result.
    const body = await request.json() as CallsBody;
    if (!body || typeof body !== 'object' || !body.action || !ALLOWED_ACTIONS.has(body.action)) {
      return jsonError('A valid action is required.', 400, 'invalid_action');
    }

    if (body.action === 'get-ice-servers') {
      const iceServers = await getIceServers();
      return NextResponse.json(
        { configured: true, iceServers },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const baseUrl = `https://rtc.live.cloudflare.com/v1/apps/${encodeURIComponent(appId)}`;
    const headers = { Authorization: `Bearer ${appToken}`, 'Content-Type': 'application/json' };

    const forward = async (path: string, method: 'POST' | 'PUT', payload?: object) => {
      const { response, data } = await fetchJson(`${baseUrl}${path}`, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!response.ok) {
        const failure = getCloudflareError(data, response.status);
        console.error('Cloudflare Calls API rejected request:', response.status, failure.code, data);
        return NextResponse.json(
          { error: failure.message, errorCode: failure.code },
          { status: response.status, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      return NextResponse.json(
        { configured: true, ...data },
        { headers: { 'Cache-Control': 'no-store' } },
      );
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

    return jsonError('Invalid action.', 400, 'invalid_action');
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError('The request body is not valid JSON.', 400, 'invalid_json');
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonError('Cloudflare Calls did not respond in time.', 504, 'cloudflare_timeout');
    }
    console.error('Cloudflare Calls route failed:', error);
    return jsonError('The Cloudflare Calls request failed unexpectedly.', 502, 'cloudflare_proxy_error');
  }
}
'use client';

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export interface RoomParticipant {
    userId: string;
    fullName: string;
    micEnabled: boolean;
    cameraEnabled: boolean;
    isOnline: boolean;
    cfSessionId?: string;
    audioTrackId?: string;
    videoTrackId?: string;
}

export interface RemoteRoomStream {
    userId: string;
    stream: MediaStream;
}

export interface CallDebugInfo {
    status: 'idle' | 'connecting' | 'ready' | 'live';
    sessionId: string | null;
    connectionState: string;
    iceConnectionState: string;
    published: { audio: boolean; video: boolean };
    pulledTracks: number;
    logs: string[];
}

interface UseStudyRoomCallOptions {
    roomId: string | null;
    userId: string | null;
    profileName?: string;
    localVideoRef: RefObject<HTMLVideoElement | null>;
}

type CloudflareTrack = { mid?: string; trackName?: string; errorCode?: string; errorDescription?: string };
type CloudflareResponse = {
    sessionId?: string;
    sessionDescription?: RTCSessionDescriptionInit;
    tracks?: CloudflareTrack[];
    configured?: boolean;
    iceServers?: RTCIceServer[];
};
type CloudflareRequestError = Error & { code?: string; status?: number };
type TrackKind = 'audio' | 'video';
type PresencePayload = {
    user_id: string;
    full_name: string;
    cf_session_id?: string | null;
    audio_track_id?: string | null;
    video_track_id?: string | null;
    mic_enabled: boolean;
    camera_enabled: boolean;
};

const ICE_CONNECT_TIMEOUT_MS = 2500;
const TRACK_DELIVERY_TIMEOUT_MS = 4000;
const PULL_MAX_ATTEMPTS = 5;
const PULL_RETRY_DELAY_MS = 1200;
const PRESENCE_HEARTBEAT_MS = 10_000;

export function useStudyRoomCall({ roomId, userId, profileName = 'طالب مسار', localVideoRef }: UseStudyRoomCallOptions) {
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<RemoteRoomStream[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [mediaError, setMediaError] = useState('');
    const [cfSessionId, setCfSessionId] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<CallDebugInfo>({
        status: 'idle',
        sessionId: null,
        connectionState: 'new',
        iceConnectionState: 'new',
        published: { audio: false, video: false },
        pulledTracks: 0,
        logs: [],
    });

    const localStreamRef = useRef<MediaStream | null>(null);
    const profileNameRef = useRef(profileName);
    const userIdRef = useRef(userId);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
    const iceServersRef = useRef<RTCIceServer[] | null>(null);
    const publishedTracksRef = useRef(new Map<TrackKind, MediaStreamTrack>());
    const publishInFlightRef = useRef(new Map<TrackKind, Promise<void>>());
    const pulledTracksRef = useRef(new Set<string>());
    const pullAttemptsRef = useRef(new Map<string, number>());
    const deliveredMidsRef = useRef(new Set<string>());
    const trackToUserRef = useRef(new Map<string, string>());
    const negotiationRef = useRef(Promise.resolve());
    const micEnabledRef = useRef(false);
    const cameraEnabledRef = useRef(false);
    const audioTrackIdRef = useRef<string | null>(null);
    const videoTrackIdRef = useRef<string | null>(null);
    const requestingMediaRef = useRef(new Set<TrackKind>());
    const refreshingRef = useRef(false);
    const cleanedRef = useRef(false);
    const timersRef = useRef<number[]>([]);
    const pullRemoteTracksRef = useRef<((remoteSessionId: string, remoteUserId: string, trackNames: string[]) => Promise<void>) | null>(null);
    const refreshSessionRef = useRef<((reason?: string) => Promise<string | null>) | null>(null);
    const publishTrackRef = useRef<(track: MediaStreamTrack, kind: TrackKind) => Promise<void>>(null);
    const applyPresenceRef = useRef<((channel: ReturnType<typeof supabase.channel>) => void) | null>(null);

    const pushLog = useCallback((message: string) => {
        setDebugInfo((current) => {
            const logs = [`${new Date().toLocaleTimeString()} ${message}`, ...current.logs].slice(0, 8);
            return { ...current, logs };
        });
    }, []);

    const log = useCallback((...args: unknown[]) => {
        console.info('[calls]', ...args);
    }, []);

    const scheduleTimer = useCallback((fn: () => void, delay: number) => {
        const id = window.setTimeout(() => {
            timersRef.current = timersRef.current.filter((timerId) => timerId !== id);
            fn();
        }, delay);
        timersRef.current.push(id);
        return id;
    }, []);

    const trackPresence = useCallback(async () => {
        const currentUserId = userIdRef.current;
        if (!channelRef.current || !currentUserId) return;
        try {
            await channelRef.current.track({
                user_id: currentUserId,
                full_name: profileNameRef.current,
                cf_session_id: sessionIdRef.current,
                audio_track_id: audioTrackIdRef.current,
                video_track_id: videoTrackIdRef.current,
                mic_enabled: micEnabledRef.current,
                camera_enabled: cameraEnabledRef.current,
            } satisfies PresencePayload);
        } catch (error) {
            console.warn('[calls] presence broadcast failed:', error);
        }
    }, []);

    const cloudflare = useCallback(async (body: Record<string, unknown>): Promise<CloudflareResponse> => {
        let response: Response;
        try {
            response = await fetch('/api/cloudflare/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                cache: 'no-store',
            });
        } catch (cause) {
            const error = new Error('تعذر الوصول إلى خادم الاتصال. تحقق من الشبكة ثم حاول مجدداً.', { cause }) as CloudflareRequestError;
            error.code = 'cloudflare_network_error';
            throw error;
        }

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
            ? await response.json().catch(() => ({})) as Record<string, unknown>
            : {};
        if (!response.ok || typeof data.error === 'string') {
            const serverMessage = typeof data.error === 'string' ? data.error : '';
            const error = new Error(serverMessage || `Cloudflare Calls request failed (${response.status})`) as CloudflareRequestError;
            if (typeof data.errorCode === 'string') error.code = data.errorCode;
            error.status = response.status;
            throw error;
        }
        return data as CloudflareResponse;
    }, []);

    const renegotiate = useCallback((operation: () => Promise<void>) => {
        const next = negotiationRef.current.then(operation, operation);
        negotiationRef.current = next.catch(() => undefined);
        return next;
    }, []);

    const waitForIceConnected = useCallback((pc: RTCPeerConnection, timeoutMs: number) => new Promise<boolean>((resolve) => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') { resolve(true); return; }
        const timeout = window.setTimeout(() => {
            pc.removeEventListener('iceconnectionstatechange', handler);
            resolve(false);
        }, timeoutMs);
        const handler = () => {
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                window.clearTimeout(timeout);
                pc.removeEventListener('iceconnectionstatechange', handler);
                resolve(true);
            }
        };
        pc.addEventListener('iceconnectionstatechange', handler);
    }), []);

    const waitForTrackDelivery = useCallback((mid: string, timeoutMs: number) => new Promise<boolean>((resolve) => {
        if (!mid) { resolve(true); return; }
        if (deliveredMidsRef.current.has(mid)) { resolve(true); return; }
        const start = Date.now();
        const interval = window.setInterval(() => {
            if (deliveredMidsRef.current.has(mid)) { window.clearInterval(interval); resolve(true); }
            else if (Date.now() - start >= timeoutMs) { window.clearInterval(interval); resolve(false); }
        }, 100);
    }), []);

    const ensureIceServers = useCallback(async () => {
        if (iceServersRef.current?.length) return iceServersRef.current;
        try {
            const data = await cloudflare({ action: 'get-ice-servers' });
            if (data.iceServers?.length) iceServersRef.current = data.iceServers;
        } catch (error) {
            log('ice-servers fetch failed, using fallback STUN:', error);
        }
        iceServersRef.current = iceServersRef.current || [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
        return iceServersRef.current;
    }, [cloudflare, log]);

    const updateConnectionDebug = useCallback(() => {
        const pc = pcRef.current;
        if (!pc) return;
        setDebugInfo((current) => ({ ...current, connectionState: pc.connectionState, iceConnectionState: pc.iceConnectionState }));
    }, []);

    const createPeerConnection = useCallback((): RTCPeerConnection => {
        const pc = new RTCPeerConnection({
            iceServers: iceServersRef.current || [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }],
            iceCandidatePoolSize: 16,
            bundlePolicy: 'max-bundle',
        });

        pc.ontrack = (event) => {
            const stream = event.streams[0] || new MediaStream([event.track]);
            const mid = event.transceiver?.mid || '';
            if (mid) deliveredMidsRef.current.add(mid);
            const remoteUserId = trackToUserRef.current.get(mid) || trackToUserRef.current.get(event.track.id) || event.track.id;
            setRemoteStreams((current) => {
                const existingIndex = current.findIndex((item) => item.userId === remoteUserId);
                if (existingIndex >= 0) {
                    const existingStream = current[existingIndex].stream;
                    if (!existingStream.getTracks().some((t) => t.id === event.track.id)) {
                        existingStream.addTrack(event.track);
                    }
                    const updated = [...current];
                    updated[existingIndex] = { userId: remoteUserId, stream: new MediaStream(existingStream.getTracks()) };
                    return updated;
                }
                return [...current, { userId: remoteUserId, stream }];
            });
        };

        pc.onconnectionstatechange = () => {
            updateConnectionDebug();
            if (cleanedRef.current || pc !== pcRef.current) return;
            if (pc.connectionState === 'failed') {
                console.warn('[calls] peer connection failed, refreshing session');
                pushLog('الاتصال سقط — إعادة إنشاء الجلسة');
                void refreshSessionRef.current?.('peer-connection-failed');
            }
        };

        pc.oniceconnectionstatechange = updateConnectionDebug;

        return pc;
    }, [pushLog, updateConnectionDebug]);

    const initSession = useCallback(async (): Promise<string | null> => {
        if (sessionIdRef.current) return sessionIdRef.current;
        if (sessionPromiseRef.current) return sessionPromiseRef.current;
        sessionPromiseRef.current = (async () => {
            try {
                await ensureIceServers();
                const data = await cloudflare({ action: 'create-session' });
                if (!data.configured || !data.sessionId) throw new Error('Cloudflare Calls is not configured');
                if (cleanedRef.current || !channelRef.current) return null;
                const pc = createPeerConnection();
                pcRef.current = pc;
                sessionIdRef.current = data.sessionId;
                setCfSessionId(data.sessionId);
                setDebugInfo((current) => ({ ...current, status: 'ready', sessionId: data.sessionId || null }));
                log('session created', data.sessionId);
                pushLog('الجلسة جاهزة');
                await trackPresence();
                return data.sessionId;
            } catch (error) {
                const failure = error as CloudflareRequestError;
                console.error('[calls] session init failed:', failure.code || failure.message);
                pushLog(`تعذر إنشاء الجلسة${failure.code ? ` (${failure.code})` : ''}`);
                if (failure.code === 'cloudflare_not_configured') {
                    setMediaError('خدمة الاتصال غير مهيأة على الخادم. يجب إضافة بيانات Cloudflare Calls إلى بيئة النشر ثم إعادة تشغيل الخادم.');
                } else if (failure.code === 'cloudflare_timeout' || failure.code === 'cloudflare_network_error') {
                    setMediaError('تعذر الوصول إلى خدمة الاتصال الآن. تحقق من الشبكة ثم حاول مجدداً.');
                } else if (failure.status === 401 || failure.status === 403) {
                    setMediaError('رفضت Cloudflare بيانات الاتصال. تحقق من App ID وApp Token في إعدادات الخادم.');
                } else {
                    setMediaError(`تعذر تشغيل خدمة الاتصال${failure.code ? ` (${failure.code})` : ''}. أعد المحاولة بعد لحظات.`);
                }
                return null;
            } finally {
                sessionPromiseRef.current = null;
            }
        })();
        return sessionPromiseRef.current;
    }, [cloudflare, createPeerConnection, ensureIceServers, log, pushLog, trackPresence]);

    const closeLocalTrack = useCallback(async (kind: TrackKind) => {
        const sessionId = sessionIdRef.current;
        const pc = pcRef.current;
        const track = localStreamRef.current?.getTracks().find((t) => t.kind === kind);
        if (!sessionId || !pc || !track) return;
        const transceiver = pc.getTransceivers().find((t) => t.sender && t.sender.track === track);
        const mid = transceiver?.mid;
        if (!mid) return;
        try {
            await cloudflare({ action: 'close-tracks', sessionId, tracks: [{ location: 'local', mid }] });
            try { pc.removeTrack(transceiver!.sender); } catch { /* noop */ }
        } catch (error) {
            console.warn('[calls] track close failed (non-fatal):', error);
        }
    }, [cloudflare]);

    const publishTrack = useCallback(async (track: MediaStreamTrack, kind: TrackKind) => {
        if (publishInFlightRef.current.has(kind)) await publishInFlightRef.current.get(kind);
        const sessionId = (sessionIdRef.current || await initSession());
        const pc = pcRef.current;
        const previous = publishedTracksRef.current.get(kind);
        if (previous === track && audioTrackIdRef.current && kind === 'audio') return;
        if (!sessionId || !pc || cleanedRef.current) return;

        const publishPromise = (async () => {
            publishedTracksRef.current.set(kind, track);
            if (kind === 'audio') audioTrackIdRef.current = null;
            else videoTrackIdRef.current = null;

            const existing = pc.getTransceivers().filter((t) => t.sender && t.sender.track === track);
            existing.forEach((t) => { try { pc.removeTrack(t.sender); } catch { /* noop */ } });

            const trackName = `${userIdRef.current}-${kind}-${crypto.randomUUID()}`;
            const transceiver = pc.addTransceiver(track, { direction: 'sendonly', streams: [localStreamRef.current || new MediaStream([track])] });

            await renegotiate(async () => {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                let mid = transceiver.mid;
                if (!mid && offer.sdp) {
                    const midMatches = Array.from(offer.sdp.matchAll(/a=mid:(\S+)/g));
                    if (midMatches.length > 0) mid = midMatches[midMatches.length - 1][1];
                }

                const data = await cloudflare({ action: 'new-track', sessionId, trackId: trackName, mid: mid || '0', sdp: pc.localDescription });
                if (data.sessionDescription) await pc.setRemoteDescription(data.sessionDescription);
            });

            if (kind === 'audio') audioTrackIdRef.current = trackName;
            else videoTrackIdRef.current = trackName;
            log('published', kind, trackName);
            pushLog(`${kind === 'audio' ? 'الميكروفون' : 'الكاميرا'} بُثّت`);

            const connected = await waitForIceConnected(pc, ICE_CONNECT_TIMEOUT_MS);
            setDebugInfo((current) => ({ ...current, published: { ...current.published, [kind]: true } }));
            await trackPresence();
            if (!connected) {
                console.warn('[calls] ICE did not connect after publish, refreshing session', kind);
                pushLog('لا يوجد اتصال ICE — إعادة المحاولة');
                void refreshSessionRef.current?.('publish-ice-timeout');
            }
        })();

        publishInFlightRef.current.set(kind, publishPromise);
        try {
            await publishPromise;
        } finally {
            publishInFlightRef.current.delete(kind);
        }
    }, [cloudflare, initSession, log, pushLog, renegotiate, trackPresence, waitForIceConnected]);

    const pullRemoteTracks = useCallback(async (remoteSessionId: string, remoteUserId: string, trackNames: string[]) => {
        const sessionId = (sessionIdRef.current || await initSession());
        const pc = pcRef.current;
        if (!sessionId || !pc || cleanedRef.current) return;

        const names = trackNames.filter((name) => name && !pulledTracksRef.current.has(`${remoteSessionId}:${name}`));
        if (!names.length) return;
        names.forEach((name) => pulledTracksRef.current.add(`${remoteSessionId}:${name}`));
        setDebugInfo((current) => ({ ...current, pulledTracks: current.pulledTracks + names.length }));

        try {
            const midByTrack = new Map<string, string>();
            const failedNames: string[] = [];

            await renegotiate(async () => {
                const data = await cloudflare({ action: 'pull-tracks', sessionId, tracks: names.map((trackName) => ({ location: 'remote', sessionId: remoteSessionId, trackName })) });
                (data.tracks || []).forEach((trackResponse) => {
                    if (trackResponse.errorCode || !trackResponse.mid) {
                        if (trackResponse.trackName) failedNames.push(trackResponse.trackName);
                        return;
                    }
                    if (trackResponse.mid) trackToUserRef.current.set(trackResponse.mid, remoteUserId);
                    if (trackResponse.trackName) trackToUserRef.current.set(trackResponse.trackName, remoteUserId);
                    if (trackResponse.mid && trackResponse.trackName) midByTrack.set(trackResponse.trackName, trackResponse.mid);
                });

                if (midByTrack.size > 0 && data.sessionDescription) {
                    await pc.setRemoteDescription(data.sessionDescription);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await cloudflare({ action: 'renegotiate', sessionId, sdp: pc.localDescription });
                }
            });

            if (midByTrack.size > 0) {
                await Promise.all([...midByTrack.values()].map((mid) => waitForTrackDelivery(mid, TRACK_DELIVERY_TIMEOUT_MS)));
                await waitForIceConnected(pc, ICE_CONNECT_TIMEOUT_MS);
            }

            const undelivered = names.filter((name) => {
                const mid = midByTrack.get(name);
                return mid ? !deliveredMidsRef.current.has(mid) : false;
            });
            const retryNames = [...new Set([...failedNames, ...undelivered])];
            retryNames.forEach((name) => pulledTracksRef.current.delete(`${remoteSessionId}:${name}`));

            if (retryNames.length) {
                const attempts = retryNames.map((name) => pullAttemptsRef.current.get(`${remoteSessionId}:${name}`) || 0);
                const maxAttempt = Math.max(...attempts);
                if (maxAttempt < PULL_MAX_ATTEMPTS) {
                    retryNames.forEach((name) => pullAttemptsRef.current.set(`${remoteSessionId}:${name}`, maxAttempt + 1));
                    if (maxAttempt === 0) log('pulling', remoteUserId.slice(0, 8), names);
                    if (maxAttempt > 0) log('retrying (attempt', `${maxAttempt + 1}/${PULL_MAX_ATTEMPTS})`, retryNames.map((n) => n.split('-').slice(-1)[0]));
                    scheduleTimer(() => { if (pcRef.current) void pullRemoteTracksRef.current?.(remoteSessionId, remoteUserId, retryNames); }, PULL_RETRY_DELAY_MS * (maxAttempt + 1));
                } else {
                    console.warn('[calls] giving up on tracks after', PULL_MAX_ATTEMPTS, 'attempts:', remoteUserId.slice(0, 8), retryNames.map((n) => n.split('-').slice(-1)[0]));
                    pushLog('تعذّر سحب بعض المسارات — سيُعاد تلقائياً');
                }
            }
        } catch (error) {
            names.forEach((name) => pulledTracksRef.current.delete(`${remoteSessionId}:${name}`));
            const failure = error as Error & { code?: string };
            if (failure.code === 'session_error') {
                console.warn('[calls] session expired (410), refreshing');
                pushLog('انتهت الجلسة — إعادة إنشائها');
                void refreshSessionRef.current?.('session-error');
            } else {
                console.warn('[calls] pull failed (will retry on next presence sync):', failure.code || failure.message);
            }
        }
    }, [cloudflare, initSession, log, pushLog, renegotiate, scheduleTimer, waitForIceConnected, waitForTrackDelivery]);

    useEffect(() => {
        pullRemoteTracksRef.current = pullRemoteTracks;
    });

    const applyPresence = useCallback((channel: ReturnType<typeof supabase.channel>) => {
        const state = channel.presenceState() as Record<string, PresencePayload[]>;
        const onlineMap = new Map<string, PresencePayload>();
        Object.entries(state).forEach(([key, values]) => { const value = values?.[values.length - 1]; if (value) onlineMap.set(value.user_id || key, value); });

        setParticipants((current) => {
            const updated = [...current];
            const currentIds = new Set(current.map((p) => p.userId));

            onlineMap.forEach((presence, presenceUserId) => {
                if (!currentIds.has(presenceUserId)) {
                    updated.push({
                        userId: presenceUserId,
                        fullName: presence.full_name || 'طالب مسار',
                        micEnabled: presence.mic_enabled || false,
                        cameraEnabled: presence.camera_enabled || false,
                        isOnline: true,
                        cfSessionId: presence.cf_session_id || undefined,
                        audioTrackId: presence.audio_track_id || undefined,
                        videoTrackId: presence.video_track_id || undefined,
                    });
                }
            });

            return updated.map((participant) => {
                const presence = onlineMap.get(participant.userId);
                if (!presence) return { ...participant, isOnline: false };

                if (participant.userId !== userId && presence.cf_session_id) {
                    const names = [presence.audio_track_id, presence.video_track_id].filter((name): name is string => !!name);
                    if (names.length) void pullRemoteTracksRef.current?.(presence.cf_session_id, participant.userId, names);
                }

                return {
                    ...participant,
                    fullName: presence.full_name || participant.fullName,
                    isOnline: true,
                    micEnabled: participant.userId === userId ? micEnabledRef.current : presence.mic_enabled,
                    cameraEnabled: participant.userId === userId ? cameraEnabledRef.current : presence.camera_enabled,
                    cfSessionId: presence.cf_session_id || undefined,
                    audioTrackId: presence.audio_track_id || undefined,
                    videoTrackId: presence.video_track_id || undefined,
                };
            });
        });
    }, [userId]);

    useEffect(() => {
        applyPresenceRef.current = applyPresence;
    });

    const refreshSession = useCallback(async (reason?: string) => {
        if (refreshingRef.current) return sessionIdRef.current;
        if (cleanedRef.current) return null;
        refreshingRef.current = true;
        log('refreshing session:', reason || 'unknown');

        pcRef.current?.close();
        pcRef.current = null;
        sessionIdRef.current = null;
        setCfSessionId(null);
        pulledTracksRef.current.clear();
        pullAttemptsRef.current.clear();
        trackToUserRef.current.clear();
        deliveredMidsRef.current.clear();
        setDebugInfo((current) => ({ ...current, status: 'connecting', sessionId: null, pulledTracks: 0, published: { audio: false, video: false } }));

        const sessionId = await initSession();
        const liveTracks = [...publishedTracksRef.current.entries()].filter(([, track]) => track.readyState === 'live');
        publishedTracksRef.current.clear();
        for (const [kind, track] of liveTracks) {
            await publishTrackRef.current?.(track, kind);
        }

        const channel = channelRef.current;
        if (channel && pcRef.current) applyPresenceRef.current?.(channel);
        refreshingRef.current = false;
        return sessionId;
    }, [initSession, log]);

    useEffect(() => {
        refreshSessionRef.current = refreshSession;
    });

    const mediaErrorMessage = useCallback((kind: TrackKind, error: unknown) => {
        const domError = error as DOMException;
        const device = kind === 'audio' ? 'الميكروفون' : 'الكاميرا';
        switch (domError.name) {
            case 'NotAllowedError': return `لم نتمكن من الوصول إلى ${device}. اسمح بالصلاحيات من شريط المتصفح ثم حاول مجدداً.`;
            case 'NotFoundError': return `لم يتم العثور على ${device} متصل بهذا الجهاز. تأكد من توصيله ثم حاول مجدداً.`;
            case 'NotReadableError': return `${device} مشغولة من تطبيق أو نافذة أخرى حالياً. أغلقها ثم حاول مجدداً.`;
            case 'OverconstrainedError': return `${device} غير متوافقة مع الإعدادات المطلوبة. جرّب جهازاً آخر.`;
            default: return `تعذر الوصول إلى ${device}. تأكد من الصلاحيات ثم حاول مجدداً.`;
        }
    }, []);

    const enableMedia = useCallback(async (kind: TrackKind) => {
        if (requestingMediaRef.current.has(kind)) return;
        requestingMediaRef.current.add(kind);
        setMediaError('');

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                setMediaError('المتصفح لا يدعم الصوت والفيديو. استخدم اتصالاً آمناً عبر HTTPS.');
                return;
            }

            const requested = await navigator.mediaDevices.getUserMedia({
                audio: kind === 'audio',
                video: kind === 'video'
                    ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }
                    : false,
            });
            const track = kind === 'audio' ? requested.getAudioTracks()[0] : requested.getVideoTracks()[0];
            if (!track) throw new Error(`No ${kind} track was returned by the browser`);

            const stream = localStreamRef.current || new MediaStream();
            const oldTrack = kind === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
            if (oldTrack && oldTrack !== track) {
                void closeLocalTrack(kind);
                stream.removeTrack(oldTrack);
                oldTrack.stop();
                publishedTracksRef.current.delete(kind);
            }

            track.enabled = true;
            stream.addTrack(track);
            localStreamRef.current = stream;
            setLocalStream(stream);

            if (kind === 'audio') {
                micEnabledRef.current = true;
                setMicEnabled(true);
            } else {
                cameraEnabledRef.current = true;
                setCameraEnabled(true);
            }

            track.addEventListener('ended', () => {
                publishedTracksRef.current.delete(kind);
                if (kind === 'audio') {
                    audioTrackIdRef.current = null;
                    micEnabledRef.current = false;
                    setMicEnabled(false);
                } else {
                    videoTrackIdRef.current = null;
                    cameraEnabledRef.current = false;
                    setCameraEnabled(false);
                }
                setDebugInfo((current) => ({ ...current, published: { ...current.published, [kind]: false } }));
                void trackPresence();
            }, { once: true });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                await localVideoRef.current.play().catch(() => undefined);
            }

            try {
                await publishTrackRef.current?.(track, kind);
                setDebugInfo((current) => ({ ...current, status: 'live' }));
            } catch (error) {
                console.error(`[calls] ${kind} publish failed:`, error);
                void trackPresence();
                pushLog(`${kind === 'audio' ? 'الميكروفون' : 'الكاميرا'}: تعذّر البث، ستُعاد المحاولة تلقائياً`);
            }
            setDebugInfo((current) => ({ ...current, published: { ...current.published, [kind]: Boolean(audioTrackIdRef.current || videoTrackIdRef.current) } }));
            void scheduleTimer(() => void trackPresence(), 0);
        } catch (error) {
            console.error('[calls] media permission failed:', error);
            setMediaError(mediaErrorMessage(kind, error));
        } finally {
            requestingMediaRef.current.delete(kind);
        }
    }, [closeLocalTrack, localVideoRef, mediaErrorMessage, pushLog, scheduleTimer, trackPresence]);

    useEffect(() => {
        publishTrackRef.current = publishTrack;
    });

    const toggleMic = useCallback(() => {
        if (requestingMediaRef.current.has('audio')) return;
        const track = localStreamRef.current?.getAudioTracks().find((item) => item.readyState === 'live');
        if (!track) {
            void enableMedia('audio');
            return;
        }
        track.enabled = !track.enabled;
        micEnabledRef.current = track.enabled;
        setMicEnabled(track.enabled);
        if (!track.enabled) {
            audioTrackIdRef.current = null;
            setDebugInfo((current) => ({ ...current, published: { ...current.published, audio: false } }));
        }
        void trackPresence();
    }, [enableMedia, trackPresence]);

    const toggleCamera = useCallback(() => {
        if (requestingMediaRef.current.has('video')) return;
        const track = localStreamRef.current?.getVideoTracks().find((item) => item.readyState === 'live');
        if (!track) {
            void enableMedia('video');
            return;
        }
        track.enabled = !track.enabled;
        cameraEnabledRef.current = track.enabled;
        setCameraEnabled(track.enabled);
        if (!track.enabled) {
            videoTrackIdRef.current = null;
            setDebugInfo((current) => ({ ...current, published: { ...current.published, video: false } }));
        }
        void trackPresence();
    }, [enableMedia, trackPresence]);

    const cleanup = useCallback(() => {
        cleanedRef.current = true;
        timersRef.current.forEach((id) => window.clearTimeout(id));
        timersRef.current = [];
        if (channelRef.current) void channelRef.current.untrack();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        pcRef.current?.close();
        pcRef.current = null;
        sessionIdRef.current = null;
        setCfSessionId(null);
        sessionPromiseRef.current = null;
        publishedTracksRef.current.clear();
        publishInFlightRef.current.clear();
        pulledTracksRef.current.clear();
        pullAttemptsRef.current.clear();
        trackToUserRef.current.clear();
        requestingMediaRef.current.clear();
        deliveredMidsRef.current.clear();
        micEnabledRef.current = false;
        cameraEnabledRef.current = false;
        setRemoteStreams([]);
        setMicEnabled(false);
        setCameraEnabled(false);
        setDebugInfo((current) => ({ ...current, status: 'idle', sessionId: null, connectionState: 'new', iceConnectionState: 'new', published: { audio: false, video: false }, pulledTracks: 0, logs: [] }));
    }, [localVideoRef]);

    useEffect(() => {
        profileNameRef.current = profileName;
        userIdRef.current = userId;
    }, [profileName, userId]);

    useEffect(() => {
        if (!roomId || !userId) return;
        let active = true;
        cleanedRef.current = false;
        const channel = supabase.channel(`cf-room:${roomId}`, { config: { presence: { key: userId } } });
        channelRef.current = channel;
        channel.on('presence', { event: 'sync' }, () => { if (active) applyPresenceRef.current?.(channel); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_members', filter: `room_id=eq.${roomId}` }, () => void loadParticipantsRef.current?.())
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && active) {
                    setDebugInfo((current) => ({ ...current, status: 'connecting' }));
                    await loadParticipantsRef.current?.();
                    await initSession();
                    await trackPresence();
                    if (active && channelRef.current) applyPresenceRef.current?.(channel);
                }
            });

        const heartbeat = window.setInterval(() => {
            if (active) void trackPresence();
        }, PRESENCE_HEARTBEAT_MS);
        timersRef.current.push(heartbeat);

        return () => {
            active = false;
            window.clearInterval(heartbeat);
            channelRef.current = null;
            void supabase.removeChannel(channel);
            cleanup();
        };
    }, [cleanup, initSession, roomId, trackPresence, userId]);

    const loadParticipants = useCallback(async () => {
        const currentUserId = userIdRef.current;
        if (!roomId || !currentUserId) return;
        const { data, error } = await supabase.from('study_room_members').select('user_id,users(full_name)').eq('room_id', roomId);
        if (error) { console.error('[calls] participants load failed:', error); return; }
        type MemberRow = { user_id: string; users: { full_name: string | null } | { full_name: string | null }[] | null };
        setParticipants((current) => (data as MemberRow[] || []).map((row) => {
            const relatedUser = Array.isArray(row.users) ? row.users[0] : row.users;
            const previous = current.find((item) => item.userId === row.user_id);
            return { userId: row.user_id, fullName: relatedUser?.full_name || (row.user_id === currentUserId ? profileNameRef.current : 'طالب مسار'), micEnabled: previous?.micEnabled || false, cameraEnabled: previous?.cameraEnabled || false, isOnline: previous?.isOnline || row.user_id === currentUserId };
        }));
    }, [roomId]);

    const loadParticipantsRef = useRef<(() => Promise<void>) | null>(null);
    useEffect(() => {
        loadParticipantsRef.current = loadParticipants;
    });

    useEffect(() => { micEnabledRef.current = micEnabled; cameraEnabledRef.current = cameraEnabled; void trackPresence(); }, [cameraEnabled, micEnabled, trackPresence]);

    return { participants, remoteStreams, localStream, micEnabled, cameraEnabled, mediaError, cfSessionId, toggleMic, toggleCamera, cleanup, debugInfo };
}
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
    sessionGeneration?: number;
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
    sessionGeneration: number;
    inboundBytes: number;
    outboundBytes: number;
    candidateType: string;
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
    client_instance_id: string;
    session_generation: number;
    session_ready: boolean;
    updated_at: number;
    cf_session_id?: string | null;
    audio_track_id?: string | null;
    video_track_id?: string | null;
    mic_enabled: boolean;
    camera_enabled: boolean;
};

type DesiredRemoteTrack = {
    key: string;
    userId: string;
    sessionId: string;
    generation: number;
    trackName: string;
};

const ICE_CONNECT_TIMEOUT_MS = 10_000;
const ICE_DISCONNECTED_GRACE_MS = 8_000;
const TRACK_DELIVERY_TIMEOUT_MS = 7_000;
const PULL_MAX_ATTEMPTS = 6;
const PULL_RETRY_DELAY_MS = 900;
const PULL_RECONCILE_INTERVAL_MS = 5_000;
const PARTICIPANT_RECONCILE_INTERVAL_MS = 5_000;
const PRESENCE_HEARTBEAT_MS = 10_000;
const STATS_INTERVAL_MS = 5_000;

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
        sessionGeneration: 0,
        inboundBytes: 0,
        outboundBytes: 0,
        candidateType: 'unknown',
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
    const desiredRemoteTracksRef = useRef(new Map<string, DesiredRemoteTrack>());
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
    const sessionGenerationRef = useRef(0);
    const presenceReadyRef = useRef(false);
    const clientInstanceIdRef = useRef(crypto.randomUUID());
    const iceDisconnectedTimerRef = useRef<number | null>(null);
    const lastStatsRef = useRef({ inbound: 0, outbound: 0, stagnantChecks: 0 });
    const timersRef = useRef<number[]>([]);
    const pullRemoteTracksRef = useRef<((remoteSessionId: string, remoteUserId: string, trackNames: string[], remoteGeneration?: number) => Promise<void>) | null>(null);
    const reconcileRemoteTracksRef = useRef<(() => void) | null>(null);
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
                client_instance_id: clientInstanceIdRef.current,
                session_generation: sessionGenerationRef.current,
                session_ready: presenceReadyRef.current,
                updated_at: Date.now(),
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

    const renegotiate = useCallback((operation: () => Promise<void>, generation = sessionGenerationRef.current) => {
        const guardedOperation = async () => {
            if (generation !== sessionGenerationRef.current || cleanedRef.current) return;
            await operation();
        };
        const next = negotiationRef.current.then(guardedOperation, guardedOperation);
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

        pc.oniceconnectionstatechange = () => {
            updateConnectionDebug();
            if (cleanedRef.current || pc !== pcRef.current) return;
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                if (iceDisconnectedTimerRef.current !== null) window.clearTimeout(iceDisconnectedTimerRef.current);
                iceDisconnectedTimerRef.current = null;
                reconcileRemoteTracksRef.current?.();
            } else if (pc.iceConnectionState === 'disconnected' && iceDisconnectedTimerRef.current === null) {
                iceDisconnectedTimerRef.current = window.setTimeout(() => {
                    iceDisconnectedTimerRef.current = null;
                    if (pc === pcRef.current && pc.iceConnectionState === 'disconnected') {
                        pushLog('الاتصال متوقف — محاولة استعادة الجلسة');
                        void refreshSessionRef.current?.('ice-disconnected');
                    }
                }, ICE_DISCONNECTED_GRACE_MS);
            } else if (pc.iceConnectionState === 'failed') {
                void refreshSessionRef.current?.('ice-failed');
            }
        };

        return pc;
    }, [pushLog, updateConnectionDebug]);

    const initSession = useCallback(async (): Promise<string | null> => {
        if (sessionIdRef.current) return sessionIdRef.current;
        if (sessionPromiseRef.current) return sessionPromiseRef.current;
        sessionPromiseRef.current = (async () => {
            try {
                await ensureIceServers();
                const generation = sessionGenerationRef.current + 1;
                sessionGenerationRef.current = generation;
                presenceReadyRef.current = false;
                audioTrackIdRef.current = null;
                videoTrackIdRef.current = null;
                await trackPresence();
                const data = await cloudflare({ action: 'create-session' });
                if (!data.configured || !data.sessionId) throw new Error('Cloudflare Calls is not configured');
                if (cleanedRef.current || !channelRef.current || generation !== sessionGenerationRef.current) return null;
                const pc = createPeerConnection();
                pcRef.current = pc;
                sessionIdRef.current = data.sessionId;
                setCfSessionId(data.sessionId);
                setDebugInfo((current) => ({ ...current, status: 'ready', sessionId: data.sessionId || null, sessionGeneration: generation }));
                log('session created', data.sessionId, 'generation', generation);
                pushLog(`الجلسة جاهزة (${generation})`);
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
        const generation = sessionGenerationRef.current;
        const previous = publishedTracksRef.current.get(kind);
        const existingTrackId = kind === 'audio' ? audioTrackIdRef.current : videoTrackIdRef.current;
        if (previous === track && existingTrackId) return;
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
                if (pc.signalingState !== 'stable') throw new Error(`Cannot publish while signaling state is ${pc.signalingState}`);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                let mid = transceiver.mid;
                if (!mid && offer.sdp) {
                    const midMatches = Array.from(offer.sdp.matchAll(/a=mid:(\S+)/g));
                    if (midMatches.length > 0) mid = midMatches[midMatches.length - 1][1];
                }

                const data = await cloudflare({ action: 'new-track', sessionId, trackId: trackName, mid: mid || '0', sdp: pc.localDescription });
                if (generation !== sessionGenerationRef.current || pc !== pcRef.current) return;
                if (data.sessionDescription) await pc.setRemoteDescription(data.sessionDescription);
            }, generation);

            if (generation !== sessionGenerationRef.current || pc !== pcRef.current) return;
            if (kind === 'audio') audioTrackIdRef.current = trackName;
            else videoTrackIdRef.current = trackName;
            log('published', kind, trackName);
            pushLog(`${kind === 'audio' ? 'الميكروفون' : 'الكاميرا'} بُثّت`);

            const connected = await waitForIceConnected(pc, ICE_CONNECT_TIMEOUT_MS);
            setDebugInfo((current) => ({ ...current, published: { ...current.published, [kind]: true } }));
            await trackPresence();
            if (!connected) {
                console.warn('[calls] ICE is still connecting after publish', kind);
                pushLog('اتصال ICE بطيء — تستمر محاولة الاتصال');
            }
        })();

        publishInFlightRef.current.set(kind, publishPromise);
        try {
            await publishPromise;
        } finally {
            publishInFlightRef.current.delete(kind);
        }
    }, [cloudflare, initSession, log, pushLog, renegotiate, trackPresence, waitForIceConnected]);

    const pullRemoteTracks = useCallback(async (remoteSessionId: string, remoteUserId: string, trackNames: string[], remoteGeneration = 0) => {
        const sessionId = (sessionIdRef.current || await initSession());
        const pc = pcRef.current;
        const localGeneration = sessionGenerationRef.current;
        if (!sessionId || !pc || cleanedRef.current) return;

        const names = trackNames.filter((name) => {
            const key = `${remoteSessionId}:${name}`;
            const desired = desiredRemoteTracksRef.current.get(key);
            return name && !pulledTracksRef.current.has(key) && (!desired || desired.generation === remoteGeneration);
        });
        if (!names.length) return;
        names.forEach((name) => pulledTracksRef.current.add(`${remoteSessionId}:${name}`));
        setDebugInfo((current) => ({ ...current, pulledTracks: current.pulledTracks + names.length }));

        try {
            const midByTrack = new Map<string, string>();
            const failedNames: string[] = [];
            await renegotiate(async () => {
                if (pc.signalingState !== 'stable') throw new Error(`Cannot pull while signaling state is ${pc.signalingState}`);
                const data = await cloudflare({ action: 'pull-tracks', sessionId, tracks: names.map((trackName) => ({ location: 'remote', sessionId: remoteSessionId, trackName })) });
                if (localGeneration !== sessionGenerationRef.current || pc !== pcRef.current) return;
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
            }, localGeneration);

            if (midByTrack.size > 0) {
                await Promise.all([...midByTrack.values()].map((mid) => waitForTrackDelivery(mid, TRACK_DELIVERY_TIMEOUT_MS)));
                await waitForIceConnected(pc, ICE_CONNECT_TIMEOUT_MS);
            }
            const retryNames = [...new Set([...failedNames, ...names.filter((name) => {
                const mid = midByTrack.get(name);
                return !mid || !deliveredMidsRef.current.has(mid);
            })])];
            retryNames.forEach((name) => pulledTracksRef.current.delete(`${remoteSessionId}:${name}`));
            if (retryNames.length) {
                const attempt = Math.max(...retryNames.map((name) => pullAttemptsRef.current.get(`${remoteSessionId}:${name}`) || 0));
                retryNames.forEach((name) => pullAttemptsRef.current.set(`${remoteSessionId}:${name}`, attempt + 1));
                const delay = Math.min(15_000, PULL_RETRY_DELAY_MS * 2 ** Math.min(attempt, PULL_MAX_ATTEMPTS)) + Math.floor(Math.random() * 350);
                if (attempt === PULL_MAX_ATTEMPTS) pushLog('تعذّر مسار مؤقتاً — تستمر الاستعادة تلقائياً');
                scheduleTimer(() => reconcileRemoteTracksRef.current?.(), delay);
            }
        } catch (error) {
            names.forEach((name) => {
                const key = `${remoteSessionId}:${name}`;
                pulledTracksRef.current.delete(key);
                pullAttemptsRef.current.set(key, (pullAttemptsRef.current.get(key) || 0) + 1);
            });
            const failure = error as Error & { code?: string };
            if (failure.code === 'session_error') {
                pushLog('انتهت الجلسة — إعادة إنشائها');
                void refreshSessionRef.current?.('session-error');
            } else {
                console.warn('[calls] pull failed, reconciliation will retry:', failure.code || failure.message);
                scheduleTimer(() => reconcileRemoteTracksRef.current?.(), PULL_RETRY_DELAY_MS + Math.floor(Math.random() * 350));
            }
        }
    }, [cloudflare, initSession, pushLog, renegotiate, scheduleTimer, waitForIceConnected, waitForTrackDelivery]);

    useEffect(() => { pullRemoteTracksRef.current = pullRemoteTracks; });

    const reconcileRemoteTracks = useCallback(() => {
        if (cleanedRef.current || !navigator.onLine) return;
        desiredRemoteTracksRef.current.forEach((descriptor) => {
            if (!pulledTracksRef.current.has(descriptor.key)) void pullRemoteTracksRef.current?.(descriptor.sessionId, descriptor.userId, [descriptor.trackName], descriptor.generation);
        });
    }, []);

    useEffect(() => { reconcileRemoteTracksRef.current = reconcileRemoteTracks; }, [reconcileRemoteTracks]);

    const applyPresence = useCallback((channel: ReturnType<typeof supabase.channel>) => {
        const state = channel.presenceState() as Record<string, PresencePayload[]>;
        const onlineMap = new Map<string, PresencePayload>();
        Object.entries(state).forEach(([key, values]) => {
            const value = [...(values || [])].sort((a, b) => ((b.session_generation || 0) - (a.session_generation || 0)) || ((b.updated_at || 0) - (a.updated_at || 0)))[0];
            if (!value) return;
            const presenceUserId = value.user_id || key;
            const current = onlineMap.get(presenceUserId);
            if (!current || (value.session_generation || 0) > (current.session_generation || 0) || ((value.session_generation || 0) === (current.session_generation || 0) && (value.updated_at || 0) > (current.updated_at || 0))) {
                onlineMap.set(presenceUserId, value);
            }
        });

        const nextDesired = new Map<string, DesiredRemoteTrack>();
        onlineMap.forEach((presence, presenceUserId) => {
            const sessionReady = presence.session_ready ?? Boolean(presence.cf_session_id);
            if (presenceUserId === userId || !sessionReady || !presence.cf_session_id) return;
            [presence.audio_track_id, presence.video_track_id].filter((name): name is string => !!name).forEach((trackName) => {
                const key = `${presence.cf_session_id}:${trackName}`;
                nextDesired.set(key, { key, userId: presenceUserId, sessionId: presence.cf_session_id!, generation: presence.session_generation || 0, trackName });
            });
        });
        const usersWithReplacedSessions = new Set<string>();
        desiredRemoteTracksRef.current.forEach((descriptor, key) => {
            if (!nextDesired.has(key)) {
                pulledTracksRef.current.delete(key);
                pullAttemptsRef.current.delete(key);
                const replacement = [...nextDesired.values()].find((next) => next.userId === descriptor.userId);
                if (!replacement || replacement.sessionId !== descriptor.sessionId) usersWithReplacedSessions.add(descriptor.userId);
            }
        });
        if (usersWithReplacedSessions.size) {
            setRemoteStreams((current) => current.filter((stream) => !usersWithReplacedSessions.has(stream.userId)));
        }
        desiredRemoteTracksRef.current = nextDesired;

        setParticipants((current) => {
            const updated = [...current];
            const currentIds = new Set(current.map((participant) => participant.userId));
            onlineMap.forEach((presence, presenceUserId) => {
                if (!currentIds.has(presenceUserId)) updated.push({ userId: presenceUserId, fullName: presence.full_name || 'طالب مسار', micEnabled: presence.mic_enabled || false, cameraEnabled: presence.camera_enabled || false, isOnline: true, cfSessionId: presence.cf_session_id || undefined, audioTrackId: presence.audio_track_id || undefined, videoTrackId: presence.video_track_id || undefined, sessionGeneration: presence.session_generation || 0 });
            });
            return updated.map((participant) => {
                const presence = onlineMap.get(participant.userId);
                if (!presence) return { ...participant, isOnline: false };
                return { ...participant, fullName: presence.full_name || participant.fullName, isOnline: true, micEnabled: participant.userId === userId ? micEnabledRef.current : presence.mic_enabled, cameraEnabled: participant.userId === userId ? cameraEnabledRef.current : presence.camera_enabled, cfSessionId: presence.cf_session_id || undefined, audioTrackId: presence.audio_track_id || undefined, videoTrackId: presence.video_track_id || undefined, sessionGeneration: presence.session_generation || 0 };
            });
        });
        reconcileRemoteTracks();
    }, [reconcileRemoteTracks, userId]);

    useEffect(() => {
        applyPresenceRef.current = applyPresence;
    });

    const refreshSession = useCallback(async (reason?: string) => {
        if (refreshingRef.current) return sessionIdRef.current;
        if (cleanedRef.current) return null;
        refreshingRef.current = true;
        log('refreshing session:', reason || 'unknown');
        const liveTracks = [...publishedTracksRef.current.entries()].filter(([, track]) => track.readyState === 'live');
        try {
            presenceReadyRef.current = false;
            audioTrackIdRef.current = null;
            videoTrackIdRef.current = null;
            await trackPresence();
            pcRef.current?.close();
            pcRef.current = null;
            sessionIdRef.current = null;
            setCfSessionId(null);
            pulledTracksRef.current.clear();
            pullAttemptsRef.current.clear();
            trackToUserRef.current.clear();
            deliveredMidsRef.current.clear();
            setRemoteStreams([]);
            publishedTracksRef.current.clear();
            setDebugInfo((current) => ({ ...current, status: 'connecting', sessionId: null, pulledTracks: 0, published: { audio: false, video: false } }));

            const sessionId = await initSession();
            if (!sessionId) return null;
            for (const [kind, track] of liveTracks) await publishTrackRef.current?.(track, kind);
            presenceReadyRef.current = true;
            await trackPresence();
            const channel = channelRef.current;
            if (channel && pcRef.current) applyPresenceRef.current?.(channel);
            reconcileRemoteTracksRef.current?.();
            return sessionId;
        } catch (error) {
            console.error('[calls] session refresh failed:', error);
            pushLog('تعذّرت استعادة الجلسة — ستتم المحاولة مجدداً');
            scheduleTimer(() => void refreshSessionRef.current?.('refresh-retry'), 3_000);
            return null;
        } finally {
            refreshingRef.current = false;
        }
    }, [initSession, log, pushLog, scheduleTimer, trackPresence]);

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
            case 'AbortError': return `استغرق تشغيل ${device} وقتاً طويلاً. أغلق التطبيقات الأخرى التي تستخدمه ثم حاول مجدداً.`;
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
                await closeLocalTrack(kind);
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
                void closeLocalTrack(kind);
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
            setDebugInfo((current) => ({ ...current, published: { ...current.published, [kind]: Boolean(kind === 'audio' ? audioTrackIdRef.current : videoTrackIdRef.current) } }));
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
        // Muting keeps the Cloudflare publication alive. Presence advertises availability
        // separately from the enabled state, so unmuting never loses the track identity.
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
        desiredRemoteTracksRef.current.clear();
        pullAttemptsRef.current.clear();
        trackToUserRef.current.clear();
        requestingMediaRef.current.clear();
        deliveredMidsRef.current.clear();
        micEnabledRef.current = false;
        cameraEnabledRef.current = false;
        presenceReadyRef.current = false;
        if (iceDisconnectedTimerRef.current !== null) window.clearTimeout(iceDisconnectedTimerRef.current);
        iceDisconnectedTimerRef.current = null;
        setRemoteStreams([]);
        setMicEnabled(false);
        setCameraEnabled(false);
        setDebugInfo((current) => ({ ...current, status: 'idle', sessionId: null, connectionState: 'new', iceConnectionState: 'new', published: { audio: false, video: false }, pulledTracks: 0, sessionGeneration: 0, inboundBytes: 0, outboundBytes: 0, candidateType: 'unknown', logs: [] }));
    }, [localVideoRef]);

    useEffect(() => {
        profileNameRef.current = profileName;
        userIdRef.current = userId;
    }, [profileName, userId]);

    useEffect(() => {
        if (!roomId || !userId) return;
        let active = true;
        let initialized = false;
        cleanedRef.current = false;
        const channel = supabase.channel(`cf-room:${roomId}`, { config: { presence: { key: `${userId}:${clientInstanceIdRef.current}` } } });
        channelRef.current = channel;
        const refreshParticipants = () => {
            if (active) void loadParticipantsRef.current?.();
        };
        channel.on('presence', { event: 'sync' }, () => {
            if (!active) return;
            applyPresenceRef.current?.(channel);
            refreshParticipants();
        })
            .on('presence', { event: 'join' }, refreshParticipants)
            .on('presence', { event: 'leave' }, refreshParticipants)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_members', filter: `room_id=eq.${roomId}` }, refreshParticipants)
            .subscribe(async (status) => {
                if (status !== 'SUBSCRIBED' || !active) return;
                setDebugInfo((current) => ({ ...current, status: initialized ? current.status : 'connecting' }));
                await loadParticipantsRef.current?.();
                if (!initialized) {
                    await initSession();
                    initialized = true;
                }
                presenceReadyRef.current = Boolean(sessionIdRef.current);
                await trackPresence();
                if (active && channelRef.current) applyPresenceRef.current?.(channel);
            });

        const heartbeat = window.setInterval(() => {
            if (active) void trackPresence();
        }, PRESENCE_HEARTBEAT_MS);
        const reconciliation = window.setInterval(() => {
            if (active) reconcileRemoteTracksRef.current?.();
        }, PULL_RECONCILE_INTERVAL_MS);
        const participantReconciliation = window.setInterval(refreshParticipants, PARTICIPANT_RECONCILE_INTERVAL_MS);
        timersRef.current.push(heartbeat, reconciliation, participantReconciliation);

        return () => {
            active = false;
            window.clearInterval(heartbeat);
            window.clearInterval(reconciliation);
            window.clearInterval(participantReconciliation);
            channelRef.current = null;
            void supabase.removeChannel(channel);
            cleanup();
        };
    }, [cleanup, initSession, roomId, trackPresence, userId]);

    useEffect(() => {
        if (!roomId || !userId) return;
        const recover = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                const channel = channelRef.current;
                if (channel) applyPresenceRef.current?.(channel);
                void loadParticipantsRef.current?.();
                void trackPresence();
                reconcileRemoteTracksRef.current?.();
            }
        };
        const handleOffline = () => pushLog('انقطع اتصال الشبكة — بانتظار عودته');
        window.addEventListener('online', recover);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', recover);
        return () => {
            window.removeEventListener('online', recover);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', recover);
        };
    }, [pushLog, roomId, trackPresence, userId]);

    useEffect(() => {
        if (!roomId || !userId) return;
        const statsTimer = window.setInterval(async () => {
            const pc = pcRef.current;
            if (!pc || pc.connectionState === 'closed') return;
            try {
                const reports = await pc.getStats();
                let inbound = 0;
                let outbound = 0;
                let candidateType = 'unknown';
                reports.forEach((report) => {
                    if (report.type === 'inbound-rtp' && !report.isRemote) inbound += Number(report.bytesReceived || 0);
                    if (report.type === 'outbound-rtp' && !report.isRemote) outbound += Number(report.bytesSent || 0);
                    if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
                        const localCandidate = reports.get(report.localCandidateId);
                        if (localCandidate?.candidateType) candidateType = localCandidate.candidateType;
                    }
                });
                const previous = lastStatsRef.current;
                const expectsInbound = desiredRemoteTracksRef.current.size > 0;
                const stagnantChecks = expectsInbound && inbound <= previous.inbound ? previous.stagnantChecks + 1 : 0;
                lastStatsRef.current = { inbound, outbound, stagnantChecks };
                setDebugInfo((current) => ({ ...current, inboundBytes: inbound, outboundBytes: outbound, candidateType }));
                // Byte counters are diagnostic only: a muted participant can legitimately
                // produce no inbound bytes, so delivery and ICE state drive recovery.
            } catch (error) {
                console.warn('[calls] stats collection failed:', error);
            }
        }, STATS_INTERVAL_MS);
        return () => window.clearInterval(statsTimer);
    }, [pushLog, roomId, userId]);

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
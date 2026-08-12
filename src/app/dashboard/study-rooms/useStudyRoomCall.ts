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

interface UseStudyRoomCallOptions {
    roomId: string | null;
    userId: string | null;
    profileName?: string;
    localVideoRef: RefObject<HTMLVideoElement | null>;
}

type CloudflareTrack = { mid?: string; trackName?: string; errorCode?: string; errorDescription?: string };
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

export function useStudyRoomCall({ roomId, userId, profileName = 'طالب مسار', localVideoRef }: UseStudyRoomCallOptions) {
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<RemoteRoomStream[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [mediaError, setMediaError] = useState('');
    const [cfSessionId, setCfSessionId] = useState<string | null>(null);

    const localStreamRef = useRef<MediaStream | null>(null);
    const profileNameRef = useRef(profileName);
    const userIdRef = useRef(userId);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
    const publishedTracksRef = useRef(new Map<'audio' | 'video', MediaStreamTrack>());
    const pulledTracksRef = useRef(new Set<string>());
    const pullAttemptsRef = useRef(new Map<string, number>());
    const deliveredMidsRef = useRef(new Set<string>());
    const trackToUserRef = useRef(new Map<string, string>());
    const negotiationRef = useRef(Promise.resolve());
    const micEnabledRef = useRef(false);
    const cameraEnabledRef = useRef(false);
    const audioTrackIdRef = useRef<string | null>(null);
    const videoTrackIdRef = useRef<string | null>(null);
    const requestingMediaRef = useRef(new Set<'audio' | 'video'>());
    const refreshingRef = useRef(false);
    const cleanedRef = useRef(false);
    const timersRef = useRef<number[]>([]);
    const pullRemoteTracksRef = useRef<((remoteSessionId: string, remoteUserId: string, trackNames: string[]) => Promise<void>) | null>(null);
    const refreshSessionRef = useRef<((reason?: string) => Promise<string | null>) | null>(null);
    const publishTrackRef = useRef<(track: MediaStreamTrack, kind: 'audio' | 'video') => Promise<void>>(null);

    const log = useCallback((...args: unknown[]) => { console.info('[calls]', ...args); }, []);

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

    const cloudflare = useCallback(async (body: Record<string, unknown>) => {
        const response = await fetch('/api/cloudflare/calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error) {
            const error = new Error(data.error || 'Cloudflare Calls request failed') as Error & { code?: string };
            if (data.errorCode) error.code = data.errorCode;
            throw error;
        }
        return data as { sessionId?: string; sessionDescription?: RTCSessionDescriptionInit; tracks?: CloudflareTrack[]; configured?: boolean };
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

    const createPeerConnection = useCallback((): RTCPeerConnection => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], bundlePolicy: 'max-bundle' });

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
            if (cleanedRef.current || pc !== pcRef.current) return;
            if (pc.connectionState === 'failed') {
                console.warn('[calls] peer connection failed, refreshing session');
                void refreshSessionRef.current?.('peer-connection-failed');
            }
        };

        return pc;
    }, []);

    const initSession = useCallback(async (): Promise<string | null> => {
        if (sessionIdRef.current) return sessionIdRef.current;
        if (sessionPromiseRef.current) return sessionPromiseRef.current;
        sessionPromiseRef.current = (async () => {
            try {
                const data = await cloudflare({ action: 'create-session' });
                if (!data.configured || !data.sessionId) throw new Error('Cloudflare Calls is not configured');
                if (cleanedRef.current || !channelRef.current) return null;
                const pc = createPeerConnection();
                pcRef.current = pc;
                sessionIdRef.current = data.sessionId;
                setCfSessionId(data.sessionId);
                log('session created', data.sessionId);
                await trackPresence();
                return data.sessionId;
            } catch (error) {
                console.error('[calls] session init failed:', error);
                setMediaError('تعذر تشغيل خدمة الاتصال. تأكد من إعداد Cloudflare Calls ثم أعد المحاولة.');
                return null;
            } finally {
                sessionPromiseRef.current = null;
            }
        })();
        return sessionPromiseRef.current;
    }, [cloudflare, createPeerConnection, log, trackPresence]);

    const publishTrack = useCallback(async (track: MediaStreamTrack, kind: 'audio' | 'video') => {
        const sessionId = (sessionIdRef.current || await initSession());
        const pc = pcRef.current;
        if (!sessionId || !pc || cleanedRef.current) return;

        publishedTracksRef.current.set(kind, track);

        if (audioTrackIdRef.current && kind === 'audio') audioTrackIdRef.current = null;
        if (videoTrackIdRef.current && kind === 'video') videoTrackIdRef.current = null;
        const previous = pc.getTransceivers().filter((t) => t.sender && t.sender.track === track);
        previous.forEach((t) => { try { pc.removeTrack(t.sender); } catch { /* noop */ } });

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

        const connected = await waitForIceConnected(pc, ICE_CONNECT_TIMEOUT_MS);
        await trackPresence();
        if (!connected) {
            console.warn('[calls] ICE did not connect after publish, refreshing session', kind);
            void refreshSessionRef.current?.('publish-ice-timeout');
        }
    }, [cloudflare, initSession, log, renegotiate, trackPresence, waitForIceConnected]);

    const pullRemoteTracks = useCallback(async (remoteSessionId: string, remoteUserId: string, trackNames: string[]) => {
        const sessionId = (sessionIdRef.current || await initSession());
        const pc = pcRef.current;
        if (!sessionId || !pc || cleanedRef.current) return;

        const names = trackNames.filter((name) => name && !pulledTracksRef.current.has(`${remoteSessionId}:${name}`));
        if (!names.length) return;
        names.forEach((name) => pulledTracksRef.current.add(`${remoteSessionId}:${name}`));

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
                    if (maxAttempt > 0 && !refreshingRef.current) log('retrying (attempt', `${maxAttempt + 1}/${PULL_MAX_ATTEMPTS})`, retryNames.map((n) => n.split('-').slice(-1)[0]));
                    scheduleTimer(() => { if (pcRef.current) void pullRemoteTracksRef.current?.(remoteSessionId, remoteUserId, retryNames); }, PULL_RETRY_DELAY_MS * (maxAttempt + 1));
                } else {
                    console.warn('[calls] giving up on tracks after', PULL_MAX_ATTEMPTS, 'attempts:', remoteUserId.slice(0, 8), retryNames.map((n) => n.split('-').slice(-1)[0]));
                }
            }
        } catch (error) {
            names.forEach((name) => pulledTracksRef.current.delete(`${remoteSessionId}:${name}`));
            const failure = error as Error & { code?: string };
            console.warn('[calls] pull failed (will retry on next presence sync):', failure.code || failure.message);
        }
    }, [cloudflare, initSession, log, renegotiate, scheduleTimer, waitForIceConnected, waitForTrackDelivery]);

    useEffect(() => {
        pullRemoteTracksRef.current = pullRemoteTracks;
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

    const applyPresenceRef = useRef<((channel: ReturnType<typeof supabase.channel>) => void) | null>(null);
    useEffect(() => {
        applyPresenceRef.current = applyPresence;
    });

    const enableMedia = useCallback(async (kind: 'audio' | 'video') => {
        if (requestingMediaRef.current.has(kind)) return;
        requestingMediaRef.current.add(kind);
        setMediaError('');

        try {
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
                    micEnabledRef.current = false;
                    setMicEnabled(false);
                } else {
                    cameraEnabledRef.current = false;
                    setCameraEnabled(false);
                }
                void trackPresence();
            }, { once: true });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                await localVideoRef.current.play().catch(() => undefined);
            }

            try {
                await publishTrackRef.current?.(track, kind);
            } catch (error) {
                console.error(`[calls] ${kind} publish failed:`, error);
                void trackPresence();
                setMediaError('تم تشغيل الجهاز محلياً، لكن تعذر بثه إلى بقية المشاركين. حاول مرة أخرى بعد لحظات.');
            }
        } catch (error) {
            console.error('[calls] media permission failed:', error);
            setMediaError('لم نتمكن من الوصول إلى الميكروفون أو الكاميرا. اسمح بالصلاحيات من شريط المتصفح ثم حاول مجدداً.');
        } finally {
            requestingMediaRef.current.delete(kind);
        }
    }, [localVideoRef, trackPresence]);

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
        publishedTracksRef.current.clear();
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
                    await loadParticipantsRef.current?.();
                    await initSession();
                    await trackPresence();
                    if (active && channelRef.current) applyPresenceRef.current?.(channel);
                }
            });
        return () => {
            active = false;
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

    return { participants, remoteStreams, localStream, micEnabled, cameraEnabled, mediaError, cfSessionId, toggleMic, toggleCamera, cleanup };
}
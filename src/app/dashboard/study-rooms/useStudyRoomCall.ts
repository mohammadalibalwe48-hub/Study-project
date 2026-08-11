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

type CloudflareTrack = { mid?: string; trackName?: string };
type PresencePayload = {
    user_id: string;
    full_name: string;
    cf_session_id?: string | null;
    audio_track_id?: string | null;
    video_track_id?: string | null;
    mic_enabled: boolean;
    camera_enabled: boolean;
};

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
    const publishedTracksRef = useRef(new Set<string>());
    const pulledTracksRef = useRef(new Set<string>());
    const trackToUserRef = useRef(new Map<string, string>());
    const negotiationRef = useRef(Promise.resolve());
    const micEnabledRef = useRef(false);
    const cameraEnabledRef = useRef(false);
    const audioTrackIdRef = useRef<string | null>(null);
    const videoTrackIdRef = useRef<string | null>(null);
    const requestingMediaRef = useRef(new Set<'audio' | 'video'>());

    const trackPresence = useCallback(async () => {
        const currentUserId = userIdRef.current;
        if (!channelRef.current || !currentUserId) return;
        await channelRef.current.track({
            user_id: currentUserId,
            full_name: profileNameRef.current,
            cf_session_id: sessionIdRef.current,
            audio_track_id: audioTrackIdRef.current,
            video_track_id: videoTrackIdRef.current,
            mic_enabled: micEnabledRef.current,
            camera_enabled: cameraEnabledRef.current,
        } satisfies PresencePayload);
    }, []);

    const cloudflare = useCallback(async (body: Record<string, unknown>) => {
        const response = await fetch('/api/cloudflare/calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error) throw new Error(data.error || 'Cloudflare Calls request failed');
        return data as { sessionId?: string; sessionDescription?: RTCSessionDescriptionInit; tracks?: CloudflareTrack[]; configured?: boolean };
    }, []);

    const renegotiate = useCallback((operation: () => Promise<void>) => {
        const next = negotiationRef.current.then(operation, operation);
        negotiationRef.current = next.catch(() => undefined);
        return next;
    }, []);

    const initSession = useCallback(async () => {
        try {
            const data = await cloudflare({ action: 'create-session' });
            if (!data.configured || !data.sessionId) throw new Error('Cloudflare Calls is not configured');
            if (!channelRef.current) return null;
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }] });
            
            pc.ontrack = (event) => {
                const stream = event.streams[0] || new MediaStream([event.track]);
                const mid = event.transceiver?.mid || '';
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

            pcRef.current = pc;
            sessionIdRef.current = data.sessionId;
            setCfSessionId(data.sessionId);
            await trackPresence();
            return data.sessionId;
        } catch (error) {
            console.error('Cloudflare Calls init failed:', error);
            setMediaError('تعذر تشغيل خدمة الاتصال. تأكد من إعداد Cloudflare Calls ثم أعد المحاولة.');
            return null;
        }
    }, [cloudflare, trackPresence]);

    const publishTrack = useCallback(async (track: MediaStreamTrack, kind: 'audio' | 'video') => {
        let sessionId = sessionIdRef.current;
        let pc = pcRef.current;
        if (!sessionId || !pc) {
            sessionId = await initSession();
            pc = pcRef.current;
        }
        if (!sessionId || !pc || publishedTracksRef.current.has(track.id)) return;

        const trackName = `${userIdRef.current}-${kind}-${crypto.randomUUID()}`;
        const sender = pc.addTrack(track, localStreamRef.current || new MediaStream([track]));
        
        await renegotiate(async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            const transceiver = pc.getTransceivers().find((t) => t.sender === sender || t.sender?.track === track);
            let mid = transceiver?.mid;
            
            if (!mid && offer.sdp) {
                const midMatches = Array.from(offer.sdp.matchAll(/a=mid:(\S+)/g));
                if (midMatches.length > 0) {
                    mid = midMatches[midMatches.length - 1][1];
                }
            }
            if (!mid) mid = '0';

            const data = await cloudflare({ action: 'new-track', sessionId, trackId: trackName, mid, sdp: pc.localDescription });
            if (data.sessionDescription) await pc.setRemoteDescription(data.sessionDescription);
        });

        publishedTracksRef.current.add(track.id);
        if (kind === 'audio') audioTrackIdRef.current = trackName;
        else videoTrackIdRef.current = trackName;
        await trackPresence();
    }, [cloudflare, initSession, renegotiate, trackPresence]);

    const pullRemoteTrack = useCallback(async (remoteSessionId: string, trackName: string, remoteUserId: string) => {
        let sessionId = sessionIdRef.current;
        let pc = pcRef.current;
        if (!sessionId || !pc) {
            sessionId = await initSession();
            pc = pcRef.current;
        }
        if (!sessionId || !pc || !trackName || pulledTracksRef.current.has(`${remoteSessionId}:${trackName}`)) return;
        pulledTracksRef.current.add(`${remoteSessionId}:${trackName}`);
        try {
            await renegotiate(async () => {
                const kind = trackName.includes('-video-') ? 'video' : 'audio';
                pc.addTransceiver(kind, { direction: 'recvonly' });
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                const data = await cloudflare({ action: 'pull-tracks', sessionId, tracks: [{ location: 'remote', sessionId: remoteSessionId, trackName }], sdp: pc.localDescription });
                
                (data.tracks || []).forEach((track) => {
                    if (track.mid) trackToUserRef.current.set(track.mid, remoteUserId);
                    if (track.trackName) trackToUserRef.current.set(track.trackName, remoteUserId);
                });

                if (data.sessionDescription) {
                    await pc.setRemoteDescription(data.sessionDescription);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await cloudflare({ action: 'renegotiate', sessionId, sdp: pc.localDescription });
                }
            });
        } catch (error) {
            pulledTracksRef.current.delete(`${remoteSessionId}:${trackName}`);
            console.error('Cloudflare remote track pull failed:', error);
        }
    }, [cloudflare, initSession, renegotiate]);

    const loadParticipants = useCallback(async () => {
        const currentUserId = userIdRef.current;
        if (!roomId || !currentUserId) return;
        const { data, error } = await supabase.from('study_room_members').select('user_id,users(full_name)').eq('room_id', roomId);
        if (error) { console.error('Participants load failed:', error); return; }
        type MemberRow = { user_id: string; users: { full_name: string | null } | { full_name: string | null }[] | null };
        setParticipants((current) => (data as MemberRow[] || []).map((row) => {
            const relatedUser = Array.isArray(row.users) ? row.users[0] : row.users;
            const previous = current.find((item) => item.userId === row.user_id);
            return { userId: row.user_id, fullName: relatedUser?.full_name || (row.user_id === currentUserId ? profileNameRef.current : 'طالب مسار'), micEnabled: previous?.micEnabled || false, cameraEnabled: previous?.cameraEnabled || false, isOnline: previous?.isOnline || row.user_id === currentUserId };
        }));
    }, [roomId]);

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
                    if (presence.audio_track_id) void pullRemoteTrack(presence.cf_session_id, presence.audio_track_id, participant.userId);
                    if (presence.video_track_id) void pullRemoteTrack(presence.cf_session_id, presence.video_track_id, participant.userId);
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
    }, [pullRemoteTrack, userId]);

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
            await trackPresence();

            try {
                await publishTrack(track, kind);
            } catch (error) {
                console.error(`Cloudflare ${kind} publish failed:`, error);
                setMediaError('تم تشغيل الجهاز محلياً، لكن تعذر بثه إلى بقية المشاركين. حاول مرة أخرى بعد لحظات.');
            }
        } catch (error) {
            console.error('Media permission failed:', error);
            setMediaError('لم نتمكن من الوصول إلى الميكروفون أو الكاميرا. اسمح بالصلاحيات من شريط المتصفح ثم حاول مجدداً.');
        } finally {
            requestingMediaRef.current.delete(kind);
        }
    }, [localVideoRef, publishTrack, trackPresence]);

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

    const cleanup = useCallback(async () => {
        if (channelRef.current) await channelRef.current.untrack();
        localStreamRef.current?.getTracks().forEach((track) => track.stop()); localStreamRef.current = null; setLocalStream(null);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        pcRef.current?.close(); pcRef.current = null; sessionIdRef.current = null; setCfSessionId(null);
        publishedTracksRef.current.clear(); pulledTracksRef.current.clear(); trackToUserRef.current.clear(); requestingMediaRef.current.clear();
        micEnabledRef.current = false; cameraEnabledRef.current = false; setRemoteStreams([]); setMicEnabled(false); setCameraEnabled(false);
    }, [localVideoRef]);

    useEffect(() => {
        profileNameRef.current = profileName;
        userIdRef.current = userId;
    }, [profileName, userId]);

    useEffect(() => {
        if (!roomId || !userId) return;
        let active = true;
        const channel = supabase.channel(`cf-room:${roomId}`, { config: { presence: { key: userId } } });
        channelRef.current = channel;
        channel.on('presence', { event: 'sync' }, () => { if (active) applyPresence(channel); }).on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_members', filter: `room_id=eq.${roomId}` }, () => void loadParticipants()).subscribe(async (status) => { if (status === 'SUBSCRIBED') { await loadParticipants(); await initSession(); await trackPresence(); if (active && channelRef.current) applyPresence(channel); } });
        return () => { active = false; channelRef.current = null; void supabase.removeChannel(channel); void cleanup(); };
    }, [applyPresence, cleanup, initSession, loadParticipants, roomId, trackPresence, userId]);

    useEffect(() => { micEnabledRef.current = micEnabled; cameraEnabledRef.current = cameraEnabled; void trackPresence(); }, [cameraEnabled, micEnabled, trackPresence]);

    return { participants, remoteStreams, localStream, micEnabled, cameraEnabled, mediaError, cfSessionId, toggleMic, toggleCamera, cleanup };
}


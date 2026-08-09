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

export function useStudyRoomCall({ roomId, userId, profileName = 'طالب مسار', localVideoRef }: UseStudyRoomCallOptions) {
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<RemoteRoomStream[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [mediaError, setMediaError] = useState('');
    const [cfSessionId, setCfSessionId] = useState<string | null>(null);

    const localStreamRef = useRef<MediaStream | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const pulledTracksRef = useRef<Set<string>>(new Set());
    const trackToUserMapRef = useRef<Map<string, string>>(new Map());

    const micEnabledRef = useRef(micEnabled);
    const cameraEnabledRef = useRef(cameraEnabled);
    const audioTrackIdRef = useRef<string | null>(null);
    const videoTrackIdRef = useRef<string | null>(null);
    const cfSessionIdRef = useRef<string | null>(cfSessionId);

    useEffect(() => {
        micEnabledRef.current = micEnabled;
        cameraEnabledRef.current = cameraEnabled;
        cfSessionIdRef.current = cfSessionId;
    }, [micEnabled, cameraEnabled, cfSessionId]);

    // 1. Initialize Cloudflare Calls SFU WebRTC Session
    const initCloudflareSession = useCallback(async () => {
        try {
            const res = await fetch('/api/cloudflare/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-session' }),
            });
            const data = await res.json();

            if (!data.configured || !data.sessionId) {
                setMediaError('Cloudflare Calls API keys error. Check Vercel environment variables.');
                return null;
            }

            const sessionId = data.sessionId as string;
            setCfSessionId(sessionId);

            // Create RTCPeerConnection connected to Cloudflare SFU
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.cloudflare.com:3478' },
                    { urls: 'stun:stun.l.google.com:19302' },
                ],
            });

            pc.ontrack = (event) => {
                const stream = event.streams[0] || new MediaStream([event.track]);
                const trackId = event.track.id;
                const remoteUserId = trackToUserMapRef.current.get(trackId) || trackId;

                setRemoteStreams((current) => {
                    const filtered = current.filter((s) => s.userId !== remoteUserId && s.stream.id !== stream.id);
                    return [...filtered, { userId: remoteUserId, stream }];
                });
            };

            pcRef.current = pc;

            // Set remote offer from Cloudflare and send local answer
            if (data.sessionDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await fetch('/api/cloudflare/calls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'renegotiate',
                        sessionId,
                        sdp: answer,
                    }),
                });
            }

            return sessionId;
        } catch (err) {
            console.error('Cloudflare Calls Init Error:', err);
            setMediaError('تعذر الاتصال بخادم Cloudflare Calls. حاول مجدداً.');
            return null;
        }
    }, []);

    // 2. Publish local mic/camera track to Cloudflare SFU
    const publishTrackToCloudflare = useCallback(async (track: MediaStreamTrack, trackType: 'audio' | 'video') => {
        if (!cfSessionId || !pcRef.current) return null;

        try {
            const trackName = `${userId}_${trackType}_${Date.now()}`;
            pcRef.current.addTrack(track, localStreamRef.current!);

            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);

            const res = await fetch('/api/cloudflare/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'new-track',
                    sessionId: cfSessionId,
                    trackId: trackName,
                }),
            });

            const data = await res.json();
            if (data.sessionDescription) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
            }

            if (trackType === 'audio') audioTrackIdRef.current = trackName;
            if (trackType === 'video') videoTrackIdRef.current = trackName;

            return trackName;
        } catch (err) {
            console.error('Cloudflare Publish Track Error:', err);
            return null;
        }
    }, [cfSessionId, userId]);

    // 3. Pull remote tracks from Cloudflare Calls SFU
    const pullRemoteTrack = useCallback(async (remoteSessionId: string, trackName: string, remoteUserId: string) => {
        if (!cfSessionId || !pcRef.current || pulledTracksRef.current.has(trackName)) return;

        try {
            pulledTracksRef.current.add(trackName);

            const res = await fetch('/api/cloudflare/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'pull-tracks',
                    sessionId: cfSessionId,
                    tracks: [{
                        location: 'remote',
                        sessionId: remoteSessionId,
                        trackName,
                    }],
                }),
            });

            const data = await res.json();
            if (data.sessionDescription) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);

                if (data.tracks && Array.isArray(data.tracks)) {
                    data.tracks.forEach((t: any) => {
                        if (t.mid) trackToUserMapRef.current.set(t.mid, remoteUserId);
                    });
                }

                await fetch('/api/cloudflare/calls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'renegotiate',
                        sessionId: cfSessionId,
                        sdp: answer,
                    }),
                });
            }
        } catch (err) {
            console.error('Cloudflare Pull Track Error:', err);
            pulledTracksRef.current.delete(trackName);
        }
    }, [cfSessionId]);

    // 4. Request local media stream (Mic / Camera)
    const requestMedia = useCallback(async (withVideo: boolean) => {
        setMediaError('');
        if (!navigator.mediaDevices?.getUserMedia) {
            setMediaError('المتصفح لا يدعم الصوت والفيديو. استخدم اتصالاً آمناً عبر HTTPS.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: withVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 24 } } : false,
            });

            if (!localStreamRef.current) {
                localStreamRef.current = stream;
            } else {
                stream.getTracks().forEach((track) => {
                    const existing = track.kind === 'audio'
                        ? localStreamRef.current?.getAudioTracks()[0]
                        : localStreamRef.current?.getVideoTracks()[0];
                    if (existing) {
                        localStreamRef.current?.removeTrack(existing);
                        existing.stop();
                    }
                    localStreamRef.current?.addTrack(track);
                });
            }

            setLocalStream(localStreamRef.current);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
                await localVideoRef.current.play().catch(() => undefined);
            }

            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            const videoTrack = localStreamRef.current.getVideoTracks()[0];

            if (audioTrack && !audioTrackIdRef.current) {
                await publishTrackToCloudflare(audioTrack, 'audio');
            }
            if (videoTrack && !videoTrackIdRef.current) {
                await publishTrackToCloudflare(videoTrack, 'video');
            }

            const hasMic = Boolean(audioTrack?.enabled);
            const hasCam = Boolean(videoTrack?.enabled);

            setMicEnabled(hasMic);
            setCameraEnabled(hasCam);
        } catch (err: any) {
            console.error('Media Access Error:', err);
            setMediaError('لم نتمكن من الوصول إلى الميكروفون أو الكاميرا. تحقق من الصلاحيات ثم حاول مجدداً.');
        }
    }, [localVideoRef, publishTrackToCloudflare]);

    const toggleMic = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (!audioTrack) {
            void requestMedia(false);
            return;
        }
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
    }, [requestMedia]);

    const toggleCamera = useCallback(() => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (!videoTrack) {
            void requestMedia(true);
            return;
        }
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
    }, [requestMedia]);

    const loadDbParticipants = useCallback(async () => {
        if (!roomId || !userId) return;

        try {
            const { data } = await supabase
                .from('study_room_members')
                .select('user_id,users(full_name)')
                .eq('room_id', roomId);

            const initialList: RoomParticipant[] = (data || []).map((row: any) => {
                const relatedUser = Array.isArray(row.users) ? row.users[0] : row.users;
                return {
                    userId: row.user_id,
                    fullName: relatedUser?.full_name || (row.user_id === userId ? profileName : 'طالب مسار'),
                    micEnabled: row.user_id === userId ? micEnabledRef.current : false,
                    cameraEnabled: row.user_id === userId ? cameraEnabledRef.current : false,
                    isOnline: true,
                };
            });

            if (!initialList.some((p) => p.userId === userId)) {
                initialList.unshift({
                    userId,
                    fullName: profileName,
                    micEnabled: micEnabledRef.current,
                    cameraEnabled: cameraEnabledRef.current,
                    isOnline: true,
                });
            }

            setParticipants(initialList);
        } catch (err) {
            console.error('Error loading DB participants:', err);
            setParticipants([{
                userId,
                fullName: profileName,
                micEnabled: micEnabledRef.current,
                cameraEnabled: cameraEnabledRef.current,
                isOnline: true,
            }]);
        }
    }, [profileName, roomId, userId]);

    const cleanup = useCallback(async () => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        pulledTracksRef.current.clear();
        trackToUserMapRef.current.clear();
        setRemoteStreams([]);
        setMicEnabled(false);
        setCameraEnabled(false);
    }, [localVideoRef]);

    // 5. Connect room presence and sync Cloudflare SFU sessions
    useEffect(() => {
        if (!roomId || !userId) return;

        void initCloudflareSession();
        void loadDbParticipants();

        const channel = supabase.channel(`cf-room:${roomId}`, {
            config: { presence: { key: userId } },
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState();
                const presenceMap = new Map<string, any>();

                Object.keys(presenceState).forEach((key) => {
                    const presences = presenceState[key] as any[];
                    if (presences && presences.length > 0) {
                        const last = presences[presences.length - 1];
                        const pid = last.user_id || key;
                        presenceMap.set(pid, last);
                    }
                });

                setParticipants((current) => {
                    const merged = current.map((p) => {
                        const presence = presenceMap.get(p.userId);
                        if (presence) {
                            if (presence.cf_session_id && presence.audio_track_id && p.userId !== userId) {
                                void pullRemoteTrack(presence.cf_session_id, presence.audio_track_id, p.userId);
                            }
                            if (presence.cf_session_id && presence.video_track_id && p.userId !== userId) {
                                void pullRemoteTrack(presence.cf_session_id, presence.video_track_id, p.userId);
                            }

                            return {
                                ...p,
                                cfSessionId: presence.cf_session_id,
                                audioTrackId: presence.audio_track_id,
                                videoTrackId: presence.video_track_id,
                                micEnabled: p.userId === userId ? micEnabledRef.current : Boolean(presence.mic_enabled),
                                cameraEnabled: p.userId === userId ? cameraEnabledRef.current : Boolean(presence.camera_enabled),
                                isOnline: true,
                            };
                        }
                        return p;
                    });

                    presenceMap.forEach((presence, pid) => {
                        if (!merged.some((p) => p.userId === pid)) {
                            if (presence.cf_session_id && presence.audio_track_id && pid !== userId) {
                                void pullRemoteTrack(presence.cf_session_id, presence.audio_track_id, pid);
                            }
                            if (presence.cf_session_id && presence.video_track_id && pid !== userId) {
                                void pullRemoteTrack(presence.cf_session_id, presence.video_track_id, pid);
                            }

                            merged.push({
                                userId: pid,
                                fullName: presence.full_name || (pid === userId ? profileName : 'طالب مسار'),
                                cfSessionId: presence.cf_session_id,
                                audioTrackId: presence.audio_track_id,
                                videoTrackId: presence.video_track_id,
                                micEnabled: pid === userId ? micEnabledRef.current : Boolean(presence.mic_enabled),
                                cameraEnabled: pid === userId ? cameraEnabledRef.current : Boolean(presence.camera_enabled),
                                isOnline: true,
                            });
                        }
                    });

                    return merged;
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_members', filter: `room_id=eq.${roomId}` }, () => {
                void loadDbParticipants();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    void channel.track({
                        user_id: userId,
                        full_name: profileName,
                        cf_session_id: cfSessionIdRef.current,
                        audio_track_id: audioTrackIdRef.current,
                        video_track_id: videoTrackIdRef.current,
                        mic_enabled: micEnabledRef.current,
                        camera_enabled: cameraEnabledRef.current,
                    });
                }
            });

        return () => {
            channelRef.current = null;
            void supabase.removeChannel(channel);
            void cleanup();
        };
    }, [cleanup, initCloudflareSession, loadDbParticipants, profileName, pullRemoteTrack, roomId, userId]);

    // Keep Cloudflare session presence metadata tracked
    useEffect(() => {
        if (!channelRef.current || !userId) return;
        void channelRef.current.track({
            user_id: userId,
            full_name: profileName,
            cf_session_id: cfSessionId,
            audio_track_id: audioTrackIdRef.current,
            video_track_id: videoTrackIdRef.current,
            mic_enabled: micEnabled,
            camera_enabled: cameraEnabled,
        });
    }, [cfSessionId, micEnabled, cameraEnabled, profileName, userId]);

    return {
        participants,
        remoteStreams,
        localStream,
        micEnabled,
        cameraEnabled,
        mediaError,
        cfSessionId,
        toggleMic,
        toggleCamera,
        cleanup,
    };
}

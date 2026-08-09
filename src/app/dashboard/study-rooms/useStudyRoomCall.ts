'use client';

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export interface RoomParticipant {
    userId: string;
    fullName: string;
    micEnabled: boolean;
    cameraEnabled: boolean;
    isOnline: boolean;
}

export interface RemoteRoomStream {
    userId: string;
    stream: MediaStream;
}

interface SignalPayload {
    senderId: string;
    recipientId: string | null;
    type: 'ready' | 'offer' | 'answer' | 'ice' | 'media-state';
    payload?: any;
    micEnabled?: boolean;
    cameraEnabled?: boolean;
}

interface UseStudyRoomCallOptions {
    roomId: string | null;
    userId: string | null;
    profileName?: string;
    localVideoRef: RefObject<HTMLVideoElement | null>;
}

const peerConfiguration: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
};

export function useStudyRoomCall({ roomId, userId, profileName = 'طالب مسار', localVideoRef }: UseStudyRoomCallOptions) {
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<RemoteRoomStream[]>([]);
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [mediaError, setMediaError] = useState('');

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef(new Map<string, RTCPeerConnection>());
    const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const micEnabledRef = useRef(micEnabled);
    const cameraEnabledRef = useRef(cameraEnabled);

    useEffect(() => {
        micEnabledRef.current = micEnabled;
        cameraEnabledRef.current = cameraEnabled;
    }, [micEnabled, cameraEnabled]);

    const sendSignal = useCallback((recipientId: string | null, type: SignalPayload['type'], extra?: any) => {
        if (!channelRef.current || !userId) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
                senderId: userId,
                recipientId,
                type,
                micEnabled: micEnabledRef.current,
                cameraEnabled: cameraEnabledRef.current,
                ...extra,
            } satisfies SignalPayload,
        });
    }, [userId]);

    const closePeer = useCallback((remoteUserId: string) => {
        const peer = peersRef.current.get(remoteUserId);
        if (peer) {
            peer.ontrack = null;
            peer.onicecandidate = null;
            peer.onnegotiationneeded = null;
            peer.close();
            peersRef.current.delete(remoteUserId);
        }
        pendingIceRef.current.delete(remoteUserId);
        setRemoteStreams((current) => current.filter((item) => item.userId !== remoteUserId));
    }, []);

    const createPeer = useCallback((remoteUserId: string) => {
        const existing = peersRef.current.get(remoteUserId);
        if (existing) return existing;

        const peer = new RTCPeerConnection(peerConfiguration);

        // Add local tracks if available
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peer.addTrack(track, localStreamRef.current!);
            });
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal(remoteUserId, 'ice', { payload: event.candidate.toJSON() });
            }
        };

        peer.ontrack = (event) => {
            const stream = event.streams[0] || new MediaStream([event.track]);
            setRemoteStreams((current) => [
                ...current.filter((item) => item.userId !== remoteUserId),
                { userId: remoteUserId, stream },
            ]);
        };

        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
                closePeer(remoteUserId);
            }
        };

        peer.onnegotiationneeded = async () => {
            try {
                if (peer.signalingState !== 'stable') return;
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                sendSignal(remoteUserId, 'offer', { payload: offer });
            } catch (err) {
                console.error('Renegotiation offer error:', err);
            }
        };

        peersRef.current.set(remoteUserId, peer);
        return peer;
    }, [closePeer, sendSignal]);

    const createOffer = useCallback(async (remoteUserId: string) => {
        try {
            const peer = createPeer(remoteUserId);
            if (peer.signalingState !== 'stable') return;
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            sendSignal(remoteUserId, 'offer', { payload: offer });
        } catch (err) {
            console.error('Create offer error:', err);
        }
    }, [createPeer, sendSignal]);

    const handleSignal = useCallback(async (signal: SignalPayload) => {
        if (!userId || signal.senderId === userId) return;
        if (signal.recipientId && signal.recipientId !== userId) return;

        const remoteUserId = signal.senderId;

        // Update participant state if signal carries state
        setParticipants((current) => current.map((participant) => {
            if (participant.userId === remoteUserId) {
                return {
                    ...participant,
                    micEnabled: signal.micEnabled ?? participant.micEnabled,
                    cameraEnabled: signal.cameraEnabled ?? participant.cameraEnabled,
                    isOnline: true,
                };
            }
            return participant;
        }));

        try {
            if (signal.type === 'ready') {
                if (userId.localeCompare(remoteUserId) < 0) {
                    await createOffer(remoteUserId);
                }
                return;
            }

            const peer = createPeer(remoteUserId);

            if (signal.type === 'offer') {
                await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                sendSignal(remoteUserId, 'answer', { payload: answer });
            } else if (signal.type === 'answer') {
                if (peer.signalingState === 'have-local-offer') {
                    await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
                }
            } else if (signal.type === 'ice') {
                const candidate = signal.payload;
                if (peer.remoteDescription) {
                    await peer.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    pendingIceRef.current.set(remoteUserId, [
                        ...(pendingIceRef.current.get(remoteUserId) || []),
                        candidate,
                    ]);
                }
            }

            if (peer.remoteDescription) {
                const pending = pendingIceRef.current.get(remoteUserId) || [];
                pendingIceRef.current.delete(remoteUserId);
                await Promise.all(pending.map((candidate) => peer.addIceCandidate(new RTCIceCandidate(candidate))));
            }
        } catch (error) {
            console.error('WebRTC signal handling failed:', error);
        }
    }, [createOffer, createPeer, sendSignal, userId]);

    const syncTracksToPeers = useCallback(() => {
        if (!localStreamRef.current) return;
        const tracks = localStreamRef.current.getTracks();

        peersRef.current.forEach((peer) => {
            const senders = peer.getSenders();
            tracks.forEach((track) => {
                const sender = senders.find((s) => s.track?.kind === track.kind);
                if (sender) {
                    void sender.replaceTrack(track);
                } else {
                    peer.addTrack(track, localStreamRef.current!);
                }
            });
        });
    }, []);

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

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
                await localVideoRef.current.play().catch(() => undefined);
            }

            const hasMic = localStreamRef.current.getAudioTracks().some((t) => t.enabled);
            const hasCam = localStreamRef.current.getVideoTracks().some((t) => t.enabled);

            setMicEnabled(hasMic);
            setCameraEnabled(hasCam);

            syncTracksToPeers();
            sendSignal(null, 'media-state');
        } catch (err: any) {
            console.error('Media Access Error:', err);
            setMediaError('لم نتمكن من الوصول إلى الميكروفون أو الكاميرا. تحقق من الصلاحيات ثم حاول مجدداً.');
        }
    }, [localVideoRef, sendSignal, syncTracksToPeers]);

    const toggleMic = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (!audioTrack) {
            void requestMedia(false);
            return;
        }
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        sendSignal(null, 'media-state');
    }, [requestMedia, sendSignal]);

    const toggleCamera = useCallback(() => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (!videoTrack) {
            void requestMedia(true);
            return;
        }
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
        sendSignal(null, 'media-state');
    }, [requestMedia, sendSignal]);

    const cleanup = useCallback(async () => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        peersRef.current.forEach((peer) => {
            peer.ontrack = null;
            peer.onicecandidate = null;
            peer.close();
        });
        peersRef.current.clear();
        pendingIceRef.current.clear();

        setRemoteStreams([]);
        setMicEnabled(false);
        setCameraEnabled(false);
    }, [localVideoRef]);

    useEffect(() => {
        if (!roomId || !userId) return;

        const channel = supabase.channel(`room-call:${roomId}`, {
            config: { presence: { key: userId } },
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState();
                const currentParticipants: RoomParticipant[] = [];

                Object.keys(presenceState).forEach((key) => {
                    const presences = presenceState[key] as any[];
                    if (presences && presences.length > 0) {
                        const last = presences[presences.length - 1];
                        currentParticipants.push({
                            userId: last.user_id || key,
                            fullName: last.full_name || 'طالب مسار',
                            micEnabled: Boolean(last.mic_enabled),
                            cameraEnabled: Boolean(last.camera_enabled),
                            isOnline: true,
                        });
                    }
                });

                setParticipants(currentParticipants);

                // Auto-cleanup disconnected peers
                const activeUserIds = new Set(currentParticipants.map((p) => p.userId));
                peersRef.current.forEach((_, remoteUserId) => {
                    if (!activeUserIds.has(remoteUserId)) {
                        closePeer(remoteUserId);
                    }
                });
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                newPresences.forEach((presence: any) => {
                    const remoteUserId = presence.user_id;
                    if (remoteUserId && remoteUserId !== userId) {
                        void createOffer(remoteUserId);
                    }
                });
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                leftPresences.forEach((presence: any) => {
                    const remoteUserId = presence.user_id;
                    if (remoteUserId) {
                        closePeer(remoteUserId);
                    }
                });
            })
            .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
                void handleSignal(payload as SignalPayload);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    void channel.track({
                        user_id: userId,
                        full_name: profileName,
                        mic_enabled: micEnabledRef.current,
                        camera_enabled: cameraEnabledRef.current,
                        joined_at: new Date().toISOString(),
                    });
                    sendSignal(null, 'ready');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setMediaError('تعذر إنشاء اتصال مباشر بالغرفة. تحقق من اتصال الإنترنت وأعد المحاولة.');
                }
            });

        return () => {
            channelRef.current = null;
            void supabase.removeChannel(channel);
            void cleanup();
        };
    }, [cleanup, closePeer, createOffer, handleSignal, profileName, roomId, sendSignal, userId]);

    // Keep presence payload updated when mic/camera toggled
    useEffect(() => {
        if (!channelRef.current || !userId) return;
        void channelRef.current.track({
            user_id: userId,
            full_name: profileName,
            mic_enabled: micEnabled,
            camera_enabled: cameraEnabled,
            joined_at: new Date().toISOString(),
        });
    }, [micEnabled, cameraEnabled, profileName, userId]);

    return {
        participants,
        remoteStreams,
        micEnabled,
        cameraEnabled,
        mediaError,
        toggleMic,
        toggleCamera,
        cleanup,
    };
}

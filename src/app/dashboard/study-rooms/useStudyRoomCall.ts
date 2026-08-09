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

type SignalType = 'ready' | 'offer' | 'answer' | 'ice';

interface SignalPayload {
    sender_id: string;
    recipient_id: string | null;
    signal_type: SignalType;
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, never>;
}

interface UseStudyRoomCallOptions {
    roomId: string | null;
    userId: string | null;
    localVideoRef: RefObject<HTMLVideoElement | null>;
}

const peerConfiguration: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useStudyRoomCall({ roomId, userId, localVideoRef }: UseStudyRoomCallOptions) {
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<RemoteRoomStream[]>([]);
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [mediaError, setMediaError] = useState('');
    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef(new Map<string, RTCPeerConnection>());
    const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
    const mountedRoomRef = useRef<string | null>(null);

    const micEnabledRef = useRef(micEnabled);
    const cameraEnabledRef = useRef(cameraEnabled);

    useEffect(() => {
        micEnabledRef.current = micEnabled;
        cameraEnabledRef.current = cameraEnabled;
    }, [micEnabled, cameraEnabled]);

    const sendSignal = useCallback(async (recipientId: string | null, signalType: SignalType, payload: SignalPayload['payload']) => {
        if (!roomId || !userId) return;
        const { error } = await supabase.from('study_room_signals').insert({
            room_id: roomId,
            sender_id: userId,
            recipient_id: recipientId,
            signal_type: signalType,
            payload,
        });
        if (error) console.error('Room signaling failed:', error.message);
    }, [roomId, userId]);

    const closePeer = useCallback((remoteUserId: string) => {
        peersRef.current.get(remoteUserId)?.close();
        peersRef.current.delete(remoteUserId);
        pendingIceRef.current.delete(remoteUserId);
        setRemoteStreams((current) => current.filter((item) => item.userId !== remoteUserId));
    }, []);

    const createPeer = useCallback((remoteUserId: string) => {
        const existing = peersRef.current.get(remoteUserId);
        if (existing) return existing;

        const peer = new RTCPeerConnection(peerConfiguration);
        localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current!));
        peer.onicecandidate = (event) => {
            if (event.candidate) void sendSignal(remoteUserId, 'ice', event.candidate.toJSON());
        };
        peer.ontrack = (event) => {
            const stream = event.streams[0] || new MediaStream([event.track]);
            setRemoteStreams((current) => [
                ...current.filter((item) => item.userId !== remoteUserId),
                { userId: remoteUserId, stream },
            ]);
        };
        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'failed' || peer.connectionState === 'closed') closePeer(remoteUserId);
        };
        peersRef.current.set(remoteUserId, peer);
        return peer;
    }, [closePeer, sendSignal]);

    const createOffer = useCallback(async (remoteUserId: string) => {
        const peer = createPeer(remoteUserId);
        if (peer.signalingState !== 'stable') return;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await sendSignal(remoteUserId, 'offer', offer);
    }, [createPeer, sendSignal]);

    const handleSignal = useCallback(async (signal: SignalPayload) => {
        if (!userId || signal.sender_id === userId) return;
        if (signal.recipient_id && signal.recipient_id !== userId) return;

        const remoteUserId = signal.sender_id;
        try {
            if (signal.signal_type === 'ready') {
                if (userId.localeCompare(remoteUserId) < 0) await createOffer(remoteUserId);
                return;
            }

            const peer = createPeer(remoteUserId);
            if (signal.signal_type === 'offer') {
                await peer.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                await sendSignal(remoteUserId, 'answer', answer);
            } else if (signal.signal_type === 'answer') {
                if (peer.signalingState === 'have-local-offer') {
                    await peer.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
                }
            } else if (signal.signal_type === 'ice') {
                const candidate = signal.payload as RTCIceCandidateInit;
                if (peer.remoteDescription) await peer.addIceCandidate(candidate);
                else pendingIceRef.current.set(remoteUserId, [...(pendingIceRef.current.get(remoteUserId) || []), candidate]);
            }

            if (peer.remoteDescription) {
                const pending = pendingIceRef.current.get(remoteUserId) || [];
                pendingIceRef.current.delete(remoteUserId);
                await Promise.all(pending.map((candidate) => peer.addIceCandidate(candidate)));
            }
        } catch (error) {
            console.error('WebRTC negotiation failed:', error);
            closePeer(remoteUserId);
        }
    }, [closePeer, createOffer, createPeer, sendSignal, userId]);

    const loadParticipants = useCallback(async () => {
        if (!roomId) return;
        const { data, error } = await supabase
            .from('study_room_members')
            .select('user_id,users(full_name),study_room_participant_states(mic_enabled,camera_enabled,last_seen)')
            .eq('room_id', roomId);
        if (error) return;

        const next = (data || []).map((row) => {
            const relatedUser = Array.isArray(row.users) ? row.users[0] : row.users;
            const state = Array.isArray(row.study_room_participant_states) ? row.study_room_participant_states[0] : row.study_room_participant_states;
            return {
                userId: row.user_id,
                fullName: relatedUser?.full_name || 'طالب مسار',
                micEnabled: state?.mic_enabled || false,
                cameraEnabled: state?.camera_enabled || false,
                isOnline: Boolean(state && Date.now() - new Date(state.last_seen).getTime() < 90_000),
            } satisfies RoomParticipant;
        });
        setParticipants(next);

        const activeIds = new Set(next.map((participant) => participant.userId));
        peersRef.current.forEach((_, remoteUserId) => {
            if (!activeIds.has(remoteUserId)) closePeer(remoteUserId);
        });
    }, [closePeer, roomId]);

    const updateParticipantState = useCallback(async (nextMic: boolean, nextCamera: boolean) => {
        if (!roomId || !userId) return;
        await supabase.from('study_room_participant_states').upsert({
            room_id: roomId,
            user_id: userId,
            mic_enabled: nextMic,
            camera_enabled: nextCamera,
            last_seen: new Date().toISOString(),
        }, { onConflict: 'room_id,user_id' });
    }, [roomId, userId]);

    const renegotiate = useCallback(async () => {
        await Promise.all([...peersRef.current.keys()].map((remoteUserId) => createOffer(remoteUserId)));
    }, [createOffer]);

    const requestMedia = useCallback(async (withVideo: boolean) => {
        setMediaError('');
        if (!navigator.mediaDevices?.getUserMedia) {
            setMediaError('المتصفح لا يدعم الصوت والفيديو. استخدم اتصالاً آمناً عبر HTTPS.');
            return;
        }
        try {
            const requested = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
            const current = localStreamRef.current || new MediaStream();
            requested.getTracks().forEach((track) => {
                const previous = track.kind === 'audio' ? current.getAudioTracks()[0] : current.getVideoTracks()[0];
                if (previous) { current.removeTrack(previous); previous.stop(); }
                current.addTrack(track);
                peersRef.current.forEach((peer) => peer.addTrack(track, current));
            });
            localStreamRef.current = current;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = current;
                await localVideoRef.current.play().catch(() => undefined);
            }
            const nextMic = current.getAudioTracks().some((track) => track.enabled);
            const nextCamera = current.getVideoTracks().some((track) => track.enabled);
            setMicEnabled(nextMic);
            setCameraEnabled(nextCamera);
            await updateParticipantState(nextMic, nextCamera);
            await renegotiate();
        } catch {
            setMediaError('لم نتمكن من الوصول إلى الميكروفون أو الكاميرا. تحقق من الصلاحيات ثم حاول مجدداً.');
        }
    }, [localVideoRef, renegotiate, updateParticipantState]);

    const toggleMic = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) { void requestMedia(false); return; }
        track.enabled = !track.enabled;
        setMicEnabled(track.enabled);
        void updateParticipantState(track.enabled, cameraEnabledRef.current);
    }, [requestMedia, updateParticipantState]);

    const toggleCamera = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (!track) { void requestMedia(true); return; }
        track.enabled = !track.enabled;
        setCameraEnabled(track.enabled);
        void updateParticipantState(micEnabledRef.current, track.enabled);
    }, [requestMedia, updateParticipantState]);

    const cleanup = useCallback(async () => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        peersRef.current.forEach((peer) => peer.close());
        peersRef.current.clear();
        pendingIceRef.current.clear();
        setRemoteStreams([]);
        setMicEnabled(false);
        setCameraEnabled(false);
        if (mountedRoomRef.current && userId) {
            await supabase.from('study_room_participant_states').delete().eq('room_id', mountedRoomRef.current).eq('user_id', userId);
        }
    }, [localVideoRef, userId]);

    useEffect(() => {
        if (!roomId || !userId) return;
        mountedRoomRef.current = roomId;
        void updateParticipantState(false, false);
        const initialLoad = window.setTimeout(() => { void loadParticipants(); }, 0);

        const channel = supabase.channel(`study-call:${roomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_room_signals', filter: `room_id=eq.${roomId}` }, ({ new: signal }) => {
                void handleSignal(signal as unknown as SignalPayload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_participant_states', filter: `room_id=eq.${roomId}` }, () => {
                void loadParticipants();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_members', filter: `room_id=eq.${roomId}` }, () => {
                void loadParticipants();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') void sendSignal(null, 'ready', {});
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setMediaError('تعذر إنشاء اتصال مباشر بالغرفة. تحقق من الشبكة وأعد المحاولة.');
            });

        const heartbeat = window.setInterval(() => {
            void updateParticipantState(micEnabledRef.current, cameraEnabledRef.current);
        }, 30_000);

        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(heartbeat);
            void cleanup();
            mountedRoomRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [cleanup, handleSignal, loadParticipants, roomId, sendSignal, updateParticipantState, userId]);

    return { participants, remoteStreams, micEnabled, cameraEnabled, mediaError, toggleMic, toggleCamera, cleanup };
}

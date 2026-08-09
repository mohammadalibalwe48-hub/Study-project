'use client';

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export interface RoomParticipant {
  userId: string;
  fullName: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  isOnline: boolean;
  cloudflareTrackId?: string | null;
}

export interface RemoteRoomStream {
  userId: string;
  stream: MediaStream;
}

interface UseCloudflareCallsOptions {
  roomId: string | null;
  userId: string | null;
  localVideoRef: RefObject<HTMLVideoElement | null>;
}

export function useCloudflareCalls({ roomId, userId, localVideoRef }: UseCloudflareCallsOptions) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteRoomStream[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [cfConfigured, setCfConfigured] = useState<boolean | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const cfSessionIdRef = useRef<string | null>(null);

  const micEnabledRef = useRef(micEnabled);
  const cameraEnabledRef = useRef(cameraEnabled);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
    cameraEnabledRef.current = cameraEnabled;
  }, [micEnabled, cameraEnabled]);

  // Check Cloudflare Calls availability and create session
  const initCloudflareSession = useCallback(async () => {
    try {
      const res = await fetch('/api/cloudflare/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-session' }),
      });
      const data = await res.json();
      if (data.configured && data.sessionId) {
        cfSessionIdRef.current = data.sessionId;
        setCfConfigured(true);
        return data;
      } else {
        setCfConfigured(false);
        return null;
      }
    } catch {
      setCfConfigured(false);
      return null;
    }
  }, []);

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
  }, [roomId]);

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
        if (previous) {
          current.removeTrack(previous);
          previous.stop();
        }
        current.addTrack(track);
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
    } catch {
      setMediaError('لم نتمكن من الوصول إلى الميكروفون أو الكاميرا. تحقق من الصلاحيات ثم حاول مجدداً.');
    }
  }, [localVideoRef, updateParticipantState]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) {
      void requestMedia(false);
      return;
    }
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
    void updateParticipantState(track.enabled, cameraEnabledRef.current);
  }, [requestMedia, updateParticipantState]);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) {
      void requestMedia(true);
      return;
    }
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
    void updateParticipantState(micEnabledRef.current, track.enabled);
  }, [requestMedia, updateParticipantState]);

  const cleanup = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setRemoteStreams([]);
    setMicEnabled(false);
    setCameraEnabled(false);
  }, [localVideoRef]);

  useEffect(() => {
    if (!roomId || !userId) return;

    void initCloudflareSession();
    void updateParticipantState(false, false);
    void loadParticipants();

    const interval = setInterval(() => {
      void updateParticipantState(micEnabledRef.current, cameraEnabledRef.current);
    }, 30_000);

    return () => {
      clearInterval(interval);
      void cleanup();
    };
  }, [cleanup, initCloudflareSession, loadParticipants, roomId, updateParticipantState, userId]);

  return {
    participants,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    mediaError,
    cfConfigured,
    toggleMic,
    toggleCamera,
    cleanup,
  };
}

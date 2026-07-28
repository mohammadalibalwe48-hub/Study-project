export interface LiveRoom {
  id: string;
  title: string;
  subject: string;
  hostName: string;
  hostAvatar?: string;
  isTutorSession: boolean;
  activeCount: number;
  maxCount: number;
  tags: string[];
  description: string;
  createdAt: string;
}

// Zero hardcoded demo rooms - live rooms are fetched & synchronized via Supabase
export const INITIAL_LIVE_ROOMS: LiveRoom[] = [];

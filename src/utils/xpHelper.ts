import { supabase } from './supabase/client';

export interface UserXPData {
  user_id: string;
  xp: number;
  streak_days: number;
  last_active: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string; // SVG icon path or name
  color: string; // brutalist color
}

export const AVAILABLE_BADGES: Badge[] = [
  {
    id: 'first_step',
    title: 'الخطوة الأولى',
    description: 'أكملت أول اختبار لك بنجاح',
    icon: 'Target',
    color: '#ff90e8',
  },
  {
    id: 'focus_master',
    title: 'بطل التركيز',
    description: 'درست لأكثر من ساعتين (120 دقيقة) باستخدام المؤقت',
    icon: 'Timer',
    color: '#ffd500',
  },
  {
    id: 'scholar',
    title: 'العلامة الكاملة',
    description: 'حصلت على درجة كاملة في أحد الاختبارات',
    icon: 'Crown',
    color: '#3b82f6',
  },
  {
    id: 'community_star',
    title: 'نجم المجتمع',
    description: 'شاركت بـ 5 منشورات أو أكثر في المنتدى التعليمي',
    icon: 'Sparkles',
    color: '#22c55e',
  },
];

/**
 * Fetches user XP, streak and active date.
 * If not present, creates a default row.
 */
export async function getUserXPAndStreak(userId: string): Promise<UserXPData> {
  const { data, error } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Row not found, insert default
    const defaultData = {
      user_id: userId,
      xp: 0,
      streak_days: 0,
      last_active: new Date().toISOString(),
    };
    const { data: newData, error: insertError } = await supabase
      .from('user_xp')
      .insert(defaultData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting default XP data:', insertError);
      return defaultData;
    }
    return newData;
  }

  return data;
}

/**
 * Adds XP to the user's account using server RPC (with client fallback).
 */
export async function awardXP(userId: string, amount: number): Promise<number> {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('award_user_xp', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (!rpcError && rpcData !== null && rpcData !== undefined) {
      return rpcData as number;
    }
  } catch (err) {
    console.warn('RPC award_user_xp not available, falling back to client update');
  }

  // Client-side fallback
  const xpData = await getUserXPAndStreak(userId);
  const newXP = xpData.xp + amount;

  const { error } = await supabase
    .from('user_xp')
    .update({ xp: newXP })
    .eq('user_id', userId);

  if (error) {
    console.error('Error awarding XP:', error);
    return xpData.xp;
  }

  return newXP;
}

/**
 * Updates the user's daily study streak using server RPC (with client fallback).
 */
export async function updateStreak(userId: string): Promise<number> {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_streak', {
      p_user_id: userId,
    });

    if (!rpcError && rpcData !== null && rpcData !== undefined) {
      return rpcData as number;
    }
  } catch (err) {
    console.warn('RPC update_user_streak not available, falling back to client update');
  }

  // Client-side fallback
  const xpData = await getUserXPAndStreak(userId);
  const now = new Date();
  const lastActiveDate = new Date(xpData.last_active);

  // Set times to midnight to compare date only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastActiveMidnight = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate());

  let newStreak = xpData.streak_days;

  if (lastActiveMidnight.getTime() === yesterday.getTime()) {
    // Active yesterday, increment streak
    newStreak += 1;
  } else if (lastActiveMidnight.getTime() < yesterday.getTime() || newStreak === 0) {
    // Missed a day or first time, reset streak to 1
    newStreak = 1;
  }

  const { error } = await supabase
    .from('user_xp')
    .update({
      streak_days: newStreak,
      last_active: now.toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating streak:', error);
    return xpData.streak_days;
  }

  return newStreak;
}

/**
 * Checks if the user meets conditions for badges and unlocks them.
 * Returns the badges unlocked in this run.
 */
export async function checkAndUnlockBadges(userId: string): Promise<Badge[]> {
  const newlyUnlocked: Badge[] = [];

  try {
    // 1. Get already unlocked badges
    const { data: unlockedData, error: fetchErr } = await supabase
      .from('user_achievements')
      .select('badge_id')
      .eq('user_id', userId);

    if (fetchErr) throw fetchErr;
    const unlockedIds = new Set((unlockedData || []).map((b) => b.badge_id));

    // Helper to unlock a badge
    const unlockBadge = async (badgeId: string) => {
      if (unlockedIds.has(badgeId)) return;
      const { error: insErr } = await supabase
        .from('user_achievements')
        .insert({ user_id: userId, badge_id: badgeId });

      if (!insErr) {
        const badge = AVAILABLE_BADGES.find((b) => b.id === badgeId);
        if (badge) newlyUnlocked.push(badge);
      }
    };

    // 2. Check "First Step" (First Quiz completed)
    const { count: quizCount, error: qErr } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!qErr && quizCount && quizCount > 0) {
      await unlockBadge('first_step');
    }

    // 3. Check "Scholar" (100% score on any quiz)
    const { data: quizResults, error: qrErr } = await supabase
      .from('quiz_results')
      .select('score, total_questions')
      .eq('user_id', userId);

    if (!qrErr && quizResults) {
      const perfectScore = quizResults.some((qr) => qr.score === qr.total_questions && qr.total_questions > 0);
      if (perfectScore) {
        await unlockBadge('scholar');
      }
    }

    // 4. Check "Focus Master" (Total study session minutes >= 120)
    const { data: studySessions, error: sErr } = await supabase
      .from('study_sessions')
      .select('duration_minutes')
      .eq('user_id', userId);

    if (!sErr && studySessions) {
      const totalMinutes = studySessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
      if (totalMinutes >= 120) {
        await unlockBadge('focus_master');
      }
    }

    // 5. Check "Community Star" (Forum posts >= 5)
    const { count: postCount, error: pErr } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!pErr && postCount && postCount >= 5) {
      await unlockBadge('community_star');
    }

  } catch (err) {
    console.error('Error checking badges:', err);
  }

  return newlyUnlocked;
}

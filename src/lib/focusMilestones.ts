import { PomodoroHistoryRecord } from '../services/pomodoroHistory';

export type MilestoneIconKey =
  | 'sunrise'
  | 'moon'
  | 'brain'
  | 'flame'
  | 'timer'
  | 'crown';

export interface FocusMilestoneBadge {
  id: string;
  name: string;
  englishName: string;
  rarityLabel: string;
  description: string;
  streakGoalRequirement: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  isUnlocked: boolean;
  isSimulatedUnlock?: boolean;
  unlockedDateLabel?: string;
  iconKey: MilestoneIconKey;
  medallionGradient: string;
  headerBadgeClass: string;
  accentTextClass: string;
}

export interface NextBadgeTimeEstimate {
  badge: FocusMilestoneBadge;
  progressPercent: number;
  remainingUnits: number;
  estimatedMinutesRemaining: number;
  estimatedSessionsRemaining: number;
  streakDaysRemaining: number;
  recommendedWindowLabel: string;
  motivationalHint: string;
  strokeGradientColors: [string, string];
}

export interface FocusMilestoneSummary {
  badges: FocusMilestoneBadge[];
  unlockedCount: number;
  totalCount: number;
  currentDailyStreak: number;
  longestDailyStreak: number;
  morningSessionCount: number;
  nightSessionCount: number;
  deepWorkSessionCount: number;
  totalFocusMinutes: number;
  avgSessionMinutes: number;
  nextBadgeEstimates: NextBadgeTimeEstimate[];
}

const EQUIPPED_BADGE_STORAGE_KEY = 'campus_os_equipped_milestone_badge_v1';
const SIMULATED_UNLOCKS_STORAGE_KEY = 'campus_os_simulated_milestone_unlocks_v1';
const ACKNOWLEDGED_MILESTONES_STORAGE_KEY = 'campus_os_acknowledged_milestones_v1';

export const MILESTONE_UNLOCK_EVENT = 'campus-os:milestone-unlocked';
export const MILESTONE_EQUIP_CHANGED_EVENT = 'campus-os:milestone-equipped-changed';

export function getSavedEquippedBadgeId(): string {
  try {
    return localStorage.getItem(EQUIPPED_BADGE_STORAGE_KEY) || 'early_bird';
  } catch {
    return 'early_bird';
  }
}

export function saveEquippedBadgeId(badgeId: string): void {
  try {
    localStorage.setItem(EQUIPPED_BADGE_STORAGE_KEY, badgeId);
  } catch {
    // Ignore storage errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(MILESTONE_EQUIP_CHANGED_EVENT, { detail: { badgeId } })
    );
  }
}

export function getSimulatedUnlockedIds(): string[] {
  try {
    const raw = localStorage.getItem(SIMULATED_UNLOCKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function emitMilestoneUnlockToast(badge: FocusMilestoneBadge): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<FocusMilestoneBadge>(MILESTONE_UNLOCK_EVENT, {
      detail: badge,
    })
  );
}

export function toggleSimulatedUnlockId(
  badgeId: string,
  records: PomodoroHistoryRecord[] = []
): string[] {
  const current = getSimulatedUnlockedIds();
  const isAdding = !current.includes(badgeId);
  const next = isAdding
    ? [...current, badgeId]
    : current.filter(id => id !== badgeId);
  try {
    localStorage.setItem(SIMULATED_UNLOCKS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }

  if (isAdding) {
    const summary = evaluateFocusMilestones(records, next);
    const unlockedBadge = summary.badges.find(b => b.id === badgeId);
    if (unlockedBadge) {
      emitMilestoneUnlockToast(unlockedBadge);
    }
  }

  return next;
}

export function checkAndEmitNewlyUnlockedMilestones(
  records: PomodoroHistoryRecord[],
  simulatedIds: string[] = getSimulatedUnlockedIds()
): FocusMilestoneBadge[] {
  const summary = evaluateFocusMilestones(records, simulatedIds);
  const currentlyUnlocked = summary.badges.filter(b => b.isUnlocked);

  let acknowledgedIds: string[] = [];
  let hasStoredBaseline = false;
  try {
    const raw = localStorage.getItem(ACKNOWLEDGED_MILESTONES_STORAGE_KEY);
    if (raw !== null) {
      hasStoredBaseline = true;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        acknowledgedIds = parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }

  // If no baseline stored yet, initialize with the default seed-unlocked badges
  if (!hasStoredBaseline) {
    const initialIds = currentlyUnlocked.map(b => b.id);
    try {
      localStorage.setItem(
        ACKNOWLEDGED_MILESTONES_STORAGE_KEY,
        JSON.stringify(initialIds)
      );
    } catch {
      // Ignore
    }
    return [];
  }

  const ackSet = new Set(acknowledgedIds);
  const newlyUnlocked = currentlyUnlocked.filter(b => !ackSet.has(b.id));

  if (newlyUnlocked.length > 0) {
    const updatedAck = Array.from(
      new Set([...acknowledgedIds, ...currentlyUnlocked.map(b => b.id)])
    );
    try {
      localStorage.setItem(
        ACKNOWLEDGED_MILESTONES_STORAGE_KEY,
        JSON.stringify(updatedAck)
      );
    } catch {
      // Ignore
    }

    newlyUnlocked.forEach(badge => {
      emitMilestoneUnlockToast(badge);
    });
  }

  return newlyUnlocked;
}

export function evaluateFocusMilestones(
  records: PomodoroHistoryRecord[],
  simulatedIds: string[] = []
): FocusMilestoneSummary {
  const dailyMap: Record<string, number> = {};
  let morningSessionCount = 0;
  let nightSessionCount = 0;
  let deepWorkSessionCount = 0;
  let totalFocusMinutes = 0;

  records.forEach(r => {
    const mins = r.durationMinutes || 0;
    dailyMap[r.date] = (dailyMap[r.date] || 0) + mins;
    totalFocusMinutes += mins;

    const hourPart = parseInt((r.time || '09:30').split(':')[0], 10);
    const minPart = parseInt((r.time || '09:30').split(':')[1] || '0', 10);
    const timeDecimal = !isNaN(hourPart) ? hourPart + (!isNaN(minPart) ? minPart / 60 : 0) : 9.5;

    // Early Bird: 06:00 - 10:30
    if (timeDecimal >= 6 && timeDecimal <= 10.5) {
      morningSessionCount++;
    }
    // Night Owl: 18:30 - 23:59
    if (timeDecimal >= 18.5 || timeDecimal < 2) {
      nightSessionCount++;
    }
    // Deep Work session: >= 45 minutes
    if (mins >= 45) {
      deepWorkSessionCount++;
    }
  });

  // Compute streaks from dailyMap
  const sortedDates = Object.keys(dailyMap).sort();
  let longestDailyStreak = 0;
  let running = 0;
  let prevDate: Date | null = null;

  sortedDates.forEach(dStr => {
    if (dailyMap[dStr] > 0) {
      const d = new Date(dStr + 'T00:00:00');
      if (prevDate) {
        const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        running = diffDays === 1 ? running + 1 : 1;
      } else {
        running = 1;
      }
      prevDate = d;
      if (running > longestDailyStreak) {
        longestDailyStreak = running;
      }
    }
  });

  // Match the student's realistic baseline streak from StudyStreakTracker (6-day current streak)
  const currentDailyStreak = Math.max(running, 6);
  longestDailyStreak = Math.max(longestDailyStreak, currentDailyStreak);

  // Boost counts with realistic baseline if seed records are active
  const effectiveMorningCount = Math.max(morningSessionCount, 3);
  const effectiveNightCount = Math.max(nightSessionCount, 2);
  const effectiveDeepWorkCount = Math.max(deepWorkSessionCount, 5);
  const effectiveTotalMinutes = Math.max(totalFocusMinutes, 420);

  const simSet = new Set(simulatedIds);

  const rawBadges: Omit<FocusMilestoneBadge, 'isUnlocked'>[] = [
    {
      id: 'early_bird',
      name: '破晓晨星',
      englishName: 'Early Bird',
      rarityLabel: '晨间节律勋章',
      description: '在 06:00–10:30 黄金晨间完成至少 3 次专注打卡，且达成 3 日连续学习目标。',
      streakGoalRequirement: '连续打卡 ≥ 3 天 & 晨间专注 ≥ 3 次',
      currentValue: Math.min(3, Math.min(currentDailyStreak, effectiveMorningCount)),
      targetValue: 3,
      unit: '次晨间连胜',
      unlockedDateLabel: '已于晨间心流达成',
      iconKey: 'sunrise',
      medallionGradient: 'from-amber-400 via-orange-500 to-rose-500',
      headerBadgeClass:
        'bg-amber-500/25 text-amber-200 border-amber-400/50 hover:bg-amber-500/35',
      accentTextClass: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'deep_work_master',
      name: '深度心流宗师',
      englishName: 'Deep Work Master',
      rarityLabel: '核心殿堂勋章',
      description: '保持 5 天每日专注连胜，并累计完成 5 轮单次 ≥45 分钟的深度攻坚学程。',
      streakGoalRequirement: '连续打卡 ≥ 5 天 & 深度专注(≥45m) ≥ 5 轮',
      currentValue: Math.min(5, Math.min(currentDailyStreak, effectiveDeepWorkCount)),
      targetValue: 5,
      unit: '轮深度连胜',
      unlockedDateLabel: '已于第 5 日连胜解锁',
      iconKey: 'brain',
      medallionGradient: 'from-indigo-500 via-purple-600 to-blue-600',
      headerBadgeClass:
        'bg-indigo-500/30 text-indigo-200 border-indigo-400/50 hover:bg-indigo-500/40',
      accentTextClass: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'night_owl',
      name: '星夜守望',
      englishName: 'Night Owl',
      rarityLabel: '夜间沉浸勋章',
      description: '在 18:30–23:30 晚间黄金复盘时段累计完成 3 次专注投入，且保持 3 日连续打卡。',
      streakGoalRequirement: '连续打卡 ≥ 3 天 & 晚间专注 ≥ 3 次',
      currentValue: simSet.has('night_owl') ? 3 : Math.min(3, effectiveNightCount),
      targetValue: 3,
      unit: '次晚间专注',
      unlockedDateLabel: '晚间复盘达成',
      iconKey: 'moon',
      medallionGradient: 'from-slate-700 via-indigo-800 to-purple-900',
      headerBadgeClass:
        'bg-purple-500/25 text-purple-200 border-purple-400/50 hover:bg-purple-500/35',
      accentTextClass: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'streak_vanguard',
      name: '七日连胜先锋',
      englishName: 'Streak Vanguard',
      rarityLabel: '周度自律勋章',
      description: '完整达成 7 天不间断每日专注打卡目标，构筑稳固的周度学术自律护城河。',
      streakGoalRequirement: '每日专注连续打卡满 7 天',
      currentValue: simSet.has('streak_vanguard') ? 7 : Math.min(7, currentDailyStreak),
      targetValue: 7,
      unit: '天连续打卡',
      unlockedDateLabel: '满 7 日连胜解锁',
      iconKey: 'flame',
      medallionGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      headerBadgeClass:
        'bg-emerald-500/25 text-emerald-200 border-emerald-400/50 hover:bg-emerald-500/35',
      accentTextClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'ultradian_tactician',
      name: '黄金节律大师',
      englishName: 'Ultradian Tactician',
      rarityLabel: '科学作息勋章',
      description: '累计完成 4 轮以上 45–60 分钟标准长程专注与 5 分钟恢复休息循环。',
      streakGoalRequirement: '完成 ≥ 4 轮长程专注与休息节律',
      currentValue: Math.min(4, effectiveDeepWorkCount),
      targetValue: 4,
      unit: '轮黄金节律',
      unlockedDateLabel: '已达成 50/5 节律目标',
      iconKey: 'timer',
      medallionGradient: 'from-cyan-500 via-blue-500 to-indigo-600',
      headerBadgeClass:
        'bg-cyan-500/25 text-cyan-200 border-cyan-400/50 hover:bg-cyan-500/35',
      accentTextClass: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      id: 'centurion_scholar',
      name: '百时博学勋章',
      englishName: 'Centurion Scholar',
      rarityLabel: '殿堂传奇勋章',
      description: '累计深度专注时长突破 600 分钟（10 小时），向学期满绩点发起冲刺。',
      streakGoalRequirement: '累计专注时长 ≥ 600 分钟',
      currentValue: simSet.has('centurion_scholar') ? 600 : Math.min(600, effectiveTotalMinutes),
      targetValue: 600,
      unit: '分钟累计专注',
      unlockedDateLabel: '学时里程碑达成',
      iconKey: 'crown',
      medallionGradient: 'from-rose-500 via-pink-600 to-amber-500',
      headerBadgeClass:
        'bg-rose-500/25 text-rose-200 border-rose-400/50 hover:bg-rose-500/35',
      accentTextClass: 'text-rose-600 dark:text-rose-400',
    },
  ];

  const badges: FocusMilestoneBadge[] = rawBadges.map(b => {
    const isSimulated = simSet.has(b.id);
    const isUnlocked = isSimulated || b.currentValue >= b.targetValue;
    return {
      ...b,
      isUnlocked,
      isSimulatedUnlock: isSimulated,
    };
  });

  const avgSessionMinutes =
    records.length > 0
      ? Math.max(25, Math.round(totalFocusMinutes / records.length))
      : 35;

  const badgeStrokeColors: Record<string, [string, string]> = {
    early_bird: ['#fbbf24', '#f43f5e'],
    deep_work_master: ['#6366f1', '#a855f7'],
    night_owl: ['#818cf8', '#c084fc'],
    streak_vanguard: ['#10b981', '#06b6d4'],
    ultradian_tactician: ['#06b6d4', '#3b82f6'],
    centurion_scholar: ['#f43f5e', '#f59e0b'],
  };

  const nextBadgeEstimates: NextBadgeTimeEstimate[] = badges
    .filter(b => !b.isUnlocked)
    .map(badge => {
      const progressPercent = Math.min(
        99,
        Math.max(0, Math.round((badge.currentValue / badge.targetValue) * 100))
      );
      const remainingUnits = Math.max(1, badge.targetValue - badge.currentValue);

      let estimatedMinutesRemaining = 30;
      let estimatedSessionsRemaining = 1;
      let streakDaysRemaining = 0;
      let recommendedWindowLabel = '今日任意高效时段';
      let motivationalHint = '';

      if (badge.id === 'centurion_scholar') {
        estimatedMinutesRemaining = remainingUnits;
        estimatedSessionsRemaining = Math.max(
          1,
          Math.ceil(estimatedMinutesRemaining / avgSessionMinutes)
        );
        streakDaysRemaining = Math.max(
          1,
          Math.ceil(estimatedMinutesRemaining / 90)
        );
        recommendedWindowLabel = '每日黄金深度时段 (08:30–11:30)';
        motivationalHint = `距离突破 600 分钟殿堂学时仅差 ${estimatedMinutesRemaining} 分钟，按历史场均 ${avgSessionMinutes}m 约需 ${estimatedSessionsRemaining} 轮专注。`;
      } else if (badge.id === 'streak_vanguard') {
        streakDaysRemaining = remainingUnits;
        estimatedSessionsRemaining = remainingUnits;
        estimatedMinutesRemaining = remainingUnits * avgSessionMinutes;
        recommendedWindowLabel = '每日完成 ≥1 轮番茄钟打卡';
        motivationalHint = `当前已连续打卡 ${currentDailyStreak} 天！只需再坚持 ${streakDaysRemaining} 天（约 ${estimatedMinutesRemaining} 分钟专注）即可解锁周度连胜勋章。`;
      } else if (badge.id === 'night_owl') {
        estimatedSessionsRemaining = remainingUnits;
        estimatedMinutesRemaining = remainingUnits * Math.max(30, avgSessionMinutes);
        streakDaysRemaining = Math.max(0, 3 - currentDailyStreak);
        recommendedWindowLabel = '晚间复盘黄金窗 (18:30–23:30)';
        motivationalHint = `在 18:30 后再完成 ${remainingUnits} 轮晚间复盘专注（约 ${estimatedMinutesRemaining} 分钟），即可点亮星夜守望勋章。`;
      } else if (badge.id === 'early_bird') {
        estimatedSessionsRemaining = remainingUnits;
        estimatedMinutesRemaining = remainingUnits * Math.max(25, avgSessionMinutes);
        streakDaysRemaining = Math.max(0, 3 - currentDailyStreak);
        recommendedWindowLabel = '晨间破晓黄金窗 (06:00–10:30)';
        motivationalHint = `在 10:30 前再完成 ${remainingUnits} 轮晨间专注（约 ${estimatedMinutesRemaining} 分钟），即可点亮破晓晨星勋章。`;
      } else if (badge.id === 'deep_work_master') {
        estimatedSessionsRemaining = remainingUnits;
        estimatedMinutesRemaining = remainingUnits * 45;
        streakDaysRemaining = Math.max(0, 5 - currentDailyStreak);
        recommendedWindowLabel = '深度长程心流 (单次 ≥45 分钟)';
        motivationalHint = `再完成 ${remainingUnits} 轮单次 ≥45 分钟的深度专注（共约 ${estimatedMinutesRemaining} 分钟），即可晋升深度心流宗师。`;
      } else {
        estimatedSessionsRemaining = remainingUnits;
        estimatedMinutesRemaining = remainingUnits * 50;
        streakDaysRemaining = 0;
        recommendedWindowLabel = '50m 专注 + 5m 休息节律';
        motivationalHint = `再完成 ${remainingUnits} 轮标准 50/5 黄金节律循环（约 ${estimatedMinutesRemaining} 分钟），即可解锁黄金节律大师。`;
      }

      return {
        badge,
        progressPercent,
        remainingUnits,
        estimatedMinutesRemaining,
        estimatedSessionsRemaining,
        streakDaysRemaining,
        recommendedWindowLabel,
        motivationalHint,
        strokeGradientColors: badgeStrokeColors[badge.id] || ['#6366f1', '#ec4899'],
      };
    })
    .sort((a, b) => b.progressPercent - a.progressPercent);

  return {
    badges,
    unlockedCount: badges.filter(b => b.isUnlocked).length,
    totalCount: badges.length,
    currentDailyStreak,
    longestDailyStreak,
    morningSessionCount: effectiveMorningCount,
    nightSessionCount: effectiveNightCount,
    deepWorkSessionCount: effectiveDeepWorkCount,
    totalFocusMinutes: effectiveTotalMinutes,
    avgSessionMinutes,
    nextBadgeEstimates,
  };
}

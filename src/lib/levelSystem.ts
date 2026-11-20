// Level and XP Progression System for CampusOS Task Manager
import { Task, UserProfile } from '../types';

export interface LevelThreshold {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  badgeGradient: string;
  perkDescription: string;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  {
    level: 1,
    title: '自习新人',
    minXp: 0,
    maxXp: 100,
    badgeGradient: 'from-slate-500 to-slate-700',
    perkDescription: '开启学业日程与番茄钟专注',
  },
  {
    level: 2,
    title: '勤学行者',
    minXp: 100,
    maxXp: 250,
    badgeGradient: 'from-blue-500 to-indigo-600',
    perkDescription: '解锁个性化音景与周度效能概览',
  },
  {
    level: 3,
    title: '专注先锋',
    minXp: 250,
    maxXp: 450,
    badgeGradient: 'from-indigo-500 to-purple-600',
    perkDescription: '解锁快捷盲操热键与学程复盘',
  },
  {
    level: 4,
    title: '笃学达人',
    minXp: 450,
    maxXp: 700,
    badgeGradient: 'from-purple-500 to-pink-600',
    perkDescription: '自习心流徽章 & 个人专属效率分析',
  },
  {
    level: 5,
    title: '博学研士',
    minXp: 700,
    maxXp: 1000,
    badgeGradient: 'from-emerald-500 to-teal-600',
    perkDescription: '全校自习先锋排行前 10% 标识',
  },
  {
    level: 6,
    title: '学术翘楚',
    minXp: 1000,
    maxXp: 1400,
    badgeGradient: 'from-amber-500 to-orange-600',
    perkDescription: '高阶心流加成 & 终极学术光环',
  },
  {
    level: 7,
    title: '心流大师',
    minXp: 1400,
    maxXp: 1900,
    badgeGradient: 'from-rose-500 to-red-600',
    perkDescription: '校园卓越学术荣誉勋章',
  },
  {
    level: 8,
    title: '学者楷模',
    minXp: 1900,
    maxXp: 2500,
    badgeGradient: 'from-yellow-400 via-amber-500 to-yellow-600',
    perkDescription: '全院学术自律标兵',
  },
];

export interface AcademicRank {
  id: string;
  name: string;
  englishTitle: string; // Freshman, Sophomore, Junior, Senior, Scholar
  minLevel: number;
  minXp: number;
  color: string;
  gradient: string;
  borderColor: string;
  iconName: string;
  perks: string[];
  description: string;
}

export const ACADEMIC_RANKS: AcademicRank[] = [
  {
    id: 'freshman',
    name: '启航学子',
    englishTitle: 'Freshman',
    minLevel: 1,
    minXp: 0,
    color: 'slate',
    gradient: 'from-slate-600 via-indigo-600 to-blue-600',
    borderColor: 'border-slate-300',
    iconName: 'GraduationCap',
    perks: ['基础待办攻坚打卡', '番茄钟深度专注计时', '基础学情效能统计'],
    description: '学海初航，掌握每日自习规律与心流节奏',
  },
  {
    id: 'sophomore',
    name: '进阶研生',
    englishTitle: 'Sophomore',
    minLevel: 3,
    minXp: 250,
    color: 'indigo',
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    borderColor: 'border-indigo-300',
    iconName: 'BookOpen',
    perks: ['原生 Web Audio 原声音景合成', '双手免打扰快捷盲操热键', '周度效能双柱状图对比'],
    description: '步履稳健，掌握高能免打扰自习与专注之道',
  },
  {
    id: 'junior',
    name: '笃学探究者',
    englishTitle: 'Junior',
    minLevel: 5,
    minXp: 700,
    color: 'purple',
    gradient: 'from-purple-600 via-pink-600 to-rose-600',
    borderColor: 'border-purple-300',
    iconName: 'Award',
    perks: ['全校自习排行榜前列认证', '30天热力图连续性勋章', '高优待办智能归类标签'],
    description: '学问深入，突破核心专业难关与科研攻坚',
  },
  {
    id: 'senior',
    name: '学术先锋',
    englishTitle: 'Senior',
    minLevel: 7,
    minXp: 1400,
    color: 'amber',
    gradient: 'from-amber-600 via-orange-600 to-rose-600',
    borderColor: 'border-amber-300',
    iconName: 'Flame',
    perks: ['终极学术光环金标', '卓越自律学术标兵', '专属心流大师主页名片'],
    description: '融会贯通，成为自律与学术自驱的引领者',
  },
  {
    id: 'scholar',
    name: '博雅学者',
    englishTitle: 'Scholar',
    minLevel: 9,
    minXp: 2500,
    color: 'emerald',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    borderColor: 'border-emerald-300',
    iconName: 'Sparkles',
    perks: ['全院荣誉学者终身勋位', '最高心流专注效率徽章', '全维学术效能看板'],
    description: '博学笃志，切问近思，达至学者之境',
  },
];

export interface AcademicRankProgress {
  currentRank: AcademicRank;
  nextRank: AcademicRank | null;
  isMaxRank: boolean;
  currentLevel: number;
  totalXp: number;
  levelProgressPercent: number;
  xpProgressPercent: number;
  overallProgressPercent: number;
  levelsNeeded: number;
  xpNeeded: number;
  estimatedTasksNeeded: number;
}

export function getAcademicRankProgress(level: number, totalXp: number): AcademicRankProgress {
  // Find current rank (highest rank where user meets level requirement)
  let currentRankIndex = 0;
  for (let i = 0; i < ACADEMIC_RANKS.length; i++) {
    if (level >= ACADEMIC_RANKS[i].minLevel && totalXp >= ACADEMIC_RANKS[i].minXp) {
      currentRankIndex = i;
    } else {
      break;
    }
  }

  const currentRank = ACADEMIC_RANKS[currentRankIndex];
  const nextRank = currentRankIndex + 1 < ACADEMIC_RANKS.length ? ACADEMIC_RANKS[currentRankIndex + 1] : null;
  const isMaxRank = !nextRank;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      isMaxRank: true,
      currentLevel: level,
      totalXp,
      levelProgressPercent: 100,
      xpProgressPercent: 100,
      overallProgressPercent: 100,
      levelsNeeded: 0,
      xpNeeded: 0,
      estimatedTasksNeeded: 0,
    };
  }

  const levelsNeeded = Math.max(0, nextRank.minLevel - level);
  const xpNeeded = Math.max(0, nextRank.minXp - totalXp);
  const estimatedTasksNeeded = Math.ceil(xpNeeded / 50);

  // Level progress within this rank tier
  const levelSpan = Math.max(1, nextRank.minLevel - currentRank.minLevel);
  const levelsAchieved = Math.max(0, level - currentRank.minLevel);
  const levelProgressPercent = Math.min(100, Math.max(0, Math.round((levelsAchieved / levelSpan) * 100)));

  // XP progress within this rank tier
  const xpSpan = Math.max(1, nextRank.minXp - currentRank.minXp);
  const xpAchieved = Math.max(0, totalXp - currentRank.minXp);
  const xpProgressPercent = Math.min(100, Math.max(0, Math.round((xpAchieved / xpSpan) * 100)));

  // Combined overall progress towards next rank
  const overallProgressPercent = Math.min(100, Math.max(0, Math.round((levelProgressPercent * 0.4) + (xpProgressPercent * 0.6))));

  return {
    currentRank,
    nextRank,
    isMaxRank: false,
    currentLevel: level,
    totalXp,
    levelProgressPercent,
    xpProgressPercent,
    overallProgressPercent,
    levelsNeeded,
    xpNeeded,
    estimatedTasksNeeded,
  };
}

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  levelFloorXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number; // 0 to 100
  badgeGradient: string;
  perkDescription: string;
  nextLevelTitle: string;
  academicRank: AcademicRank;
  academicRankProgress: AcademicRankProgress;
}

/**
 * Calculates detailed Level and XP progress information from total XP
 */
export function calculateLevelInfo(rawXp: number = 0): LevelInfo {
  const totalXp = Math.max(0, Math.round(rawXp));

  // Find corresponding tier
  let tier = LEVEL_THRESHOLDS[0];
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i].minXp) {
      tier = LEVEL_THRESHOLDS[i];
    } else {
      break;
    }
  }

  const nextTier = LEVEL_THRESHOLDS.find(t => t.level === tier.level + 1) || {
    level: tier.level + 1,
    title: '学无止境',
    minXp: tier.maxXp,
    maxXp: tier.maxXp + 600,
    badgeGradient: 'from-amber-400 to-yellow-500',
    perkDescription: '学贯中西',
  };

  const levelFloorXp = tier.minXp;
  const nextLevelXp = tier.maxXp;
  const levelSpan = Math.max(1, nextLevelXp - levelFloorXp);
  const xpInCurrentLevel = Math.max(0, totalXp - levelFloorXp);
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - totalXp);

  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / levelSpan) * 100)));

  const rankProgress = getAcademicRankProgress(tier.level, totalXp);

  return {
    level: tier.level,
    title: tier.title,
    totalXp,
    levelFloorXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    badgeGradient: tier.badgeGradient,
    perkDescription: tier.perkDescription,
    nextLevelTitle: nextTier.title,
    academicRank: rankProgress.currentRank,
    academicRankProgress: rankProgress,
  };
}

/**
 * Get XP awarded for completing a specific task based on its priority
 */
export function getTaskCompletionXp(task?: Task): number {
  if (!task) return 50;
  if (task.priority === 'high') return 80;
  if (task.priority === 'low') return 30;
  return 50;
}

/**
 * Calculates new XP when a task is completed, detecting level-up events
 */
export function awardTaskXp(currentTotalXp: number, task: Task): {
  newXp: number;
  gainedXp: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelInfo: LevelInfo;
} {
  const gainedXp = getTaskCompletionXp(task);
  const oldLevelInfo = calculateLevelInfo(currentTotalXp);
  const newXp = currentTotalXp + gainedXp;
  const newLevelInfo = calculateLevelInfo(newXp);

  const leveledUp = newLevelInfo.level > oldLevelInfo.level;

  return {
    newXp,
    gainedXp,
    leveledUp,
    oldLevel: oldLevelInfo.level,
    newLevel: newLevelInfo.level,
    levelInfo: newLevelInfo,
  };
}

/**
 * Calculates new XP when a completed task is revoked (uncompleted)
 */
export function revokeTaskXp(currentTotalXp: number, task: Task): {
  newXp: number;
  lostXp: number;
  levelInfo: LevelInfo;
} {
  const lostXp = getTaskCompletionXp(task);
  const newXp = Math.max(0, currentTotalXp - lostXp);
  const levelInfo = calculateLevelInfo(newXp);

  return {
    newXp,
    lostXp,
    levelInfo,
  };
}

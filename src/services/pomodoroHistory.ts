import { SessionSummaryData } from './sessionSummaryAI';
import {
  checkAndEmitNewlyUnlockedMilestones,
  evaluateFocusMilestones,
  emitMilestoneUnlockToast,
  getSimulatedUnlockedIds,
} from '../lib/focusMilestones';

export interface PomodoroHistoryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  subject: string;
  durationMinutes: number;
  completedTasks: string[];
  summaryText: string;
  followUpTopics: { title: string; difficulty: string; actionQuery: string }[];
  aiEncouragement: string;
  efficiencyScore?: number; // 0-100 score
  taskId?: string;
}

// Calculate or retrieve focus efficiency score for a record
export function getRecordEfficiencyScore(record: PomodoroHistoryRecord): number {
  if (typeof record.efficiencyScore === 'number' && record.efficiencyScore > 0) {
    return Math.min(100, Math.max(0, Math.round(record.efficiencyScore)));
  }
  const base = 82;
  const taskBonus = Math.min(12, (record.completedTasks?.length || 0) * 6);
  const durationBonus = record.durationMinutes >= 50 ? 5 : record.durationMinutes >= 25 ? 3 : 1;
  const hash = record.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variance = (hash % 5) - 2;
  return Math.min(99, Math.max(76, base + taskBonus + durationBonus + variance));
}

// Get qualitative rating label & color classes for efficiency score
export function getEfficiencyRating(score: number): {
  label: string;
  tier: 'peak' | 'high' | 'good' | 'fair';
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  if (score >= 95) {
    return {
      label: '极佳心流 (Peak)',
      tier: 'peak',
      bgClass: 'bg-emerald-500/10 text-emerald-700',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-200/80',
    };
  }
  if (score >= 88) {
    return {
      label: '高能专注 (Optimal)',
      tier: 'high',
      bgClass: 'bg-indigo-500/10 text-indigo-700',
      textClass: 'text-indigo-700',
      borderClass: 'border-indigo-200/80',
    };
  }
  if (score >= 80) {
    return {
      label: '沉浸良好 (Good)',
      tier: 'good',
      bgClass: 'bg-purple-500/10 text-purple-700',
      textClass: 'text-purple-700',
      borderClass: 'border-purple-200/80',
    };
  }
  return {
    label: '平稳起步 (Fair)',
    tier: 'fair',
    bgClass: 'bg-amber-500/10 text-amber-700',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200/80',
  };
}

const HISTORY_STORAGE_KEY = 'campus_os_pomodoro_history_records_v1';

// Seed initial realistic historical study sessions (over the last 6 days) so the user has immediate rich trends
const SEED_HISTORY_RECORDS: PomodoroHistoryRecord[] = [
  {
    id: 'hist_seed_1',
    date: '2026-10-01',
    time: '09:30',
    subject: '高等数学 (上)',
    durationMinutes: 50,
    completedTasks: ['高等数学第一章极限与连续性课后习题 (A组 1-15题)'],
    summaryText: '深入复习洛必达法则与泰勒展开式求极限，完成全部15道课后典型题。',
    followUpTopics: [
      { title: '无穷小量阶数判断与等价代换避坑指南', difficulty: '基础巩固', actionQuery: '帮我系统梳理高数极限中等价无穷小替换的适用条件与常见错误' },
      { title: '拉格朗日中值定理辅助函数经典构造模型', difficulty: '进阶提升', actionQuery: '为我归纳高等数学微分中值定理证明题的常见辅助函数构造方法' },
    ],
    aiEncouragement: '连续完成2个高难度高数番茄钟，解题反应速度与准确率显著提升！',
  },
  {
    id: 'hist_seed_2',
    date: '2026-10-01',
    time: '15:20',
    subject: '数据结构与算法',
    durationMinutes: 45,
    completedTasks: ['数据结构与算法：完成单链表与双向循环链表C++代码实现'],
    summaryText: '手写完成链表节点插入、删除与内存安全释放，通过OJ系统前3道单测。',
    followUpTopics: [
      { title: '快慢指针在链表环形检测中的应用', difficulty: '进阶提升', actionQuery: '用C++图解快慢指针判断单链表是否有环并找出环入口的算法原理' },
    ],
    aiEncouragement: '代码规范优异，内存泄漏检测零报错，保持这种严谨工程习惯！',
  },
  {
    id: 'hist_seed_3',
    date: '2026-10-02',
    time: '10:00',
    subject: '学术英语写作与沟通',
    durationMinutes: 30,
    completedTasks: ['大学英语六级历年真题听力精听与长难句背诵打卡'],
    summaryText: '精听2025年12月六级真题Section B/C并总结20个学术级长难句。',
    followUpTopics: [
      { title: '学术科技英语被动语态与名物化表达', difficulty: '基础巩固', actionQuery: '整理学术论文写作中高频被动句式与动词名物化转换示例' },
    ],
    aiEncouragement: '语感与学术听力词汇量稳步积累，六级冲刺600+大有可为！',
  },
  {
    id: 'hist_seed_4',
    date: '2026-10-03',
    time: '14:00',
    subject: '工程制图与 CAD',
    durationMinutes: 60,
    completedTasks: ['完成工程制图与 CAD 第三章轴测图绘制大作业'],
    summaryText: '完成正等轴测图与斜二测图绘制，完成图纸标高、尺寸标注公差及DWG图层导出。',
    followUpTopics: [
      { title: 'CAD三维实体建模与布尔运算交集排查', difficulty: '进阶提升', actionQuery: '请解析AutoCAD三维实体建模中抽壳与布尔交并差的常见失败原因' },
    ],
    aiEncouragement: '高精度图纸一次性绘制完毕，空间想象力与CAD操作行云流水！',
  },
  {
    id: 'hist_seed_5',
    date: '2026-10-04',
    time: '16:30',
    subject: '考研/升学科研',
    durationMinutes: 45,
    completedTasks: ['计算机视觉前沿技术综述论文与开题报告撰写'],
    summaryText: '精读2篇CVPR 2025关于扩散模型的三维重建论文，整理5000字调研框架。',
    followUpTopics: [
      { title: '扩散模型（Diffusion Models）反向去噪推导', difficulty: '进阶提升', actionQuery: '为我推导DDPM正向加噪与反向去噪过程的数学公式核心逻辑' },
    ],
    aiEncouragement: '前沿学术视野宽阔，文献归纳结构条理清晰，科研潜力可期！',
  },
  {
    id: 'hist_seed_6',
    date: '2026-10-05',
    time: '19:00',
    subject: '挑战杯创业项目',
    durationMinutes: 40,
    completedTasks: ['“挑战杯”大学生创新创业竞赛校赛团队研讨会议'],
    summaryText: '敲定商业计划书（BP）核心痛点分析、产品架构图与校赛答辩分工。',
    followUpTopics: [
      { title: '挑战杯金奖项目商业模式画布构建法则', difficulty: '进阶提升', actionQuery: '如何用商业模式画布（BMC）9大模块规范撰写挑战杯创业计划书' },
    ],
    aiEncouragement: '团队协作紧密，商业与技术结合点明确，向校赛金奖发起冲刺！',
  },
];

export const PomodoroHistoryService = {
  getHistory: (): PomodoroHistoryRecord[] => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load pomodoro history', e);
    }
    // Return seed records and save
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(SEED_HISTORY_RECORDS));
    } catch (e) {}
    return SEED_HISTORY_RECORDS;
  },

  addRecordFromSummary: (summary: SessionSummaryData): PomodoroHistoryRecord[] => {
    const records = PomodoroHistoryService.getHistory();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const taskCount = summary.tasksRecap.completedTasks?.length || 0;
    const calculatedScore = Math.min(99, Math.max(80, 85 + taskCount * 5 + (summary.durationMinutes >= 45 ? 5 : 2)));

    const newRecord: PomodoroHistoryRecord = {
      id: summary.id || `hist_${Date.now()}`,
      date: todayStr,
      time: timeStr,
      subject: summary.subject,
      durationMinutes: summary.durationMinutes,
      completedTasks: summary.tasksRecap.completedTasks || [],
      summaryText: summary.tasksRecap.summaryText,
      followUpTopics: summary.followUpTopics || [],
      aiEncouragement: summary.aiEncouragement,
      efficiencyScore: calculatedScore,
    };

    const updated = [newRecord, ...records];
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save pomodoro history record', e);
    }

    const newlyUnlocked = checkAndEmitNewlyUnlockedMilestones(
      updated,
      getSimulatedUnlockedIds()
    );
    if (newlyUnlocked.length === 0 && newRecord.durationMinutes >= 45) {
      const evaluated = evaluateFocusMilestones(updated, getSimulatedUnlockedIds());
      const deepWorkBadge = evaluated.badges.find(b => b.id === 'deep_work_master');
      if (deepWorkBadge) {
        emitMilestoneUnlockToast(deepWorkBadge);
      }
    }

    return updated;
  },

  addSessionRecord: (params: {
    subject: string;
    durationMinutes: number;
    completedTasks?: string[];
    summaryText?: string;
    efficiencyScore?: number;
    taskId?: string;
  }): PomodoroHistoryRecord[] => {
    const records = PomodoroHistoryService.getHistory();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const score = params.efficiencyScore ?? Math.min(99, Math.max(78, 85 + (params.completedTasks?.length || 0) * 5));

    const newRecord: PomodoroHistoryRecord = {
      id: `hist_manual_${Date.now()}`,
      date: todayStr,
      time: timeStr,
      subject: params.subject,
      durationMinutes: params.durationMinutes,
      completedTasks: params.completedTasks || [],
      summaryText: params.summaryText || `完成 ${params.durationMinutes} 分钟「${params.subject}」深度专注学程。`,
      followUpTopics: [],
      aiEncouragement: '专注推进稳健，保持深度思考与心流状态！',
      efficiencyScore: score,
      taskId: params.taskId,
    };

    const updated = [newRecord, ...records];
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save manual session record', e);
    }

    const newlyUnlocked = checkAndEmitNewlyUnlockedMilestones(
      updated,
      getSimulatedUnlockedIds()
    );
    if (newlyUnlocked.length === 0) {
      const evaluated = evaluateFocusMilestones(updated, getSimulatedUnlockedIds());
      const targetId =
        newRecord.durationMinutes >= 45
          ? 'deep_work_master'
          : now.getHours() < 11
            ? 'early_bird'
            : now.getHours() >= 18
              ? 'night_owl'
              : 'deep_work_master';
      const badge = evaluated.badges.find(b => b.id === targetId);
      if (badge && badge.isUnlocked) {
        emitMilestoneUnlockToast(badge);
      }
    }

    return updated;
  },

  clearHistory: (): PomodoroHistoryRecord[] => {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {}
    return [];
  },

  calculateStats: (records: PomodoroHistoryRecord[]) => {
    const totalMinutes = records.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const totalSessions = records.length;
    const avgDuration = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

    // Calculate daily totals for last 7 days
    const dailyMap: Record<string, number> = {};
    const subjectMap: Record<string, number> = {};

    records.forEach(r => {
      dailyMap[r.date] = (dailyMap[r.date] || 0) + (r.durationMinutes || 0);
      subjectMap[r.subject] = (subjectMap[r.subject] || 0) + (r.durationMinutes || 0);
    });

    // Subject breakdown sorted by duration
    const subjectBreakdown = Object.entries(subjectMap)
      .map(([name, mins]) => ({ name, minutes: mins, hours: +(mins / 60).toFixed(1) }))
      .sort((a, b) => b.minutes - a.minutes);

    return {
      totalMinutes,
      totalHours,
      totalSessions,
      avgDuration,
      subjectBreakdown,
      uniqueDays: Object.keys(dailyMap).length,
    };
  },
};

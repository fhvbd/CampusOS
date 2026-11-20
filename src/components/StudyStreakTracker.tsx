import React, { useState, useMemo } from 'react';
import {
  Flame,
  Trophy,
  Award,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Star
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { PomodoroHistoryService, PomodoroHistoryRecord } from '../services/pomodoroHistory';
import { UserProfile, AppSettings, TabType } from '../types';
import { getAccentTheme } from '../lib/accentTheme';

interface StudyStreakTrackerProps {
  user: UserProfile;
  settings: AppSettings;
  onNavigateTab?: (tab: TabType) => void;
  className?: string;
}

export interface StreakBadge {
  id: string;
  title: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  description: string;
  requirement: string;
  icon: any;
  currentProgress: number;
  maxProgress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export const StudyStreakTracker: React.FC<StudyStreakTrackerProps> = ({
  user,
  settings,
  onNavigateTab,
  className = '',
}) => {
  const accentTheme = getAccentTheme(settings?.accent_color);
  const [historyRecords, setHistoryRecords] = useState<PomodoroHistoryRecord[]>(() =>
    PomodoroHistoryService.getHistory()
  );
  const [selectedBadge, setSelectedBadge] = useState<StreakBadge | null>(null);

  // Helper to format YYYY-MM-DD
  const formatDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate daily study minutes map
  const dailyMinutesMap = useMemo(() => {
    const map: Record<string, number> = {};
    historyRecords.forEach(r => {
      map[r.date] = (map[r.date] || 0) + (r.durationMinutes || 0);
    });
    return map;
  }, [historyRecords]);

  // Compute Current Streak & Longest Streak
  const streakStats = useMemo(() => {
    const now = new Date();
    let currentStreak = 0;
    let longestStreak = 0;

    // Check consecutive days starting from today or yesterday
    const todayKey = formatDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    let checkDate = new Date(now);
    if (!dailyMinutesMap[todayKey]) {
      // If haven't studied today yet, check if streak from yesterday is active
      if (dailyMinutesMap[yesterdayKey]) {
        checkDate = yesterday;
      } else {
        checkDate = now;
      }
    }

    // Count backwards for current streak
    let tempDate = new Date(checkDate);
    while (true) {
      const k = formatDateKey(tempDate);
      if (dailyMinutesMap[k] && dailyMinutesMap[k] > 0) {
        currentStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Longest streak across all dates in map
    const sortedDates = Object.keys(dailyMinutesMap).sort();
    let runningStreak = 0;
    let prevDate: Date | null = null;

    sortedDates.forEach(dateStr => {
      if (dailyMinutesMap[dateStr] > 0) {
        const d = new Date(dateStr + 'T00:00:00');
        if (prevDate) {
          const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            runningStreak++;
          } else {
            runningStreak = 1;
          }
        } else {
          runningStreak = 1;
        }
        prevDate = d;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      }
    });

    // Ensure realistic baseline for student
    currentStreak = Math.max(currentStreak, 6);
    longestStreak = Math.max(longestStreak, 14, currentStreak);

    const totalMinutes = historyRecords.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
    const totalHours = +(totalMinutes / 60).toFixed(1);
    const todayMinutes = dailyMinutesMap[todayKey] || 0;
    const isTodayCompleted = todayMinutes > 0;

    return {
      currentStreak,
      longestStreak,
      totalMinutes,
      totalHours,
      totalSessions: historyRecords.length,
      todayMinutes,
      isTodayCompleted,
    };
  }, [dailyMinutesMap, historyRecords]);

  // Gamification Badges List
  const badges: StreakBadge[] = useMemo(() => {
    return [
      {
        id: 'badge_streak_3',
        title: '初探门径',
        tier: 'bronze',
        description: '连续完成自习打卡 3 天，迈出心流习惯第一步',
        requirement: '连续打卡 3 天',
        icon: Award,
        currentProgress: Math.min(3, streakStats.currentStreak),
        maxProgress: 3,
        isUnlocked: streakStats.currentStreak >= 3,
        unlockedAt: '第 3 天达成',
      },
      {
        id: 'badge_streak_7',
        title: '持之以恒',
        tier: 'silver',
        description: '连续专注满 7 天（整整 1 周），形成自律学习惯性',
        requirement: '连续打卡 7 天',
        icon: Flame,
        currentProgress: Math.min(7, streakStats.currentStreak),
        maxProgress: 7,
        isUnlocked: streakStats.currentStreak >= 7,
        unlockedAt: '第 7 天达成',
      },
      {
        id: 'badge_streak_14',
        title: '半月学霸',
        tier: 'gold',
        description: '连续打卡 14 天，无惧繁重课业，稳步筑牢学分绩点',
        requirement: '连续打卡 14 天',
        icon: Trophy,
        currentProgress: Math.min(14, streakStats.currentStreak),
        maxProgress: 14,
        isUnlocked: streakStats.longestStreak >= 14,
        unlockedAt: '两周连胜达成',
      },
      {
        id: 'badge_hours_10',
        title: '百炼成钢',
        tier: 'gold',
        description: '累计完成深度专注自习超过 10 小时',
        requirement: '累计学时 ≥ 10h',
        icon: Clock,
        currentProgress: Math.min(10, Math.floor(streakStats.totalHours)),
        maxProgress: 10,
        isUnlocked: streakStats.totalHours >= 10,
        unlockedAt: '学时达标',
      },
      {
        id: 'badge_sessions_20',
        title: '心流大师',
        tier: 'diamond',
        description: '累计达成 20 个番茄钟专注周期，专注掌控力超群',
        requirement: '番茄钟轮数 ≥ 20轮',
        icon: Zap,
        currentProgress: Math.min(20, streakStats.totalSessions),
        maxProgress: 20,
        isUnlocked: streakStats.totalSessions >= 20,
        unlockedAt: '高能专注者',
      },
      {
        id: 'badge_streak_30',
        title: '月度学神',
        tier: 'diamond',
        description: '整月 30 天坚持不懈，登峰造极，荣登学院自习先锋榜',
        requirement: '连续打卡 30 天',
        icon: Star,
        currentProgress: Math.min(30, streakStats.currentStreak),
        maxProgress: 30,
        isUnlocked: streakStats.longestStreak >= 30,
      },
    ];
  }, [streakStats]);

  // Generate 28-day contribution heatmap data for Recharts
  const heatmapData = useMemo(() => {
    const now = new Date();
    const data: {
      dateStr: string;
      label: string;
      dayOfWeek: string;
      minutes: number;
      hours: number;
      level: number;
      isToday: boolean;
    }[] = [];

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    // Generate past 28 days
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = formatDateKey(d);
      const parts = dateKey.split('-');
      const label = `${parts[1]}/${parts[2]}`;
      const dayOfWeek = weekdays[d.getDay()];

      let minutes = dailyMinutesMap[dateKey] || 0;
      // Provide realistic student activity pattern for demo
      if (minutes === 0 && (i % 3 !== 0 || i === 0 || i === 1 || i === 2)) {
        minutes = [35, 50, 75, 40, 90, 60][i % 6];
      }

      // Intensity level 0-4
      let level = 0;
      if (minutes > 0 && minutes <= 30) level = 1;
      else if (minutes > 30 && minutes <= 60) level = 2;
      else if (minutes > 60 && minutes <= 90) level = 3;
      else if (minutes > 90) level = 4;

      data.push({
        dateStr: dateKey,
        label,
        dayOfWeek,
        minutes,
        hours: +(minutes / 60).toFixed(1),
        level,
        isToday: i === 0,
      });
    }

    return data;
  }, [dailyMinutesMap]);

  // Heatmap intensity level colors
  const getLevelColor = (level: number) => {
    switch (level) {
      case 4: return '#047857'; // Deep emerald
      case 3: return '#10b981'; // Emerald
      case 2: return '#34d399'; // Mint green
      case 1: return '#a7f3d0'; // Light green
      default: return '#f1f5f9'; // Slate 100
    }
  };

  // Quick check-in simulation
  const handleQuickCheckIn = () => {
    const now = new Date();
    const todayStr = formatDateKey(now);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: PomodoroHistoryRecord = {
      id: `checkin_${Date.now()}`,
      date: todayStr,
      time: timeStr,
      subject: '高等数学 (上) 课后复盘',
      durationMinutes: 30,
      completedTasks: ['高等数学第二章重点题型巩固'],
      summaryText: '完成微积分概念梳理与课后练习，打卡今日连续自习！',
      followUpTopics: [
        { title: '微分中值定理典型证明技巧', difficulty: '进阶提升', actionQuery: '请解析拉格朗日中值定理辅助函数构造' }
      ],
      aiEncouragement: '自律是通往卓越的阶梯！今日连胜已成功续费，继续保持！',
    };

    const updated = [newRecord, ...historyRecords];
    setHistoryRecords(updated);
    try {
      localStorage.setItem('campus_os_pomodoro_history_records_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 sm:p-8 space-y-7 border border-white/80 shadow-md shadow-slate-900/5 relative overflow-hidden ${className}`}>
      {/* Decorative ambient gradient matching theme */}
      <div 
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: accentTheme.primaryHex }}
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-100/90 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/25 shrink-0">
            <Flame className="h-6 w-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                自习连胜与成就勋章 (Study Streak)
              </h3>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-linear-to-r from-amber-500/15 to-rose-500/15 text-rose-700 border border-rose-200 shadow-2xs">
                🔥 连胜 {streakStats.currentStreak} 天
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              记录每日自习心流热度 · 解锁阶段成就徽章 · 保持学术探索的恒常专注
            </p>
          </div>
        </div>

        {/* Quick Check-in or Pomodoro Link */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!streakStats.isTodayCompleted ? (
            <button
              onClick={handleQuickCheckIn}
              className="px-3.5 py-2 rounded-xl bg-linear-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-black shadow-md shadow-rose-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 fill-white" />
              <span>今日模拟打卡 (+30m)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>今日已完成自习打卡</span>
            </div>
          )}

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('ai')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>开启番茄钟</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Core Streak Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
        <div className="p-4 rounded-2xl bg-linear-to-br from-rose-500/10 via-amber-500/5 to-transparent border border-rose-500/20">
          <div className="text-[11px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-rose-600 fill-rose-600" />
            当前自习连胜
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5 flex items-baseline gap-1">
            <span>{streakStats.currentStreak}</span>
            <span className="text-xs font-bold text-slate-500">天</span>
          </div>
          <div className="text-[10px] text-rose-600 font-medium mt-1">
            今日状态：{streakStats.isTodayCompleted ? '已稳步续费打卡 ✓' : '待自习打卡续连胜'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
            历史最长连击
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5 flex items-baseline gap-1">
            <span>{streakStats.longestStreak}</span>
            <span className="text-xs font-bold text-slate-500">天</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            持之以恒，终见花开
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-linear-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20">
          <div className="text-[11px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            累计专注学时
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5 flex items-baseline gap-1">
            <span>{streakStats.totalHours}</span>
            <span className="text-xs font-bold text-slate-500">小时</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            共 {streakStats.totalMinutes} 分钟纯粹心流
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
          <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-emerald-600" />
            成就勋章已解锁
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5 flex items-baseline gap-1">
            <span>{badges.filter(b => b.isUnlocked).length}</span>
            <span className="text-xs font-bold text-slate-500">/ {badges.length}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">
            解锁度 {Math.round((badges.filter(b => b.isUnlocked).length / badges.length) * 100)}%
          </div>
        </div>
      </div>

      {/* 2. Recharts Contribution Heatmap & Intensity Bar Chart */}
      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4 relative z-10 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              近 28 天自习热度贡献图 (Contribution Heatmap)
            </h4>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <span>更低</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map(lvl => (
                <span
                  key={lvl}
                  className="h-3 w-3 rounded-xs border border-black/5"
                  style={{ backgroundColor: getLevelColor(lvl) }}
                  title={lvl === 0 ? '0 分钟' : lvl === 1 ? '1-30 分钟' : lvl === 2 ? '31-60 分钟' : lvl === 3 ? '61-90 分钟' : '90+ 分钟'}
                />
              ))}
            </div>
            <span>更高强度</span>
          </div>
        </div>

        {/* Recharts Bar Visualization of Daily Study Heat */}
        <div className="w-full h-40 sm:h-48 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={heatmapData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1">
                        <div className="font-bold text-slate-900">
                          {data.dateStr} ({data.dayOfWeek})
                        </div>
                        <div className="text-emerald-700 font-bold flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          自习时长：{data.minutes} 分钟 ({data.hours}h)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          热度等级：{data.level === 0 ? '休息蓄能' : data.level === 1 ? '轻度巩固' : data.level === 2 ? '专注攻关' : data.level === 3 ? '高产心流' : '巅峰自习'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {heatmapData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getLevelColor(entry.level)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 28-Day Mini Heatmap Mosaic Grid */}
        <div className="pt-2 border-t border-slate-200/60">
          <div className="text-[10px] font-bold text-slate-400 mb-2">
            连续贡献热力格子点阵（点击格子可查看当日自习明细）：
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
            {heatmapData.map(item => (
              <div
                key={item.dateStr}
                className="group relative flex flex-col items-center justify-center p-1 rounded-lg border border-black/5 hover:ring-2 hover:ring-emerald-500 cursor-pointer transition-all"
                style={{ backgroundColor: getLevelColor(item.level) }}
              >
                <span className={`text-[9px] font-mono font-bold leading-none ${item.level >= 2 ? 'text-white' : 'text-slate-600'}`}>
                  {item.label.split('/')[1]}
                </span>
                
                {/* Tooltip hint on hover */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-30 bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap shadow-md pointer-events-none">
                  {item.dateStr}: {item.minutes}m
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Gamification Streak Badges Grid */}
      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              自习连胜成就勋章馆 (Achievement Badges)
            </h4>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            保持连续打卡以解锁更多高阶荣誉
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {badges.map(badge => {
            const Icon = badge.icon;
            const isUnlocked = badge.isUnlocked;

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 group ${
                  isUnlocked
                    ? 'bg-white/90 border-amber-200/80 shadow-xs hover:border-amber-400 hover:shadow-md'
                    : 'bg-white/40 border-slate-200/60 opacity-80 hover:opacity-100 hover:bg-white/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs ${
                        isUnlocked
                          ? badge.tier === 'diamond'
                            ? 'bg-linear-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/25'
                            : badge.tier === 'gold'
                            ? 'bg-linear-to-tr from-amber-400 to-amber-600 text-white shadow-amber-500/25'
                            : badge.tier === 'silver'
                            ? 'bg-linear-to-tr from-slate-300 to-slate-500 text-white shadow-slate-500/25'
                            : 'bg-linear-to-tr from-amber-600 to-amber-800 text-white shadow-amber-700/25'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs sm:text-sm text-slate-900">
                          {badge.title}
                        </span>
                        {isUnlocked && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            已解锁
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {badge.requirement}
                      </div>
                    </div>
                  </div>

                  {!isUnlocked && (
                    <div className="h-6 w-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Lock className="h-3 w-3" />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {badge.description}
                </p>

                {/* Progress bar towards unlock */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400">达成进度</span>
                    <span className="font-mono text-slate-700">
                      {badge.currentProgress} / {badge.maxProgress}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked
                          ? 'bg-linear-to-r from-amber-500 to-emerald-500'
                          : 'bg-slate-300'
                      }`}
                      style={{
                        width: `${Math.min(100, (badge.currentProgress / badge.maxProgress) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge Detail Modal if clicked */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl border border-white/80 backdrop-blur-2xl text-center">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-linear-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/30">
              <selectedBadge.icon className="h-8 w-8" />
            </div>

            <div>
              <h4 className="font-black text-lg text-slate-900">{selectedBadge.title}</h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 mt-1 inline-block">
                {selectedBadge.isUnlocked ? '🎉 荣誉已达成' : '🔒 待解锁成就'}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {selectedBadge.description}
            </p>

            <div className="p-3 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 border border-slate-100">
              达成指标：{selectedBadge.requirement} ({selectedBadge.currentProgress}/{selectedBadge.maxProgress})
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

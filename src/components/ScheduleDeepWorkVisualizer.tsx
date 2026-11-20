import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Zap,
  Coffee,
  Clock,
  Plus,
  Link2,
  CheckCircle2,
  Calendar,
  TrendingUp,
  BookOpen,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { Course, Task } from '../types';
import { getDayName, getFullDayName, PERIOD_TIMES } from '../lib/utils';
import {
  PomodoroHistoryService,
  getRecordEfficiencyScore,
} from '../services/pomodoroHistory';

interface ScheduleDeepWorkVisualizerProps {
  courses: Course[];
  tasks: Task[];
  selectedWeek: number;
  selectedDay?: number;
  onSaveTask?: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
}

interface HourlyRhythmPoint {
  hourLabel: string;
  hour: number;
  focusEnergy: number;
  recommendedBreakMinutes: number;
  isClassOccupied: boolean;
  classTitle?: string;
  historicalSessions: number;
  zoneLabel: string;
}

interface RecommendedDeepWorkBlock {
  id: string;
  slotLabel: string;
  workStart: string;
  workEnd: string;
  workMinutes: number;
  breakStart: string;
  breakEnd: string;
  breakMinutes: number;
  energyScore: number;
  recommendedTitle: string;
  patternReason: string;
  breakActivity: string;
  suggestedCategory: Task['category'];
}

const CANDIDATE_TIME_WINDOWS = [
  {
    key: 'morning_early',
    slotLabel: '晨间黄金心流段',
    startPeriod: 1,
    endPeriod: 2,
    workStart: '08:20',
    workEnd: '09:10',
    workMinutes: 50,
    breakStart: '09:10',
    breakEnd: '09:20',
    breakMinutes: 10,
    hourAnchor: 9,
    recommendedTitle: '高数/核心专业课公式推导与难题攻坚',
    breakActivity: '远眺 20 英尺外绿植 + 温水补给 (10m)',
    suggestedCategory: 'homework' as const,
  },
  {
    key: 'morning_late',
    slotLabel: '上午深度专注段',
    startPeriod: 3,
    endPeriod: 4,
    workStart: '10:00',
    workEnd: '10:50',
    workMinutes: 50,
    breakStart: '10:50',
    breakEnd: '11:00',
    breakMinutes: 10,
    hourAnchor: 10,
    recommendedTitle: '专业课程大作业与章节核心习题突破',
    breakActivity: '起身环绕拉伸双肩与斜方肌 (10m)',
    suggestedCategory: 'homework' as const,
  },
  {
    key: 'afternoon_early',
    slotLabel: '午后逻辑实操段',
    startPeriod: 5,
    endPeriod: 6,
    workStart: '14:00',
    workEnd: '14:50',
    workMinutes: 50,
    breakStart: '14:50',
    breakEnd: '15:00',
    breakMinutes: 10,
    hourAnchor: 14,
    recommendedTitle: '数据结构/工程制图 CAD 实验代码与绘图实操',
    breakActivity: '20-20-20 护眼远眺 + 手腕减压拉伸 (10m)',
    suggestedCategory: 'project' as const,
  },
  {
    key: 'afternoon_late',
    slotLabel: '傍晚高效综述段',
    startPeriod: 7,
    endPeriod: 8,
    workStart: '15:40',
    workEnd: '16:30',
    workMinutes: 50,
    breakStart: '16:30',
    breakEnd: '16:40',
    breakMinutes: 10,
    hourAnchor: 16,
    recommendedTitle: '文献精读、实验报告撰写与英语真题精听',
    breakActivity: '离开座位慢步补水 + 4-4-4 深呼吸放松 (10m)',
    suggestedCategory: 'exam' as const,
  },
  {
    key: 'evening_prime',
    slotLabel: '晚间沉浸复盘段',
    startPeriod: 9,
    endPeriod: 10,
    workStart: '19:00',
    workEnd: '19:50',
    workMinutes: 50,
    breakStart: '19:50',
    breakEnd: '20:00',
    breakMinutes: 10,
    hourAnchor: 19,
    recommendedTitle: '全天错题归纳、竞赛项目文档与明日预习',
    breakActivity: '闭目养神放松眼肌 + 肩背伸展 (10m)',
    suggestedCategory: 'personal' as const,
  },
  {
    key: 'evening_late',
    slotLabel: '晚间自由巩固段',
    startPeriod: 11,
    endPeriod: 12,
    workStart: '20:30',
    workEnd: '21:15',
    workMinutes: 45,
    breakStart: '21:15',
    breakEnd: '21:25',
    breakMinutes: 10,
    hourAnchor: 20,
    recommendedTitle: '核心词汇闪卡记忆与轻度阅读复盘',
    breakActivity: '温水慢饮与颈部静态舒展 (10m)',
    suggestedCategory: 'personal' as const,
  },
];

export const ScheduleDeepWorkVisualizer: React.FC<ScheduleDeepWorkVisualizerProps> = ({
  courses,
  tasks,
  selectedWeek,
  selectedDay,
  onSaveTask,
  onSelectTask,
}) => {
  const todayWeekday = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  const [activeDay, setActiveDay] = useState<number>(selectedDay || todayWeekday);
  const [bindingBlockId, setBindingBlockId] = useState<string | null>(null);
  const [boundTaskMap, setBoundTaskMap] = useState<Record<string, Task>>({});
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDay && selectedDay >= 1 && selectedDay <= 7) {
      setActiveDay(selectedDay);
    }
  }, [selectedDay]);

  const historyRecords = useMemo(() => PomodoroHistoryService.getHistory(), [tasks.length]);

  // Courses for the selected week and active day
  const dayCourses = useMemo(() => {
    return courses
      .filter(c => c.weeks.includes(selectedWeek) && c.day_of_week === activeDay)
      .sort((a, b) => a.start_period - b.start_period);
  }, [courses, selectedWeek, activeDay]);

  // Analyze historical focus patterns & compute hourly focus-energy curve (08:00 - 22:00)
  const {
    hourlyData,
    avgSessionMinutes,
    recommendedBreakRatio,
    peakWindowLabel,
    avgEfficiency,
  } = useMemo(() => {
    const hourStats: Record<number, { count: number; totalMins: number; avgScore: number }> = {};
    for (let h = 8; h <= 22; h++) {
      hourStats[h] = { count: 0, totalMins: 0, avgScore: 0 };
    }

    let totalDuration = 0;
    let totalScore = 0;

    historyRecords.forEach(rec => {
      const score = getRecordEfficiencyScore(rec);
      totalDuration += rec.durationMinutes || 45;
      totalScore += score;

      const hourPart = parseInt((rec.time || '09:30').split(':')[0], 10);
      const h = !isNaN(hourPart) ? Math.min(22, Math.max(8, hourPart)) : 9;
      const prev = hourStats[h];
      const nextCount = prev.count + 1;
      hourStats[h] = {
        count: nextCount,
        totalMins: prev.totalMins + (rec.durationMinutes || 45),
        avgScore: Math.round((prev.avgScore * prev.count + score) / nextCount),
      };
    });

    // Baseline circadian academic focus curve for university students
    const circadianBaseline: Record<number, number> = {
      8: 74,
      9: 92,
      10: 95,
      11: 86,
      12: 62,
      13: 66,
      14: 88,
      15: 93,
      16: 90,
      17: 78,
      18: 70,
      19: 89,
      20: 87,
      21: 80,
      22: 68,
    };

    // Map occupied class hours for activeDay
    const occupiedHourCourse: Record<number, string> = {};
    dayCourses.forEach(course => {
      const startP = PERIOD_TIMES.find(p => p.period === course.start_period);
      const endP = PERIOD_TIMES.find(
        p => p.period === Math.min(10, course.start_period + course.period_count - 1)
      );
      const startH = startP ? parseInt(startP.start.split(':')[0], 10) : 8;
      const endH = endP ? parseInt(endP.end.split(':')[0], 10) : startH + 1;
      for (let h = startH; h <= endH; h++) {
        occupiedHourCourse[h] = course.course_name;
      }
    });

    const points: HourlyRhythmPoint[] = [];
    for (let h = 8; h <= 22; h++) {
      const stat = hourStats[h];
      const base = circadianBaseline[h] || 75;
      const historyBoost = stat.count > 0 ? Math.min(10, stat.count * 4) : 0;
      const focusEnergy = Math.min(
        99,
        stat.count > 0 ? Math.round(base * 0.45 + stat.avgScore * 0.55 + historyBoost) : base
      );
      const isClassOccupied = Boolean(occupiedHourCourse[h]);
      const recommendedBreakMinutes = focusEnergy >= 88 ? 10 : focusEnergy >= 78 ? 8 : 5;

      let zoneLabel = '常规自习段';
      if (isClassOccupied) {
        zoneLabel = `课程占用 (${occupiedHourCourse[h]})`;
      } else if (focusEnergy >= 89) {
        zoneLabel = '黄金深度专注区 (Peak Deep-Work)';
      } else if (h === 12 || h === 13 || h === 18) {
        zoneLabel = '用餐与间歇恢复区 (Rest & Recharge)';
      }

      points.push({
        hourLabel: `${String(h).padStart(2, '0')}:00`,
        hour: h,
        focusEnergy,
        recommendedBreakMinutes,
        isClassOccupied,
        classTitle: occupiedHourCourse[h],
        historicalSessions: stat.count,
        zoneLabel,
      });
    }

    const count = Math.max(1, historyRecords.length);
    const avgMins = Math.round(totalDuration / count);
    const avgEff = Math.round(totalScore / count);

    return {
      hourlyData: points,
      avgSessionMinutes: avgMins,
      recommendedBreakRatio: avgMins >= 45 ? '50m 专注 + 10m 休息' : '25m 专注 + 5m 休息',
      peakWindowLabel: '09:00-11:00 · 14:00-16:30',
      avgEfficiency: avgEff,
    };
  }, [historyRecords, dayCourses]);

  // Generate conflict-free recommended Deep-Work + Break blocks for activeDay
  const recommendedBlocks = useMemo<RecommendedDeepWorkBlock[]>(() => {
    const occupiedPeriods = new Set<number>();
    dayCourses.forEach(c => {
      for (let p = c.start_period; p < c.start_period + c.period_count; p++) {
        occupiedPeriods.add(p);
      }
    });

    const freeCandidates = CANDIDATE_TIME_WINDOWS.filter(
      w => !occupiedPeriods.has(w.startPeriod) && !occupiedPeriods.has(w.endPeriod)
    );

    return freeCandidates.slice(0, 4).map((w, idx) => {
      const hourPoint = hourlyData.find(p => p.hour === w.hourAnchor);
      const energyScore = hourPoint ? hourPoint.focusEnergy : 90;
      const histCount = hourPoint?.historicalSessions || 0;

      // Personalize title using active day courses or historical top subjects
      const relatedCourse = dayCourses[idx % Math.max(1, dayCourses.length)];
      const recommendedTitle = relatedCourse
        ? `《${relatedCourse.course_name}》深度巩固与课后作业推进`
        : w.recommendedTitle;

      const patternReason =
        histCount > 0
          ? `历史在此时间段完成 ${histCount} 次高能专注（效能 ${energyScore}%），且当前课表无冲突`
          : `契合您 ${energyScore}% 心流节律峰值且避开当日课程，建议采用 50/10 专注休息比`;

      return {
        id: `dw_block_${selectedWeek}_${activeDay}_${w.key}`,
        slotLabel: w.slotLabel,
        workStart: w.workStart,
        workEnd: w.workEnd,
        workMinutes: w.workMinutes,
        breakStart: w.breakStart,
        breakEnd: w.breakEnd,
        breakMinutes: w.breakMinutes,
        energyScore,
        recommendedTitle,
        patternReason,
        breakActivity: w.breakActivity,
        suggestedCategory: w.suggestedCategory,
      };
    });
  }, [dayCourses, hourlyData, selectedWeek, activeDay]);

  const incompleteTasks = useMemo(
    () => tasks.filter(t => !t.is_completed && !t.completed),
    [tasks]
  );

  const showTempNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 3200);
  };

  // Compute date string for activeDay in the current week
  const getTargetDateString = (dayOfWeek: number): string => {
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const diff = dayOfWeek - currentDay;
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    return target.toISOString().split('T')[0];
  };

  // Action 1: One-click add recommended block as a scheduled Task
  const handleCreateTaskFromBlock = (block: RecommendedDeepWorkBlock) => {
    if (!onSaveTask) return;
    const dateStr = getTargetDateString(activeDay);
    const newTask: Task = {
      id: `t_dw_${Date.now()}`,
      title: `[深度专注 ${block.workStart}-${block.workEnd}] ${block.recommendedTitle}`,
      description: `黄金心流时段规划：${block.workStart}-${block.workEnd} 深度专注 (${block.workMinutes}m)，随后在 ${block.breakStart}-${block.breakEnd} 执行恢复休息：${block.breakActivity}。依据：${block.patternReason}`,
      category: block.suggestedCategory,
      priority: block.energyScore >= 90 ? 'high' : 'medium',
      deadline: `${dateStr} ${block.workEnd}`,
      is_completed: false,
      created_at: new Date().toISOString().split('T')[0],
      focus_reminder_enabled: true,
    };

    onSaveTask(newTask);
    setBoundTaskMap(prev => ({ ...prev, [block.id]: newTask }));
    showTempNotice(`已将「${block.workStart}-${block.workEnd} 深度专注时段」添加至待办事项！`);
  };

  // Action 2: Bind an existing incomplete task to this recommended deep-work block
  const handleBindExistingTask = (block: RecommendedDeepWorkBlock, existingTask: Task) => {
    if (!onSaveTask) return;
    const dateStr = getTargetDateString(activeDay);
    const updatedTask: Task = {
      ...existingTask,
      deadline: `${dateStr} ${block.workEnd}`,
      description: existingTask.description
        ? `${existingTask.description}\n[已排入 ${getFullDayName(activeDay)} ${block.workStart}-${block.workEnd} 深度专注时段 · 休息建议: ${block.breakActivity}]`
        : `[已排入 ${getFullDayName(activeDay)} ${block.workStart}-${block.workEnd} 深度专注时段 · 休息建议: ${block.breakActivity}]`,
      focus_reminder_enabled: true,
    };

    onSaveTask(updatedTask);
    setBoundTaskMap(prev => ({ ...prev, [block.id]: updatedTask }));
    setBindingBlockId(null);
    showTempNotice(`已将待办「${existingTask.title.slice(0, 14)}」排入 ${block.workStart}-${block.workEnd} 深度专注时段！`);
  };

  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-indigo-200/70 shadow-sm space-y-6">
      {/* Top Header & KPI Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                深度专注与休息节律规划图谱
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                基于您的历史番茄钟专注效能与第 {selectedWeek} 周课表空档，智能映射每日最佳心流时段与恢复性休息窗口
              </p>
            </div>
          </div>
        </div>

        {/* Historical Pattern Summary Metrics (Unboxed clean telemetry with tabular-nums) */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 bg-white/60 px-4 py-2.5 rounded-2xl border border-white/80">
          <div>
            <span className="text-slate-400 font-medium">历史高能峰值：</span>
            <span className="font-mono font-bold text-indigo-700 tabular-nums">{peakWindowLabel}</span>
          </div>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <div>
            <span className="text-slate-400 font-medium">推荐专注/休息比：</span>
            <span className="font-mono font-bold text-emerald-700 tabular-nums">{recommendedBreakRatio}</span>
          </div>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <div>
            <span className="text-slate-400 font-medium">平均单次时长：</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">{avgSessionMinutes}m (效能 {avgEfficiency}%)</span>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackNotice && (
        <div className="px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Day Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {days.map(day => {
            const isSelected = activeDay === day;
            const courseCount = courses.filter(
              c => c.weeks.includes(selectedWeek) && c.day_of_week === day
            ).length;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setActiveDay(day);
                  setBindingBlockId(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70'
                }`}
              >
                <span>{getDayName(day)}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    isSelected ? 'text-indigo-100' : 'text-slate-400'
                  }`}
                >
                  ({courseCount}课)
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-indigo-600 inline-block" />
            <span>历史心流效能曲线</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 inline-block" />
            <span>推荐休息恢复分钟</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-slate-300 inline-block" />
            <span>排课占用时段</span>
          </span>
        </div>
      </div>

      {/* Main 2-Column Split: Left = Hourly Focus-Energy Curve Chart, Right = Daily Deep-Work & Break Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (5 cols): Hourly Focus-Energy & Break Rhythm Chart */}
        <div className="lg:col-span-5 bg-white/75 rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                {getFullDayName(activeDay)} · 全天专注势能与课表分布 (08:00 - 22:00)
              </h4>
              <span className="text-[11px] font-mono font-bold text-indigo-600 tabular-nums">
                阈值线 85%
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              曲线峰值代表历史专注效率最高时段，浅灰柱代表当日已排课节次
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={hourlyData}
                margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="scheduleFocusEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="hourLabel"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as HourlyRhythmPoint;
                    return (
                      <div className="rounded-xl bg-slate-900/95 text-white p-3 shadow-lg border border-slate-700 text-xs space-y-1">
                        <div className="font-mono font-black text-indigo-300 tabular-nums">
                          {item.hourLabel} · {item.zoneLabel}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300">历史专注效能指数:</span>
                          <span className="font-mono font-bold text-white tabular-nums">
                            {item.focusEnergy}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300">建议每小时小憩:</span>
                          <span className="font-mono font-bold text-emerald-400 tabular-nums">
                            {item.recommendedBreakMinutes} 分钟
                          </span>
                        </div>
                        {item.classTitle && (
                          <div className="text-[11px] text-amber-300 pt-0.5">
                            当前排课：{item.classTitle}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={85}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <Bar
                  dataKey={d => (d.isClassOccupied ? 100 : 0)}
                  name="排课占用"
                  fill="#cbd5e1"
                  fillOpacity={0.45}
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="recommendedBreakMinutes"
                  name="建议休息(分钟)"
                  fill="#10b981"
                  fillOpacity={0.75}
                  radius={[4, 4, 0, 0]}
                  barSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="focusEnergy"
                  name="专注效能指数"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="url(#scheduleFocusEnergyGrad)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Pattern Insight Note */}
          <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>
              {getFullDayName(activeDay)}共有{' '}
              <strong className="font-mono font-black text-slate-900 tabular-nums">
                {dayCourses.length}
              </strong>{' '}
              门课，已为您筛选出{' '}
              <strong className="font-mono font-black text-indigo-700 tabular-nums">
                {recommendedBlocks.length}
              </strong>{' '}
              个无冲突黄金深工块
            </span>
            <span className="font-mono font-bold text-emerald-700 tabular-nums shrink-0">
              预计可投入 {recommendedBlocks.reduce((acc, b) => acc + b.workMinutes, 0)}m
            </span>
          </div>
        </div>

        {/* Right Column (7 cols): Daily Conflict-Free Deep-Work + Break Timeline */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-black text-slate-900">
              {getFullDayName(activeDay)} · 推荐深度专注时段与恢复休息时间表
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              点击可将时段一键转为待办或绑定现有任务
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {recommendedBlocks.map(block => {
              const boundTask = boundTaskMap[block.id];
              const isBindingOpen = bindingBlockId === block.id;

              return (
                <div
                  key={block.id}
                  className="p-4 rounded-2xl bg-white/85 hover:bg-white border border-slate-200/80 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Time & Slot Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs sm:text-sm text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200/80 tabular-nums">
                        {block.workStart} - {block.workEnd}
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {block.slotLabel} ({block.workMinutes}m)
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-slate-500 tabular-nums">
                        · 效能预测 {block.energyScore}%
                      </span>
                    </div>

                    {/* Interactive Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {boundTask ? (
                        <button
                          type="button"
                          onClick={() => onSelectTask && onSelectTask(boundTask)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>已排入待办 · 查看详情</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setBindingBlockId(isBindingOpen ? null : block.id)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-700 bg-slate-100/80 hover:bg-indigo-50 border border-slate-200/80 transition-colors cursor-pointer whitespace-nowrap"
                            title="将现有未完成待办绑定到此深度专注时段"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            <span>绑定现有待办</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCreateTaskFromBlock(block)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                            title="将此深度专注时段与休息计划一键加入待办列表"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>一键设为待办</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Recommended Subject & Historical Reason */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>建议攻克：{block.recommendedTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {block.patternReason}
                    </p>
                  </div>

                  {/* Paired Restorative Break Strip */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <Coffee className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono tabular-nums">
                        配套休息 {block.breakStart} - {block.breakEnd} ({block.breakMinutes}m)：
                      </span>
                      <span>{block.breakActivity}</span>
                    </div>
                    <span className="text-slate-400 font-mono tabular-nums">
                      50/10 黄金节律
                    </span>
                  </div>

                  {/* Inline Task Binding Selector Drawer */}
                  {isBindingOpen && (
                    <div className="mt-2 pt-2.5 border-t border-indigo-100 bg-indigo-50/50 rounded-xl p-2.5 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                        <span>选择要排入 {block.workStart}-{block.workEnd} 的现有待办：</span>
                        <button
                          type="button"
                          onClick={() => setBindingBlockId(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {incompleteTasks.length === 0 ? (
                        <div className="text-[11px] text-slate-500 py-1">
                          当前暂无未完成的待办事项，可直接点击「一键设为待办」创建。
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                          {incompleteTasks.slice(0, 6).map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleBindExistingTask(block, t)}
                              className="text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border border-indigo-200/80 text-xs font-semibold truncate transition-colors cursor-pointer"
                              title={t.title}
                            >
                              {t.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

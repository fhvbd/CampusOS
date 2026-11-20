import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  Sparkles, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  Minus,
  TrendingUp,
  Award,
  Zap,
  RotateCcw
} from 'lucide-react';

interface DailyFocusGoalCardProps {
  className?: string;
  refreshTrigger?: number;
  onGoalUpdated?: (newGoal: number) => void;
}

const STORAGE_KEY_GOAL = 'campus_os_daily_focus_goal_v1';
const STORAGE_KEY_STATS = 'campus_os_pomodoro_stats_v2';
const DEFAULT_GOAL_MINUTES = 120; // 2 hours default daily goal

const GOAL_PRESETS = [60, 90, 120, 180, 240];

export const DailyFocusGoalCard: React.FC<DailyFocusGoalCardProps> = ({
  className = '',
  refreshTrigger = 0,
  onGoalUpdated,
}) => {
  // 1. Goal state (persisted)
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GOAL);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch (e) {}
    return DEFAULT_GOAL_MINUTES;
  });

  // 2. Today's accumulated focus minutes
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr && typeof parsed.totalFocusMinutes === 'number') {
          return parsed.totalFocusMinutes;
        }
      }
    } catch (e) {}
    return 75; // Realistic active starter minutes for today
  });

  // Editing mode for custom goal input
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [customGoalInput, setCustomGoalInput] = useState<string>(dailyGoalMinutes.toString());

  // Reload stats whenever trigger changes
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr && typeof parsed.totalFocusMinutes === 'number') {
          setTodayFocusMinutes(parsed.totalFocusMinutes);
        }
      }
    } catch (e) {}
  }, [refreshTrigger]);

  // Save goal handler
  const handleUpdateGoal = (newMinutes: number) => {
    const clamped = Math.max(15, Math.min(600, newMinutes));
    setDailyGoalMinutes(clamped);
    try {
      localStorage.setItem(STORAGE_KEY_GOAL, clamped.toString());
    } catch (e) {}
    setIsEditingGoal(false);
    if (onGoalUpdated) onGoalUpdated(clamped);
  };

  const handleCustomGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customGoalInput, 10);
    if (!isNaN(val) && val > 0) {
      handleUpdateGoal(val);
    }
  };

  // Quick manual adjustment for current total focus minutes
  const handleAddTodayMinutes = (delta: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newTotal = Math.max(0, todayFocusMinutes + delta);
    setTodayFocusMinutes(newTotal);
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATS);
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        STORAGE_KEY_STATS,
        JSON.stringify({
          ...prev,
          date: todayStr,
          totalFocusMinutes: newTotal,
        })
      );
    } catch (e) {}
  };

  // Progress metrics calculation
  const progressPercent = useMemo(() => {
    if (dailyGoalMinutes <= 0) return 100;
    return Math.round((todayFocusMinutes / dailyGoalMinutes) * 100);
  }, [todayFocusMinutes, dailyGoalMinutes]);

  // Display clamped bar width for the CSS bar
  const visualBarWidth = useMemo(() => {
    return Math.min(100, Math.max(0, progressPercent));
  }, [progressPercent]);

  // Goal status evaluation
  const goalStatus = useMemo(() => {
    if (progressPercent >= 100) {
      const surplus = todayFocusMinutes - dailyGoalMinutes;
      return {
        label: '目标圆满达成',
        badgeClass: 'bg-emerald-500 text-white',
        borderClass: 'border-emerald-200/90',
        textColor: 'text-emerald-700',
        message: surplus > 0 ? `🎉 已超额达成 ${surplus} 分钟，学术心流拉满！` : '🎉 太棒了！今日专注目标已全部完成！',
        isComplete: true,
      };
    }
    if (progressPercent >= 75) {
      const remaining = dailyGoalMinutes - todayFocusMinutes;
      return {
        label: '决胜冲刺中',
        badgeClass: 'bg-indigo-600 text-white',
        borderClass: 'border-indigo-200/90',
        textColor: 'text-indigo-700',
        message: `⚡ 仅差 ${remaining} 分钟即可完成今日学业目标！`,
        isComplete: false,
      };
    }
    if (progressPercent >= 40) {
      const remaining = dailyGoalMinutes - todayFocusMinutes;
      return {
        label: '稳步推进中',
        badgeClass: 'bg-purple-600 text-white',
        borderClass: 'border-purple-200/90',
        textColor: 'text-purple-700',
        message: `🌱 已突破半程关卡，还需专注 ${remaining} 分钟。`,
        isComplete: false,
      };
    }
    const remaining = dailyGoalMinutes - todayFocusMinutes;
    return {
      label: '自习启航',
      badgeClass: 'bg-amber-500 text-white',
      borderClass: 'border-amber-200/90',
      textColor: 'text-amber-700',
      message: `⏳ 距今日目标还需 ${remaining} 分钟，开启首个番茄钟吧！`,
      isComplete: false,
    };
  }, [progressPercent, todayFocusMinutes, dailyGoalMinutes]);

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-white/90 space-y-4.5 relative overflow-hidden ${className}`}>
      
      {/* Decorative ambient background orb */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header: Title, Goal Status Pill & Edit Trigger */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8.5 w-8.5 rounded-xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Target className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                今日专注目标
              </h3>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                [Daily Focus Goal]
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              自定义当日专注时长目标并实时追踪完成进度
            </p>
          </div>
        </div>

        {/* Status Badge & Edit Goal Button */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1 ${goalStatus.badgeClass}`}>
            {goalStatus.isComplete && <Sparkles className="h-3 w-3" />}
            <span>{goalStatus.label}</span>
          </span>

          <button
            onClick={() => {
              setCustomGoalInput(dailyGoalMinutes.toString());
              setIsEditingGoal(!isEditingGoal);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="修改今日目标"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Custom Goal Input Drawer (Inline when editing) */}
      {isEditingGoal && (
        <form onSubmit={handleCustomGoalSubmit} className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
            <span>设定今日目标专注时长 (分钟)</span>
            <button
              type="button"
              onClick={() => setIsEditingGoal(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="15"
              max="600"
              step="5"
              value={customGoalInput}
              onChange={e => setCustomGoalInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-slate-900 font-mono text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              保存
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-500 font-medium">推荐预设：</span>
            {GOAL_PRESETS.map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => handleUpdateGoal(mins)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  dailyGoalMinutes === mins
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                }`}
              >
                {mins}m ({(mins / 60).toFixed(1)}h)
              </button>
            ))}
          </div>
        </form>
      )}

      {/* 3. Numbers Overview Row: Current vs Goal */}
      <div className="flex items-end justify-between gap-3">
        {/* Left: Current Focus Minutes */}
        <div>
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Clock className="h-3 w-3 text-indigo-500" />
            <span>今日已专注用时</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {todayFocusMinutes}
            </span>
            <span className="text-xs text-slate-500 font-medium">分钟</span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({(todayFocusMinutes / 60).toFixed(1)}h)
            </span>
          </div>
        </div>

        {/* Center: Slash Divider */}
        <div className="text-slate-300 font-light text-2xl pb-1">/</div>

        {/* Right: Goal Target Minutes */}
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-bold flex items-center justify-end gap-1">
            <Target className="h-3 w-3 text-purple-500" />
            <span>今日目标时长</span>
          </div>
          <div className="flex items-baseline justify-end gap-1 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono tracking-tight">
              {dailyGoalMinutes}
            </span>
            <span className="text-xs text-slate-500 font-medium">分钟</span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({(dailyGoalMinutes / 60).toFixed(1)}h)
            </span>
          </div>
        </div>
      </div>

      {/* 4. Visual Progress Bar Component */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-500">
            完成进度
          </span>
          <span className="font-mono font-black text-xs text-slate-900 flex items-center gap-1">
            <span className={goalStatus.textColor}>{progressPercent}%</span>
            {progressPercent >= 100 && (
              <span className="text-[10px] text-emerald-600 font-bold">达标 🎯</span>
            )}
          </span>
        </div>

        {/* Outer Bar Track */}
        <div className="relative h-4 w-full bg-slate-100/90 rounded-full overflow-hidden p-0.5 border border-slate-200/70 shadow-inner">
          
          {/* Milestone markers at 25%, 50%, 75% */}
          <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none z-10 opacity-30">
            <div className="w-0.5 h-full bg-slate-400" />
            <div className="w-0.5 h-full bg-slate-400" />
          </div>

          {/* Filled Progress Bar with Smooth Gradient & Animation */}
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out relative ${
              progressPercent >= 100
                ? 'bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-500 shadow-sm shadow-emerald-500/20'
                : 'bg-linear-to-r from-indigo-500 to-purple-600 shadow-sm shadow-indigo-500/20'
            }`}
            style={{ width: `${visualBarWidth}%` }}
          >
            {/* Shimmer light effect inside bar */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>

        {/* Milestone Labels */}
        <div className="flex justify-between text-[9px] font-mono text-slate-400 pt-0.5 px-0.5">
          <span>0m</span>
          <span>{(dailyGoalMinutes * 0.25).toFixed(0)}m</span>
          <span>{(dailyGoalMinutes * 0.5).toFixed(0)}m</span>
          <span>{(dailyGoalMinutes * 0.75).toFixed(0)}m</span>
          <span className="font-bold text-slate-600">{dailyGoalMinutes}m</span>
        </div>
      </div>

      {/* 5. Goal Status Message & Quick Adjustment Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs">
        
        {/* Status Message */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>{goalStatus.message}</span>
        </div>

        {/* Quick Micro-adjustment buttons for testing/manual logging */}
        <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
          <span className="text-[10px] text-slate-400 font-bold mr-0.5">微调已专注:</span>
          <button
            onClick={() => handleAddTodayMinutes(-15)}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-mono font-bold cursor-pointer transition-all"
            title="扣减今日已专注用时 15m"
          >
            -15m
          </button>
          <button
            onClick={() => handleAddTodayMinutes(15)}
            className="px-2 py-0.5 rounded-md bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[10px] font-mono font-bold cursor-pointer transition-all shadow-2xs active:scale-95"
            title="追加今日已专注用时 15m"
          >
            +15m
          </button>
        </div>

      </div>

    </div>
  );
};

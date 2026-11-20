import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  Circle, 
  Flame, 
  Plus, 
  X, 
  Clock, 
  ArrowLeft, 
  ListTodo, 
  Calendar, 
  Tag, 
  Layers,
  ChevronRight,
  Zap,
  Volume2,
  Target,
  TrendingUp,
  Award,
  Timer,
  Palette,
  Activity,
  Keyboard,
  Repeat
} from 'lucide-react';
import { Course, Task, AppSettings, TabType } from '../types';
import { PomodoroTimer } from './PomodoroTimer';
import { FocusMusicPlayer } from './FocusMusicPlayer';
import { AmbientSoundPanel } from './AmbientSoundPanel';
import { FocusSessionHistory } from './FocusSessionHistory';
import { DailyFocusGoalCard } from './DailyFocusGoalCard';
import { FiftyMinuteBreakActivityCard } from './FiftyMinuteBreakActivityCard';
import { GlobalFocusLeaderboard } from './GlobalFocusLeaderboard';
import { FocusAmbienceSelector } from './FocusAmbienceSelector';
import { FocusMoodBoardModal } from './FocusMoodBoardModal';
import { StretchBreakToast } from './StretchBreakToast';
import { FocusModeShortcutsOverlay } from './FocusModeShortcutsOverlay';
import { 
  FocusAmbienceTheme, 
  FOCUS_AMBIENCE_THEMES, 
  getFocusAmbienceConfig, 
  STORAGE_KEY_FOCUS_AMBIENCE 
} from '../lib/focusAmbience';
import { detectTaskAutoTag, getTaskTagIcon } from '../lib/taskTags';

interface FocusModeViewProps {
  tasks: Task[];
  courses: Course[];
  settings: AppSettings;
  onToggleTask: (taskId: string) => void;
  onSaveTask?: (task: Task) => void;
  onExitFocusMode: () => void;
  onAskAI?: (prompt: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  initialTaskId?: string | null;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({
  tasks,
  courses,
  settings,
  onToggleTask,
  onSaveTask,
  onExitFocusMode,
  onAskAI,
  onNavigateTab,
  initialTaskId = null,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'high_priority'>('all');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(initialTaskId);

  useEffect(() => {
    if (initialTaskId) {
      setFocusedTaskId(initialTaskId);
    }
  }, [initialTaskId]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState<number>(0);
  const [isFiftyMinBreakModalOpen, setIsFiftyMinBreakModalOpen] = useState<boolean>(false);
  const [isMoodBoardOpen, setIsMoodBoardOpen] = useState<boolean>(false);

  // Pomodoro Interval End Subtle 5-Minute Stretch Break Toast State
  const [isStretchToastOpen, setIsStretchToastOpen] = useState<boolean>(false);
  const [toastIntervalMinutes, setToastIntervalMinutes] = useState<number>(25);
  const [toastSubject, setToastSubject] = useState<string>('深度自习学程');
  const [externalBreakTrigger, setExternalBreakTrigger] = useState<number>(0);

  // Focus Mode Shortcuts State & Hands-free triggers
  const [isShortcutsOverlayOpen, setIsShortcutsOverlayOpen] = useState<boolean>(false);
  const [lastTriggeredShortcut, setLastTriggeredShortcut] = useState<string | null>(null);
  const [externalToggleTrigger, setExternalToggleTrigger] = useState<number>(0);
  const [externalResetTrigger, setExternalResetTrigger] = useState<number>(0);
  const [externalMuteTrigger, setExternalMuteTrigger] = useState<number>(0);

  const handleTriggerStretchToast = (mins: number = 25, sub: string = '深度自习学程') => {
    setToastIntervalMinutes(mins);
    setToastSubject(sub);
    setIsStretchToastOpen(true);
  };

  // Global Keyboard Shortcuts Listener for Hands-Free Efficiency
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or select field
      const target = e.target as HTMLElement | null;
      if (
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        )
      ) {
        return;
      }

      // '?' or 'Shift + /': Toggle shortcuts overlay
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOverlayOpen(prev => !prev);
        setLastTriggeredShortcut('?');
        return;
      }

      // 'Escape' key
      if (e.key === 'Escape') {
        if (isShortcutsOverlayOpen) {
          setIsShortcutsOverlayOpen(false);
          return;
        }
        if (isMoodBoardOpen) {
          setIsMoodBoardOpen(false);
          return;
        }
        if (isFiftyMinBreakModalOpen) {
          setIsFiftyMinBreakModalOpen(false);
          return;
        }
        if (isStretchToastOpen) {
          setIsStretchToastOpen(false);
          return;
        }
        onExitFocusMode();
        return;
      }

      // 'Space' key: Toggle timer pause/run
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setExternalToggleTrigger(Date.now());
        setLastTriggeredShortcut('Space');
        return;
      }

      // 'r' or 'R': Reset timer
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setExternalResetTrigger(Date.now());
        setLastTriggeredShortcut('R');
        return;
      }

      // 's' or 'S': Switch to break
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setExternalBreakTrigger(Date.now());
        setLastTriggeredShortcut('S');
        return;
      }

      // 'm' or 'M': Mute/unmute ambience and alert sounds
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setExternalMuteTrigger(Date.now());
        setLastTriggeredShortcut('M');
        return;
      }

      // 'b' or 'B': Trigger 5-minute stretch break toast
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleTriggerStretchToast(25, '深度自习学程');
        setLastTriggeredShortcut('B');
        return;
      }

      // 't' or 'T': Toggle quick add task form
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setIsAddingTask(prev => !prev);
        setLastTriggeredShortcut('T');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOverlayOpen, isFiftyMinBreakModalOpen, isStretchToastOpen, onExitFocusMode]);

  // Calming Focus Ambience Background State (Nature Blur / Minimal Gradient)
  const [ambienceTheme, setAmbienceTheme] = useState<FocusAmbienceTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOCUS_AMBIENCE);
      if (saved) return saved as FocusAmbienceTheme;
    } catch (e) {}
    return 'default';
  });

  const ambienceConfig = useMemo(() => {
    return getFocusAmbienceConfig(ambienceTheme);
  }, [ambienceTheme]);

  const handleSelectAmbience = (theme: FocusAmbienceTheme) => {
    setAmbienceTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY_FOCUS_AMBIENCE, theme);
    } catch (e) {}
  };

  // Focus Session Efficiency State (Planned vs Focused Time)
  const [plannedSessionMinutes, setPlannedSessionMinutes] = useState<number>(25);
  const [focusedMinutes, setFocusedMinutes] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('campus_os_pomodoro_stats_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.totalFocusMinutes > 0) {
          // Provide realistic active focus time
          return Math.min(25, (parsed.totalFocusMinutes % 25) || 18);
        }
      }
    } catch (e) {}
    return 18;
  });

  // Today's total accumulated focus minutes across all sessions
  const todayTotalFocusMinutes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let mins = 0;
    try {
      const raw = localStorage.getItem('campus_os_pomodoro_stats_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr && typeof parsed.totalFocusMinutes === 'number') {
          mins = parsed.totalFocusMinutes;
        }
      }
    } catch (e) {}
    return mins > 0 ? mins : 75;
  }, [historyRefreshTrigger]);

  // Calculate efficiency percentage
  const efficiencyRate = useMemo(() => {
    if (plannedSessionMinutes <= 0) return 100;
    return Math.round((focusedMinutes / plannedSessionMinutes) * 100);
  }, [focusedMinutes, plannedSessionMinutes]);

  // Efficiency Evaluation & Rating
  const efficiencyEvaluation = useMemo(() => {
    if (efficiencyRate >= 100) {
      return {
        label: '目标达成 (Peak Flow)',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeColor: 'bg-emerald-500',
        tip: '🎉 太棒了！已圆满完成既定学程目标，可选择深度冲刺或进入微休息。',
      };
    }
    if (efficiencyRate >= 75) {
      return {
        label: '高效冲刺中 (High Focus)',
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        badgeColor: 'bg-indigo-600',
        tip: '⚡ 心流状态极佳，已达成大半预定学程，保持当前沉浸节奏！',
      };
    }
    if (efficiencyRate >= 40) {
      return {
        label: '稳步推进 (In Progress)',
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        badgeColor: 'bg-purple-600',
        tip: '🌱 专注渐入佳境，心流平稳累积中。',
      };
    }
    return {
      label: '热身启动 (Warm Up)',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      badgeColor: 'bg-amber-500',
      tip: '⏳ 自习刚启程，屏蔽干扰，专注于第一步行动。',
    };
  }, [efficiencyRate]);

  // Recharts Chart Data (Small Donut Chart)
  const efficiencyChartData = useMemo(() => {
    if (focusedMinutes >= plannedSessionMinutes) {
      return [
        { name: '计划达成用时', value: plannedSessionMinutes, color: '#6366f1' },
        { name: '超额专注冲刺', value: focusedMinutes - plannedSessionMinutes, color: '#10b981' },
      ];
    }
    return [
      { name: '实际已专注', value: focusedMinutes, color: '#6366f1' },
      { name: '剩余计划时长', value: plannedSessionMinutes - focusedMinutes, color: '#e2e8f0' },
    ];
  }, [focusedMinutes, plannedSessionMinutes]);

  // Active (uncompleted) tasks
  const activeTasks = useMemo(() => {
    return tasks
      .filter(t => !t.is_completed)
      .sort((a, b) => {
        // High priority first
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return (a.deadline || '').localeCompare(b.deadline || '');
      });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filterMode === 'high_priority') {
      return activeTasks.filter(t => t.priority === 'high');
    }
    return activeTasks;
  }, [activeTasks, filterMode]);

  const completedTodayCount = useMemo(() => {
    return tasks.filter(t => t.is_completed).length;
  }, [tasks]);

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !onSaveTask) return;

    const courseObj = courses.find(c => c.id === selectedCourseId);
    const autoTag = detectTaskAutoTag(newTaskTitle.trim(), 'homework');

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      category: 'homework',
      priority: 'high',
      deadline: `${new Date().toISOString().split('T')[0]} 22:00`,
      is_completed: false,
      course_id: courseObj?.id,
      course_name: courseObj?.course_name,
      created_at: new Date().toISOString().split('T')[0],
      auto_tag_label: autoTag.label,
      auto_tag_icon: autoTag.iconName,
    };

    onSaveTask(newTask);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  return (
    <div className="relative space-y-6 animate-in fade-in zoom-in-98 duration-300">
      
      {/* Full-screen Calming Focus Ambience Backdrop (Nature Blur / Minimal Gradient) */}
      <div className={`fixed inset-0 pointer-events-none transition-all duration-700 ease-in-out z-0 overflow-hidden ${ambienceConfig.screenBackdropClass}`}>
        <div className={`absolute -top-24 -left-24 w-[38rem] h-[38rem] rounded-full blur-3xl opacity-75 transition-all duration-700 bg-linear-to-br ${ambienceConfig.orb1Class}`} />
        <div className={`absolute top-1/4 -right-28 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-65 transition-all duration-700 bg-linear-to-bl ${ambienceConfig.orb2Class}`} />
        <div className={`absolute -bottom-28 left-1/3 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-50 transition-all duration-700 bg-linear-to-tr ${ambienceConfig.orb3Class}`} />
      </div>

      {/* 1. Zen Mode Ambient Banner (Liquid Glass Holographic) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-md border border-purple-200/80 bg-linear-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 relative overflow-hidden z-10">
        {/* Subtle glowing ambient orb */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-linear-to-bl from-purple-500/20 via-pink-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-purple-600 via-indigo-600 to-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/25 shrink-0">
              <Brain className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                  沉浸专注工作台 (Focus Mode Active)
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
                  🧘 心流防打扰
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs transition-all ${ambienceConfig.accentPillClass}`}>
                  🌿 {ambienceConfig.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                已自动收起全局复杂导航与多余模块，全屏聚焦【活跃攻坚待办】与【番茄钟深度自习】
              </p>

              {/* 1-Click Ambient Swatches */}
              <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Palette className="h-3 w-3 text-indigo-500" />
                  <span>专注背景：</span>
                </span>
                {FOCUS_AMBIENCE_THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectAmbience(t.id)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                      ambienceTheme === t.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white/70 hover:bg-white text-slate-600 border-slate-200/60'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full bg-linear-to-tr ${t.swatchGradient}`} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons: Ambience Selector, Shortcuts & Exit Focus Mode */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {/* Focus Mode Shortcuts Trigger with Rich Hover Tooltip */}
            <div className="relative group">
              <button
                onClick={() => setIsShortcutsOverlayOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/90 hover:bg-white text-purple-900 text-xs font-black border border-purple-200/90 shadow-xs transition-all cursor-pointer active:scale-95"
                title="查看与使用双手盲操快捷键指南 (按 ? 快速打开)"
              >
                <Keyboard className="h-4 w-4 text-purple-600" />
                <span>快捷键</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold shadow-2xs">
                  ?
                </kbd>
              </button>

              {/* Hover Tooltip Preview */}
              <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-[11px] shadow-2xl border border-white/10 z-50 w-64 pointer-events-none animate-in fade-in duration-150">
                <div className="font-bold flex items-center justify-between text-purple-300 pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Keyboard className="h-3.5 w-3.5" />
                    <span>快捷盲操速查</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">监听中</span>
                </div>
                <div className="space-y-1 pt-1.5 font-medium text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>暂停/继续专注</span>
                    <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.2 rounded border border-white/10 text-white font-bold">Space</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>重置当前周期</span>
                    <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.2 rounded border border-white/10 text-white font-bold">R</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>提前进入休息</span>
                    <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.2 rounded border border-white/10 text-white font-bold">S</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>5分钟拉伸微提醒</span>
                    <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.2 rounded border border-white/10 text-white font-bold">B</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>白噪音静音切换</span>
                    <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.2 rounded border border-white/10 text-white font-bold">M</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>退出专注模式</span>
                    <kbd className="font-mono text-[10px] bg-white/10 px-1.5 py-0.2 rounded border border-white/10 text-white font-bold">Esc</kbd>
                  </div>
                </div>
                <div className="text-[10px] text-purple-300 pt-1.5 border-t border-white/10 mt-1 font-bold flex items-center justify-between">
                  <span>点击或按【?】查看完整清单</span>
                  <span className="font-mono text-[9px] bg-purple-500/30 px-1 rounded">Shift + /</span>
                </div>
              </div>
            </div>

            {/* Quick Test / Trigger Stretch Toast */}
            <button
              onClick={() => handleTriggerStretchToast(25, '自由专注自习')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/90 hover:bg-white text-emerald-850 text-xs font-black border border-emerald-200/90 shadow-xs transition-all cursor-pointer active:scale-95"
              title="模拟/预览专注周期结束时的 5 分钟拉伸微提示 Toast"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>测试5分钟拉伸Toast</span>
            </button>

            <FocusAmbienceSelector
              currentTheme={ambienceTheme}
              onSelectTheme={handleSelectAmbience}
            />

            {/* Mood Board Button */}
            <button
              onClick={() => setIsMoodBoardOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 border border-white/20 transition-all cursor-pointer active:scale-95"
              title="打开专注情绪画板 (自选背景音景与视觉美学)"
            >
              <Palette className="h-3.5 w-3.5 text-white" />
              <span>情绪画板 (Mood Board)</span>
              <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
            </button>

            <button
              onClick={onExitFocusMode}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-2xl bg-white/90 hover:bg-white text-slate-800 text-xs font-black shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 text-purple-600" />
              <span>退出专注模式 (恢复全览)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Focus Layout: Left = Pomodoro Timer + Music; Right = Focus Efficiency Chart + Active Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Col (7 of 12): Pomodoro Timer & Lo-Fi Focus Music & 50-Min Activity */}
        <div className="lg:col-span-7 space-y-6">
          {/* Core Pomodoro Timer */}
          <PomodoroTimer
            courses={courses}
            tasks={tasks}
            activeTaskId={focusedTaskId}
            onSelectActiveTask={setFocusedTaskId}
            onToggleTask={onToggleTask}
            onAskAI={onAskAI}
            onSessionComplete={() => {
              setHistoryRefreshTrigger(prev => prev + 1);
            }}
            onFiftyMinuteBreakNotification={() => {
              setIsFiftyMinBreakModalOpen(true);
            }}
            onIntervalEnd={(timerMode, durationMins) => {
              if (timerMode === 'work') {
                handleTriggerStretchToast(durationMins, '番茄专注学程');
              }
            }}
            externalBreakTrigger={externalBreakTrigger}
            externalToggleTrigger={externalToggleTrigger}
            externalResetTrigger={externalResetTrigger}
            externalMuteTrigger={externalMuteTrigger}
          />

          {/* Focus Music Soundscape Player */}
          <FocusMusicPlayer />

          {/* Mood Board Quick Access Card */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm border border-white/80 bg-linear-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-900">专注情绪画板 (Mood Board)</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                    声画定制
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  一键搭配细雨、咖啡馆、白噪音等背景音景与视觉美学
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMoodBoardOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold border border-indigo-200/80 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>调配情绪</span>
            </button>
          </div>

          {/* Ambient Sound Selection Panel (Native Web Audio API Synthesis) */}
          <AmbientSoundPanel />

          {/* 50-Minute Break Dynamic Quick Activity Card (Time of Day Based) */}
          <FiftyMinuteBreakActivityCard
            isTriggeredModalOpen={isFiftyMinBreakModalOpen}
            onCloseTriggeredModal={() => setIsFiftyMinBreakModalOpen(false)}
            onTriggerSimulate={() => setIsFiftyMinBreakModalOpen(true)}
          />
        </div>

        {/* Right Col (5 of 12): Focus Efficiency Chart & Active Tasks */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 2.0 Daily Focus Goal Card: Target vs Current Progress Bar */}
          <DailyFocusGoalCard refreshTrigger={historyRefreshTrigger} />

          {/* 2.1 Small Chart: Current Session Focus Efficiency (Recharts Donut Gauge) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm border border-white/90 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-500/15 text-purple-700 flex items-center justify-center font-bold">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span>当前学程专注效能</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">[Focus Efficiency]</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    实际已专注时长 vs 计划目标时长
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${efficiencyEvaluation.color}`}>
                {efficiencyEvaluation.label}
              </span>
            </div>

            {/* Chart & Numeric Breakdown Grid */}
            <div className="flex items-center justify-between gap-4">
              
              {/* Left: Recharts Donut Gauge Chart */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={efficiencyChartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={34}
                      outerRadius={48}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {efficiencyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          return (
                            <div className="bg-slate-900/95 text-white px-2.5 py-1.5 rounded-xl text-[11px] shadow-lg border border-white/10 font-bold">
                              <div>{item.name}：{item.value} 分钟</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Percentage Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-slate-900 font-mono leading-none">
                    {efficiencyRate}%
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                    达成率
                  </span>
                </div>
              </div>

              {/* Right: Key Session Numbers & Preset Buttons */}
              <div className="flex-1 space-y-2.5 min-w-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                    <div className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      实际专注用时
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                      {focusedMinutes} <span className="text-[10px] text-slate-500 font-normal">分钟</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                      <Target className="h-3 w-3 text-slate-500" />
                      计划目标时长
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                      {plannedSessionMinutes} <span className="text-[10px] text-slate-500 font-normal">分钟</span>
                    </div>
                  </div>
                </div>

                {/* Quick Interactive Increment / Presets */}
                <div className="flex items-center justify-between gap-1.5 pt-1 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">学程目标：</span>
                    {[25, 45, 60].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setPlannedSessionMinutes(mins)}
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all cursor-pointer ${
                          plannedSessionMinutes === mins
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  {/* Manual focused time increment button */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFocusedMinutes(prev => Math.max(0, prev - 5))}
                      className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-mono font-bold cursor-pointer transition-all"
                      title="微调已专注用时 -5m"
                    >
                      -5m
                    </button>
                    <button
                      onClick={() => setFocusedMinutes(prev => prev + 5)}
                      className="px-2 py-0.5 rounded-md bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[10px] font-mono font-bold cursor-pointer transition-all shadow-2xs active:scale-95"
                      title="记录当前专注推进 +5m"
                    >
                      +5m
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Tip */}
            <div className="text-[11px] text-slate-600 font-medium bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 leading-relaxed flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span>{efficiencyEvaluation.tip}</span>
            </div>
          </div>

          {/* 2.2 Active Tasks Panel */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm border border-white/90 relative overflow-hidden">
            
            {/* Header with Counter and Filter */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center font-bold">
                  <ListTodo className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">活跃攻坚待办</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    剩余 <span className="font-bold text-indigo-600 font-mono">{activeTasks.length}</span> 项待完成 · 已完成 {completedTodayCount} 项
                  </p>
                </div>
              </div>

              {/* Quick Add Toggle */}
              {onSaveTask && (
                <button
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加待办</span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white/70 hover:bg-white text-slate-600 border border-slate-200/60'
                }`}
              >
                全部待办 ({activeTasks.length})
              </button>
              <button
                onClick={() => setFilterMode('high_priority')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'high_priority'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white/70 hover:bg-white text-rose-700 border border-slate-200/60'
                }`}
              >
                <Flame className="h-3 w-3 fill-rose-600" />
                <span>仅看高优先 ({activeTasks.filter(t => t.priority === 'high').length})</span>
              </button>
            </div>

            {/* Inline Quick Add Task Form */}
            {isAddingTask && onSaveTask && (
              <form onSubmit={handleQuickAddTask} className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span>快速录入当前攻坚待办</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="例如：完成计算机图形学着色器实验报告..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-200 text-slate-900 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />

                <div className="flex items-center justify-between gap-2">
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-slate-700 text-xs font-medium focus:outline-hidden cursor-pointer"
                  >
                    <option value="">关联课程 (可选)</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.course_name}</option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    加入攻坚
                  </button>
                </div>
              </form>
            )}

            {/* Active Tasks Checklist */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto animate-bounce" />
                  <div className="text-sm font-black text-slate-800">当前没有未完成的待办事项！</div>
                  <p className="text-xs">
                    全部课业攻坚已顺利告一段落，您可以开启新番茄钟深度拓展，或安心退出专注模式。
                  </p>
                </div>
              ) : (
                filteredTasks.map(task => {
                  const autoTag = detectTaskAutoTag(task.title, task.category);
                  const TagIcon = getTaskTagIcon(task.auto_tag_icon || autoTag.iconName);
                  const isHigh = task.priority === 'high';

                  return (
                    <div
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group select-none shadow-2xs hover:shadow-xs ${
                        isHigh
                          ? 'bg-linear-to-r from-rose-50/80 to-amber-50/60 border-rose-200/90 hover:border-rose-300'
                          : 'bg-white/80 hover:bg-white border-white/90 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox */}
                        <div className="mt-0.5 shrink-0 text-slate-400 group-hover:text-emerald-600 transition-colors">
                          <Circle className="h-4.5 w-4.5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs ${autoTag.badgeClass}`}>
                              <TagIcon className="h-3 w-3" />
                              <span>{task.auto_tag_label || autoTag.label}</span>
                            </span>

                            {isHigh && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white flex items-center gap-0.5 shadow-2xs">
                                <Flame className="h-2.5 w-2.5 fill-white" />
                                <span>高优先</span>
                              </span>
                            )}

                            {task.is_recurring && task.recurrence_pattern && task.recurrence_pattern !== 'none' && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-700 border border-teal-500/25 flex items-center gap-0.5">
                                <Repeat className="h-2.5 w-2.5 text-teal-600" />
                                <span>{task.recurrence_pattern === 'daily' ? '每天' : task.recurrence_pattern === 'weekly' ? '每周' : '每月'}</span>
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                            {task.title}
                          </h4>

                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-mono">
                            <span className="flex items-center gap-1 font-bold text-rose-600">
                              <Clock className="h-3 w-3" />
                              {task.deadline ? task.deadline.split(' ')[0] : '今日'}
                            </span>
                            {task.course_name && (
                              <span className="text-slate-600 truncate max-w-32 bg-slate-100 px-1.5 py-0.2 rounded font-sans">
                                {task.course_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Start Focus & Complete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Start Pomodoro Focus on this Task */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedTaskId(task.id);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                            focusedTaskId === task.id
                              ? 'bg-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-400'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70'
                          }`}
                          title="挂载此待办到番茄钟开启专注"
                        >
                          <Timer className="h-3 w-3" />
                          <span>{focusedTaskId === task.id ? '当前专注' : '专注此项'}</span>
                        </button>

                        {/* Click to Complete Pill */}
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(task.id);
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-all cursor-pointer border border-transparent hover:border-emerald-200"
                        >
                          勾选结案
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Productivity Hint */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 text-xs text-slate-600 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <span>点击待办卡片直接勾选完成，实时同步更新学业进度。</span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Global Focus Leaderboard: Campus-wide peer comparison via CampusAPI */}
      <GlobalFocusLeaderboard
        refreshTrigger={historyRefreshTrigger}
        currentUserMinutes={todayTotalFocusMinutes}
      />

      {/* 4. Session History Section: Completed Focus Sessions, Total Duration & Efficiency Scores */}
      <FocusSessionHistory
        courses={courses}
        tasks={tasks}
        onAskAI={onAskAI}
        refreshTrigger={historyRefreshTrigger}
      />

      {/* 4.5. Focus Mode Mood Board Modal */}
      <FocusMoodBoardModal
        isOpen={isMoodBoardOpen}
        onClose={() => setIsMoodBoardOpen(false)}
        currentAmbience={ambienceTheme}
        onSelectAmbience={handleSelectAmbience}
      />

      {/* 5. Subtle Pomodoro-style 5-Minute Stretch Break Toast */}
      <StretchBreakToast
        isOpen={isStretchToastOpen}
        onClose={() => setIsStretchToastOpen(false)}
        onStartBreak={() => {
          setExternalBreakTrigger(Date.now());
        }}
        intervalMinutes={toastIntervalMinutes}
        subject={toastSubject}
      />

      {/* 6. Focus Mode Keyboard Shortcuts Overlay Guide */}
      <FocusModeShortcutsOverlay
        isOpen={isShortcutsOverlayOpen}
        onClose={() => setIsShortcutsOverlayOpen(false)}
        lastPressedKey={lastTriggeredShortcut}
      />

    </div>
  );
};

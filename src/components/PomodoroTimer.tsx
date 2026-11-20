import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Sparkles, 
  Settings2, 
  CheckCircle2, 
  Flame, 
  Volume2, 
  VolumeX, 
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Brain,
  Lightbulb,
  BookOpen,
  CalendarCheck,
  Activity,
  Droplets,
  Eye,
  Smile,
  ArrowRight,
  X,
  Check,
  PlusCircle,
  FileText,
  ListTodo,
  Bell,
  BellRing,
  History,
  CloudRain,
  Radio,
  Trees,
  Headphones,
  Target,
  Clock
} from 'lucide-react';
import { Course, Task } from '../types';
import { generateSessionSummary, SessionSummaryData, FollowUpStudyTopic } from '../services/sessionSummaryAI';
import { PomodoroHistoryService } from '../services/pomodoroHistory';
import { PomodoroHistoryModal } from './PomodoroHistoryModal';
import { GlobalSoundscapeEngine, SOUNDSCAPE_OPTIONS, SoundscapeOption } from '../lib/soundscapes';
import { getRecommendedQuickActivity } from '../lib/quickBreakActivities';

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

export interface StudySessionLog {
  id: string;
  time: string;
  subject: string;
  duration: number;
}

interface PomodoroTimerProps {
  onSuggestBreak?: (breakMinutes: number, subject?: string) => void;
  onAskAI?: (prompt: string) => void;
  className?: string;
  defaultMinutes?: number;
  courses?: Course[];
  tasks?: Task[];
  onAddTaskFromAI?: (title: string, deadline?: string) => void;
  onSessionComplete?: (summary: SessionSummaryData) => void;
  onFiftyMinuteBreakNotification?: () => void;
  onIntervalEnd?: (mode: PomodoroMode, durationMinutes: number) => void;
  activeTaskId?: string | null;
  onSelectActiveTask?: (taskId: string | null) => void;
  onToggleTask?: (taskId: string) => void;
  autoStartOnTaskSelect?: boolean;
  externalBreakTrigger?: number;
  externalToggleTrigger?: number;
  externalResetTrigger?: number;
  externalMuteTrigger?: number;
}

const STORAGE_KEY = 'campus_os_pomodoro_stats_v2';

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onSuggestBreak,
  onAskAI,
  className = '',
  defaultMinutes = 25,
  courses = [],
  tasks = [],
  onAddTaskFromAI,
  onSessionComplete,
  onFiftyMinuteBreakNotification,
  onIntervalEnd,
  activeTaskId,
  onSelectActiveTask,
  onToggleTask,
  autoStartOnTaskSelect = false,
  externalBreakTrigger,
  externalToggleTrigger,
  externalResetTrigger,
  externalMuteTrigger,
}) => {
  // Configurable durations (in minutes)
  const [workDuration, setWorkDuration] = useState<number>(defaultMinutes);
  const [shortBreakDuration, setShortBreakDuration] = useState<number>(5);
  const [longBreakDuration, setLongBreakDuration] = useState<number>(15);

  const [mode, setMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(defaultMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  // Bound Task for Focus Session
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(activeTaskId || null);

  // Current study subject / course
  const [selectedSubject, setSelectedSubject] = useState<string>('自由专注自习');

  // Synchronize when activeTaskId prop changes
  useEffect(() => {
    if (activeTaskId !== undefined) {
      setSelectedTaskId(activeTaskId);
      if (activeTaskId) {
        const target = tasks.find(t => t.id === activeTaskId);
        if (target) {
          setSelectedSubject(`【待办】${target.title}`);
          if (autoStartOnTaskSelect) {
            setMode('work');
            setIsRunning(true);
          }
        }
      }
    }
  }, [activeTaskId, tasks, autoStartOnTaskSelect]);

  const handleSelectTaskForFocus = (taskId: string | null, shouldAutoStart: boolean = false) => {
    setSelectedTaskId(taskId);
    if (onSelectActiveTask) onSelectActiveTask(taskId);
    if (taskId) {
      const target = tasks.find(t => t.id === taskId);
      if (target) {
        setSelectedSubject(`【待办】${target.title}`);
        setMode('work');
        if (shouldAutoStart) {
          setIsRunning(true);
        }
      }
    } else {
      setSelectedSubject('自由专注自习');
    }
  };

  const activeTask = tasks.find(t => t.id === selectedTaskId) || null;
  const pendingTasks = tasks.filter(t => !t.is_completed);
  
  // Persistent tracking of today's study sessions
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState<number>(0);
  const [sessionLogs, setSessionLogs] = useState<StudySessionLog[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showBreakSuggestion, setShowBreakSuggestion] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Session Summary states
  const [activeSessionSummary, setActiveSessionSummary] = useState<SessionSummaryData | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // Focus Push & History Modal states
  const [focusPushEnabled, setFocusPushEnabled] = useState<boolean>(true);
  const [hasSentAboutToEndPush, setHasSentAboutToEndPush] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Focus Soundscapes State
  const [selectedSoundscape, setSelectedSoundscape] = useState<SoundscapeOption>('none');
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(0.5);
  const [isSoundscapeMuted, setIsSoundscapeMuted] = useState<boolean>(false);
  const [isSoundscapePlaying, setIsSoundscapePlaying] = useState<boolean>(false);

  // External Break Trigger (e.g. from 5-Minute Stretch Break Toast)
  useEffect(() => {
    if (externalBreakTrigger && externalBreakTrigger > 0) {
      setMode('shortBreak');
      setTimeLeft(shortBreakDuration * 60);
      setIsRunning(true);
      setShowBreakSuggestion(false);
      setShowSummaryModal(false);
    }
  }, [externalBreakTrigger, shortBreakDuration]);

  // External Toggle Trigger (Spacebar from shortcuts)
  useEffect(() => {
    if (externalToggleTrigger && externalToggleTrigger > 0) {
      setIsRunning(prev => !prev);
    }
  }, [externalToggleTrigger]);

  // External Reset Trigger (R key from shortcuts)
  useEffect(() => {
    if (externalResetTrigger && externalResetTrigger > 0) {
      setIsRunning(false);
      setShowBreakSuggestion(false);
      if (mode === 'work') {
        setTimeLeft(workDuration * 60);
      } else if (mode === 'shortBreak') {
        setTimeLeft(shortBreakDuration * 60);
      } else {
        setTimeLeft(longBreakDuration * 60);
      }
    }
  }, [externalResetTrigger, mode, workDuration, shortBreakDuration, longBreakDuration]);

  // External Mute Trigger (M key from shortcuts)
  useEffect(() => {
    if (externalMuteTrigger && externalMuteTrigger > 0) {
      setIsMuted(prev => !prev);
      setIsSoundscapeMuted(prev => {
        const next = !prev;
        if (next) {
          GlobalSoundscapeEngine.setVolume(0);
        } else {
          GlobalSoundscapeEngine.setVolume(soundscapeVolume);
        }
        return next;
      });
    }
  }, [externalMuteTrigger, soundscapeVolume]);

  // Cleanup soundscape engine on unmount
  useEffect(() => {
    return () => {
      GlobalSoundscapeEngine.stop();
    };
  }, []);

  // Auto start/pause soundscape on timer run state
  useEffect(() => {
    if (isRunning && selectedSoundscape !== 'none') {
      GlobalSoundscapeEngine.play(selectedSoundscape, isSoundscapeMuted ? 0 : soundscapeVolume);
      setIsSoundscapePlaying(true);
    }
  }, [isRunning, selectedSoundscape, isSoundscapeMuted, soundscapeVolume]);

  const handleSelectSoundscape = (option: SoundscapeOption) => {
    setSelectedSoundscape(option);
    if (option === 'none') {
      GlobalSoundscapeEngine.stop();
      setIsSoundscapePlaying(false);
    } else {
      GlobalSoundscapeEngine.play(option, isSoundscapeMuted ? 0 : soundscapeVolume);
      setIsSoundscapePlaying(true);
    }
  };

  const handleSoundscapeVolumeChange = (vol: number) => {
    setSoundscapeVolume(vol);
    GlobalSoundscapeEngine.setVolume(vol);
  };
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          new Notification('🔔 专注推送已就绪 (Focus Push)', {
            body: '当您的自习即将结束时，系统将通过浏览器温柔提醒您！',
          });
        }
      } catch (e) {
        console.warn('Notification permission error', e);
      }
    }
  };

  const handleExtendSession = (extraMinutes: number) => {
    setTimeLeft(prev => prev + extraMinutes * 60);
    setHasSentAboutToEndPush(false);
    playAlertSound('tick');
  };

  const handleTakeBreakEarly = () => {
    setTimeLeft(0);
  };

  // Helper to generate and display a session summary
  const triggerSummaryGeneration = (targetSubject: string = selectedSubject, durationMins: number = workDuration) => {
    const summary = generateSessionSummary({
      subject: targetSubject,
      duration: durationMins,
      completedSessionsToday: Math.max(1, completedSessions),
      totalFocusMinutesToday: Math.max(durationMins, totalFocusMinutes),
      tasks,
      courses,
    });
    setActiveSessionSummary(summary);
    setShowSummaryModal(true);
    if (onSessionComplete) {
      onSessionComplete(summary);
    }
    return summary;
  };

  // Load persistent stats for today on mount
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr) {
          setCompletedSessions(parsed.completedSessions || 0);
          setTotalFocusMinutes(parsed.totalFocusMinutes || 0);
          setSessionLogs(parsed.sessionLogs || []);
        }
      }
    } catch (e) {
      console.warn('Failed to load Pomodoro stats', e);
    }
  }, []);

  // Save persistent stats
  const saveSessionStats = (newCount: number, addedMinutes: number, logEntry: StudySessionLog) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const newTotal = totalFocusMinutes + addedMinutes;
      const newLogs = [logEntry, ...sessionLogs];
      setCompletedSessions(newCount);
      setTotalFocusMinutes(newTotal);
      setSessionLogs(newLogs);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          date: todayStr,
          completedSessions: newCount,
          totalFocusMinutes: newTotal,
          sessionLogs: newLogs,
        })
      );
    } catch (e) {
      console.warn('Failed to save Pomodoro stats', e);
    }
  };

  const totalTimeForMode = 
    mode === 'work' ? workDuration * 60 : 
    mode === 'shortBreak' ? shortBreakDuration * 60 : 
    longBreakDuration * 60;

  const progressPercent = Math.min(100, Math.max(0, ((totalTimeForMode - timeLeft) / totalTimeForMode) * 100));

  // Audio tone synthesizer using Web Audio API
  const playAlertSound = (type: 'finish' | 'tick') => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === 'finish') {
        // Melodic chime: C5 -> E5 -> G5
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + index * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + index * 0.15);
          osc.stop(ctx.currentTime + index * 0.15 + 0.5);
        });
      }
    } catch (e) {
      console.warn('Audio Context tone not permitted', e);
    }
  };

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          // Focus Push gentle notification at 60s remaining
          if ((prev === 61 || prev === 60) && mode === 'work' && focusPushEnabled && !hasSentAboutToEndPush) {
            setHasSentAboutToEndPush(true);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('⏰ 专注即将结束提醒 (Focus Push)', {
                  body: `您在【${selectedSubject}】的自习还剩 1 分钟！准备休息，或延长专注？`,
                  tag: 'focus-push-end',
                });
              } catch (e) {}
            }
          }

          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setHasSentAboutToEndPush(false);
      playAlertSound('finish');

      if (mode === 'work') {
        const nextCompleted = completedSessions + 1;
        const nextTotalMinutes = totalFocusMinutes + workDuration;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const newLog: StudySessionLog = {
          id: `log_${Date.now()}`,
          time: timeStr,
          subject: selectedSubject,
          duration: workDuration,
        };

        saveSessionStats(nextCompleted, workDuration, newLog);
        setShowBreakSuggestion(true);

        // Generate intelligent Session Summary with task recap and follow-up topics
        const summary = generateSessionSummary({
          subject: selectedSubject,
          duration: workDuration,
          completedSessionsToday: nextCompleted,
          totalFocusMinutesToday: nextTotalMinutes,
          tasks,
          courses,
        });

        // Persist to historical study session archive
        PomodoroHistoryService.addRecordFromSummary(summary);

        // Check 50-minute break milestone
        const isFiftyMinMilestone = workDuration >= 50 || (nextTotalMinutes >= 50 && nextTotalMinutes % 50 === 0);
        if (isFiftyMinMilestone && onFiftyMinuteBreakNotification) {
          onFiftyMinuteBreakNotification();
        }

        // Browser push notification upon completion
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && focusPushEnabled) {
          try {
            if (isFiftyMinMilestone) {
              const quickAct = getRecommendedQuickActivity();
              new Notification('🔔 50分钟专注达成！课间微活动提醒', {
                body: `已持续专注 50 分钟！当前时段专属微活动建议：【${quickAct.title}】(${quickAct.englishTitle})。请立刻站起活动或补水！`,
                tag: 'focus-50m-break',
              });
            } else {
              new Notification('🎉 专注周期圆满达成！', {
                body: `太棒了！已顺利完成 ${workDuration} 分钟【${selectedSubject}】自习。请站起补水活动，开始休息吧！`,
                tag: 'focus-finish',
              });
            }
          } catch (e) {}
        }

        setActiveSessionSummary(summary);
        setShowSummaryModal(true);

        if (onSessionComplete) {
          onSessionComplete(summary);
        }

        if (onIntervalEnd) {
          onIntervalEnd('work', workDuration);
        }

        // Auto determine recommended break duration
        const isLong = nextCompleted % 4 === 0;
        const breakTime = isLong ? longBreakDuration : shortBreakDuration;

        if (onSuggestBreak) {
          onSuggestBreak(breakTime, selectedSubject);
        }
      } else {
        // Break finished, ready for next work session
        if (onIntervalEnd) {
          onIntervalEnd(mode, mode === 'shortBreak' ? shortBreakDuration : longBreakDuration);
        }
        setMode('work');
        setTimeLeft(workDuration * 60);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, workDuration, shortBreakDuration, longBreakDuration, completedSessions, selectedSubject, totalFocusMinutes, sessionLogs, tasks, courses, onSessionComplete, onIntervalEnd, focusPushEnabled, hasSentAboutToEndPush]);

  // Switch Mode
  const switchMode = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    setShowBreakSuggestion(false);
    if (newMode === 'work') {
      setTimeLeft(workDuration * 60);
    } else if (newMode === 'shortBreak') {
      setTimeLeft(shortBreakDuration * 60);
    } else {
      setTimeLeft(longBreakDuration * 60);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setShowBreakSuggestion(false);
    if (mode === 'work') {
      setTimeLeft(workDuration * 60);
    } else if (mode === 'shortBreak') {
      setTimeLeft(shortBreakDuration * 60);
    } else {
      setTimeLeft(longBreakDuration * 60);
    }
  };

  const startBreakDirectly = (isLong: boolean = false) => {
    setShowBreakSuggestion(false);
    const targetMode: PomodoroMode = isLong ? 'longBreak' : 'shortBreak';
    setMode(targetMode);
    setTimeLeft((isLong ? longBreakDuration : shortBreakDuration) * 60);
    setIsRunning(true);
  };

  const formatMinutes = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Custom Quick Presets (15m, 25m, 45m, 60m)
  const setQuickWorkDuration = (mins: number) => {
    setWorkDuration(mins);
    if (mode === 'work') {
      setIsRunning(false);
      setTimeLeft(mins * 60);
    }
  };

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm border border-white/80 ${className}`}>
      
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/25 border border-white/40">
            <Timer className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
              <span>番茄钟深度专注</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                mode === 'work' 
                  ? 'bg-rose-500/15 text-rose-700 border-rose-500/20' 
                  : mode === 'shortBreak'
                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20'
                  : 'bg-purple-500/15 text-purple-700 border-purple-500/20'
              }`}>
                {mode === 'work' ? '专注学习中' : mode === 'shortBreak' ? '短暂休息' : '深度放松'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">科学 25/5 节奏·专注追踪与智能休息建议</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="h-8 w-8 rounded-xl bg-white/60 hover:bg-white/95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all border border-white/80 cursor-pointer shadow-2xs"
            title={isMuted ? '开启提示音' : '静音模式'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-indigo-600" />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all border border-white/80 cursor-pointer shadow-2xs ${
              showSettings ? 'bg-indigo-600 text-white' : 'bg-white/60 hover:bg-white/95 text-slate-600'
            }`}
            title="自定义时长与科目"
          >
            <Settings2 className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 rounded-xl bg-white/60 hover:bg-white/95 text-slate-600 flex items-center justify-center transition-all border border-white/80 cursor-pointer shadow-2xs"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          
          {/* 1. Task-Linked Focus Section (Direct Focus Session on Selected Tasks) */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-indigo-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                <Target className="h-4 w-4 text-indigo-600" />
                <span>挂载关联待办任务专注 (Task-Linked Focus)</span>
              </span>

              {activeTask ? (
                <button
                  type="button"
                  onClick={() => handleSelectTaskForFocus(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  解除待办关联 (自由自习)
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">
                  从待办清单一键挂载专注目标
                </span>
              )}
            </div>

            {activeTask ? (
              <div className="p-3 rounded-xl bg-linear-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/80 border border-indigo-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-600 text-white shadow-2xs">
                      🎯 当前专注目标
                    </span>
                    {activeTask.priority === 'high' && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white flex items-center gap-0.5 shadow-2xs">
                        <Flame className="h-2 w-2 fill-white" />
                        <span>高优待办</span>
                      </span>
                    )}
                    {activeTask.course_name && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-indigo-700 border border-indigo-200 truncate max-w-36">
                        {activeTask.course_name}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {activeTask.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>截止：{activeTask.deadline}</span>
                    <span className="text-slate-300">·</span>
                    <span className={isRunning ? 'text-emerald-600 font-bold animate-pulse' : 'text-slate-500'}>
                      {isRunning ? '🟢 正在深度专注此任务中...' : '⏸️ 任务已就绪，点击开始计时'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onToggleTask && (
                    <button
                      type="button"
                      onClick={() => onToggleTask(activeTask.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      title="已攻克完毕！点击直接勾选完成任务并结算 XP 成长值"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>直接完成 (+XP)</span>
                    </button>
                  )}
                  {!isRunning && (
                    <button
                      type="button"
                      onClick={() => setIsRunning(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>启动专注</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Quick Dropdown Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTaskId || ''}
                    onChange={e => handleSelectTaskForFocus(e.target.value || null, false)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white font-bold text-slate-800 border border-slate-200/80 shadow-2xs text-xs cursor-pointer truncate"
                  >
                    <option value="">-- 选择待办清单中的任务直接开启专注 --</option>
                    {pendingTasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.priority === 'high' ? '🔥 ' : '📋 '}
                        {t.title} {t.course_name ? `(${t.course_name})` : ''} - 截止 {t.deadline.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Chips of Top High Priority Tasks */}
                {pendingTasks.filter(t => t.priority === 'high').length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5 shrink-0">
                      <Flame className="h-2.5 w-2.5 fill-rose-600" />
                      <span>紧急高优一键专注：</span>
                    </span>
                    {pendingTasks
                      .filter(t => t.priority === 'high')
                      .slice(0, 3)
                      .map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTaskForFocus(t.id, false)}
                          className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold truncate max-w-48 transition-colors cursor-pointer"
                          title={`点击一键关联专注：《${t.title}》`}
                        >
                          {t.title}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject / Course Tag Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-white/60 border border-white/80 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                <span>专注科目：</span>
              </span>

              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-white font-bold text-slate-800 border border-slate-200/80 shadow-2xs text-[11px] cursor-pointer max-w-44 truncate"
              >
                <option value="自由专注自习">自由专注自习</option>
                <option value="期末考点突击">期末考点突击</option>
                <option value="挑战杯创新竞赛">挑战杯创新竞赛</option>
                <option value="课后习题大作业">课后习题大作业</option>
                {courses.map(c => (
                  <option key={c.id} value={c.course_name}>
                    {c.course_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Today's Study Stats Summary */}
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/80 flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span>今日 {completedSessions} 周期 ({totalFocusMinutes} 分钟)</span>
              </span>

              {/* Session Summary Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  if (activeSessionSummary) {
                    setShowSummaryModal(true);
                  } else {
                    triggerSummaryGeneration();
                  }
                }}
                className="px-2.5 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="查看或生成专注学程小结与进阶建议"
              >
                <Sparkles className="h-3 w-3 text-purple-600" />
                <span>学程小结</span>
              </button>

              {/* Pomodoro History View Button */}
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="px-2.5 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="查看历史专注记录、累计学时与多维效能趋势"
              >
                <History className="h-3 w-3 text-indigo-600" />
                <span>学程档案与趋势</span>
              </button>

              {sessionLogs.length > 0 && (
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-indigo-600 hover:text-indigo-800 cursor-pointer underline text-[10px]"
                >
                  {showLogs ? '隐藏足迹' : '查看足迹'}
                </button>
              )}
            </div>
          </div>

          {/* Today's Study Session Logs Timeline */}
          {showLogs && sessionLogs.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white/80 border border-indigo-100 shadow-inner space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                <span>今日专注记录明细</span>
                <span className="text-[10px] text-slate-400 font-normal">记录于本地浏览器</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {sessionLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-[11px] border border-slate-200/60"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-800">{log.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                      <span>{log.duration} 分钟</span>
                      <span>·</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white/60 rounded-2xl border border-white/80 backdrop-blur-xs">
            <button
              onClick={() => switchMode('work')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'work'
                  ? 'bg-linear-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/25 border border-white/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Brain className="h-3.5 w-3.5" />
              <span>专注 ({workDuration}m)</span>
            </button>

            <button
              onClick={() => switchMode('shortBreak')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'shortBreak'
                  ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 border border-white/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>短休 ({shortBreakDuration}m)</span>
            </button>

            <button
              onClick={() => switchMode('longBreak')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'longBreak'
                  ? 'bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25 border border-white/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>长休 ({longBreakDuration}m)</span>
            </button>
          </div>

          {/* Settings Drawer */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-white/80 border border-white/90 backdrop-blur-md space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>自定义专注与休息时长 (分钟)</span>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-indigo-600 hover:text-indigo-800 text-[11px]"
                    >
                      完成设置
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-500 font-semibold mb-1">专注时长</label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={workDuration}
                        onChange={e => {
                          const v = Math.max(1, parseInt(e.target.value) || 1);
                          setWorkDuration(v);
                          if (mode === 'work' && !isRunning) setTimeLeft(v * 60);
                        }}
                        className="w-full px-3 py-1.5 rounded-xl border border-white/90 bg-white font-mono font-bold text-slate-800 text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-semibold mb-1">短休时长</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={shortBreakDuration}
                        onChange={e => {
                          const v = Math.max(1, parseInt(e.target.value) || 1);
                          setShortBreakDuration(v);
                          if (mode === 'shortBreak' && !isRunning) setTimeLeft(v * 60);
                        }}
                        className="w-full px-3 py-1.5 rounded-xl border border-white/90 bg-white font-mono font-bold text-slate-800 text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-semibold mb-1">长休时长</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={longBreakDuration}
                        onChange={e => {
                          const v = Math.max(1, parseInt(e.target.value) || 1);
                          setLongBreakDuration(v);
                          if (mode === 'longBreak' && !isRunning) setTimeLeft(v * 60);
                        }}
                        className="w-full px-3 py-1.5 rounded-xl border border-white/90 bg-white font-mono font-bold text-slate-800 text-center"
                      />
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">快捷预设:</span>
                    {[15, 25, 45, 60].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setQuickWorkDuration(mins)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          workDuration === mins
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {mins}分钟
                      </button>
                    ))}
                  </div>

                  {/* Focus Push Browser Notification Config */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">浏览器专注即将结束推送 (Focus Push)</div>
                        <div className="text-[10px] text-slate-400">在自习最后 60 秒温柔提醒您准备休息或延长心流</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notificationPermission !== 'granted' && (
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold hover:bg-indigo-100 cursor-pointer"
                        >
                          开启浏览器权限
                        </button>
                      )}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={focusPushEnabled}
                          onChange={e => setFocusPushEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Break Suggestion Banner when completed */}
          <AnimatePresence>
            {showBreakSuggestion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-2xl bg-linear-to-r from-emerald-500/15 via-teal-500/15 to-blue-500/15 border border-emerald-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-950 flex items-center gap-2">
                      <span>🎉 恭喜完成 1 轮深度专注！</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-md">
                        {selectedSubject}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
                      大脑已消耗一定糖原，建议进行 {shortBreakDuration} 分钟短暂休息、眺望远方或喝一杯温水。
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeSessionSummary) {
                        triggerSummaryGeneration();
                      } else {
                        setShowSummaryModal(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>查看学程小结</span>
                  </button>
                  <button
                    onClick={() => startBreakDirectly(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    <span>立即开始休息</span>
                  </button>
                  <button
                    onClick={() => setShowBreakSuggestion(false)}
                    className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    稍后
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Break Tips when in Break mode */}
          {(mode === 'shortBreak' || mode === 'longBreak') && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
              <div className="flex items-center justify-between font-black text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  <span>科学休息指导：让大脑海马体高效巩固记忆</span>
                </span>
                {onAskAI && (
                  <button
                    onClick={() => onAskAI('请为我推荐一套 5 分钟大学生课桌放松拉伸操与呼吸减压法')}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                  >
                    请 AI 推荐课间拉伸法
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-emerald-800 font-medium">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/70">
                  <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>20-20-20：眺望6米外绿植20秒</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/70">
                  <Droplets className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>起身走动，喝半杯温开水</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/70">
                  <Activity className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span>转动颈肩，做 3 次腹式深呼吸</span>
                </div>
              </div>
            </div>
          )}

          {/* Focus Push Gentle Alert Banner (at <= 60s remaining) */}
          {mode === 'work' && isRunning && timeLeft <= 60 && timeLeft > 0 && (
            <div className="p-3.5 rounded-2xl bg-linear-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="font-bold text-slate-800 leading-snug">
                  ⏰ <strong>专注即将结束提示 (Focus Push)</strong>：距离本次自习完成还剩 <span className="font-mono text-rose-600 font-black">{timeLeft}</span> 秒，是否准备休息或延长心流？
                </span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleExtendSession(5)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs cursor-pointer active:scale-95 text-[11px] flex items-center gap-1"
                >
                  <span>+5 分钟</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExtendSession(10)}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-2xs cursor-pointer active:scale-95 text-[11px] flex items-center gap-1"
                >
                  <span>+10 分钟 (心流)</span>
                </button>
                <button
                  type="button"
                  onClick={handleTakeBreakEarly}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs cursor-pointer active:scale-95 text-[11px] flex items-center gap-1"
                >
                  <span>准备休息</span>
                </button>
              </div>
            </div>
          )}

          {/* Display & Controls Area */}
          <div className="p-6 rounded-3xl bg-linear-to-br from-white/70 to-white/40 border border-white/90 backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
            
            {/* Progress Arc background bar */}
            <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden mb-4 max-w-xs border border-white/60">
              <motion.div 
                className={`h-full transition-all duration-300 ${
                  mode === 'work' ? 'bg-linear-to-r from-rose-500 to-amber-500' :
                  mode === 'shortBreak' ? 'bg-linear-to-r from-emerald-500 to-teal-500' :
                  'bg-linear-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Giant Countdown Digits */}
            <div className="flex items-baseline gap-1 font-mono font-black tracking-tight text-slate-900 drop-shadow-xs">
              <span className="text-4xl sm:text-5xl">{formatMinutes(timeLeft)}</span>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-500">
              <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>
                {mode === 'work' ? `当前目标: ${selectedSubject}` : '放松中，适度休息让学习更高效'}
              </span>
            </div>

            {/* Play/Pause/Reset Action Buttons */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg active:scale-95 border border-white/40 ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
                    : mode === 'work'
                    ? 'bg-linear-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white shadow-rose-500/30'
                    : 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4.5 w-4.5 fill-current" />
                    <span>暂停计时</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4.5 w-4.5 fill-current" />
                    <span>开始专注</span>
                  </>
                )}
              </button>

              <button
                onClick={resetTimer}
                className="h-11 w-11 rounded-2xl bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-white/90 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                title="重置当前计时"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Focus Soundscapes Selector (Rain, Cafe, White Noise, Forest, Off) */}
            <div className="w-full mt-6 pt-4 border-t border-slate-200/70 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-black text-slate-800">
                    专注白噪音背景声 (Focus Soundscapes)
                  </span>
                  {selectedSoundscape !== 'none' && isSoundscapePlaying && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200 shadow-2xs animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>播放中</span>
                    </span>
                  )}
                </div>

                {/* Volume slider when soundscape active */}
                {selectedSoundscape !== 'none' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const newMute = !isSoundscapeMuted;
                        setIsSoundscapeMuted(newMute);
                        GlobalSoundscapeEngine.setMuted(newMute);
                      }}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                      title={isSoundscapeMuted ? '取消静音' : '静音背景声'}
                    >
                      {isSoundscapeMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isSoundscapeMuted ? 0 : soundscapeVolume}
                      onChange={e => handleSoundscapeVolumeChange(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      title="调节背景声响度"
                    />
                  </div>
                )}
              </div>

              {/* Preset Selector Grid: Rain, Cafe, White Noise, Forest, Off */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {SOUNDSCAPE_OPTIONS.map(opt => {
                  const isSelected = selectedSoundscape === opt.id;
                  let Icon = VolumeX;
                  if (opt.id === 'rain') Icon = CloudRain;
                  if (opt.id === 'cafe') Icon = Coffee;
                  if (opt.id === 'white_noise') Icon = Radio;
                  if (opt.id === 'forest') Icon = Trees;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectSoundscape(opt.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border text-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/30'
                          : 'bg-white/70 hover:bg-white text-slate-700 border-slate-200/80 hover:border-slate-300 shadow-2xs'
                      }`}
                      title={opt.description}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                      <div className="leading-tight">
                        <div className="text-[11px] font-black">{opt.englishName}</div>
                        <div className={`text-[9px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {opt.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Session Summary Modal / Card */}
      <AnimatePresence>
        {showSummaryModal && activeSessionSummary && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="glass-panel rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl border border-white/80 backdrop-blur-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-white/60 bg-linear-to-r from-purple-500/10 via-indigo-500/10 to-transparent flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/25 shrink-0">
                    <Sparkles className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900">番茄钟学程小结与进阶建议</h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 border border-purple-500/20">
                        Session Summary
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      AI 自动复盘专注成果并推荐后续进阶学习主题
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="h-8 w-8 rounded-xl bg-white/70 hover:bg-white text-slate-400 hover:text-slate-800 flex items-center justify-center border border-white/80 cursor-pointer shadow-2xs transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* 1. Core Focus Metric Capsule */}
                <div className="p-4 rounded-2xl bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">专注科目</div>
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      <span>{activeSessionSummary.subject}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">本次时长</div>
                      <div className="text-base font-black text-indigo-700 font-mono">{activeSessionSummary.durationMinutes} 分钟</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">今日累计</div>
                      <div className="text-base font-black text-purple-700 font-mono">{activeSessionSummary.totalFocusMinutesToday} 分钟</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">今日周期</div>
                      <div className="text-base font-black text-rose-600 font-mono">{activeSessionSummary.completedSessionsToday} 个</div>
                    </div>
                  </div>
                </div>

                {/* 2. Tasks Recap & Cognitive Achievement */}
                <div className="space-y-2">
                  <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>学程复盘与任务完成成效</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 text-xs text-slate-700 leading-relaxed space-y-2.5">
                    <p className="font-medium text-slate-800 leading-relaxed">{activeSessionSummary.tasksRecap.summaryText}</p>
                    
                    {activeSessionSummary.tasksRecap.completedTasks.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>关联已完成待办项：</span>
                        </span>
                        {activeSessionSummary.tasksRecap.completedTasks.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium pl-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>{activeSessionSummary.aiEncouragement}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Follow-up Study Topics (Based on the session's focus) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span>AI 推荐后续进阶学习主题 (Follow-up Topics)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">基于《{activeSessionSummary.subject}》智能解析</span>
                  </div>

                  <div className="space-y-2.5">
                    {activeSessionSummary.followUpTopics.map((topic, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/80 transition-all space-y-2 shadow-2xs group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-black text-[10px] shrink-0">
                              {i + 1}
                            </span>
                            <span>{topic.title}</span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${
                            topic.difficulty === '考前冲刺' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : topic.difficulty === '进阶提升'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {topic.difficulty}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {topic.description}
                        </p>

                        {/* Action Buttons for this Topic */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1.5 border-t border-slate-100/80">
                          {onAddTaskFromAI && (
                            <button
                              type="button"
                              onClick={() => onAddTaskFromAI(topic.title)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="将该主题收录进待办任务"
                            >
                              <PlusCircle className="h-3 w-3 text-slate-500" />
                              <span>加入待办</span>
                            </button>
                          )}

                          {onAskAI && (
                            <button
                              type="button"
                              onClick={() => {
                                onAskAI(topic.actionQuery);
                                setShowSummaryModal(false);
                              }}
                              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>向 AI 追问此考点</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 px-6 border-t border-white/60 bg-white/50 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {onAskAI && (
                    <button
                      type="button"
                      onClick={() => {
                        onAskAI(`请为我详细剖析本次《${activeSessionSummary.subject}》专注学程中推荐的后续进阶主题，并为我出两道自测题。`);
                        setShowSummaryModal(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>发送完整复盘至 AI 对话</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSummaryModal(false);
                      startBreakDirectly(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    <span>开始短暂休息</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSummaryModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pomodoro Study History & Productivity Trends Modal */}
      <PomodoroHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectTopicAction={onAskAI}
        onStartSessionWithSubject={subj => {
          setSelectedSubject(subj);
          setShowHistoryModal(false);
          setIsRunning(true);
        }}
      />

    </div>
  );
};

export default PomodoroTimer;

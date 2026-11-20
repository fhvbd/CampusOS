import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Maximize2, 
  Timer,
  Volume2,
  VolumeX,
  Radio,
  CloudRain,
  Coffee,
  BookOpen,
  Headphones,
  Bell,
  BellOff,
  Clock,
  Sparkles,
  X,
  RefreshCw
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../types';
import { GlobalSoundscapeEngine, SoundscapeOption } from '../lib/soundscapes';
import {
  generateBreakSuggestionWithGemini,
  BreakSuggestionItem,
} from '../services/breakSuggestionAI';

interface TaskFocusTimerCardProps {
  task?: Task | null;
  taskTitle: string;
  taskDescription?: string;
  taskCategory?: TaskCategory;
  taskPriority?: TaskPriority;
  courseName?: string;
  subtasksCount?: number;
  onCompleteSession: (durationMinutes: number) => void;
  onExpandToFullScreen?: () => void;
  focusReminderEnabled?: boolean;
  onToggleFocusReminder?: (enabled: boolean) => void;
}

const PRESET_DURATIONS = [
  { label: '速攻 15m', minutes: 15 },
  { label: '标准 25m', minutes: 25 },
  { label: '深度 45m', minutes: 45 },
  { label: '长程 60m', minutes: 60 },
];

const CARD_SOUNDSCAPE_PRESETS: {
  id: SoundscapeOption;
  label: string;
  englishLabel: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'none', label: '静音', englishLabel: 'Off', icon: VolumeX },
  { id: 'white_noise', label: '白噪音', englishLabel: 'White Noise', icon: Radio },
  { id: 'rain', label: '细雨', englishLabel: 'Rainfall', icon: CloudRain },
  { id: 'cafe', label: '咖啡馆', englishLabel: 'Coffee Shop', icon: Coffee },
  { id: 'library', label: '图书馆', englishLabel: 'Library', icon: BookOpen },
];

const DEFAULT_REMINDER_THRESHOLD_SECONDS = 50 * 60; // 50 consecutive minutes
const BREAK_DURATION_SECONDS = 5 * 60; // 5-minute break
const SNOOZE_DURATION_SECONDS = 10 * 60; // 10-minute snooze
const REMINDER_PREF_STORAGE_KEY = 'campus_os_focus_reminder_enabled';

export const TaskFocusTimerCard: React.FC<TaskFocusTimerCardProps> = ({
  task,
  taskTitle,
  taskDescription,
  taskCategory,
  taskPriority,
  courseName,
  subtasksCount,
  onCompleteSession,
  onExpandToFullScreen,
  focusReminderEnabled: externalReminderEnabled,
  onToggleFocusReminder,
}) => {
  const [selectedPresetMinutes, setSelectedPresetMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [isCustomInputOpen, setIsCustomInputOpen] = useState<boolean>(false);

  // Focus Soundscape Selector & Volume State
  const [selectedSoundscape, setSelectedSoundscape] = useState<SoundscapeOption>(() => {
    const current = GlobalSoundscapeEngine.getCurrentSoundscape();
    return current !== 'none' ? current : 'white_noise';
  });
  const [soundVolume, setSoundVolume] = useState<number>(() => GlobalSoundscapeEngine.getVolume());
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => GlobalSoundscapeEngine.getIsMuted());

  // 50-Minute Consecutive Focus Reminder State
  const [internalReminderEnabled, setInternalReminderEnabled] = useState<boolean>(() => {
    if (typeof externalReminderEnabled === 'boolean') return externalReminderEnabled;
    if (typeof task?.focus_reminder_enabled === 'boolean') return task.focus_reminder_enabled;
    try {
      const saved = localStorage.getItem(REMINDER_PREF_STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const isReminderEnabled =
    typeof externalReminderEnabled === 'boolean' ? externalReminderEnabled : internalReminderEnabled;

  const taskStorageKey = `campus_os_consecutive_focus_${task?.id || 'draft'}`;

  const [consecutiveFocusSeconds, setConsecutiveFocusSeconds] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(taskStorageKey);
      const parsed = saved ? parseInt(saved, 10) : 0;
      return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  });

  const [nextReminderThresholdSeconds, setNextReminderThresholdSeconds] = useState<number>(
    DEFAULT_REMINDER_THRESHOLD_SECONDS
  );
  const [isBreakAlertOpen, setIsBreakAlertOpen] = useState<boolean>(false);
  const [isBreakRunning, setIsBreakRunning] = useState<boolean>(false);
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState<number>(BREAK_DURATION_SECONDS);
  const [breakFinishedNotice, setBreakFinishedNotice] = useState<boolean>(false);

  // Proactive Break Suggestion (Gemini AI task complexity analysis)
  const [breakSuggestion, setBreakSuggestion] = useState<BreakSuggestionItem | null>(null);
  const [isLoadingBreakSuggestion, setIsLoadingBreakSuggestion] = useState<boolean>(false);
  const [seenSuggestionIds, setSeenSuggestionIds] = useState<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breakTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalSecondsRef = useRef<number>(25 * 60);
  const isExpandingRef = useRef<boolean>(false);
  const consecutiveRef = useRef<number>(consecutiveFocusSeconds);
  const thresholdRef = useRef<number>(nextReminderThresholdSeconds);
  const reminderEnabledRef = useRef<boolean>(isReminderEnabled);

  useEffect(() => {
    consecutiveRef.current = consecutiveFocusSeconds;
    try {
      sessionStorage.setItem(taskStorageKey, String(consecutiveFocusSeconds));
    } catch {
      // Ignore storage quota errors
    }
  }, [consecutiveFocusSeconds, taskStorageKey]);

  useEffect(() => {
    thresholdRef.current = nextReminderThresholdSeconds;
  }, [nextReminderThresholdSeconds]);

  useEffect(() => {
    reminderEnabledRef.current = isReminderEnabled;
  }, [isReminderEnabled]);

  // Play a pleasant Web Audio completion chime
  const playCompletionChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + startDelay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration + 0.05);
      };

      // Harmonic C5 major triad: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      playTone(523.25, 0, 0.4);
      playTone(659.25, 0.15, 0.4);
      playTone(783.99, 0.3, 0.5);
      playTone(1046.50, 0.45, 0.8);
    } catch {
      // Audio autoplay restriction fallback
    }
  };

  // Play a gentle two-note break reminder chime when 50 consecutive minutes are reached
  const playBreakReminderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playSoftNote = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + startDelay + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration + 0.05);
      };

      // Soothing pentatonic interval: A4 (440Hz) -> E5 (659.25Hz) -> D5 (587.33Hz)
      playSoftNote(440.0, 0, 0.45);
      playSoftNote(659.25, 0.2, 0.45);
      playSoftNote(587.33, 0.42, 0.7);
    } catch {
      // Audio autoplay restriction fallback
    }
  };

  // Sync ambient soundscape playback automatically with timer state (isRunning)
  useEffect(() => {
    if (isRunning) {
      if (selectedSoundscape !== 'none') {
        GlobalSoundscapeEngine.play(selectedSoundscape, isSoundMuted ? 0 : soundVolume);
      } else {
        GlobalSoundscapeEngine.stop();
      }
    } else {
      GlobalSoundscapeEngine.stop();
    }
  }, [isRunning, selectedSoundscape]);

  // Stop ambient sound when modal closes unless expanding to Full Focus Mode
  useEffect(() => {
    return () => {
      if (!isExpandingRef.current) {
        GlobalSoundscapeEngine.stop();
      }
    };
  }, []);

  // Main countdown tick interval + Consecutive 50-minute focus tracker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const nextConsecutive = consecutiveRef.current + 1;
        consecutiveRef.current = nextConsecutive;
        setConsecutiveFocusSeconds(nextConsecutive);

        // Check if 50 consecutive focus minutes (or snoozed threshold) has been reached
        if (
          reminderEnabledRef.current &&
          nextConsecutive >= thresholdRef.current &&
          secondsRemaining > 1
        ) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsRunning(false);
          GlobalSoundscapeEngine.stop();
          playBreakReminderChime();
          setIsBreakAlertOpen(true);
          return;
        }

        setSecondsRemaining(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRunning(false);
            setHasStarted(false);
            GlobalSoundscapeEngine.stop();
            playCompletionChime();
            const sessionMins = Math.max(1, Math.round(totalSecondsRef.current / 60));
            onCompleteSession(sessionMins);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, onCompleteSession, secondsRemaining]);

  // 5-Minute Break Countdown Tick Interval
  useEffect(() => {
    if (isBreakRunning) {
      breakTimerRef.current = setInterval(() => {
        setBreakSecondsRemaining(prev => {
          if (prev <= 1) {
            if (breakTimerRef.current) clearInterval(breakTimerRef.current);
            setIsBreakRunning(false);
            setBreakSecondsRemaining(BREAK_DURATION_SECONDS);
            setConsecutiveFocusSeconds(0);
            consecutiveRef.current = 0;
            setNextReminderThresholdSeconds(DEFAULT_REMINDER_THRESHOLD_SECONDS);
            thresholdRef.current = DEFAULT_REMINDER_THRESHOLD_SECONDS;
            setBreakFinishedNotice(true);
            playBreakReminderChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current);
    }

    return () => {
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    };
  }, [isBreakRunning]);

  const handleToggleReminderSetting = () => {
    const next = !isReminderEnabled;
    setInternalReminderEnabled(next);
    try {
      localStorage.setItem(REMINDER_PREF_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage errors
    }
    if (onToggleFocusReminder) {
      onToggleFocusReminder(next);
    }
    if (!next) {
      setIsBreakAlertOpen(false);
    }
  };

  // Fetch or refresh Gemini Proactive Break Suggestion based on current task complexity
  const handleFetchBreakSuggestion = async (isRefresh = false) => {
    setIsLoadingBreakSuggestion(true);
    try {
      const nextExclude = isRefresh ? seenSuggestionIds : [];
      const suggestion = await generateBreakSuggestionWithGemini({
        title: taskTitle || task?.title || '当前学习任务',
        description: taskDescription ?? task?.description,
        category: taskCategory ?? task?.category,
        priority: taskPriority ?? task?.priority,
        courseName: courseName ?? task?.course_name,
        subtasksCount: subtasksCount ?? task?.subtasks?.length ?? 0,
        excludeIds: nextExclude,
      });
      setBreakSuggestion(suggestion);
      setSeenSuggestionIds(prev => {
        const updated = [...prev, suggestion.id, suggestion.activityTitle];
        return updated.length > 6 ? updated.slice(-4) : updated;
      });
    } finally {
      setIsLoadingBreakSuggestion(false);
    }
  };

  // Automatically analyze task complexity & generate break suggestion when break alert opens
  useEffect(() => {
    if (isBreakAlertOpen && !breakSuggestion && !isLoadingBreakSuggestion) {
      handleFetchBreakSuggestion(false);
    }
  }, [isBreakAlertOpen]);

  // Trigger 50-minute threshold alert immediately for preview/testing or manual break
  const handleTriggerBreakReminderPreview = () => {
    setIsRunning(false);
    GlobalSoundscapeEngine.stop();
    setBreakFinishedNotice(false);
    setConsecutiveFocusSeconds(prev => Math.max(prev, DEFAULT_REMINDER_THRESHOLD_SECONDS));
    consecutiveRef.current = Math.max(consecutiveRef.current, DEFAULT_REMINDER_THRESHOLD_SECONDS);
    playBreakReminderChime();
    setIsBreakAlertOpen(true);
    handleFetchBreakSuggestion(false);
  };

  // Action 1: Start 5-min Break Countdown
  const handleStartFiveMinBreak = () => {
    setIsBreakAlertOpen(false);
    setBreakFinishedNotice(false);
    setIsRunning(false);
    setBreakSecondsRemaining(BREAK_DURATION_SECONDS);
    setIsBreakRunning(true);
    if (!breakSuggestion && !isLoadingBreakSuggestion) {
      handleFetchBreakSuggestion(false);
    }
  };

  // Action 2: Snooze 10 minutes and resume focus
  const handleSnoozeTenMinutes = () => {
    const nextThreshold = consecutiveRef.current + SNOOZE_DURATION_SECONDS;
    setNextReminderThresholdSeconds(nextThreshold);
    thresholdRef.current = nextThreshold;
    setIsBreakAlertOpen(false);
    setBreakFinishedNotice(false);
    setHasStarted(true);
    setIsRunning(true);
  };

  // Action 3: Dismiss break alert, reset consecutive counter, and continue focusing
  const handleDismissBreakAlert = () => {
    setConsecutiveFocusSeconds(0);
    consecutiveRef.current = 0;
    setNextReminderThresholdSeconds(DEFAULT_REMINDER_THRESHOLD_SECONDS);
    thresholdRef.current = DEFAULT_REMINDER_THRESHOLD_SECONDS;
    setIsBreakAlertOpen(false);
    setBreakFinishedNotice(false);
    if (hasStarted && secondsRemaining > 0) {
      setIsRunning(true);
    }
  };

  // Finish or skip the active 5-minute break and return to task focus
  const handleFinishBreakAndResume = () => {
    setIsBreakRunning(false);
    setBreakSecondsRemaining(BREAK_DURATION_SECONDS);
    setConsecutiveFocusSeconds(0);
    consecutiveRef.current = 0;
    setNextReminderThresholdSeconds(DEFAULT_REMINDER_THRESHOLD_SECONDS);
    thresholdRef.current = DEFAULT_REMINDER_THRESHOLD_SECONDS;
    setBreakFinishedNotice(false);
    if (secondsRemaining > 0) {
      setHasStarted(true);
      setIsRunning(true);
    }
  };

  const handleSelectPreset = (mins: number) => {
    setIsRunning(false);
    setSelectedPresetMinutes(mins);
    setSecondsRemaining(mins * 60);
    totalSecondsRef.current = mins * 60;
    setHasStarted(false);
    setIsCustomInputOpen(false);
  };

  const handleApplyCustomMinutes = () => {
    const parsed = parseInt(customMinutes, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 180) {
      handleSelectPreset(parsed);
    }
  };

  const handleTogglePlay = () => {
    if (isBreakRunning) {
      setIsBreakRunning(false);
    }
    setBreakFinishedNotice(false);
    if (!isRunning) {
      setHasStarted(true);
      if (secondsRemaining === 0) {
        setSecondsRemaining(selectedPresetMinutes * 60);
        totalSecondsRef.current = selectedPresetMinutes * 60;
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setHasStarted(false);
    setSecondsRemaining(selectedPresetMinutes * 60);
    setConsecutiveFocusSeconds(0);
    consecutiveRef.current = 0;
    setNextReminderThresholdSeconds(DEFAULT_REMINDER_THRESHOLD_SECONDS);
    thresholdRef.current = DEFAULT_REMINDER_THRESHOLD_SECONDS;
    setIsBreakAlertOpen(false);
    setIsBreakRunning(false);
    setBreakFinishedNotice(false);
    GlobalSoundscapeEngine.stop();
  };

  const handleEarlyComplete = () => {
    setIsRunning(false);
    setHasStarted(false);
    setIsBreakRunning(false);
    setIsBreakAlertOpen(false);
    GlobalSoundscapeEngine.stop();
    playCompletionChime();
    const elapsedSeconds = totalSecondsRef.current - secondsRemaining;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    onCompleteSession(elapsedMinutes);
  };

  const handleSelectSoundscape = (presetId: SoundscapeOption) => {
    setSelectedSoundscape(presetId);
    if (presetId === 'none') {
      GlobalSoundscapeEngine.stop();
    } else if (isRunning) {
      GlobalSoundscapeEngine.play(presetId, isSoundMuted ? 0 : soundVolume);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSoundVolume(val);
    GlobalSoundscapeEngine.setVolume(val);
    if (isSoundMuted && val > 0) {
      setIsSoundMuted(false);
      GlobalSoundscapeEngine.setMuted(false);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    GlobalSoundscapeEngine.setMuted(nextMuted);
  };

  const handleExpandClick = () => {
    if (!onExpandToFullScreen) return;
    isExpandingRef.current = true;
    if (selectedSoundscape !== 'none') {
      GlobalSoundscapeEngine.play(selectedSoundscape, isSoundMuted ? 0 : soundVolume);
    }
    onExpandToFullScreen();
  };

  // Format MM:SS
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Format Break MM:SS
  const breakMins = Math.floor(breakSecondsRemaining / 60);
  const breakSecs = breakSecondsRemaining % 60;
  const breakTimeFormatted = `${breakMins.toString().padStart(2, '0')}:${breakSecs.toString().padStart(2, '0')}`;
  const breakProgressPercent = Math.min(
    100,
    Math.max(0, ((BREAK_DURATION_SECONDS - breakSecondsRemaining) / BREAK_DURATION_SECONDS) * 100)
  );

  // Consecutive focus stats
  const consecutiveMinutesDisplay = Math.floor(consecutiveFocusSeconds / 60);
  const targetThresholdMinutes = Math.round(nextReminderThresholdSeconds / 60);
  const consecutiveProgressPercent = Math.min(
    100,
    Math.max(0, (consecutiveFocusSeconds / nextReminderThresholdSeconds) * 100)
  );

  const progressPercent = totalSecondsRef.current > 0 
    ? Math.min(100, Math.max(0, ((totalSecondsRef.current - secondsRemaining) / totalSecondsRef.current) * 100))
    : 0;

  const isAudioActivelyPlaying = isRunning && selectedSoundscape !== 'none' && !isSoundMuted && soundVolume > 0;

  return (
    <div className="rounded-2xl p-4 bg-linear-to-br from-indigo-50/70 via-white/80 to-blue-50/60 dark:from-slate-900/80 dark:via-slate-800/80 dark:to-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 shadow-sm backdrop-blur-md transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-indigo-100/60 dark:border-indigo-900/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight">
                即时专注学程计时
              </span>
              {isRunning && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  心流专注中
                </span>
              )}
              {isBreakRunning && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  <Coffee className="h-3 w-3" />
                  5分钟恢复休息中
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              倒计时结束将自动结算专注时长并完结待办
            </p>
          </div>
        </div>

        {/* Global Focus Mode Link */}
        {onExpandToFullScreen && (
          <button
            type="button"
            onClick={handleExpandClick}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title="将当前待办无缝接入全局沉浸番茄钟"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">全屏专注</span>
          </button>
        )}
      </div>

      {/* 50-Minute Consecutive Focus Reminder Notification Banner */}
      {isBreakAlertOpen && (
        <div className="mb-3.5 p-3.5 rounded-2xl bg-amber-50/95 dark:bg-amber-950/70 border border-amber-300/90 dark:border-amber-700 shadow-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-2xs">
                <Coffee className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-950 dark:text-amber-100">
                    已连续专注满 {Math.max(50, consecutiveMinutesDisplay)} 分钟 · 建议小憩 5 分钟
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 mt-0.5 leading-relaxed">
                  已为您自动暂停当前计时。根据当前待办的认知与视觉复杂度，Gemini 为您定制了专属 5 分钟恢复建议：
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissBreakAlert}
              className="text-amber-600 hover:text-amber-900 dark:text-amber-300 p-1 rounded-lg cursor-pointer"
              title="关闭提醒"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Gemini Proactive Break Suggestion Box */}
          <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/90 dark:border-amber-800/80 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>
                  {isLoadingBreakSuggestion
                    ? 'Gemini 正在分析任务复杂度...'
                    : breakSuggestion?.complexityTag || '高专注负荷 · 智能恢复建议'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleFetchBreakSuggestion(true)}
                disabled={isLoadingBreakSuggestion}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                title="让 Gemini 重新推荐一项 5 分钟休息活动"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingBreakSuggestion ? 'animate-spin' : ''}`} />
                <span>换个建议</span>
              </button>
            </div>

            {isLoadingBreakSuggestion && !breakSuggestion ? (
              <div className="py-1.5 text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                正在结合当前任务标题与复杂度生成 5 分钟恢复活动...
              </div>
            ) : breakSuggestion ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    推荐活动：{breakSuggestion.activityTitle}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-300">
                    ({breakSuggestion.englishCue})
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {breakSuggestion.reason}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleDismissBreakAlert}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-white/80 hover:bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-amber-700 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              忽略并继续
            </button>
            <button
              type="button"
              onClick={handleSnoozeTenMinutes}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 dark:text-amber-100 bg-amber-100/90 hover:bg-amber-200/80 dark:bg-amber-900/60 border border-amber-300/80 dark:border-amber-700 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>延后 10 分钟</span>
            </button>
            <button
              type="button"
              onClick={handleStartFiveMinBreak}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>开始 5 分钟休息</span>
            </button>
          </div>
        </div>
      )}

      {/* Active 5-Minute Break Countdown Card */}
      {isBreakRunning && (
        <div className="mb-3.5 p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-800 dark:text-emerald-200 tabular-nums bg-white/90 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs">
                {breakTimeFormatted}
              </div>
              <div>
                <div className="text-xs font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5 text-emerald-600" />
                  <span>5 分钟护眼与脑力恢复休息</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  请跟随下方 AI 恢复指南放松身心；休息结束后将清零连续疲劳计时
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishBreakAndResume}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>结束休息，恢复专注</span>
            </button>
          </div>

          {/* Carry over Gemini Proactive Break Suggestion into active 5-minute break countdown */}
          {breakSuggestion && (
            <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/85 border border-emerald-200/90 dark:border-emerald-800/80 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>{breakSuggestion.complexityTag}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleFetchBreakSuggestion(true)}
                  disabled={isLoadingBreakSuggestion}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingBreakSuggestion ? 'animate-spin' : ''}`} />
                  <span>换个建议</span>
                </button>
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-white">
                当前执行：{breakSuggestion.activityTitle}{' '}
                <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                  ({breakSuggestion.englishCue})
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {breakSuggestion.reason}
              </p>
            </div>
          )}

          <div className="w-full bg-emerald-200/70 dark:bg-emerald-900/60 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
              style={{ width: `${breakProgressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Break Completed Notice Banner */}
      {breakFinishedNotice && !isBreakRunning && !isBreakAlertOpen && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>5 分钟休息已完成！连续专注疲劳计时已重置，随时点击「继续专注」投入学习。</span>
          </div>
          <button
            type="button"
            onClick={() => setBreakFinishedNotice(false)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Display & Controls Grid */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Countdown Time Display */}
        <div className="flex items-center gap-3">
          <div className="relative font-mono font-black text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-white tabular-nums select-none bg-white/90 dark:bg-slate-800/90 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-inner">
            {timeFormatted}
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              目标时长: {selectedPresetMinutes} 分钟
            </div>
            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold tabular-nums">
              {Math.round(progressPercent)}% 已投入
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                <span>暂停</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>{hasStarted ? '继续专注' : '开始专注'}</span>
              </>
            )}
          </button>

          {/* Reset Button */}
          {hasStarted && (
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
              title="重置计时"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {/* Early Complete Button */}
          <button
            type="button"
            onClick={handleEarlyComplete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            title="已提前完成该待办，直接保存并沉淀专注时长"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">提早完结</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-1.5 rounded-full overflow-hidden my-3">
        <div 
          className="h-full bg-linear-to-r from-indigo-500 via-blue-500 to-emerald-500 transition-all duration-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Presets Row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1">
          快捷档位:
        </span>
        {PRESET_DURATIONS.map(preset => (
          <button
            key={preset.minutes}
            type="button"
            disabled={isRunning}
            onClick={() => handleSelectPreset(preset.minutes)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedPresetMinutes === preset.minutes && !isCustomInputOpen
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {preset.label}
          </button>
        ))}

        {/* Custom Duration Toggle */}
        {!isCustomInputOpen ? (
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setIsCustomInputOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 bg-transparent hover:bg-white/60 dark:hover:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            自定义分钟
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-indigo-300 dark:border-indigo-700">
            <input
              type="number"
              min="1"
              max="180"
              placeholder="分钟"
              value={customMinutes}
              onChange={e => setCustomMinutes(e.target.value)}
              className="w-12 text-xs font-mono font-bold text-slate-800 dark:text-white bg-transparent outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={handleApplyCustomMinutes}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-1"
            >
              确定
            </button>
            <button
              type="button"
              onClick={() => setIsCustomInputOpen(false)}
              className="text-[10px] text-slate-400 hover:text-slate-600 px-0.5"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* Focus Soundscape Selector Bar (Synced with Timer Active State) */}
      <div className="mt-3 pt-3 border-t border-indigo-100/60 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 mr-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <Headphones className={`h-3.5 w-3.5 ${isAudioActivelyPlaying ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
            <span>专注声景:</span>
          </div>

          {CARD_SOUNDSCAPE_PRESETS.map(sound => {
            const IconComp = sound.icon;
            const isSelected = selectedSoundscape === sound.id;
            return (
              <button
                key={sound.id}
                type="button"
                onClick={() => handleSelectSoundscape(sound.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? sound.id === 'none'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
                title={`${sound.label} (${sound.englishLabel}) · 随专注计时自动启停`}
              >
                <IconComp className="h-3 w-3" />
                <span>{sound.label}</span>
              </button>
            );
          })}
        </div>

        {/* Compact Inline Volume Slider & Mute Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto bg-white/75 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200/70 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            title={isSoundMuted ? '取消静音' : '静音环境声'}
          >
            {isSoundMuted || soundVolume === 0 ? (
              <VolumeX className="h-3.5 w-3.5 text-rose-500" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isSoundMuted ? 0 : soundVolume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            title={`环境音景音量: ${Math.round((isSoundMuted ? 0 : soundVolume) * 100)}%`}
          />

          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums w-7 text-right">
            {Math.round((isSoundMuted ? 0 : soundVolume) * 100)}%
          </span>
        </div>
      </div>

      {/* Focus Reminder Settings Bar (50-Minute Consecutive Work -> 5-Minute Break Reminder) */}
      <div className="mt-2.5 pt-2.5 border-t border-indigo-100/60 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleReminderSetting}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
              isReminderEnabled
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-white/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700'
            }`}
            title="开启后，当连续专注满 50 分钟时将自动暂停并提醒休息 5 分钟"
          >
            {isReminderEnabled ? (
              <Bell className="h-3 w-3" />
            ) : (
              <BellOff className="h-3 w-3" />
            )}
            <span>连续 50m 休息提醒: {isReminderEnabled ? '已开启' : '已关闭'}</span>
          </button>

          {isReminderEnabled && (
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                已连续 {consecutiveMinutesDisplay}/{targetThresholdMinutes}m
              </span>
              <div className="w-14 bg-slate-200/80 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${consecutiveProgressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {isReminderEnabled && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {consecutiveFocusSeconds > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConsecutiveFocusSeconds(0);
                  consecutiveRef.current = 0;
                  setNextReminderThresholdSeconds(DEFAULT_REMINDER_THRESHOLD_SECONDS);
                  thresholdRef.current = DEFAULT_REMINDER_THRESHOLD_SECONDS;
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer whitespace-nowrap"
                title="清零当前连续专注累计时长"
              >
                重置累计
              </button>
            )}
            <button
              type="button"
              onClick={handleTriggerBreakReminderPreview}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
              title="立即模拟连续工作满 50 分钟时的暂停与 5 分钟休息提醒弹窗"
            >
              <Coffee className="h-3 w-3" />
              <span>体验 50m 提醒</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


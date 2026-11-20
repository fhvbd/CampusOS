import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Sparkles, 
  Clock, 
  X, 
  CheckCircle2, 
  Play, 
  Pause,
  RotateCcw, 
  Coffee, 
  ArrowRight,
  Smile,
  Eye,
  Droplets,
  Wind,
  Check
} from 'lucide-react';

export interface StretchBreakToastProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBreak?: () => void;
  intervalMinutes?: number;
  subject?: string;
  autoCloseSeconds?: number;
}

interface StretchStep {
  id: number;
  title: string;
  timeRange: string;
  action: string;
  icon: React.ElementType;
}

const STRETCH_STEPS: StretchStep[] = [
  {
    id: 1,
    title: '肩颈舒展与绕环',
    timeRange: '第 1 分钟',
    action: '缓慢顺时针/逆时针旋转头部，双手抱头向前微低头拉伸颈椎',
    icon: Activity,
  },
  {
    id: 2,
    title: '站立扩胸与脊柱延展',
    timeRange: '第 2-3 分钟',
    action: '起立双手交叉向天花板拉伸，向后展开双肩深呼吸',
    icon: Wind,
  },
  {
    id: 3,
    title: '极目远眺与眼球转动',
    timeRange: '第 4 分钟',
    action: '望向 6 米外窗外绿植或远景，缓慢转动眼球消除视疲劳',
    icon: Eye,
  },
  {
    id: 4,
    title: '温水补水与呼吸调律',
    timeRange: '第 5 分钟',
    action: '饮用约 200ml 温水，闭目深吸气 4 秒并缓慢吐气',
    icon: Droplets,
  },
];

export const StretchBreakToast: React.FC<StretchBreakToastProps> = ({
  isOpen,
  onClose,
  onStartBreak,
  intervalMinutes = 25,
  subject = '专注自习',
  autoCloseSeconds = 14,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(autoCloseSeconds);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'prompt' | 'guided'>('prompt');
  
  // Guided 5-min stretch timer
  const [stretchSecondsLeft, setStretchSecondsLeft] = useState<number>(300); // 5 minutes = 300s
  const [isStretchTimerRunning, setIsStretchTimerRunning] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Reset states when reopened
  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(autoCloseSeconds);
      setActiveMode('prompt');
      setStretchSecondsLeft(300);
      setIsStretchTimerRunning(false);
      setCompletedSteps([]);
    }
  }, [isOpen, autoCloseSeconds]);

  // Auto close countdown (only during prompt mode and when not hovered)
  useEffect(() => {
    if (!isOpen || activeMode !== 'prompt' || isHovered) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, activeMode, isHovered, onClose]);

  // Guided stretch timer tick
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeMode === 'guided' && isStretchTimerRunning && stretchSecondsLeft > 0) {
      timer = setInterval(() => {
        setStretchSecondsLeft(prev => {
          if (prev <= 1) {
            setIsStretchTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeMode, isStretchTimerRunning, stretchSecondsLeft]);

  if (!isOpen) return null;

  const handleStart5MinStretch = () => {
    setActiveMode('guided');
    setIsStretchTimerRunning(true);
    if (onStartBreak) {
      onStartBreak();
    }
  };

  const toggleStepCompleted = (stepId: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) ? prev.filter(id => id !== stepId) : [...prev, stepId]
    );
  };

  const stretchMins = Math.floor(stretchSecondsLeft / 60);
  const stretchSecs = stretchSecondsLeft % 60;
  const formattedStretchTime = `${String(stretchMins).padStart(2, '0')}:${String(stretchSecs).padStart(2, '0')}`;
  const stretchProgressPercent = ((300 - stretchSecondsLeft) / 300) * 100;

  // Auto-dismiss progress bar width percentage
  const autoDismissPercent = (secondsRemaining / autoCloseSeconds) * 100;

  return (
    <div 
      className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white/95 backdrop-blur-xl border border-emerald-200/90 shadow-2xl rounded-3xl p-4 sm:p-5 text-slate-800 relative overflow-hidden ring-1 ring-emerald-500/10">
        
        {/* Subtle Ambient Glowing Orb */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-linear-to-bl from-emerald-400/15 via-teal-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Mode 1: Initial Subtle Encouragement Toast Prompt */}
        {activeMode === 'prompt' && (
          <div className="space-y-3.5 relative z-10">
            {/* Header: Tag + Close */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-linear-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs shadow-emerald-500/20 shrink-0">
                  <Activity className="h-4 w-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      🌿 专注周期结束
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      已专注 {intervalMinutes}m
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-slate-900 truncate">
                    该休息一下啦 · 5分钟拉伸舒缓
                  </h4>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="关闭提示"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Subtle Encouragement Message */}
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-100/90 space-y-1.5">
              <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                🎉 【{subject}】周期圆满达成！站起来伸展肩颈、眺望窗外绿植或喝杯温水，给大脑 5 分钟微充能。
              </p>
              <div className="flex items-center gap-3 text-[11px] text-emerald-800 font-bold pt-0.5">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-emerald-600" />
                  舒缓肩颈
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-emerald-600" />
                  缓解视疲劳
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-emerald-600" />
                  温水润燥
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                onClick={handleStart5MinStretch}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>开启 5 分钟拉伸休息</span>
              </button>

              <button
                onClick={onClose}
                className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                稍后提醒
              </button>
            </div>

            {/* Subtle Auto-Dismiss Countdown Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${autoDismissPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{isHovered ? '已暂停倒计时 (悬停中)' : `提示将在 ${secondsRemaining}s 后自动收起`}</span>
                <span className="font-mono">{secondsRemaining}s</span>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Interactive 5-Min Guided Stretch Routine */}
        {activeMode === 'guided' && (
          <div className="space-y-4 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <span>5 分钟舒展跟练</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      微休息进行中
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">跟随步骤活动身心，按时归位</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Timer Counter Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200/80">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="text-xl font-black font-mono text-emerald-800 leading-none">
                    {formattedStretchTime}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    {stretchSecondsLeft === 0 ? '🎉 拉伸达成！' : '拉伸剩余时间'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsStretchTimerRunning(!isStretchTimerRunning)}
                  className={`h-8 px-3 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    isStretchTimerRunning 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isStretchTimerRunning ? (
                    <>
                      <Pause className="h-3 w-3" />
                      <span>暂停</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      <span>继续</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setStretchSecondsLeft(300);
                    setIsStretchTimerRunning(false);
                  }}
                  className="h-8 w-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
                  title="重置计时"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${stretchProgressPercent}%` }}
              />
            </div>

            {/* Recommended 4 Steps Checklist */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {STRETCH_STEPS.map(step => {
                const Icon = step.icon;
                const isDone = completedSteps.includes(step.id);
                return (
                  <div
                    key={step.id}
                    onClick={() => toggleStepCompleted(step.id)}
                    className={`p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                      isDone
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 line-through opacity-80'
                        : 'bg-white/80 hover:bg-white border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 text-transparent hover:border-emerald-500'
                    }`}>
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <Icon className="h-3 w-3 text-emerald-600" />
                          <span>{step.title}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {step.timeRange}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        {step.action}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">
                已完成 {completedSteps.length}/4 项舒展动作
              </span>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                结束休息并关闭
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

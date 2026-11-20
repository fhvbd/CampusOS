import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Droplets, 
  Eye, 
  Smile, 
  Sparkles, 
  Clock, 
  Coffee, 
  Sun, 
  Moon, 
  Zap, 
  Check, 
  RotateCcw, 
  Bell, 
  ArrowRight, 
  X,
  Volume2,
  CheckCircle2,
  HeartPulse,
  Flame
} from 'lucide-react';
import { 
  QuickBreakActivity, 
  getCurrentTimePeriod, 
  getTimeBasedActivities, 
  getRecommendedQuickActivity 
} from '../lib/quickBreakActivities';

interface FiftyMinuteBreakActivityCardProps {
  className?: string;
  isTriggeredModalOpen?: boolean;
  onCloseTriggeredModal?: () => void;
  onTriggerSimulate?: () => void;
  onStartBreakTimer?: (minutes: number) => void;
}

export const FiftyMinuteBreakActivityCard: React.FC<FiftyMinuteBreakActivityCardProps> = ({
  className = '',
  isTriggeredModalOpen = false,
  onCloseTriggeredModal,
  onTriggerSimulate,
  onStartBreakTimer,
}) => {
  const [activityIndex, setActivityIndex] = useState<number>(0);
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({});
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  // Time of day evaluation (re-evaluated on mount or every minute)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const timePeriod = useMemo(() => {
    return getCurrentTimePeriod(now);
  }, [now]);

  const suitedActivities = useMemo(() => {
    return getTimeBasedActivities(timePeriod.period);
  }, [timePeriod.period]);

  const currentActivity: QuickBreakActivity = useMemo(() => {
    return suitedActivities[activityIndex % suitedActivities.length] || suitedActivities[0];
  }, [suitedActivities, activityIndex]);

  // Handle cycling to next activity
  const handleNextActivity = () => {
    setActivityIndex(prev => (prev + 1) % suitedActivities.length);
  };

  // Mark activity completed
  const handleMarkComplete = (activityId: string) => {
    setCompletedActivities(prev => ({
      ...prev,
      [activityId]: true,
    }));
    setJustCompletedId(activityId);
    setTimeout(() => {
      setJustCompletedId(null);
    }, 3000);
  };

  // Helper to render activity icon
  const renderActivityIcon = (iconName: string, classNameStr: string) => {
    switch (iconName) {
      case 'Activity':
        return <Activity className={classNameStr} />;
      case 'Droplets':
        return <Droplets className={classNameStr} />;
      case 'Eye':
        return <Eye className={classNameStr} />;
      case 'Zap':
        return <Zap className={classNameStr} />;
      case 'Smile':
      default:
        return <Smile className={classNameStr} />;
    }
  };

  const isCompleted = completedActivities[currentActivity.id];

  return (
    <>
      {/* 1. Main Inline Card in FocusModeView */}
      <div className={`glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-200/70 bg-linear-to-br from-emerald-500/10 via-teal-500/5 to-indigo-500/10 space-y-4 relative overflow-hidden ${className}`}>
        
        {/* Subtle ambient glowing orb */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-bl from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Card Header: 50-Min Title & Time of Day Dynamic Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <HeartPulse className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                  50分钟课间微活动动态推荐
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Quick Activity
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                每逢专注满 50 分钟，智能依据当前时刻为您匹配最佳课间补水与身体舒展方案
              </p>
            </div>
          </div>

          {/* Time of Day Dynamic Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1.5 ${timePeriod.badgeClass}`}>
              {timePeriod.period === 'morning' || timePeriod.period === 'noon' ? (
                <Sun className="h-3 w-3" />
              ) : (
                <Moon className="h-3 w-3" />
              )}
              <span>{timePeriod.label}</span>
              <span className="opacity-80 font-mono font-normal">({now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')})</span>
            </span>

            {/* Test Trigger Button */}
            {onTriggerSimulate && (
              <button
                type="button"
                onClick={onTriggerSimulate}
                className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-emerald-800 text-[10px] font-black border border-emerald-200 shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                title="模拟专注达到50分钟时弹出的智能活动提醒"
              >
                <Bell className="h-3 w-3 text-emerald-600" />
                <span>测试触发提醒</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Suggested Activity Showcase Card */}
        <div className="p-4 rounded-2xl bg-white/90 border border-emerald-100/90 shadow-2xs space-y-3 relative z-10 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            
            {/* Left: Icon & Title */}
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-linear-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0 mt-0.5">
                {renderActivityIcon(currentActivity.iconName, 'h-6 w-6')}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {currentActivity.categoryLabel}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    建议耗时：{currentActivity.durationText}
                  </span>
                  {currentActivity.caloriesOrCount && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-mono font-bold">
                      {currentActivity.caloriesOrCount}
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>{currentActivity.title}</span>
                  <span className="text-xs font-mono font-medium text-slate-400">({currentActivity.englishTitle})</span>
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {currentActivity.instruction}
                </p>
              </div>
            </div>

            {/* Right Action: Mark Completed or Switch Activity */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <button
                type="button"
                onClick={() => handleMarkComplete(currentActivity.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>{isCompleted ? '已完成打卡 ✓' : '完成此微活动'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextActivity}
                className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="切换当前时段其他推荐活动"
              >
                <RotateCcw className="h-3 w-3" />
                <span>换一个微活动 ({activityIndex + 1}/{suitedActivities.length})</span>
              </button>
            </div>

          </div>

          {/* Health Benefit Tip */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span><strong>医学健康收益：</strong>{currentActivity.healthBenefit}</span>
            </div>

            {justCompletedId === currentActivity.id && (
              <span className="text-xs font-black text-emerald-600 animate-bounce shrink-0">
                🎉 打卡成功！身体与大脑已充满电！
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 2. Fullscreen Triggered 50-Minute Break Modal (When 50m triggers) */}
      {isTriggeredModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="glass-panel rounded-3xl max-w-lg w-full shadow-2xl border border-emerald-200/80 bg-white/95 overflow-hidden flex flex-col space-y-4 p-6 relative">
            
            {/* Close Button */}
            <button
              onClick={onCloseTriggeredModal}
              className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Notification Header */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/25 shrink-0">
                <Bell className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg text-slate-900">
                    50分钟深度专注达成提醒！
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Take a Break
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  已持续高强度用脑 50 分钟，请立刻暂停伏案，给大脑 5 分钟微休息！
                </p>
              </div>
            </div>

            {/* Time of Day Context Banner */}
            <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="font-bold">
                  检测到当前为【{timePeriod.label} ({timePeriod.greeting})】
                </span>
              </div>
              <span className="text-[10px] text-indigo-700 font-mono">
                推荐针对性微活动
              </span>
            </div>

            {/* Suggested Activity Card */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  {renderActivityIcon(currentActivity.iconName, 'h-5 w-5')}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                      {currentActivity.categoryLabel}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      建议耗时：{currentActivity.durationText}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">
                    {currentActivity.title}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentActivity.instruction}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-emerald-800 bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{currentActivity.healthBenefit}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleNextActivity}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>换一个课间活动</span>
              </button>

              <div className="flex items-center gap-2">
                {onStartBreakTimer && (
                  <button
                    type="button"
                    onClick={() => {
                      onStartBreakTimer(5);
                      if (onCloseTriggeredModal) onCloseTriggeredModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    <span>开启 5 分钟定时休息</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleMarkComplete(currentActivity.id);
                    if (onCloseTriggeredModal) onCloseTriggeredModal();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  我知道了 / 稍后
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

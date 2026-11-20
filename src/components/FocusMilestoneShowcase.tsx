import React, { useState } from 'react';
import {
  Sunrise,
  Moon,
  Brain,
  Flame,
  Timer,
  Crown,
  CheckCircle2,
  Lock,
  Sparkles,
  Award,
  ArrowUpRight,
} from 'lucide-react';
import {
  FocusMilestoneBadge,
  FocusMilestoneSummary,
  MilestoneIconKey,
  emitMilestoneUnlockToast,
} from '../lib/focusMilestones';
import { TabType } from '../types';

interface FocusMilestoneShowcaseProps {
  summary: FocusMilestoneSummary;
  equippedBadgeId: string;
  onEquipBadge: (badgeId: string) => void;
  onToggleSimulateUnlock: (badgeId: string) => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const renderMilestoneIcon = (iconKey: MilestoneIconKey, className = 'h-5 w-5') => {
  switch (iconKey) {
    case 'sunrise':
      return <Sunrise className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'timer':
      return <Timer className={className} />;
    case 'crown':
      return <Crown className={className} />;
    default:
      return <Award className={className} />;
  }
};

export const FocusMilestoneShowcase: React.FC<FocusMilestoneShowcaseProps> = ({
  summary,
  equippedBadgeId,
  onEquipBadge,
  onToggleSimulateUnlock,
  onNavigateTab,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedTargetBadgeId, setSelectedTargetBadgeId] = useState<string | null>(null);

  const filteredBadges = summary.badges.filter(b => {
    if (filterMode === 'unlocked') return b.isUnlocked;
    if (filterMode === 'locked') return !b.isUnlocked;
    return true;
  });

  const equippedBadge =
    summary.badges.find(b => b.id === equippedBadgeId && b.isUnlocked) ||
    summary.badges.find(b => b.isUnlocked) ||
    summary.badges[0];

  // Closest locked badge or user-selected locked badge for the radial widget
  const lockedEstimates = summary.nextBadgeEstimates || [];
  const activeEstimate =
    lockedEstimates.find(item => item.badge.id === selectedTargetBadgeId) ||
    lockedEstimates[0] ||
    null;

  // Radial SVG geometry (r = 56, circumference = 2 * PI * 56 ≈ 351.86)
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const radialPercent = activeEstimate ? activeEstimate.progressPercent : 100;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(4, radialPercent)) / 100) * circumference;

  return (
    <div
      id="focus-milestone-showcase"
      className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-indigo-200/60"
    >
      {/* Header & Summary Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/70">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-linear-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Award className="h-5.5 w-5.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                专注里程碑与荣誉勋章馆 (Focus Milestones)
              </h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                · 已点亮 {summary.unlockedCount}/{summary.totalCount} 枚
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              根据每日连续专注打卡目标与全天学习节律自动解锁专属外观勋章，可随时佩戴至个人资料顶部卡片
            </p>
          </div>
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部勋章 ({summary.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unlocked')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              filterMode === 'unlocked'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            已解锁 ({summary.unlockedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('locked')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              filterMode === 'locked'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            待解锁 ({summary.totalCount - summary.unlockedCount})
          </button>
        </div>
      </div>

      {/* Top Banner Spotlight: Radial "Time to Next Badge" Progress Widget */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left + Center: Radial SVG Progress Ring & Target Badge Countdown */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-5 sm:gap-6 flex-1 min-w-0">
            {/* SVG Radial Gauge */}
            <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
              <svg
                className="h-36 w-36 -rotate-90 transform"
                viewBox="0 0 140 140"
                aria-label="Time to Next Badge Radial Progress"
              >
                <defs>
                  <linearGradient
                    id="next-badge-radial-grad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor={
                        activeEstimate
                          ? activeEstimate.strokeGradientColors[0]
                          : '#fbbf24'
                      }
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        activeEstimate
                          ? activeEstimate.strokeGradientColors[1]
                          : '#10b981'
                      }
                    />
                  </linearGradient>
                </defs>
                {/* Background Track Circle */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="10"
                />
                {/* Animated Progress Arc */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="url(#next-badge-radial-grad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Medallion & Tabular Percentage Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm border border-white/25 mb-1 bg-linear-to-br ${
                    activeEstimate
                      ? activeEstimate.badge.medallionGradient
                      : 'from-amber-400 via-orange-500 to-emerald-500'
                  }`}
                >
                  {renderMilestoneIcon(
                    activeEstimate ? activeEstimate.badge.iconKey : 'crown',
                    'h-4.5 w-4.5 text-white'
                  )}
                </div>
                <div className="text-lg font-black font-mono tabular-nums text-white leading-none">
                  {radialPercent}%
                </div>
                <div className="text-[10px] font-mono tabular-nums text-slate-300 mt-0.5">
                  {activeEstimate
                    ? `差 ${activeEstimate.estimatedMinutesRemaining}m`
                    : '全满贯达成'}
                </div>
              </div>
            </div>

            {/* Target Details, Manual Switcher & Unboxed Telemetry */}
            <div className="space-y-3 flex-1 min-w-0 text-center sm:text-left">
              {/* Manual Locked-Badge Switcher Bar */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-semibold text-amber-300 tracking-wide">
                  Time to Next Badge · 下一枚勋章冲刺倒计时
                </span>
                {lockedEstimates.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
                    {lockedEstimates.map((est, idx) => {
                      const isSelected = activeEstimate?.badge.id === est.badge.id;
                      return (
                        <button
                          key={est.badge.id}
                          type="button"
                          onClick={() => setSelectedTargetBadgeId(est.badge.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 font-mono tabular-nums ${
                            isSelected
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {idx === 0 ? `最近: ${est.badge.name}` : est.badge.name} ({est.progressPercent}%)
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeEstimate ? (
                <>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                      目标勋章：{activeEstimate.badge.name} ({activeEstimate.badge.englishName})
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                      {activeEstimate.motivationalHint}
                    </p>
                  </div>

                  {/* Clean Unboxed Telemetry Row with · Separators & Tabular Numerals */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5 text-xs text-slate-300 pt-0.5">
                    <span>
                      剩余专注时长：
                      <strong className="font-mono font-black text-amber-300 tabular-nums">
                        约 {activeEstimate.estimatedMinutesRemaining} 分钟
                      </strong>
                    </span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span>
                      预计专注轮次：
                      <strong className="font-mono font-bold text-white tabular-nums">
                        {activeEstimate.estimatedSessionsRemaining} 轮番茄钟
                      </strong>
                      <span className="text-slate-400 font-mono tabular-nums">
                        {' '}(场均 {summary.avgSessionMinutes}m)
                      </span>
                    </span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span>
                      连胜进度差值：
                      <strong className="font-mono font-bold text-emerald-300 tabular-nums">
                        {activeEstimate.streakDaysRemaining > 0
                          ? `还差 ${activeEstimate.streakDaysRemaining} 天连胜`
                          : `已满足连胜天数 (${summary.currentDailyStreak}天)`}
                      </strong>
                    </span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span>
                      推荐时段：
                      <strong className="font-semibold text-indigo-300">
                        {activeEstimate.recommendedWindowLabel}
                      </strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <h4 className="text-base sm:text-lg font-black text-amber-300">
                    全部 {summary.totalCount} 枚专注里程碑勋章已悉数点亮！
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    历史累计专注 <span className="font-mono font-bold text-white tabular-nums">{summary.totalFocusMinutes} 分钟</span> · 当前连续打卡 <span className="font-mono font-bold text-emerald-300 tabular-nums">{summary.currentDailyStreak} 天</span>，您已达成大满贯学术节律。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-row sm:flex-col items-center justify-center gap-2.5 shrink-0 border-t lg:border-t-0 lg:border-l border-white/15 pt-4 lg:pt-0 lg:pl-6">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('home')}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Timer className="h-3.5 w-3.5" />
                <span>立即开启专注冲刺</span>
              </button>
            )}

            {activeEstimate ? (
              <button
                type="button"
                onClick={() => onToggleSimulateUnlock(activeEstimate.badge.id)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
              >
                预览解锁此勋章
              </button>
            ) : (
              equippedBadge && (
                <button
                  type="button"
                  onClick={() => emitMilestoneUnlockToast(equippedBadge)}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
                >
                  重播满贯庆典
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Daily Streak & Pattern Telemetry Bar (Unboxed clean metadata with tabular-nums) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-white/70 border border-slate-200/70 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <div>
            <span className="text-slate-400 font-medium">当前连续打卡：</span>
            <span className="font-mono font-black text-slate-900 tabular-nums">
              {summary.currentDailyStreak} 天
            </span>
          </div>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <div>
            <span className="text-slate-400 font-medium">晨间破晓记录：</span>
            <span className="font-mono font-bold text-amber-700 tabular-nums">
              {summary.morningSessionCount} 次
            </span>
          </div>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <div>
            <span className="text-slate-400 font-medium">晚间守望记录：</span>
            <span className="font-mono font-bold text-purple-700 tabular-nums">
              {summary.nightSessionCount} 次
            </span>
          </div>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <div>
            <span className="text-slate-400 font-medium">深度长程(≥45m)：</span>
            <span className="font-mono font-bold text-indigo-700 tabular-nums">
              {summary.deepWorkSessionCount} 轮
            </span>
          </div>
        </div>

        {equippedBadge && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">主页展示勋章：</span>
            <span className="font-black text-indigo-700">
              {equippedBadge.name} ({equippedBadge.englishName})
            </span>
          </div>
        )}
      </div>

      {/* 6-Card Cosmetic Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredBadges.map(badge => {
          const isEquipped = equippedBadge?.id === badge.id && badge.isUnlocked;
          const progressPercent = Math.min(
            100,
            Math.max(0, Math.round((badge.currentValue / badge.targetValue) * 100))
          );

          return (
            <div
              key={badge.id}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                badge.isUnlocked
                  ? isEquipped
                    ? 'bg-white border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white/90 hover:bg-white border-slate-200/90 shadow-xs'
                  : 'bg-slate-50/75 border-slate-200/70'
              }`}
            >
              {/* Top Section: Medallion + Title + Status */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-13 w-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md border ${
                        badge.isUnlocked
                          ? `bg-linear-to-br ${badge.medallionGradient} text-white border-white/40`
                          : 'bg-slate-200/80 text-slate-400 border-slate-300/60'
                      }`}
                    >
                      {renderMilestoneIcon(badge.iconKey, 'h-6 w-6')}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-sm sm:text-base text-slate-900">
                          {badge.name}
                        </h4>
                        {badge.isUnlocked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-500">
                        {badge.englishName} · {badge.rarityLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {badge.description}
                </p>
              </div>

              {/* Bottom Section: Daily Streak Goal Progress Bar & Equip/Preview Actions */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium truncate">
                      目标条件：{badge.streakGoalRequirement}
                    </span>
                    <span className="font-mono font-black text-slate-800 tabular-nums shrink-0 ml-2">
                      {badge.currentValue}/{badge.targetValue} ({progressPercent}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.isUnlocked
                          ? `bg-linear-to-r ${badge.medallionGradient}`
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(6, progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  {badge.isUnlocked ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onEquipBadge(badge.id)}
                        disabled={isEquipped}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                          isEquipped
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs active:scale-95'
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                            <span>主页佩戴中</span>
                          </>
                        ) : (
                          <span>佩戴至个人主页</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => emitMilestoneUnlockToast(badge)}
                        className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-colors cursor-pointer whitespace-nowrap"
                        title={`播报「${badge.name} (${badge.englishName})」里程碑达成庆典弹窗`}
                      >
                        庆典播报
                      </button>

                      {badge.isSimulatedUnlock && (
                        <button
                          type="button"
                          onClick={() => onToggleSimulateUnlock(badge.id)}
                          className="px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                          title="恢复为真实历史进度状态"
                        >
                          取消预览
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleSimulateUnlock(badge.id)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-colors cursor-pointer whitespace-nowrap active:scale-95"
                        title="模拟达成该里程碑以便立即预览佩戴效果"
                      >
                        预览解锁并佩戴
                      </button>

                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('home')}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span>去专注打卡</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

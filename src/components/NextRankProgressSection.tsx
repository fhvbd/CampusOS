import React from 'react';
import { 
  Award, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  Target, 
  TrendingUp, 
  Zap, 
  Clock, 
  Check, 
  ArrowRight,
  GraduationCap,
  BookOpen,
  Flame,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { 
  AcademicRankProgress, 
  ACADEMIC_RANKS, 
  AcademicRank 
} from '../lib/levelSystem';

interface NextRankProgressSectionProps {
  rankProgress: AcademicRankProgress;
  className?: string;
  onNavigateTab?: (tab: any) => void;
}

export const NextRankProgressSection: React.FC<NextRankProgressSectionProps> = ({
  rankProgress,
  className = '',
  onNavigateTab,
}) => {
  const {
    currentRank,
    nextRank,
    isMaxRank,
    currentLevel,
    totalXp,
    levelProgressPercent,
    xpProgressPercent,
    overallProgressPercent,
    levelsNeeded,
    xpNeeded,
    estimatedTasksNeeded,
  } = rankProgress;

  // Icon selector helper
  const getRankIcon = (iconName: string) => {
    switch (iconName) {
      case 'GraduationCap': return GraduationCap;
      case 'BookOpen': return BookOpen;
      case 'Award': return Award;
      case 'Flame': return Flame;
      case 'Sparkles': return Sparkles;
      default: return Crown;
    }
  };

  const CurrentIcon = getRankIcon(currentRank.iconName);
  const NextIcon = nextRank ? getRankIcon(nextRank.iconName) : Crown;

  return (
    <div className={`glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-white/90 relative overflow-hidden ${className}`}>
      
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-purple-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                下一学术段位晋升考核与进度
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                🏅 Academic Rank Progression
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              基于学业等级与经验积累，达成目标指标即可晋升更高学术段位并解锁专属特权与勋章
            </p>
          </div>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/80">
            <span>当前段位：</span>
            <span className="text-indigo-600 font-black">{currentRank.englishTitle}</span>
            <span className="text-slate-400">({currentRank.name})</span>
          </div>
        </div>
      </div>

      {/* Current vs Next Rank Transition Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
        
        {/* Left: Current Rank Card (5 cols) */}
        <div className="md:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl bg-linear-to-tr ${currentRank.gradient} text-white flex items-center justify-center font-bold shadow-xs shrink-0`}>
                <CurrentIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">已达成当前段位</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {currentRank.englishTitle} · {currentRank.name}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200 shrink-0">
              当前持位
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {currentRank.description}
          </p>

          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 pt-1 border-t border-slate-200/60">
            <span>准入等级：Lv.{currentRank.minLevel}+</span>
            <span>·</span>
            <span>准入经验：{currentRank.minXp} XP</span>
          </div>
        </div>

        {/* Center: Progression Arrow & Overall Percentage (2 cols) */}
        <div className="md:col-span-2 flex flex-col items-center justify-center p-2 text-center space-y-1.5">
          <div className="h-10 w-10 rounded-full bg-linear-to-tr from-indigo-50 to-purple-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
            <ArrowRight className="h-4 w-4 md:rotate-0 rotate-90" />
          </div>
          <div className="font-mono font-black text-sm text-indigo-700">
            {overallProgressPercent}%
          </div>
          <span className="text-[10px] text-slate-400 font-bold">综合考核进度</span>
        </div>

        {/* Right: Next Target Rank Card (5 cols) */}
        <div className={`md:col-span-5 p-4 sm:p-5 rounded-2xl border space-y-3 relative overflow-hidden ${
          isMaxRank 
            ? 'bg-amber-50/80 border-amber-200' 
            : 'bg-indigo-50/70 border-indigo-200/90 shadow-xs'
        }`}>
          {nextRank ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl bg-linear-to-tr ${nextRank.gradient} text-white flex items-center justify-center font-bold shadow-xs shrink-0 animate-pulse`}>
                    <NextIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">晋升目标段位</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {nextRank.englishTitle} · {nextRank.name}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black shadow-2xs shrink-0">
                  下一目标
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {nextRank.description}
              </p>

              <div className="text-[11px] text-indigo-700 font-mono flex items-center gap-2 pt-1 border-t border-indigo-200/60 font-bold">
                <span>晋阶要求：Lv.{nextRank.minLevel}</span>
                <span>·</span>
                <span>经验：{nextRank.minXp} XP</span>
              </div>
            </>
          ) : (
            <div className="p-3 text-center space-y-1">
              <Sparkles className="h-8 w-8 text-amber-500 mx-auto" />
              <div className="text-sm font-black text-amber-900">已达最高学术段位！</div>
              <p className="text-xs text-amber-700">恭喜成为博雅学者，学术自律已达臻境。</p>
            </div>
          )}
        </div>

      </div>

      {/* Next Rank Requirements Breakdown Grid (2 Core Target Bars) */}
      {nextRank && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          
          {/* Target 1: Level Requirement */}
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Target className="h-4 w-4 text-indigo-600" />
                指标 1：学业成长等级
              </span>
              <span className="font-mono font-bold text-indigo-600">
                当前 Lv.{currentLevel} / 目标 Lv.{nextRank.minLevel}
              </span>
            </div>

            {/* Level progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-600 transition-all duration-700"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {levelsNeeded === 0 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="h-3 w-3 stroke-[3]" />
                      等级已达标
                    </span>
                  ) : (
                    <span>还需晋升 <strong className="text-indigo-600 font-mono font-black">{levelsNeeded}</strong> 级</span>
                  )}
                </span>
                <span className="font-mono font-bold text-slate-700">{levelProgressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Target 2: Total XP Requirement */}
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                指标 2：累计经验值 (Total XP)
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {totalXp} / {nextRank.minXp} XP
              </span>
            </div>

            {/* XP progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-linear-to-r from-teal-500 to-emerald-600 transition-all duration-700"
                  style={{ width: `${xpProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {xpNeeded === 0 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="h-3 w-3 stroke-[3]" />
                      经验已达标
                    </span>
                  ) : (
                    <span>还需积累 <strong className="text-emerald-600 font-mono font-black">{xpNeeded} XP</strong> (约完成 {estimatedTasksNeeded} 项待办)</span>
                  )}
                </span>
                <span className="font-mono font-bold text-slate-700">{xpProgressPercent}%</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Next Rank Unlocks & Privileges */}
      {nextRank && (
        <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-purple-50/70 via-indigo-50/60 to-blue-50/70 border border-purple-100/90 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>晋升【{nextRank.englishTitle} · {nextRank.name}】后即刻解锁学术特权：</span>
            </span>
            <span className="text-[10px] text-purple-700 font-bold bg-white px-2 py-0.5 rounded-full border border-purple-200">
              共 3 项专属特权
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {nextRank.perks.map((perk, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white/90 border border-purple-100/80 flex items-center gap-2.5 shadow-2xs">
                <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-slate-800 leading-snug">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Academic Rank Pathway Roadmap Track (5 Tiers) */}
      <div className="space-y-3 pt-2 border-t border-slate-100 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-slate-800 flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-amber-500" />
            <span>全阶段学术段位天梯路线 (Academic Rank Pathway)</span>
          </span>
          <span className="text-[11px] text-slate-400">
            达成对应等级与经验要求自动晋阶
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {ACADEMIC_RANKS.map((r, i) => {
            const Icon = getRankIcon(r.iconName);
            const isCompleted = currentLevel > r.minLevel || (currentLevel >= r.minLevel && totalXp >= r.minXp);
            const isCurrent = currentRank.id === r.id;

            return (
              <div
                key={r.id}
                className={`p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between space-y-2 ${
                  isCurrent
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : isCompleted
                    ? 'bg-slate-50/90 border-slate-200 text-slate-700'
                    : 'bg-white/40 border-slate-200/60 opacity-60 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isCurrent
                      ? `bg-linear-to-tr ${r.gradient} text-white shadow-2xs`
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {isCurrent ? (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-600 text-white">当前</span>
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Lock className="h-3 w-3 text-slate-400" />
                  )}
                </div>

                <div>
                  <div className="text-xs font-black text-slate-900 leading-tight">
                    {r.englishTitle}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {r.name}
                  </div>
                </div>

                <div className="text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                  Lv.{r.minLevel}+ ({r.minXp}xp)
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

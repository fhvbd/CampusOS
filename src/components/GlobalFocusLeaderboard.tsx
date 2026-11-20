import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Award, 
  Users, 
  RotateCcw, 
  ThumbsUp, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  CheckCircle2, 
  ArrowUpRight,
  Zap,
  Target,
  Smile
} from 'lucide-react';
import { CampusAPI } from '../services/api';
import { LeaderboardStudent, FocusLeaderboardData } from '../types';

interface GlobalFocusLeaderboardProps {
  className?: string;
  refreshTrigger?: number;
  currentUserMinutes?: number;
  onStartFocusSession?: () => void;
}

export const GlobalFocusLeaderboard: React.FC<GlobalFocusLeaderboardProps> = ({
  className = '',
  refreshTrigger = 0,
  currentUserMinutes = 75,
  onStartFocusSession,
}) => {
  const [leaderboardData, setLeaderboardData] = useState<FocusLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'college'>('daily');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [cheeredMap, setCheeredMap] = useState<Record<string, number>>({});
  const [justCheeredId, setJustCheeredId] = useState<string | null>(null);

  // Fetch leaderboard data via CampusAPI
  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const data = await CampusAPI.getFocusLeaderboard(currentUserMinutes);
      setLeaderboardData(data);
    } catch (e) {
      console.warn('Failed to load focus leaderboard via CampusAPI', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [refreshTrigger, currentUserMinutes]);

  // Handle cheer interaction
  const handleCheer = async (studentId: string, currentCheers: number) => {
    const nextCount = (cheeredMap[studentId] || currentCheers) + 1;
    setCheeredMap(prev => ({
      ...prev,
      [studentId]: nextCount,
    }));
    setJustCheeredId(studentId);
    setTimeout(() => setJustCheeredId(null), 2500);

    try {
      await CampusAPI.cheerStudent(studentId);
    } catch (e) {}
  };

  // Filtered students based on active tab
  const displayStudents = useMemo(() => {
    if (!leaderboardData) return [];
    let list = [...leaderboardData.students];

    if (activeTab === 'college') {
      const currentUserCollege = list.find(s => s.isCurrentUser)?.college || '计算机学院';
      list = list.filter(s => s.college === currentUserCollege);
    } else if (activeTab === 'weekly') {
      list = list.sort((a, b) => b.weeklyFocusMinutes - a.weeklyFocusMinutes);
    } else {
      list = list.sort((a, b) => b.dailyFocusMinutes - a.dailyFocusMinutes);
    }

    // Re-rank dynamically for the active tab view
    return list.map((s, idx) => ({
      ...s,
      displayRank: idx + 1,
    }));
  }, [leaderboardData, activeTab]);

  const visibleStudents = isExpanded ? displayStudents : displayStudents.slice(0, 5);

  const currentUser = useMemo(() => {
    return displayStudents.find(s => s.isCurrentUser);
  }, [displayStudents]);

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-amber-200/80 bg-linear-to-br from-amber-500/10 via-orange-500/5 to-purple-500/10 space-y-5 relative overflow-hidden ${className}`}>
      
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header with Trophy & Live Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 shrink-0">
            <Trophy className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                全校自习专注榜 (Campus Focus Leaderboard)
              </h3>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                实时联机
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              基于 CampusAPI 实时拉取全校同学今日专注用时，与学霸同频攻坚
            </p>
          </div>
        </div>

        {/* Refresh & Last Updated */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {leaderboardData?.updatedAt && (
            <span className="text-[10px] font-mono text-slate-400">
              更新于 {leaderboardData.updatedAt}
            </span>
          )}
          <button
            onClick={fetchLeaderboard}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/80 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="刷新全校排行榜"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 2. Current User Standing Banner */}
      {currentUser && leaderboardData && (
        <div className="p-4 rounded-2xl bg-linear-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/10 border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white font-mono font-black text-lg flex items-center justify-center shadow-xs shrink-0">
              #{currentUser.displayRank}
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{currentUser.name}</span>
                <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.2 rounded-md font-bold">
                  超过全校 {leaderboardData.userRank.percentile}% 的自习学子
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (全校共 {leaderboardData.userRank.totalParticipants} 人正在专注)
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-3">
                <span>今日累计：<strong className="text-amber-700 font-mono">{currentUser.dailyFocusMinutes}</strong> 分钟</span>
                <span>完成轮数：<strong className="font-mono">{currentUser.sessionsCount}</strong> 轮</span>
                <span>专注效能：<strong className="text-emerald-700 font-mono">{currentUser.efficiencyScore}</strong> 分</span>
              </div>
            </div>
          </div>

          {/* Motivational Sprint Callout */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {leaderboardData.userRank.minutesToNextRank > 0 ? (
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-medium">
                  距前一名仅差 <span className="font-bold text-amber-700 font-mono">{leaderboardData.userRank.minutesToNextRank}</span> 分钟
                </div>
                <div className="text-[11px] font-black text-indigo-700">
                  开启一个番茄钟即可反超！🚀
                </div>
              </div>
            ) : (
              <div className="text-xs font-black text-amber-700 flex items-center gap-1">
                <Crown className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span>恭喜荣登今日专注榜首！🏆</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Tab Filter Bar */}
      <div className="flex items-center justify-between gap-3 relative z-10 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-white/70 rounded-2xl border border-slate-200/70 backdrop-blur-xs">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'daily'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>今日专注榜</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'weekly'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>本周累计榜</span>
          </button>

          <button
            onClick={() => setActiveTab('college')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'college'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>同院系自习榜</span>
          </button>
        </div>

        <div className="text-[11px] font-medium text-slate-500">
          榜单前 3 名享有金色光环与勋章加成
        </div>
      </div>

      {/* 4. Leaderboard Student Rows */}
      <div className="space-y-2 relative z-10">
        {visibleStudents.map(student => {
          const isTop1 = student.displayRank === 1;
          const isTop2 = student.displayRank === 2;
          const isTop3 = student.displayRank === 3;
          const cheers = cheeredMap[student.id] || student.cheerCount;

          return (
            <div
              key={student.id}
              className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group select-none shadow-2xs ${
                student.isCurrentUser
                  ? 'bg-linear-to-r from-amber-50 to-orange-50 border-amber-300 ring-2 ring-amber-400/30'
                  : isTop1
                  ? 'bg-linear-to-r from-amber-500/10 via-yellow-500/5 to-white/80 border-amber-300/80'
                  : 'bg-white/85 hover:bg-white border-slate-200/70 hover:border-amber-200'
              }`}
            >
              {/* Left: Rank Medal & Student Avatar & Info */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Rank Badge */}
                <div className="w-8 shrink-0 text-center font-mono font-black">
                  {isTop1 ? (
                    <div className="h-8 w-8 rounded-xl bg-linear-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30 mx-auto">
                      <Crown className="h-4.5 w-4.5 fill-white text-white animate-bounce" />
                    </div>
                  ) : isTop2 ? (
                    <div className="h-8 w-8 rounded-xl bg-linear-to-tr from-slate-300 to-slate-400 text-white flex items-center justify-center shadow-md shadow-slate-400/20 mx-auto">
                      <span className="text-sm">2</span>
                    </div>
                  ) : isTop3 ? (
                    <div className="h-8 w-8 rounded-xl bg-linear-to-tr from-amber-600 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-700/20 mx-auto">
                      <span className="text-sm">3</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm font-bold">
                      #{student.displayRank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={student.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`}
                    alt={student.name}
                    className="h-9 w-9 rounded-xl object-cover border border-white shadow-2xs"
                  />
                  {student.status === 'focusing' && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" title="心流冲刺中" />
                  )}
                  {student.status === 'resting' && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white" title="微休息中" />
                  )}
                </div>

                {/* Name, Major, & Grade */}
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs sm:text-sm font-black ${student.isCurrentUser ? 'text-amber-900 font-mono' : 'text-slate-900'}`}>
                      {student.name}
                    </span>
                    {student.isCurrentUser && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-600 text-white shadow-2xs">
                        当前用户
                      </span>
                    )}
                    {isTop1 && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                        👑 榜一大神
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      {student.major} · {student.grade}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-rose-500 fill-rose-500" />
                      <span>连胜 {student.streakDays} 天</span>
                    </span>
                    <span>·</span>
                    <span className="text-emerald-700 font-bold">
                      效能 {student.efficiencyScore} 分
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Focus Minutes & Cheer Interaction */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-black font-mono text-slate-900">
                    {activeTab === 'weekly' ? student.weeklyFocusMinutes : student.dailyFocusMinutes}{' '}
                    <span className="text-[10px] font-normal text-slate-500">分钟</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {((activeTab === 'weekly' ? student.weeklyFocusMinutes : student.dailyFocusMinutes) / 60).toFixed(1)} 小时
                  </div>
                </div>

                {/* Cheer Button */}
                <button
                  onClick={() => handleCheer(student.id, student.cheerCount)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer active:scale-90 ${
                    justCheeredId === student.id
                      ? 'bg-amber-500 text-white border-amber-500 scale-105'
                      : 'bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border-slate-200/80 hover:border-amber-200'
                  }`}
                  title="为这位同学点赞鼓劲"
                >
                  <ThumbsUp className="h-3 w-3" />
                  <span className="font-mono">{cheers}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Bottom Expand/Collapse & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-100/80 relative z-10 text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-slate-600 hover:text-amber-800 font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 text-amber-600" />
              <span>收起完整榜单 (仅看 Top 5)</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 text-amber-600" />
              <span>展开完整榜单 (查看全部 {displayStudents.length} 位学友)</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto text-slate-500 text-[11px]">
          <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>每次番茄钟计时完成，数据将经由 CampusAPI 自动同步并刷新榜单位次。</span>
        </div>
      </div>

    </div>
  );
};

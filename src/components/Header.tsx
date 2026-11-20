import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Search, 
  Bell, 
  CheckCircle2, 
  Sparkles,
  Wifi,
  Command,
  Monitor
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { getFullDayName } from '../lib/utils';
import { getAccentTheme } from '../lib/accentTheme';
import { calculateLevelInfo } from '../lib/levelSystem';
import { CloudSyncStatusIndicator } from './CloudSyncStatusIndicator';

interface HeaderProps {
  user: UserProfile;
  settings: AppSettings;
  unreadNoticeCount: number;
  pendingTaskCount: number;
  onRefreshSync: () => void;
  onOpenSearch: () => void;
  onOpenCommandPalette?: () => void;
  onOpenPwaModal?: () => void;
  onOpenProfile: () => void;
  onOpenNotice: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  settings,
  unreadNoticeCount,
  pendingTaskCount,
  onRefreshSync,
  onOpenSearch,
  onOpenCommandPalette,
  onOpenPwaModal,
  onOpenProfile,
  onOpenNotice,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    onRefreshSync();
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const dateFormatted = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const levelInfo = calculateLevelInfo(user.xp ?? 220);

  return (
    <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-2xl border-b border-white/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] px-4 lg:px-8 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand & University Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 border border-white/40 ring-1 ring-white/50 shrink-0">
            <GraduationCap className="h-5 w-5 drop-shadow-xs" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                CampusOS v2.0
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 backdrop-blur-xs">
                  Liquid Glass 2.0
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              {user.university} · {user.college}
            </p>
          </div>
        </div>

        {/* Center: Semester Week & Clock Widget (Liquid Pill) */}
        <div className="hidden md:flex items-center gap-3.5 glass-pill rounded-full px-4 py-1.5 text-xs text-slate-700 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-700">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>第 {settings.current_week} 周</span>
            <span className="text-slate-300 font-normal">|</span>
            <span>{getFullDayName(dayOfWeek)}</span>
          </div>

          <span className="text-slate-300 font-bold">·</span>

          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span>{dateFormatted}</span>
          </div>

          <span className="text-slate-300 font-bold">·</span>

          <div className="flex items-center gap-1 font-mono text-slate-800 font-bold bg-white/70 px-2 py-0.5 rounded-full border border-white/90">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>{timeStr || '08:00:00'}</span>
          </div>
        </div>

        {/* Right: Quick Search, System Status, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Floating Focus Mode Toggle Button */}
          {onToggleFocusMode && (
            <button
              id="header-focus-mode-toggle"
              onClick={onToggleFocusMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                isFocusMode
                  ? 'bg-linear-to-r from-purple-600 via-indigo-600 to-rose-500 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-400'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 border border-purple-300/60 hover:border-purple-400'
              }`}
              title={isFocusMode ? '点击退出专注模式，恢复全局视图与导航' : '开启专注模式：收起导航，仅展示活跃待办与番茄钟'}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isFocusMode ? 'text-amber-300 fill-amber-300 animate-spin' : 'text-purple-600'}`} />
              <span className="hidden sm:inline">{isFocusMode ? '退出专注' : '专注模式'}</span>
              <span className="sm:hidden">{isFocusMode ? '退出' : '专注'}</span>
              {isFocusMode && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping ml-0.5 shrink-0" />
              )}
            </button>
          )}

          {/* Quick Search Button (Liquid Glass) */}
          <button
            id="header-search-btn"
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white/90 backdrop-blur-md text-slate-700 text-xs font-semibold transition-all cursor-pointer border border-white/80 shadow-2xs hover:shadow-xs hover:border-blue-200"
            title="快捷搜索课程、通知、待办 (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">全局搜索</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-white/90 rounded-md text-[10px] text-slate-500 border border-slate-200/80 font-mono shadow-2xs">
              Ctrl+K
            </kbd>
          </button>

          {/* Command Palette Trigger Button (Liquid Glass) */}
          {onOpenCommandPalette && (
            <button
              id="header-command-palette-btn"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/80 backdrop-blur-md text-indigo-700 text-xs font-semibold transition-all cursor-pointer border border-indigo-200/80 shadow-2xs hover:shadow-xs"
              title="打开全局指令面板 (Ctrl+P)"
            >
              <Command className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden md:inline">指令面板</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-white/90 rounded-md text-[10px] text-indigo-600 border border-indigo-200/80 font-mono shadow-2xs">
                Ctrl+P
              </kbd>
            </button>
          )}

          {/* Add to Desktop / PWA Trigger Button */}
          {onOpenPwaModal && (
            <button
              id="header-pwa-btn"
              onClick={onOpenPwaModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/90 backdrop-blur-md text-blue-700 text-xs font-semibold transition-all cursor-pointer border border-blue-200/80 shadow-2xs hover:shadow-xs"
              title="添加到桌面 & PWA 沉浸运行"
            >
              <Monitor className="h-3.5 w-3.5 text-blue-600" />
              <span>添加到桌面</span>
            </button>
          )}

          {/* Real-time Campus API Cloud-Sync Status Indicator & Trigger (Liquid Glass with Last Synced Tooltip) */}
          <CloudSyncStatusIndicator
            user={user}
            settings={settings}
            isSyncing={isSyncing}
            onRefreshSync={handleSync}
          />

          {/* Notifications Trigger (Liquid Glass) */}
          <button
            id="header-notice-btn"
            onClick={onOpenNotice}
            className="relative p-2 rounded-xl bg-white/60 hover:bg-white/90 text-slate-600 hover:text-blue-600 transition-all border border-white/80 shadow-2xs hover:shadow-xs cursor-pointer backdrop-blur-md"
            title="通知中心"
          >
            <Bell className="h-4 w-4" />
            {unreadNoticeCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs border border-white">
                {unreadNoticeCount > 9 ? '9+' : unreadNoticeCount}
              </span>
            )}
          </button>

          {/* User Level & XP Progress Pill */}
          <div 
            onClick={onOpenProfile}
            className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/60 hover:bg-white/90 border border-white/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group backdrop-blur-md"
            title={`Lv.${levelInfo.level} ${levelInfo.title} · 当前经验 ${levelInfo.totalXp} XP (升至下级还需 ${levelInfo.xpNeededForNextLevel} XP)`}
          >
            <div className={`px-2 py-0.5 rounded-md text-[10px] font-black text-white bg-linear-to-r ${levelInfo.badgeGradient} shadow-2xs leading-none shrink-0`}>
              Lv.{levelInfo.level}
            </div>
            <div className="w-16 space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 font-mono leading-none">
                <span>{levelInfo.progressPercent}%</span>
                <span>{levelInfo.totalXp}xp</span>
              </div>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-linear-to-r ${levelInfo.badgeGradient} transition-all duration-500`}
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* User Profile Mini Badge (Liquid Glass Card) */}
          <button
            id="header-profile-btn"
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl bg-white/60 hover:bg-white/90 border border-white/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group backdrop-blur-md relative"
          >
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center justify-end gap-1">
                <span>{user.username}</span>
                <span className="md:hidden text-[9px] font-mono px-1 rounded bg-indigo-50 text-indigo-700 font-black">
                  L{levelInfo.level}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {user.student_id}
              </div>
            </div>
            <div 
              className="h-7 w-7 rounded-lg text-white flex items-center justify-center text-xs font-bold shadow-xs border border-white/40 transition-all duration-300 relative"
              style={{ background: `linear-gradient(135deg, ${getAccentTheme(settings.accent_color).primaryHex}, ${getAccentTheme(settings.accent_color).secondaryHex})` }}
            >
              {user.username.slice(0, 1)}
            </div>
          </button>

        </div>
      </div>
    </header>
  );
};

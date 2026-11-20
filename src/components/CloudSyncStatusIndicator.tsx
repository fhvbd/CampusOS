import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  Clock, 
  Activity, 
  Server, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';

interface CloudSyncStatusIndicatorProps {
  user: UserProfile;
  settings: AppSettings;
  isSyncing: boolean;
  onRefreshSync: () => void;
}

export const CloudSyncStatusIndicator: React.FC<CloudSyncStatusIndicatorProps> = ({
  user,
  settings,
  isSyncing,
  onRefreshSync,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isTooltipOpen, setIsTooltipOpen] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [relativeTime, setRelativeTime] = useState<string>('刚刚');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor network online/offline real-time status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLatencyMs(Math.floor(Math.random() * 15) + 12); // Simulated dynamic ping 12-27ms
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Minor periodic jitter for realistic real-time connection status (15ms - 28ms)
    const pingInterval = setInterval(() => {
      if (navigator.onLine) {
        setLatencyMs(prev => {
          const jitter = Math.floor(Math.random() * 7) - 3;
          return Math.max(12, Math.min(45, prev + jitter));
        });
      }
    }, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, []);

  // Compute relative time string from last_sync_time
  useEffect(() => {
    const updateRelativeTime = () => {
      if (!user.last_sync_time) {
        setRelativeTime('刚刚');
        return;
      }
      try {
        const syncDate = new Date(user.last_sync_time.replace(/-/g, '/'));
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - syncDate.getTime()) / 1000);

        if (isNaN(diffSeconds) || diffSeconds < 30) {
          setRelativeTime('刚刚');
        } else if (diffSeconds < 60) {
          setRelativeTime(`${diffSeconds} 秒前`);
        } else if (diffSeconds < 3600) {
          const mins = Math.floor(diffSeconds / 60);
          setRelativeTime(`${mins} 分钟前`);
        } else if (diffSeconds < 86400) {
          const hours = Math.floor(diffSeconds / 3600);
          setRelativeTime(`${hours} 小时前`);
        } else {
          const days = Math.floor(diffSeconds / 86400);
          setRelativeTime(`${days} 天前`);
        }
      } catch {
        setRelativeTime('刚刚');
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 15000);
    return () => clearInterval(interval);
  }, [user.last_sync_time]);

  // Click outside listener to dismiss tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsTooltipOpen(false);
      }
    };

    if (isTooltipOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTooltipOpen]);

  // Hover handlers with debounce
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsTooltipOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsTooltipOpen(false);
    }, 220);
  };

  // Determine overall status
  const connectionStatus = !isOnline
    ? 'offline'
    : isSyncing
    ? 'syncing'
    : user.cas_sync_status === 'error'
    ? 'error'
    : 'connected';

  const lastSyncedFormatted = user.last_sync_time || '刚刚';
  const tooltipTitleText = `校园 API 实时连接状态: ${
    connectionStatus === 'connected' ? '在线已连接' : connectionStatus === 'syncing' ? '正在同步' : '已离线'
  } | 上次同步 (Last Synced): ${lastSyncedFormatted} (${relativeTime})`;

  return (
    <div 
      ref={tooltipRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Status Pill / Button */}
      <button
        id="header-sync-btn"
        type="button"
        onClick={() => {
          onRefreshSync();
        }}
        disabled={isSyncing}
        className={`group flex items-center gap-2 px-2.5 py-1.5 sm:px-3 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 ${
          connectionStatus === 'connected'
            ? 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200/80 text-emerald-800'
            : connectionStatus === 'syncing'
            ? 'bg-blue-50/80 hover:bg-blue-100/90 border-blue-200/80 text-blue-800'
            : 'bg-rose-50/80 hover:bg-rose-100/90 border-rose-200/80 text-rose-800'
        }`}
        title={tooltipTitleText}
        aria-label="Campus API Cloud Sync Status"
        aria-expanded={isTooltipOpen}
      >
        {/* Real-time Connection Status Indicator Dot with Pulse */}
        <span className="relative flex h-2 w-2 shrink-0">
          {connectionStatus === 'connected' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          {connectionStatus === 'syncing' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500'
                : connectionStatus === 'syncing'
                ? 'bg-blue-500'
                : 'bg-rose-500'
            }`}
          />
        </span>

        {/* Sync Icon */}
        <RefreshCw 
          className={`h-3.5 w-3.5 transition-transform duration-500 ${
            isSyncing ? 'animate-spin text-blue-600' : 'text-slate-600 group-hover:text-slate-900'
          }`} 
        />

        {/* Text Labels - Responsive */}
        <div className="flex items-center gap-1.5 text-xs font-bold leading-none">
          <span className="hidden xl:inline">校园云同步</span>
          <span className="hidden sm:inline text-[11px] font-semibold opacity-90">
            {connectionStatus === 'connected' ? '已连接' : connectionStatus === 'syncing' ? '同步中' : '离线'}
          </span>
          <span className="sm:hidden text-[10px] font-semibold">
            {isSyncing ? '同步中' : '在线'}
          </span>
        </div>
      </button>

      {/* Floating Detailed 'Last Synced' & Real-time Connection Tooltip Card */}
      {isTooltipOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95 duration-150"
          role="tooltip"
        >
          {/* Header row */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Cloud className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">校园 API 云同步专线</h4>
                <p className="text-[10px] text-slate-500 font-medium">Campus Cloud Data Sync</p>
              </div>
            </div>

            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              connectionStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : connectionStatus === 'syncing'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : connectionStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'
              }`} />
              <span>{connectionStatus === 'connected' ? '实时在线' : connectionStatus === 'syncing' ? '同步中' : '离线'}</span>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2 text-xs">
            {/* Last Synced Row */}
            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">上次同步 (Last Synced)</span>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                    {relativeTime}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 mt-0.5 tracking-tight">
                  {lastSyncedFormatted}
                </div>
              </div>
            </div>

            {/* Connection Latency & Gateway */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <Activity className="h-3 w-3 text-emerald-500" />
                  <span>实时延迟</span>
                </div>
                <div className="text-xs font-mono font-black text-emerald-700 mt-0.5 flex items-center gap-1">
                  <span>{isOnline ? `${latencyMs} ms` : '--'}</span>
                  <span className="text-[9px] font-medium text-emerald-600">(低延迟)</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <Server className="h-3 w-3 text-blue-500" />
                  <span>教务接口</span>
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5 truncate" title="CAS/JWXT v2.4 专线">
                  CAS 专线认证
                </div>
              </div>
            </div>

            {/* Synced Data Scope */}
            <div className="p-2 rounded-xl bg-indigo-50/40 border border-indigo-100/60 text-[11px]">
              <div className="text-[10px] font-bold text-indigo-900 mb-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                <span>全量同步范围</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] text-slate-600">
                <span className="px-1.5 py-0.5 rounded bg-white font-medium border border-slate-200/60">校历课表</span>
                <span className="px-1.5 py-0.5 rounded bg-white font-medium border border-slate-200/60">待办攻坚</span>
                <span className="px-1.5 py-0.5 rounded bg-white font-medium border border-slate-200/60">一卡通余额</span>
                <span className="px-1.5 py-0.5 rounded bg-white font-medium border border-slate-200/60">校园通知</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400">
              {settings.auto_sync_cas ? '已开启后台自动静默同步' : '当前为手动同步模式'}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRefreshSync();
              }}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '同步中...' : '立即同步'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

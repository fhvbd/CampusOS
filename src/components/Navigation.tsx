import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  CalendarDays, 
  Bell, 
  Sparkles, 
  User, 
  Flame,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { TabType, AppSettings, Task } from '../types';
import { cn } from '../lib/utils';
import { getAccentTheme } from '../lib/accentTheme';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unreadNoticeCount: number;
  pendingTaskCount: number;
  settings?: AppSettings;
  tasks?: Task[];
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  unreadNoticeCount,
  pendingTaskCount,
  settings,
  tasks = [],
}) => {
  const accentTheme = getAccentTheme(settings?.accent_color);

  // Real-time ticker to re-evaluate deadlines every 30 seconds
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute tasks due within next 24 hours (or overdue today), particularly high-priority items
  const upcoming24hTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const now = new Date();
    const currentFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return tasks.filter(t => {
      if (t.is_completed || !t.deadline) return false;

      // Real timestamp check
      const taskDate = new Date(t.deadline.replace(' ', 'T'));
      if (!isNaN(taskDate.getTime())) {
        const diffHours = (taskDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        // Due within upcoming 24h or due earlier today
        if (diffHours >= -24 && diffHours <= 24) return true;
      }

      // Demo date match fallback (e.g. today 2026-08-31 or 2026-09-01)
      const datePart = t.deadline.split(' ')[0];
      if (datePart === currentFormatted || datePart === '2026-08-31' || datePart === '2026-09-01') {
        return true;
      }

      return false;
    });
  }, [tasks, ticker]);

  const highPriority24hCount = upcoming24hTasks.filter(t => t.priority === 'high').length;
  const hasUrgent24hTasks = upcoming24hTasks.length > 0;
  const deadlineTooltipText = upcoming24hTasks
    .map(t => `${t.priority === 'high' ? '🔥 [高优]' : '•'} ${t.title} (截止: ${t.deadline})`)
    .join('\n');

  const tabs = [
    {
      id: 'home' as TabType,
      label: '首页',
      icon: Home,
      badge: pendingTaskCount > 0 ? pendingTaskCount : null,
      badgeColor: 'bg-blue-500',
      hasDeadlineProximity: hasUrgent24hTasks,
    },
    {
      id: 'schedule' as TabType,
      label: '课表',
      icon: CalendarDays,
      badge: null,
      hasDeadlineProximity: false,
    },
    {
      id: 'notice' as TabType,
      label: '通知',
      icon: Bell,
      badge: unreadNoticeCount > 0 ? unreadNoticeCount : null,
      badgeColor: 'bg-rose-500',
      hasDeadlineProximity: false,
    },
    {
      id: 'ai' as TabType,
      label: 'AI助手',
      icon: Sparkles,
      badge: 'PRO',
      badgeColor: 'bg-purple-600',
      hasDeadlineProximity: false,
    },
    {
      id: 'profile' as TabType,
      label: '我的',
      icon: User,
      badge: null,
      hasDeadlineProximity: false,
    },
  ];

  return (
    <>
      {/* Desktop Top Sub-Navbar (Liquid Glass Dock) */}
      <div className="hidden md:block sticky top-[61px] z-20 py-2">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="glass-panel rounded-2xl px-2 py-1.5 flex items-center justify-between shadow-xs">
            <nav className="flex space-x-1" aria-label="Main Navigation">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                const showProximityBadge = tab.hasDeadlineProximity && hasUrgent24hTasks;

                return (
                  <button
                    key={tab.id}
                    id={`nav-desktop-${tab.id}`}
                    onClick={() => onSelectTab(tab.id)}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                      isActive
                        ? accentTheme.activeNavClass
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    )}
                    title={showProximityBadge ? `24h截止临近：\n${deadlineTooltipText}` : undefined}
                  >
                    <Icon className={cn('h-4 w-4 transition-transform', isActive ? 'text-white scale-105' : 'text-slate-500')} />
                    <span>{tab.label}</span>

                    {/* Standard Badge or Real-Time Deadline Proximity Badge */}
                    {showProximityBadge ? (
                      <span
                        className={cn(
                          'ml-1 px-2 py-0.5 rounded-full text-[10px] font-black leading-none border flex items-center gap-0.5',
                          'animate-pulse shadow-md ring-2',
                          highPriority24hCount > 0
                            ? 'bg-linear-to-r from-rose-600 to-amber-500 text-white border-rose-300 ring-rose-400/80 shadow-rose-500/40'
                            : cn('bg-linear-to-r', accentTheme.gradientClass, 'text-white', accentTheme.borderClass, accentTheme.ringClass, accentTheme.glowClass)
                        )}
                      >
                        <Flame className="h-3 w-3 fill-white text-white shrink-0" />
                        <span>24h:{upcoming24hTasks.length}</span>
                      </span>
                    ) : (
                      tab.badge !== null && (
                        <span
                          className={cn(
                            'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none border',
                            isActive 
                              ? 'bg-white/25 text-white border-white/40' 
                              : cn(tab.badgeColor || 'bg-slate-400', 'text-white border-transparent')
                          )}
                        >
                          {tab.badge}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right side real-time indicator or Deadline Proximity Urgent Pill */}
            {hasUrgent24hTasks ? (
              <div
                onClick={() => onSelectTab('home')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none group',
                  'animate-pulse border shadow-md',
                  highPriority24hCount > 0
                    ? 'bg-rose-500/15 text-rose-700 border-rose-400/40 shadow-rose-500/20 ring-1 ring-rose-400/50 hover:bg-rose-500/25'
                    : cn(accentTheme.badgeClass, accentTheme.borderClass, accentTheme.glowClass, 'hover:opacity-90')
                )}
                title={`点击直达首页高优排期清单查看：\n${deadlineTooltipText}`}
              >
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <Flame className="h-4 w-4 text-rose-600 fill-rose-500 shrink-0" />
                <div className="flex items-center gap-1">
                  <span className="font-black text-rose-900">24h 截止临近</span>
                  <span className="font-mono text-rose-700">({upcoming24hTasks.length}项)</span>
                  {highPriority24hCount > 0 && (
                    <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-black ml-0.5">
                      {highPriority24hCount} 项高优
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pr-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>CampusOS 液态玻璃引擎活跃中</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Fixed Tab Bar (Liquid Glass Dock) */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="glass-dark rounded-2xl shadow-2xl p-1.5 border border-white/20 backdrop-blur-2xl">
          <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              const showProximityBadge = tab.hasDeadlineProximity && hasUrgent24hTasks;

              return (
                <button
                  key={tab.id}
                  id={`nav-mobile-${tab.id}`}
                  onClick={() => onSelectTab(tab.id)}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer relative',
                    isActive 
                      ? 'bg-white/20 text-white font-bold shadow-xs border border-white/30' 
                      : 'text-slate-300 hover:text-white'
                  )}
                >
                  <div className="relative">
                    <Icon className={cn('h-4.5 w-4.5 transition-transform', isActive && cn('scale-110', accentTheme.mobileActiveNavClass))} />
                    
                    {/* Mobile Proximity Badge or Standard Badge */}
                    {showProximityBadge ? (
                      <span
                        className={cn(
                          'absolute -top-1.5 -right-3.5 px-1.5 py-0.2 rounded-full text-[9px] font-black text-white leading-tight flex items-center gap-0.5 shadow-md border',
                          'animate-pulse ring-1 ring-rose-400',
                          highPriority24hCount > 0
                            ? 'bg-linear-to-r from-rose-600 to-amber-500 border-rose-300 shadow-rose-500/50'
                            : cn('bg-linear-to-r', accentTheme.gradientClass, 'border-white/50')
                        )}
                      >
                        <Flame className="h-2.5 w-2.5 fill-white text-white shrink-0" />
                        <span>{upcoming24hTasks.length}</span>
                      </span>
                    ) : (
                      tab.badge !== null && (
                        <span
                          className={cn(
                            'absolute -top-1.5 -right-2.5 px-1 py-0.2 rounded-full text-[9px] font-black text-white leading-tight min-w-3.5 text-center shadow-xs border border-slate-900',
                            tab.badgeColor || 'bg-slate-500'
                          )}
                        >
                          {tab.badge}
                        </span>
                      )
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

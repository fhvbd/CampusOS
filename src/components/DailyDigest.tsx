import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sun, 
  Sunrise, 
  AlertTriangle, 
  Clock, 
  BookOpen, 
  Bell, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  MapPin, 
  User, 
  Flame, 
  ArrowRight, 
  ShieldAlert, 
  CalendarCheck, 
  Check, 
  Hourglass, 
  Timer, 
  Zap, 
  Target, 
  BellOff, 
  Shield, 
  TrendingUp,
  BellRing
} from 'lucide-react';
import { Course, Notice, Task, UserProfile, AppSettings, TabType } from '../types';
import { COURSE_COLOR_MAP, getFullDayName } from '../lib/utils';
import { detectTaskAutoTag, getTaskTagIcon } from '../lib/taskTags';
import { NotificationManager } from '../lib/notifications';

interface DailyDigestProps {
  user: UserProfile;
  settings: AppSettings;
  courses: Course[];
  notices: Notice[];
  tasks: Task[];
  onNavigateTab: (tab: TabType) => void;
  onSelectCourse: (course: Course) => void;
  onSelectNotice: (notice: Notice) => void;
  onToggleTask: (taskId: string) => void;
  onOpenAddTask: () => void;
}

// Time parsing helper
function parseTimeToMinutes(tStr: string): number {
  if (!tStr) return 0;
  const parts = tStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Deadline parsing helper
function parseDeadlineToDate(dlStr: string): Date | null {
  if (!dlStr) return null;
  try {
    const formatted = dlStr.includes('T') ? dlStr : dlStr.replace(' ', 'T');
    const d = new Date(formatted);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export const DailyDigest: React.FC<DailyDigestProps> = ({
  user,
  settings,
  courses,
  notices,
  tasks,
  onNavigateTab,
  onSelectCourse,
  onSelectNotice,
  onToggleTask,
  onOpenAddTask,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeDigestTab, setActiveDigestTab] = useState<'all' | 'courses' | 'tasks' | 'notices'>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'overdue' | 'today'>('all');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    NotificationManager.getPermission()
  );

  // Browser notification trigger for 'urgent' notices when NOT in Focus Mode
  useEffect(() => {
    if (!isFocusMode && settings.notification_alert) {
      const urgentNotices = notices.filter(n => n.is_urgent && !n.is_read);
      if (urgentNotices.length > 0 && NotificationManager.getPermission() === 'granted') {
        urgentNotices.forEach(notice => {
          NotificationManager.sendUrgentNoticeNotification(notice, onSelectNotice);
        });
      }
    }
  }, [isFocusMode, notices, settings.notification_alert, onSelectNotice]);

  const handleRequestNotificationPermission = async () => {
    const perm = await NotificationManager.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      const urgentNotices = notices.filter(n => n.is_urgent && !n.is_read);
      urgentNotices.forEach(notice => {
        NotificationManager.sendUrgentNoticeNotification(notice, onSelectNotice);
      });
    }
  };

  const handleTestUrgentNotification = () => {
    if (NotificationManager.getPermission() !== 'granted') {
      handleRequestNotificationPermission();
      return;
    }
    const targetNotice = notices.find(n => n.is_urgent) || notices[0];
    if (targetNotice) {
      NotificationManager.resetNotifiedSession();
      NotificationManager.sendUrgentNoticeNotification(targetNotice, onSelectNotice);
    }
  };

  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Sort Today's Courses by proximity to current time
  const todayCourses = useMemo(() => {
    return courses
      .filter(c => c.day_of_week === dayOfWeek && c.weeks.includes(settings.current_week));
  }, [courses, dayOfWeek, settings.current_week]);

  const sortedTodayCourses = useMemo(() => {
    return [...todayCourses].sort((a, b) => {
      const aStart = parseTimeToMinutes(a.start_time);
      const aEnd = parseTimeToMinutes(a.end_time);
      const bStart = parseTimeToMinutes(b.start_time);
      const bEnd = parseTimeToMinutes(b.end_time);

      const getTierAndDistance = (start: number, end: number) => {
        // Tier 0: Ongoing right now (Highest urgency)
        if (currentMinutes >= start && currentMinutes <= end) {
          return { tier: 0, distance: 0 };
        }
        // Tier 1: Upcoming today (Sorted by minutes until start ascending)
        if (currentMinutes < start) {
          return { tier: 1, distance: start - currentMinutes };
        }
        // Tier 2: Completed earlier today (Sorted to bottom)
        return { tier: 2, distance: currentMinutes - end };
      };

      const aInfo = getTierAndDistance(aStart, aEnd);
      const bInfo = getTierAndDistance(bStart, bEnd);

      if (aInfo.tier !== bInfo.tier) {
        return aInfo.tier - bInfo.tier;
      }
      return aInfo.distance - bInfo.distance;
    });
  }, [todayCourses, currentMinutes]);

  // Helper for course proximity display badge
  const getCourseProximityBadge = (course: Course) => {
    const startMin = parseTimeToMinutes(course.start_time);
    const endMin = parseTimeToMinutes(course.end_time);

    if (currentMinutes >= startMin && currentMinutes <= endMin) {
      const minsLeft = endMin - currentMinutes;
      return {
        type: 'ongoing',
        label: '正在进行',
        badgeClass: 'bg-emerald-600 text-white animate-pulse shadow-xs',
        timeText: `距下课还有 ${minsLeft} 分钟`,
        isUrgent: true,
      };
    }

    if (currentMinutes < startMin) {
      const minsUntil = startMin - currentMinutes;
      const hoursUntil = Math.floor(minsUntil / 60);
      const isImminent = minsUntil <= 40;
      return {
        type: 'upcoming',
        label: isImminent ? `即将上课 (${minsUntil}分)` : '下节预告',
        badgeClass: isImminent 
          ? 'bg-amber-500 text-white animate-bounce shadow-xs' 
          : 'bg-blue-600 text-white shadow-2xs',
        timeText: minsUntil < 60 ? `${minsUntil}分钟后开始` : `约 ${hoursUntil} 小时后开始`,
        isUrgent: isImminent,
      };
    }

    return {
      type: 'past',
      label: '今日已结课',
      badgeClass: 'bg-slate-200 text-slate-600',
      timeText: '已完成今日教学',
      isUrgent: false,
    };
  };

  // 2. Sort Tasks by proximity to current time (overdue & imminent deadlines first)
  const taskProximityList = useMemo(() => {
    const uncompleted = tasks.filter(t => !t.is_completed);

    return uncompleted.map(task => {
      const dlDate = parseDeadlineToDate(task.deadline);
      if (!dlDate) {
        return {
          task,
          isOverdue: false,
          isToday: false,
          status: 'nodate' as const,
          badgeLabel: '无截止时间',
          badgeClass: 'bg-slate-100 text-slate-500',
          urgencyScore: 9999999,
          timeText: '常规待办',
          timeDesc: '未指定截止日期',
        };
      }

      const diffMs = dlDate.getTime() - now.getTime();
      const isPast = diffMs < 0;
      const absDiff = Math.abs(diffMs);
      const diffHours = Math.floor(absDiff / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      const isSameCalendarDay = dlDate.getFullYear() === now.getFullYear() &&
                                dlDate.getMonth() === now.getMonth() &&
                                dlDate.getDate() === now.getDate();

      if (isPast) {
        const overdueText = diffDays >= 1 ? `已逾期 ${diffDays}天` : `已逾期 ${Math.max(1, diffHours)}小时`;
        return {
          task,
          isOverdue: true,
          isToday: isSameCalendarDay,
          status: 'overdue' as const,
          badgeLabel: overdueText,
          badgeClass: 'bg-rose-600 text-white shadow-2xs font-bold font-mono',
          // Overdue items have tier 0; high priority tasks bubble to the very top
          urgencyScore: (task.priority === 'high' ? 0 : 200) + Math.min(diffDays, 60),
          timeText: overdueText,
          timeDesc: `原截止于 ${task.deadline.includes(' ') ? task.deadline.split(' ')[1] : task.deadline}`,
        };
      }

      if (isSameCalendarDay || diffHours <= 18) {
        const hoursLeft = Math.max(1, diffHours);
        const todayText = `今日到期 · 剩 ${hoursLeft}小时`;
        return {
          task,
          isOverdue: false,
          isToday: true,
          status: 'today' as const,
          badgeLabel: todayText,
          badgeClass: 'bg-amber-500 text-white shadow-2xs font-bold font-mono',
          // Tier 1: due today / soon
          urgencyScore: 1000 + (task.priority === 'high' ? 0 : 100) + hoursLeft,
          timeText: `剩 ${hoursLeft}小时`,
          timeDesc: `今日 ${task.deadline.includes(' ') ? task.deadline.split(' ')[1] : ''} 截止`,
        };
      }

      const daysLeft = Math.max(1, diffDays);
      return {
        task,
        isOverdue: false,
        isToday: false,
        status: 'upcoming' as const,
        badgeLabel: `${daysLeft}天后截止`,
        badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 font-medium font-mono',
        // Tier 2: upcoming in future days
        urgencyScore: 10000 + (task.priority === 'high' ? 0 : 500) + daysLeft,
        timeText: `${daysLeft}天后`,
        timeDesc: `截止于 ${task.deadline.split(' ')[0]}`,
      };
    }).sort((a, b) => a.urgencyScore - b.urgencyScore);
  }, [tasks, now]);

  // Overdue count and today due count
  const overdueCount = taskProximityList.filter(item => item.isOverdue).length;
  const todayDueCount = taskProximityList.filter(item => item.isToday && !item.isOverdue).length;

  // 4. Calculate Today's Productivity Progress
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const todayTargetTasks = useMemo(() => {
    const specificToday = tasks.filter(t => {
      if (!t.deadline) return false;
      const datePart = t.deadline.split(' ')[0];
      return datePart === todayDateStr || datePart === '2026-08-31' || datePart === '2026-09-01';
    });
    return specificToday.length > 0 ? specificToday : tasks;
  }, [tasks, todayDateStr]);

  const completedTodayTasksCount = useMemo(() => {
    return todayTargetTasks.filter(t => t.is_completed).length;
  }, [todayTargetTasks]);

  const totalTodayTasksCount = todayTargetTasks.length;

  const todayProgressPercent = useMemo(() => {
    if (totalTodayTasksCount === 0) return 100;
    return Math.round((completedTodayTasksCount / totalTodayTasksCount) * 100);
  }, [completedTodayTasksCount, totalTodayTasksCount]);

  // Filter tasks based on taskFilter chip & focus mode
  const filteredTaskList = useMemo(() => {
    let list = taskProximityList;
    if (isFocusMode) {
      // Focus mode: prioritize urgent items, hides lower-priority/routine items
      list = list.filter(item => item.isOverdue || item.isToday || item.task.priority === 'high');
    }
    if (taskFilter === 'overdue') {
      return list.filter(item => item.isOverdue);
    }
    if (taskFilter === 'today') {
      return list.filter(item => item.isToday);
    }
    return list;
  }, [taskProximityList, taskFilter, isFocusMode]);

  // 3. Urgent Unread Notices (with Focus Mode silencing non-urgent & secondary notices)
  const urgentUnreadNotices = notices.filter(n => n.is_urgent && !n.is_read);
  const allUrgentNotices = notices.filter(n => n.is_urgent);

  const displayNotices = useMemo(() => {
    if (isFocusMode) {
      // Focus mode: silences non-urgent notifications and secondary academic notices
      return notices.filter(n => n.is_urgent && !n.is_read);
    }
    return urgentUnreadNotices.length > 0 ? urgentUnreadNotices : allUrgentNotices;
  }, [isFocusMode, notices, urgentUnreadNotices, allUrgentNotices]);

  // Determine time-of-day greeting
  const hour = now.getHours();
  let greetingTimeText = '早上好';
  let greetingSubText = isFocusMode
    ? '🎯 专注自习模式已激活：已静音非紧急广播，隐匿次要学术通告，全力聚焦眼前学习'
    : '今日学业速报已按时间紧急度实时重排，助您先解燃眉之急';
  if (hour >= 12 && hour < 18) {
    greetingTimeText = '下午好';
    if (!isFocusMode) {
      greetingSubText = '午后日程已按距离当前时间的紧迫度排序，优先处理眼前事务';
    }
  } else if (hour >= 18 || hour < 5) {
    greetingTimeText = '晚上好';
    if (!isFocusMode) {
      greetingSubText = '夜间复盘：最紧迫未结待办已置顶，注意合理安排就寝与复习';
    }
  }

  // Active top class indicator
  const immediateClass = sortedTodayCourses.length > 0 ? sortedTodayCourses[0] : null;
  const immediateClassBadge = immediateClass ? getCourseProximityBadge(immediateClass) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl glass-panel border border-white/80 shadow-md shadow-slate-900/5 transition-all">
      {/* Decorative Morning Gradient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-amber-400/15 via-orange-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-linear-to-tr from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 p-5 sm:p-6 pb-4 border-b border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-linear-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 shrink-0">
            <Sunrise className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[11px] font-black border border-amber-500/25">
                <Sparkles className="h-3 w-3 text-amber-600" />
                晨间速览 · 按时间临近度排序
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 {getFullDayName(dayOfWeek)}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {greetingTimeText}，{user.username}同学！
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {greetingSubText}
            </p>
          </div>
        </div>

        {/* Status Indicators & Collapse Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Class Badge */}
            <span 
              onClick={() => { setIsCollapsed(false); setActiveDigestTab('courses'); }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                todayCourses.length > 0 
                  ? immediateClassBadge?.type === 'ongoing'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 animate-pulse'
                    : 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100/80' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              <span>
                今日课程 {todayCourses.length}
                {immediateClassBadge && immediateClassBadge.type === 'ongoing' ? ' (上课中)' : ''}
              </span>
            </span>

            {/* Overdue / Urgent Task Badge */}
            <span 
              onClick={() => { setIsCollapsed(false); setActiveDigestTab('tasks'); }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                overdueCount > 0 
                  ? 'bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse hover:bg-rose-100/80' 
                  : todayDueCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/80'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
              }`}
            >
              {overdueCount > 0 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  <span>逾期 {overdueCount} 项</span>
                </>
              ) : todayDueCount > 0 ? (
                <>
                  <Flame className="h-3.5 w-3.5 text-amber-600" />
                  <span>今日截止 {todayDueCount} 项</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>无逾期</span>
                </>
              )}
            </span>

            {/* Urgent Notice Badge */}
            <span 
              onClick={() => { setIsCollapsed(false); setActiveDigestTab('notices'); }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                urgentUnreadNotices.length > 0 
                  ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/80' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Bell className="h-3.5 w-3.5 text-amber-600" />
              <span>
                {isFocusMode ? '紧急预警' : '重要通知'} {displayNotices.length}
              </span>
            </span>

            {/* Today Progress Mini Badge */}
            <span 
              onClick={() => { setIsCollapsed(false); setActiveDigestTab('tasks'); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/80"
              title="点击查看今日待办达成率"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>今日达成 {todayProgressPercent}%</span>
            </span>
          </div>

          {/* Focus Mode Toggle Pill Button */}
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isFocusMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500 shadow-purple-500/25 ring-2 ring-purple-400/40'
                : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200 hover:border-purple-300'
            }`}
            title={isFocusMode ? '点击退出专注模式' : '开启专注自习模式：静音非紧急通知，隐匿次要学术通告'}
          >
            <Target className={`h-3.5 w-3.5 ${isFocusMode ? 'text-amber-300' : 'text-purple-600'}`} />
            <span>{isFocusMode ? '专注模式 · 已开启' : '专注模式'}</span>
          </button>

          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
            title={isCollapsed ? '展开晨间速报' : '收起晨间速报'}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Briefing Content */}
      {!isCollapsed && (
        <div className="relative z-10 p-5 sm:p-6 space-y-5">
          {/* Active Focus Mode Ribbon Banner */}
          {isFocusMode && (
            <div className="p-3.5 rounded-2xl bg-linear-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/25 flex items-center justify-between gap-3 text-xs text-purple-950 animate-in fade-in duration-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold">专注自习模式已生效 🎯</span>
                  <span className="text-slate-600 ml-2 text-[11px] hidden sm:inline">
                    已为您静音非紧急广播通知、隐藏次要学术通告，并已静音浏览器桌面推送；退出专注后将自动恢复紧急教务预警
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsFocusMode(false)}
                className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-purple-700 text-[11px] font-bold border border-purple-200 cursor-pointer shrink-0 transition-all shadow-2xs"
              >
                退出专注
              </button>
            </div>
          )}

          {/* Visual Productivity Progress Bar for the day */}
          <div className="p-4 sm:p-4.5 rounded-2xl bg-white/85 border border-white/90 shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-linear-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">今日学业生产力进度</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {todayProgressPercent}% 达成
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    今日已完成 <span className="font-bold text-slate-800 font-mono">{completedTodayTasksCount}</span> / <span className="font-bold text-slate-800 font-mono">{totalTodayTasksCount}</span> 项待办事项
                    {todayProgressPercent === 100 
                      ? ' · 🎉 太棒了！今日待办已全部达成！' 
                      : todayProgressPercent >= 50 
                      ? ' · ⚡ 进度已过半，保持专注节奏' 
                      : ' · 💪 开启高效自习，稳步推进今日学业'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-[11px] font-mono">
                <span className="text-slate-400">剩余待办:</span>
                <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  {Math.max(0, totalTodayTasksCount - completedTodayTasksCount)} 项
                </span>
              </div>
            </div>

            {/* Animated Gradient Progress Track */}
            <div className="w-full bg-slate-100/90 rounded-full h-2.5 overflow-hidden border border-slate-200/60 p-0.5">
              <div
                className="bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out shadow-xs"
                style={{ width: `${todayProgressPercent}%` }}
              />
            </div>
          </div>
          {/* Filter Chips inside Daily Digest */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                onClick={() => setActiveDigestTab('all')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  activeDigestTab === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                全景速报 (智能置顶)
              </button>
              <button
                onClick={() => setActiveDigestTab('courses')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  activeDigestTab === 'courses'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                <span>今日课程</span>
                <span className="text-[10px] opacity-80 font-mono">({todayCourses.length})</span>
              </button>
              <button
                onClick={() => setActiveDigestTab('tasks')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  activeDigestTab === 'tasks'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                <span>紧迫待办</span>
                <span className="text-[10px] opacity-80 font-mono">({taskProximityList.length})</span>
              </button>
              <button
                onClick={() => setActiveDigestTab('notices')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  activeDigestTab === 'notices'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                <span>重要通知</span>
                <span className="text-[10px] opacity-80 font-mono">({displayNotices.length})</span>
              </button>
            </div>

            {/* Quick action: jump to full schedule */}
            <button
              onClick={() => onNavigateTab('schedule')}
              className="text-xs font-bold text-slate-500 hover:text-blue-600 hidden sm:flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>查看完整课表</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 3 Sections in Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-stretch">
            
            {/* Column 1: Today's Classes (Sorted by Proximity to Current Time) */}
            {(activeDigestTab === 'all' || activeDigestTab === 'courses') && (
              <div className={`p-4 rounded-2xl bg-white/70 border border-white/90 shadow-2xs flex flex-col justify-between space-y-3 ${activeDigestTab === 'courses' ? 'md:col-span-3' : ''}`}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-blue-500/15 text-blue-700 flex items-center justify-center font-bold text-xs">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        今日课程 (按当前时间临近排序)
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 font-mono">
                      {sortedTodayCourses.length} 门
                    </span>
                  </div>

                  {sortedTodayCourses.length === 0 ? (
                    <div className="py-6 text-center space-y-1.5">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                        <CalendarCheck className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">今天没有课程安排 🎉</div>
                      <p className="text-[11px] text-slate-400">享受自由自习或竞赛研讨时光</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedTodayCourses.map((c, idx) => {
                        const proximity = getCourseProximityBadge(c);
                        const isTop = idx === 0;

                        return (
                          <div
                            key={c.id}
                            onClick={() => onSelectCourse(c)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer group ${
                              proximity.type === 'ongoing'
                                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                                : isTop && proximity.type === 'upcoming'
                                ? 'bg-blue-50/80 border-blue-200/90 ring-1 ring-blue-500/20'
                                : proximity.type === 'past'
                                ? 'bg-slate-50/60 border-slate-200/50 opacity-70 hover:opacity-100'
                                : 'bg-white/60 border-slate-200/50 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  {/* Proximity Tag (Ongoing, Soon, Upcoming) */}
                                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0 ${proximity.badgeClass}`}>
                                    {proximity.label}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600">
                                    {c.course_name}
                                  </h4>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500">
                                  <span className="font-mono text-slate-700 font-semibold">{c.start_time}-{c.end_time}</span>
                                  <span className="text-slate-300">·</span>
                                  <span className="truncate max-w-32 text-slate-600 font-medium">{c.classroom}</span>
                                  <span className="text-slate-300">·</span>
                                  <span className={`font-medium ${proximity.type === 'ongoing' ? 'text-emerald-700 font-bold' : proximity.type === 'upcoming' ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
                                    {proximity.timeText}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[10px] text-blue-600 font-bold shrink-0 self-center">
                                第{c.start_period}-{c.start_period + c.period_count - 1}节
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">第 {settings.current_week} 周 · 即刻上课优先置顶</span>
                  <button
                    onClick={() => onNavigateTab('schedule')}
                    className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    查看完整课表
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Column 2: Urgent Tasks (Sorted by Urgency / Deadline Proximity) */}
            {(activeDigestTab === 'all' || activeDigestTab === 'tasks') && (
              <div className={`p-4 rounded-2xl bg-white/70 border border-white/90 shadow-2xs flex flex-col justify-between space-y-3 ${activeDigestTab === 'tasks' ? 'md:col-span-3' : ''}`}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        overdueCount > 0 ? 'bg-rose-500/15 text-rose-700' : 'bg-amber-500/15 text-amber-700'
                      }`}>
                        <Timer className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        紧迫待办 (最急事项置顶)
                      </h3>
                    </div>
                    
                    {/* Quick Sub-filter chips when tab is expanded */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        onClick={() => setTaskFilter('all')}
                        className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          taskFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        全部 ({taskProximityList.length})
                      </button>
                      {overdueCount > 0 && (
                        <button
                          onClick={() => setTaskFilter('overdue')}
                          className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            taskFilter === 'overdue' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          逾期 ({overdueCount})
                        </button>
                      )}
                      {todayDueCount > 0 && (
                        <button
                          onClick={() => setTaskFilter('today')}
                          className={`px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            taskFilter === 'today' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          今日 ({todayDueCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredTaskList.length === 0 ? (
                    <div className="py-6 text-center space-y-1.5">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">暂无待处理紧迫事项 🎉</div>
                      <p className="text-[11px] text-slate-400">目前没有逾期或今日到期的待办，学业节奏极佳！</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTaskList.slice(0, activeDigestTab === 'tasks' ? 12 : 3).map(({ task, isOverdue, isToday, badgeLabel, badgeClass, timeDesc }) => {
                        const autoTag = detectTaskAutoTag(task.title, task.category);
                        const TagIcon = getTaskTagIcon(task.auto_tag_icon || autoTag.iconName);

                        return (
                          <div
                            key={task.id}
                            className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 group ${
                              isOverdue
                                ? 'bg-rose-50/60 border-rose-200/80 hover:bg-rose-50'
                                : isToday
                                ? 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-50'
                                : 'bg-white/60 border-slate-200/60 hover:bg-white'
                            }`}
                          >
                            <button
                              onClick={() => onToggleTask(task.id)}
                              className={`mt-0.5 cursor-pointer shrink-0 transition-colors ${
                                isOverdue ? 'text-rose-400 hover:text-emerald-600' : 'text-slate-400 hover:text-indigo-600'
                              }`}
                              title="点击标记为已完成"
                            >
                              <Circle className="h-4 w-4" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <h4 className={`text-xs font-bold truncate ${
                                  isOverdue ? 'text-slate-900 group-hover:text-rose-700' : 'text-slate-900 group-hover:text-blue-700'
                                }`}>
                                  {task.title}
                                </h4>
                                
                                {/* Proximity Urgent Badge */}
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0 ${badgeClass}`}>
                                  {badgeLabel}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500">
                                <span className={`font-mono font-bold ${
                                  isOverdue ? 'text-rose-600' : isToday ? 'text-amber-700' : 'text-slate-500'
                                }`}>
                                  {timeDesc}
                                </span>
                                {task.course_name && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="truncate max-w-28 text-indigo-700 font-medium">{task.course_name}</span>
                                  </>
                                )}
                                {task.custom_category_name && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 truncate max-w-28">
                                      🏷️ {task.custom_category_name}
                                    </span>
                                  </>
                                )}
                                {task.priority === 'high' && (
                                  <span className="text-[9px] font-black px-1 py-0.1 rounded bg-rose-500/10 text-rose-700">
                                    高优
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredTaskList.length > 3 && activeDigestTab === 'all' && (
                        <div className="text-center pt-1">
                          <button
                            onClick={() => setActiveDigestTab('tasks')}
                            className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            还有 {filteredTaskList.length - 3} 项待办（点击查看紧迫待办全览）...
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {overdueCount > 0 ? `🔥 优先处置 ${overdueCount} 项逾期` : '按截止时间远近自动排序'}
                  </span>
                  <button
                    onClick={onOpenAddTask}
                    className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    新建待办
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Column 3: Urgent Unread Notices */}
            {(activeDigestTab === 'all' || activeDigestTab === 'notices') && (
              <div className={`p-4 rounded-2xl bg-white/70 border border-white/90 shadow-2xs flex flex-col justify-between space-y-3 ${activeDigestTab === 'notices' ? 'md:col-span-3' : ''}`}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isFocusMode ? 'bg-purple-500/15 text-purple-700' : 'bg-amber-500/15 text-amber-700'
                      }`}>
                        {isFocusMode ? <Shield className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                      </div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {isFocusMode ? '紧急通知 (专注过滤)' : '重要通知预警'}
                      </h3>
                    </div>
                    <span className={`text-[11px] font-bold font-mono ${
                      isFocusMode ? 'text-purple-700' : 'text-amber-700'
                    }`}>{displayNotices.length} 条</span>
                  </div>

                  {isFocusMode && (
                    <div className="flex items-center gap-1.5 text-[10px] text-purple-800 font-bold bg-purple-50/80 px-2.5 py-1 rounded-xl border border-purple-200">
                      <Shield className="h-3 w-3 text-purple-600 shrink-0" />
                      <span>专注模式已生效 · 仅放行重大截止与紧急待办通知</span>
                    </div>
                  )}

                  {displayNotices.length === 0 ? (
                    <div className="py-6 text-center space-y-1.5">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mx-auto ${
                        isFocusMode ? 'bg-purple-500/15 text-purple-600' : 'bg-blue-500/15 text-blue-600'
                      }`}>
                        {isFocusMode ? <BellOff className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        {isFocusMode ? '已静音非紧急校园通知 🔕' : '暂无紧急未读通知'}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isFocusMode ? '专注学习模式已开启，次要通告已隐藏以保障心流体验' : '重大选课、缓考与评奖公告均已查阅'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayNotices.slice(0, activeDigestTab === 'notices' ? 8 : 2).map(notice => (
                        <div
                          key={notice.id}
                          onClick={() => onSelectNotice(notice)}
                          className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 hover:bg-amber-100/60 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-600 text-white shrink-0">
                              {notice.category_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{notice.publish_time.split(' ')[0]}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 line-clamp-1 leading-snug">
                            {notice.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {notice.summary}
                          </p>
                          {notice.deadline && (
                            <div className="mt-1 text-[10px] font-bold text-amber-700 flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" />
                              <span>截止: {notice.deadline}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {NotificationManager.isSupported() ? (
                      notifPermission === 'granted' ? (
                        <button
                          onClick={handleTestUrgentNotification}
                          className="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
                          title="非专注模式下自动触发桌面推送，点击立即测试"
                        >
                          <BellRing className="h-3 w-3 text-amber-600" />
                          <span>测试桌面推送</span>
                        </button>
                      ) : notifPermission === 'default' ? (
                        <button
                          onClick={handleRequestNotificationPermission}
                          className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-colors"
                          title="开启浏览器紧急教务通知推送"
                        >
                          <Bell className="h-3 w-3 text-blue-600" />
                          <span>开启桌面通知</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">桌面通知已禁止</span>
                      )
                    ) : (
                      <span className="text-slate-400">教务与学工重要动态</span>
                    )}
                  </div>

                  <button
                    onClick={() => onNavigateTab('notice')}
                    className="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    前往通知中心
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

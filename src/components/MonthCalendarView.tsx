import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  List, 
  Clock, 
  MapPin, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Circle,
  Flame, 
  Sparkles, 
  Filter, 
  ArrowRight, 
  BookOpen, 
  Timer,
  ChevronDown,
  Layers,
  CalendarCheck,
  Tag,
  GripVertical,
  RotateCcw,
  Move,
  Info,
  Check,
  Repeat,
  Activity,
  GraduationCap,
  ShieldAlert,
  Award,
  FileText
} from 'lucide-react';
import { Course, AppSettings, Task } from '../types';
import { COURSE_COLOR_MAP, getFullDayName, getDayName } from '../lib/utils';
import { detectTaskAutoTag, getTaskTagIcon } from '../lib/taskTags';

const STORAGE_KEY_EVENT_OVERRIDES = 'campus_os_month_calendar_event_overrides_v1';

export interface CalendarEventOverride {
  id: string; // task or course id
  type: 'task' | 'course';
  title: string;
  originalDate: string; // YYYY-MM-DD
  newDate: string; // YYYY-MM-DD
  movedAt: string;
}

interface MonthCalendarViewProps {
  courses: Course[];
  tasks?: Task[];
  settings: AppSettings;
  onSelectCourse: (course: Course) => void;
  onSelectTask?: (task: Task) => void;
  onSaveTask?: (task: Task) => void;
}

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  courses,
  tasks = [],
  settings,
  onSelectCourse,
  onSelectTask,
  onSaveTask,
}) => {
  // Current displayed Month & Year (Default to current semester / today)
  const initialDate = useMemo(() => {
    const d = new Date();
    if (settings.semester_start_date) {
      const semDate = new Date(settings.semester_start_date);
      if (Math.abs(d.getTime() - semDate.getTime()) > 1000 * 60 * 60 * 24 * 365) {
        return semDate;
      }
    }
    return d;
  }, [settings.semester_start_date]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [subViewMode, setSubViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDayStr, setSelectedDayStr] = useState<string>(
    `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, '0')}-${String(initialDate.getDate()).padStart(2, '0')}`
  );
  const [listFilter, setListFilter] = useState<'all' | 'high_priority' | 'deadlines' | 'courses' | 'exams'>('all');
  const [workloadFilter, setWorkloadFilter] = useState<'all' | 'deadlines' | 'exams' | 'heavy'>('all');

  // Drag-and-Drop & LocalStorage State
  const [eventOverrides, setEventOverrides] = useState<Record<string, CalendarEventOverride>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EVENT_OVERRIDES);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Failed to parse calendar event overrides', e);
      return {};
    }
  });

  const [draggingItem, setDraggingItem] = useState<{
    id: string;
    type: 'task' | 'course';
    title: string;
    priority?: string;
    currentDate: string;
  } | null>(null);

  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Reschedule Modal State (Mobile fallback)
  const [rescheduleModalItem, setRescheduleModalItem] = useState<{
    id: string;
    type: 'task' | 'course';
    title: string;
    currentDate: string;
  } | null>(null);
  const [targetRescheduleDate, setTargetRescheduleDate] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleTodayMonth = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayStr(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    );
  };

  // Helper to format date as YYYY-MM-DD
  const formatDateStr = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Semester week calculation
  const getSemesterWeek = (date: Date): number | null => {
    if (!settings.semester_start_date) return null;
    const semStart = new Date(settings.semester_start_date);
    semStart.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - semStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    const week = Math.floor(diffDays / 7) + 1;
    return week >= 1 && week <= 25 ? week : null;
  };

  // Helper: Get effective date for task considering local storage drag-and-drop overrides
  const getEffectiveTaskDate = (task: Task): string => {
    if (eventOverrides[task.id]) {
      return eventOverrides[task.id].newDate;
    }
    return task.deadline ? task.deadline.split(' ')[0] : (task.created_at ? task.created_at.split(' ')[0] : '');
  };

  // Helper: Get effective date for course exam or rescheduled session
  const getEffectiveCourseExamDate = (course: Course): string => {
    if (eventOverrides[`course_${course.id}`]) {
      return eventOverrides[`course_${course.id}`].newDate;
    }
    return course.exam_date || '';
  };

  // Drag and Drop Handlers
  const handleDragStart = (
    e: React.DragEvent,
    item: { id: string; type: 'task' | 'course'; title: string; priority?: string; currentDate: string }
  ) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItem(item);
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== targetDateStr) {
      setDragOverDate(targetDateStr);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetDateStr: string) => {
    if (dragOverDate === targetDateStr) {
      setDragOverDate(null);
    }
  };

  const handleDropOnDate = (targetDateStr: string) => {
    if (!draggingItem) return;
    executeEventMove(draggingItem, targetDateStr);
    setDraggingItem(null);
    setDragOverDate(null);
  };

  // Move Event Execution (Used by Drag-and-Drop and Modal Fallback)
  const executeEventMove = (
    item: { id: string; type: 'task' | 'course'; title: string; currentDate: string },
    targetDateStr: string
  ) => {
    if (item.currentDate === targetDateStr) return;

    const overrideKey = item.type === 'course' ? `course_${item.id}` : item.id;
    const newOverride: CalendarEventOverride = {
      id: item.id,
      type: item.type,
      title: item.title,
      originalDate: eventOverrides[overrideKey]?.originalDate || item.currentDate,
      newDate: targetDateStr,
      movedAt: new Date().toISOString(),
    };

    const updatedOverrides = {
      ...eventOverrides,
      [overrideKey]: newOverride,
    };

    setEventOverrides(updatedOverrides);
    try {
      localStorage.setItem(STORAGE_KEY_EVENT_OVERRIDES, JSON.stringify(updatedOverrides));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }

    // If it's a task and onSaveTask is available, sync the deadline into global tasks state
    if (item.type === 'task') {
      const taskObj = tasks.find(t => t.id === item.id);
      if (taskObj && onSaveTask) {
        const timePart = taskObj.deadline && taskObj.deadline.includes(' ') ? taskObj.deadline.split(' ')[1] : '22:00';
        onSaveTask({
          ...taskObj,
          deadline: `${targetDateStr} ${timePart}`,
        });
      }
    }

    // Show feedback toast
    setToastMessage(`已将「${item.title}」排期调整至 ${targetDateStr}，已持久化至本地存储！`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Revert a single event's override
  const handleRevertSingleOverride = (overrideKey: string) => {
    const override = eventOverrides[overrideKey];
    if (!override) return;

    const copy = { ...eventOverrides };
    delete copy[overrideKey];
    setEventOverrides(copy);
    try {
      localStorage.setItem(STORAGE_KEY_EVENT_OVERRIDES, JSON.stringify(copy));
    } catch (e) {}

    // If task, reset deadline back to original
    if (override.type === 'task') {
      const taskObj = tasks.find(t => t.id === override.id);
      if (taskObj && onSaveTask) {
        const timePart = taskObj.deadline && taskObj.deadline.includes(' ') ? taskObj.deadline.split(' ')[1] : '22:00';
        onSaveTask({
          ...taskObj,
          deadline: `${override.originalDate} ${timePart}`,
        });
      }
    }

    setToastMessage(`已恢复「${override.title}」的原始日期 (${override.originalDate})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Revert all event overrides
  const handleResetAllOverrides = () => {
    if (window.confirm('确认撤销所有拖拽调期排程，恢复默认校历与待办日期吗？')) {
      setEventOverrides({});
      try {
        localStorage.removeItem(STORAGE_KEY_EVENT_OVERRIDES);
      } catch (e) {}
      setToastMessage('已恢复所有课程与待办的默认初始排期！');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday, 6 = Sunday

  // Build grid data for Calendar view with persistence applied
  const calendarCells = useMemo(() => {
    const cells: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      semesterWeek: number | null;
      courses: Course[];
      deadlines: Task[];
      highPriorityDeadlines: Task[];
      exams: Course[];
    }[] = [];

    const todayStr = formatDateStr(new Date());

    const buildCellForDate = (d: Date, isCurrentMonth: boolean, dayNumber: number) => {
      const dStr = formatDateStr(d);
      const semWeek = getSemesterWeek(d);
      const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();

      // Courses for this day of week
      const dayCourses = semWeek
        ? courses
            .filter(c => c.day_of_week === dayOfWeek && c.weeks.includes(semWeek))
            .sort((a, b) => a.start_period - b.start_period)
        : [];

      // Deadlines matching this dateStr (taking into account local storage event overrides)
      const dayDeadlines = tasks.filter(t => {
        const effDate = getEffectiveTaskDate(t);
        return effDate === dStr;
      });

      const highPriorityDeadlines = dayDeadlines.filter(t => t.priority === 'high');

      // Exams matching this dateStr (considering overrides)
      const dayExams = courses.filter(c => {
        const effExamDate = getEffectiveCourseExamDate(c);
        return effExamDate === dStr;
      });

      return {
        date: d,
        dateStr: dStr,
        dayNumber,
        isCurrentMonth,
        isToday: dStr === todayStr,
        semesterWeek: semWeek,
        courses: dayCourses,
        deadlines: dayDeadlines,
        highPriorityDeadlines,
        exams: dayExams,
      };
    };

    // 1. Previous month trailing days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push(buildCellForDate(d, false, d.getDate()));
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push(buildCellForDate(d, true, day));
    }

    // 3. Next month leading days to complete full weeks
    const remainingSlots = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      cells.push(buildCellForDate(d, false, i));
    }

    return cells;
  }, [year, month, daysInMonth, firstDayWeekday, courses, tasks, eventOverrides, settings.semester_start_date]);

  // Selected Day data for Inspector Panel
  const selectedDayCell = useMemo(() => {
    return calendarCells.find(c => c.dateStr === selectedDayStr) || null;
  }, [calendarCells, selectedDayStr]);

  // List view data: all dates in current month that match filter
  const monthAgendaList = useMemo(() => {
    return calendarCells
      .filter(cell => cell.isCurrentMonth)
      .map(cell => {
        let hasContent = false;
        if (listFilter === 'all' && (cell.courses.length > 0 || cell.deadlines.length > 0 || cell.exams.length > 0)) {
          hasContent = true;
        } else if (listFilter === 'high_priority' && (cell.highPriorityDeadlines.length > 0 || cell.exams.length > 0)) {
          hasContent = true;
        } else if (listFilter === 'deadlines' && cell.deadlines.length > 0) {
          hasContent = true;
        } else if (listFilter === 'courses' && cell.courses.length > 0) {
          hasContent = true;
        } else if (listFilter === 'exams' && cell.exams.length > 0) {
          hasContent = true;
        }
        return {
          ...cell,
          hasContent,
        };
      })
      .filter(c => c.hasContent);
  }, [calendarCells, listFilter]);

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const overridesCount = Object.keys(eventOverrides).length;

  // Comprehensive Semester & Month Workload Statistics
  const workloadStats = useMemo(() => {
    const currentMonthCells = calendarCells.filter(c => c.isCurrentMonth);
    const monthDeadlines = currentMonthCells.flatMap(c => c.deadlines);
    const monthHighPriority = currentMonthCells.flatMap(c => c.highPriorityDeadlines);
    const monthCompleted = monthDeadlines.filter(t => t.is_completed);
    const monthExams = currentMonthCells.flatMap(c => c.exams);

    // All semester exams across courses (respecting overrides)
    const allSemesterExams = courses
      .filter(c => !!c.exam_date)
      .map(c => {
        const effExamDate = getEffectiveCourseExamDate(c);
        return {
          course: c,
          dateStr: effExamDate,
        };
      })
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    const todayStr = formatDateStr(new Date());
    const upcomingExams = allSemesterExams.filter(e => e.dateStr >= todayStr);
    const nextExam = upcomingExams[0] || null;
    let daysUntilNextExam: number | null = null;
    if (nextExam) {
      const diffMs = new Date(nextExam.dateStr).getTime() - new Date(todayStr).getTime();
      daysUntilNextExam = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Heavy days (days with exams OR (tasks + courses) score >= 6)
    const heavyDays = currentMonthCells.filter(c => {
      if (c.exams.length > 0) return true;
      const score = c.courses.length + c.deadlines.length * 2;
      return score >= 6;
    });

    const totalPeriods = currentMonthCells.reduce((acc, c) => {
      return acc + c.courses.reduce((sum, course) => sum + course.period_count, 0);
    }, 0);

    let workloadRating: 'light' | 'moderate' | 'heavy' | 'critical' = 'moderate';
    if (monthExams.length >= 2 || heavyDays.length >= 7) {
      workloadRating = 'critical';
    } else if (monthExams.length >= 1 || heavyDays.length >= 4) {
      workloadRating = 'heavy';
    } else if (totalPeriods >= 28 || monthDeadlines.length >= 5) {
      workloadRating = 'moderate';
    } else {
      workloadRating = 'light';
    }

    return {
      monthDeadlinesCount: monthDeadlines.length,
      monthCompletedCount: monthCompleted.length,
      monthHighPriorityCount: monthHighPriority.length,
      monthExamsCount: monthExams.length,
      monthHeavyDaysCount: heavyDays.length,
      totalPeriods,
      allSemesterExamsCount: allSemesterExams.length,
      allSemesterExams,
      nextExam,
      daysUntilNextExam,
      workloadRating,
    };
  }, [calendarCells, courses, eventOverrides]);

  const getCellWorkloadInfo = (cell: typeof calendarCells[0]) => {
    if (cell.exams.length > 0) {
      return {
        level: 'exam',
        label: '考试攻坚',
        dotColor: 'bg-rose-600',
        borderColor: 'ring-rose-500/50 bg-rose-50/30',
        score: 10,
      };
    }
    const score = cell.courses.length + cell.deadlines.length * 2 + cell.highPriorityDeadlines.length * 1.5;
    if (score >= 6) {
      return {
        level: 'heavy',
        label: '极高负荷',
        dotColor: 'bg-rose-500',
        borderColor: 'ring-rose-400/40 bg-rose-50/20',
        score,
      };
    }
    if (score >= 3) {
      return {
        level: 'moderate',
        label: '充实饱满',
        dotColor: 'bg-amber-500',
        borderColor: 'ring-amber-300/30 bg-amber-50/10',
        score,
      };
    }
    if (score > 0) {
      return {
        level: 'light',
        label: '平稳常态',
        dotColor: 'bg-blue-400',
        borderColor: '',
        score,
      };
    }
    return {
      level: 'free',
      label: '空闲无排程',
      dotColor: 'bg-slate-300',
      borderColor: '',
      score: 0,
    };
  };

  const handleJumpToMonth = (targetYear: number, targetMonthIndex: number) => {
    setCurrentDate(new Date(targetYear, targetMonthIndex, 1));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-md p-4 rounded-2xl bg-slate-900/95 text-white shadow-2xl border border-white/20 backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Toolbar (Liquid Glass Panel) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Month & Year Title with Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center glass-pill rounded-2xl p-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-white/80 text-slate-700 cursor-pointer transition-all active:scale-95"
                title="上个月"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-4 py-1 text-base font-black text-slate-900 min-w-36 text-center">
                {year}年 {monthNames[month]}
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-white/80 text-slate-700 cursor-pointer transition-all active:scale-95"
                title="下个月"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleTodayMonth}
              className="px-3.5 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 text-xs font-bold border border-blue-500/20 transition-all cursor-pointer backdrop-blur-xs active:scale-95"
            >
              回到今日
            </button>

            {/* Semester context tag */}
            <span className="text-xs font-bold text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 hidden sm:inline-block">
              {settings.semester_name || '秋季学期'}
            </span>

            {/* LocalStorage persistence indicator */}
            {overridesCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-700 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>已持久化 {overridesCount} 项拖拽调期</span>
                <button
                  onClick={handleResetAllOverrides}
                  className="ml-1 text-[11px] underline hover:text-purple-900 cursor-pointer"
                  title="清空所有拖拽调整，还原系统默认排期"
                >
                  恢复默认
                </button>
              </div>
            )}
          </div>

          {/* Sub-view switcher: Calendar View vs List View */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex glass-pill p-1 rounded-2xl text-xs font-bold shadow-2xs">
              <button
                onClick={() => setSubViewMode('calendar')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                  subViewMode === 'calendar'
                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-black border border-white/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>拖拽月历网格</span>
              </button>

              <button
                onClick={() => setSubViewMode('list')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                  subViewMode === 'list'
                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-black border border-white/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>日程清单</span>
              </button>
            </div>
          </div>

        </div>

        {/* Drag & Drop Instruction and Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/60 text-xs">
          <div className="flex flex-wrap items-center gap-4 font-semibold text-slate-600">
            <span className="text-slate-400 font-bold text-[11px]">图例分类：</span>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>全量课程排期</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              <Flame className="h-3 w-3 text-rose-600 fill-rose-600" />
              <span>高优先待办 (🔥 可拖拽调整)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>考试/普通待办</span>
            </span>
            {overridesCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-bold">
                <Check className="h-3 w-3" />
                <span>已同步 LocalStorage</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-100 px-3 py-1 rounded-xl">
            <Move className="h-3 w-3" />
            <span>支持按住卡片直接拖动到目标日期格子重新排期，状态实时持久化</span>
          </div>
        </div>
      </div>

      {/* 1.5. SEMESTER WORKLOAD VISUALIZER & MILESTONE RADAR */}
      <div className="space-y-4">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Month Workload Status */}
          <div className="glass-panel rounded-3xl p-4.5 sm:p-5 border border-white/80 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>月度学业负荷强度</span>
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                workloadStats.workloadRating === 'critical'
                  ? 'bg-rose-500 text-white animate-pulse'
                  : workloadStats.workloadRating === 'heavy'
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : workloadStats.workloadRating === 'moderate'
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}>
                {workloadStats.workloadRating === 'critical'
                  ? '🔴 集中统考攻坚'
                  : workloadStats.workloadRating === 'heavy'
                  ? '🔥 高负荷冲刺期'
                  : workloadStats.workloadRating === 'moderate'
                  ? '⚡ 常规教学攻坚'
                  : '🌿 平稳从容常态'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono flex items-baseline gap-1.5">
                <span>{workloadStats.monthHeavyDaysCount}</span>
                <span className="text-xs font-bold text-slate-500 font-sans">个高负荷日</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                本月共排布 {workloadStats.totalPeriods} 节线下课程 · 含 {workloadStats.monthDeadlinesCount} 项作业与大作业
              </p>
            </div>
          </div>

          {/* Card 2: Course Deadlines Highlight */}
          <div className="glass-panel rounded-3xl p-4.5 sm:p-5 border border-amber-200/60 bg-linear-to-br from-white/90 via-amber-50/20 to-orange-50/10 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>课程大作业与实践截止</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 border border-amber-500/30">
                本月攻坚
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono flex items-baseline gap-1.5">
                <span>{workloadStats.monthDeadlinesCount}</span>
                <span className="text-xs font-bold text-slate-500 font-sans">项待交付</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>已结案：{workloadStats.monthCompletedCount} 项</span>
                <span className="text-rose-600 font-bold">高优：{workloadStats.monthHighPriorityCount} 项</span>
              </div>
            </div>
          </div>

          {/* Card 3: Exam Dates Highlight */}
          <div className="glass-panel rounded-3xl p-4.5 sm:p-5 border border-rose-200/70 bg-linear-to-br from-white/90 via-rose-50/30 to-red-50/20 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-rose-600" />
                <span>期中/期末统考排期</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-2xs">
                学期考核
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-black text-rose-600 tracking-tight font-mono flex items-baseline gap-1.5">
                <span>{workloadStats.monthExamsCount}</span>
                <span className="text-xs font-bold text-slate-500 font-sans">门当月考试</span>
                <span className="text-xs text-slate-400 font-normal ml-auto font-sans">全学期共 {workloadStats.allSemesterExamsCount} 门</span>
              </div>
              <p className="text-[11px] text-rose-800 font-bold truncate">
                {workloadStats.monthExamsCount > 0 
                  ? `本月考场：${calendarCells.filter(c => c.isCurrentMonth && c.exams.length > 0).map(c => c.exams.map(e => e.course_name).join('、')).join('、')}` 
                  : '当月暂无考试，请稳步推进各科平时作业与自习备战'}
              </p>
            </div>
          </div>

          {/* Card 4: Upcoming Exam Radar */}
          <div className="glass-panel rounded-3xl p-4.5 sm:p-5 border border-indigo-200/60 bg-linear-to-br from-white/90 via-indigo-50/20 to-purple-50/10 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                <Timer className="h-4 w-4 text-indigo-600" />
                <span>最近大考倒计时</span>
              </span>
              {workloadStats.daysUntilNextExam !== null && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                  {workloadStats.daysUntilNextExam === 0 ? '今日考试！' : `倒计时 ${workloadStats.daysUntilNextExam} 天`}
                </span>
              )}
            </div>

            {workloadStats.nextExam ? (
              <div className="space-y-1">
                <div className="text-sm font-black text-slate-900 truncate" title={workloadStats.nextExam.course.course_name}>
                  {workloadStats.nextExam.course.course_name}
                </div>
                <div className="text-[11px] text-indigo-700 font-mono font-bold flex items-center gap-1">
                  <span>📅 {workloadStats.nextExam.dateStr}</span>
                  <span className="truncate">· {workloadStats.nextExam.course.exam_location || '教务指定考场'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-700">暂无待考科目</div>
                <div className="text-[11px] text-slate-400">学期阶段考查全部完成</div>
              </div>
            )}
          </div>

        </div>

        {/* Milestone Quick Jump & Workload Filter Bar */}
        <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border border-white/80">
          {/* Milestone timeline jumps */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-black text-[11px] flex items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>学期关键节点：</span>
            </span>
            <button
              onClick={() => handleJumpToMonth(2026, 8)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                year === 2026 && month === 8
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-slate-600 border border-slate-200/60'
              }`}
            >
              9月 · 学期启程
            </button>
            <button
              onClick={() => handleJumpToMonth(2026, 9)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                year === 2026 && month === 9
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-slate-600 border border-slate-200/60'
              }`}
            >
              10月 · 课程攻坚 (当前)
            </button>
            <button
              onClick={() => handleJumpToMonth(2026, 11)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                year === 2026 && month === 11
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-rose-700 border border-rose-200/60'
              }`}
            >
              12月 · 首轮考查 (2场)
            </button>
            <button
              onClick={() => handleJumpToMonth(2027, 0)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                year === 2027 && month === 0
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-rose-700 border border-rose-200/60'
              }`}
            >
              1月 · 期末统考周 (6场)
            </button>
          </div>

          {/* Interactive Workload Filter Pills */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400 font-bold text-[11px] mr-1 hidden sm:inline">高亮筛选：</span>
            <button
              onClick={() => setWorkloadFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                workloadFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white/60 hover:bg-white text-slate-600 border border-slate-200/60'
              }`}
            >
              全部日程
            </button>
            <button
              onClick={() => setWorkloadFilter('deadlines')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                workloadFilter === 'deadlines'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white/60 hover:bg-white text-amber-700 border border-amber-200/60'
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>课程作业截止 ({workloadStats.monthDeadlinesCount})</span>
            </button>
            <button
              onClick={() => setWorkloadFilter('exams')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                workloadFilter === 'exams'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/60 hover:bg-white text-rose-700 border border-rose-200/60'
              }`}
            >
              <GraduationCap className="h-3 w-3" />
              <span>考试日程 ({workloadStats.monthExamsCount})</span>
            </button>
            <button
              onClick={() => setWorkloadFilter('heavy')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                workloadFilter === 'heavy'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white/60 hover:bg-white text-purple-700 border border-purple-200/60'
              }`}
            >
              <Flame className="h-3 w-3" />
              <span>高负荷攻坚日 ({workloadStats.monthHeavyDaysCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CALENDAR GRID VIEW (With HTML5 Drag & Drop Interface) */}
      {subViewMode === 'calendar' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl shadow-md overflow-hidden border border-white/80">
            
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-white/70 bg-white/60 backdrop-blur-md text-xs font-black text-slate-700 text-center py-3">
              {weekdayNames.map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`tracking-wider ${idx >= 5 ? 'text-blue-600/80' : ''}`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar 7xN Grid with Drag & Drop DropZones */}
            <div className="grid grid-cols-7 divide-x divide-y divide-white/60 bg-white/30 backdrop-blur-xs select-none">
              {calendarCells.map(cell => {
                const isSelected = cell.dateStr === selectedDayStr;
                const isDragTarget = dragOverDate === cell.dateStr;
                const totalEvents = cell.courses.length + cell.deadlines.length + cell.exams.length;
                const hasHighPriority = cell.highPriorityDeadlines.length > 0;
                const workloadInfo = getCellWorkloadInfo(cell);

                const isFilterMatch = workloadFilter === 'all'
                  ? true
                  : workloadFilter === 'deadlines'
                  ? cell.deadlines.length > 0
                  : workloadFilter === 'exams'
                  ? cell.exams.length > 0
                  : (cell.exams.length > 0 || (cell.courses.length + cell.deadlines.length * 2 >= 6));

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDayStr(cell.dateStr)}
                    onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                    onDragLeave={(e) => handleDragLeave(e, cell.dateStr)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnDate(cell.dateStr);
                    }}
                    className={`min-h-[110px] sm:min-h-[135px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between group relative ${
                      !cell.isCurrentMonth
                        ? 'opacity-40 bg-slate-50/40'
                        : isDragTarget
                        ? 'bg-indigo-500/20 ring-3 ring-indigo-500 shadow-xl scale-[1.01] z-10'
                        : isSelected
                        ? 'bg-blue-500/10 ring-2 ring-blue-500/50 shadow-inner'
                        : !isFilterMatch
                        ? 'opacity-25 grayscale-[30%] bg-slate-50/50'
                        : cell.exams.length > 0
                        ? 'bg-linear-to-b from-rose-50/70 to-white/90 ring-1 ring-rose-400/40 hover:bg-rose-50/90'
                        : cell.deadlines.length > 0
                        ? 'bg-linear-to-b from-amber-50/40 to-white/90 hover:bg-white'
                        : 'hover:bg-white/80 bg-white/40'
                    }`}
                  >
                    {/* Active Drag Over Indicator Overlay */}
                    {isDragTarget && (
                      <div className="absolute inset-0 bg-indigo-600/15 border-2 border-dashed border-indigo-600 rounded-xl flex items-center justify-center pointer-events-none z-20">
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-md animate-bounce">
                          松开移动至此
                        </span>
                      </div>
                    )}

                    {/* Top Row: Date Number & Semester Week / Today Tag / Workload Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className={`inline-flex items-center justify-center text-xs font-black h-6 w-6 rounded-lg ${
                            cell.isToday
                              ? 'bg-blue-600 text-white shadow-xs'
                              : isSelected
                              ? 'bg-blue-100 text-blue-900 font-black'
                              : cell.exams.length > 0
                              ? 'bg-rose-100 text-rose-800 font-black'
                              : 'text-slate-800'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cell.isToday && (
                          <span className="text-[9px] font-black text-blue-600 hidden sm:inline">
                            今日
                          </span>
                        )}

                        {/* Exam Day Pulsing Badge */}
                        {cell.exams.length > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-rose-600 text-white shadow-2xs flex items-center gap-0.5 animate-pulse" title={`含 ${cell.exams.length} 门考试排期`}>
                            <GraduationCap className="h-2.5 w-2.5" />
                            <span>考</span>
                          </span>
                        )}

                        {/* Course Deadlines Badge */}
                        {cell.exams.length === 0 && cell.deadlines.length > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200/80 flex items-center gap-0.5" title={`含 ${cell.deadlines.length} 项课程作业与截止`}>
                            <Clock className="h-2.5 w-2.5 text-amber-600" />
                            <span>{cell.deadlines.length}截止</span>
                          </span>
                        )}

                        {hasHighPriority && cell.exams.length === 0 && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" title="包含高优待办" />
                        )}
                      </div>

                      {/* Semester week badge on Mondays */}
                      {cell.date.getDay() === 1 && cell.semesterWeek && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100/80 px-1 py-0.2 rounded hidden sm:inline">
                          第{cell.semesterWeek}周
                        </span>
                      )}
                    </div>

                    {/* Middle: Event Chips (Draggable) */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {/* 1. Exams first if any (Highlighted for clear workload visibility) */}
                      {cell.exams.map(exam => {
                        const isOverridden = !!eventOverrides[`course_${exam.id}`];
                        return (
                          <div
                            key={`exam-${exam.id}`}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                id: exam.id,
                                type: 'course',
                                title: `[考试] ${exam.course_name}`,
                                currentDate: cell.dateStr,
                              })
                            }
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCourse(exam);
                            }}
                            className="px-2 py-1 rounded-lg bg-linear-to-r from-rose-600 via-rose-500 to-red-600 text-white text-[10px] font-black truncate flex items-center justify-between gap-1 shadow-xs hover:brightness-110 cursor-grab active:cursor-grabbing group/item border border-white/30 ring-1 ring-rose-400"
                            title={`🔥 期末/期中考试：${exam.course_name} · ${exam.exam_time || ''} · ${exam.exam_location || ''} (点击查看考场)`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <GripVertical className="h-2.5 w-2.5 text-rose-200 shrink-0 opacity-60 group-hover/item:opacity-100" />
                              <GraduationCap className="h-3 w-3 text-amber-300 shrink-0" />
                              <span className="truncate">考: {exam.course_name}</span>
                            </div>
                            {isOverridden && (
                              <span className="text-[8px] bg-purple-700 text-white px-1 rounded font-normal shrink-0">调</span>
                            )}
                          </div>
                        );
                      })}

                      {/* 2. High-Priority Tasks (Highlighted with Flame badge) */}
                      {cell.highPriorityDeadlines.map(task => {
                        const isOverridden = !!eventOverrides[task.id];
                        return (
                          <div
                            key={`task-high-${task.id}`}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                id: task.id,
                                type: 'task',
                                title: task.title,
                                priority: task.priority,
                                currentDate: cell.dateStr,
                              })
                            }
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTask) onSelectTask(task);
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black truncate flex items-center gap-1 border hover:brightness-95 cursor-grab active:cursor-grabbing transition-transform active:scale-95 group/item ${
                              task.is_completed
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                : 'bg-linear-to-r from-rose-100 to-amber-100 text-rose-900 border-rose-300 ring-1 ring-rose-400/40 shadow-xs'
                            }`}
                            title={`🔥 高优待办 (可拖拽重新排期)：${task.title}`}
                          >
                            <GripVertical className="h-2.5 w-2.5 text-rose-500 shrink-0 opacity-60 group-hover/item:opacity-100" />
                            <Flame className="h-2.5 w-2.5 shrink-0 text-rose-600 fill-rose-600" />
                            <span className="truncate">{task.title}</span>
                            {isOverridden && (
                              <span className="text-[8px] bg-purple-600 text-white px-1 rounded font-normal shrink-0">调</span>
                            )}
                          </div>
                        );
                      })}

                      {/* 3. Normal Priority Deadlines */}
                      {cell.deadlines
                        .filter(t => t.priority !== 'high')
                        .slice(0, cell.highPriorityDeadlines.length > 0 ? 1 : 2)
                        .map(task => {
                          const isOverridden = !!eventOverrides[task.id];
                          return (
                            <div
                              key={`task-norm-${task.id}`}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, {
                                  id: task.id,
                                  type: 'task',
                                  title: task.title,
                                  priority: task.priority,
                                  currentDate: cell.dateStr,
                                })
                              }
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectTask) onSelectTask(task);
                              }}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate flex items-center gap-1 border bg-amber-50 text-amber-700 border-amber-200 hover:brightness-95 cursor-grab active:cursor-grabbing group/item"
                              title={`待办：${task.title} (可拖拽修改截止时间)`}
                            >
                              <GripVertical className="h-2 w-2 text-amber-500 shrink-0 opacity-40 group-hover/item:opacity-100" />
                              <Timer className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                              <span className="truncate">{task.title}</span>
                              {isOverridden && (
                                <span className="text-[8px] bg-purple-600 text-white px-1 rounded font-normal shrink-0">调</span>
                              )}
                            </div>
                          );
                        })}

                      {/* 4. Courses */}
                      {cell.courses
                        .slice(0, (cell.deadlines.length > 0 || cell.exams.length > 0) ? 1 : 2)
                        .map(course => {
                          const colorConfig = COURSE_COLOR_MAP[course.color] || COURSE_COLOR_MAP.blue;
                          return (
                            <div
                              key={`course-${course.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCourse(course);
                              }}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate flex items-center gap-1 border hover:brightness-95 ${colorConfig.badge}`}
                              title={`${course.course_name} (第${course.start_period}-${course.start_period + course.period_count - 1}节 · ${course.classroom})`}
                            >
                              <span className="truncate">{course.course_name}</span>
                            </div>
                          );
                        })}

                      {/* More Count Indicator */}
                      {totalEvents > 3 && (
                        <div className="text-[9px] font-bold text-slate-400 text-center">
                          +{totalEvents - 3} 项更多
                        </div>
                      )}
                    </div>

                    {/* Bottom: Daily Workload Level & Event Count Indicator */}
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/70 text-[9px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${workloadInfo.dotColor}`} />
                        <span className="hidden sm:inline text-[9px] font-semibold text-slate-500">
                          {workloadInfo.label}
                        </span>
                      </div>
                      {totalEvents > 0 && (
                        <span className="font-mono text-[9px] font-bold text-slate-400">
                          {totalEvents}项
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* DAY INSPECTION PANEL (Shows when a day is clicked) */}
          {selectedDayCell && (
            <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-blue-200/60 bg-linear-to-br from-white/90 via-blue-50/30 to-indigo-50/20 space-y-5 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-blue-500/25">
                    {selectedDayCell.dayNumber}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <span>{selectedDayCell.dateStr}</span>
                      <span className="text-sm font-bold text-slate-500">
                        {getFullDayName(selectedDayCell.date.getDay() === 0 ? 7 : selectedDayCell.date.getDay())}
                      </span>
                      {selectedDayCell.isToday && (
                        <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          今天
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedDayCell.semesterWeek ? `本学期第 ${selectedDayCell.semesterWeek} 周` : '假期/非教学周'} · 
                      包含 {selectedDayCell.courses.length} 门课程 · {selectedDayCell.deadlines.length} 项待办 ({selectedDayCell.highPriorityDeadlines.length} 项高优) · {selectedDayCell.exams.length} 门考试
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Info className="h-3.5 w-3.5 text-blue-600" />
                  <span>支持拖拽卡片至任意月份网格，或点击卡片右侧快捷调期</span>
                </div>
              </div>

              {/* Day Contents: Grid of Courses & Deadlines */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Left: Scheduled Courses on this date */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span>课程安排 ({selectedDayCell.courses.length})</span>
                    </span>
                  </div>

                  {selectedDayCell.courses.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/60 border border-white/80 text-center text-xs text-slate-400">
                      本日无日常课程排期 🌴
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedDayCell.courses.map(course => {
                        const colorConfig = COURSE_COLOR_MAP[course.color] || COURSE_COLOR_MAP.blue;
                        return (
                          <div
                            key={course.id}
                            onClick={() => onSelectCourse(course)}
                            className="p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-white/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 text-xs ${colorConfig.badge}`}>
                                <span>{course.start_period}-{course.start_period + course.period_count - 1}</span>
                                <span className="text-[9px] opacity-75">节</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {course.course_name}
                                </h4>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-0.5">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    {course.start_time}-{course.end_time}
                                  </span>
                                  <span className="flex items-center gap-1 truncate text-slate-700">
                                    <MapPin className="h-3 w-3 text-rose-500" />
                                    {course.classroom}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 shrink-0">
                              详情
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Deadlines & Exams on this date */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Timer className="h-4 w-4 text-rose-600" />
                      <span>待办与考试 ({selectedDayCell.deadlines.length + selectedDayCell.exams.length})</span>
                    </span>
                  </div>

                  {selectedDayCell.deadlines.length === 0 && selectedDayCell.exams.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/60 border border-white/80 text-center text-xs text-slate-400">
                      本日暂无截止待办或考试安排 ✨
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Exams */}
                      {selectedDayCell.exams.map(exam => {
                        const isOverridden = !!eventOverrides[`course_${exam.id}`];
                        return (
                          <div
                            key={`ins-exam-${exam.id}`}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                id: exam.id,
                                type: 'course',
                                title: `[考试] ${exam.course_name}`,
                                currentDate: selectedDayCell.dateStr,
                              })
                            }
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelectCourse(exam)}
                            className="p-3.5 rounded-2xl bg-rose-50/80 hover:bg-rose-50 border border-rose-200/80 shadow-2xs transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <GripVertical className="h-4 w-4 text-rose-400 shrink-0 opacity-60 group-hover:opacity-100" />
                              <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                                考
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white">
                                    期末考试
                                  </span>
                                  {isOverridden && (
                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-600 text-white">
                                      已手动调期
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-rose-700 transition-colors truncate mt-0.5">
                                  {exam.course_name}
                                </h4>
                                <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-0.5 font-medium">
                                  <span>{exam.exam_time}</span>
                                  <span className="text-rose-700 font-bold">{exam.exam_location}</span>
                                </div>
                              </div>
                            </div>

                            {isOverridden && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevertSingleOverride(`course_${exam.id}`);
                                }}
                                className="p-1.5 rounded-xl hover:bg-rose-200/60 text-rose-700 transition-all cursor-pointer"
                                title="还原到原始考试日期"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Deadlines (High Priority & Normal) */}
                      {selectedDayCell.deadlines.map(task => {
                        const autoTag = detectTaskAutoTag(task.title, task.category);
                        const TagIcon = getTaskTagIcon(task.auto_tag_icon || autoTag.iconName);
                        const isOverridden = !!eventOverrides[task.id];
                        const isHigh = task.priority === 'high';

                        return (
                          <div
                            key={`ins-task-${task.id}`}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                id: task.id,
                                type: 'task',
                                title: task.title,
                                priority: task.priority,
                                currentDate: selectedDayCell.dateStr,
                              })
                            }
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelectTask && onSelectTask(task)}
                            className={`p-3.5 rounded-2xl border shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 group ${
                              isHigh
                                ? 'bg-linear-to-r from-rose-50/90 to-amber-50/80 border-rose-200/90 ring-1 ring-rose-400/30'
                                : 'bg-white/80 hover:bg-white border-white/90'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <GripVertical className="h-4 w-4 text-slate-400 shrink-0 opacity-60 group-hover:opacity-100 mt-1" />

                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs shrink-0 ${autoTag.badgeClass}`}>
                                    <TagIcon className="h-3 w-3" />
                                    <span>{task.auto_tag_label || autoTag.label}</span>
                                  </span>

                                  {isHigh && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white flex items-center gap-0.5">
                                      <Flame className="h-2.5 w-2.5 fill-white" />
                                      <span>高优先级</span>
                                    </span>
                                  )}

                                  {isOverridden && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-600 text-white">
                                      已拖拽调期
                                    </span>
                                  )}

                                  {task.is_recurring && task.recurrence_pattern && task.recurrence_pattern !== 'none' && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 border border-teal-500/25 flex items-center gap-1 shrink-0" title={`周期循环：${task.recurrence_pattern === 'daily' ? '每天' : task.recurrence_pattern === 'weekly' ? '每周' : '每月'}`}>
                                      <Repeat className="h-2.5 w-2.5 text-teal-600" />
                                      <span>{task.recurrence_pattern === 'daily' ? '每天' : task.recurrence_pattern === 'weekly' ? '每周' : '每月'}</span>
                                      {task.recurrence_streak !== undefined && task.recurrence_streak > 0 && (
                                        <span className="text-[9px] bg-teal-600 text-white px-1 rounded-sm">
                                          连击 {task.recurrence_streak}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>

                                <h4 className={`font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate ${task.is_completed ? 'line-through text-slate-400' : ''}`}>
                                  {task.title}
                                </h4>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                                  <Clock className="h-3 w-3 text-rose-500 shrink-0" />
                                  <span className="font-bold text-rose-600">
                                    截止：{task.deadline.includes(' ') ? task.deadline.split(' ')[1] : '今日 22:00'}
                                  </span>
                                  {task.course_name && (
                                    <span className="text-indigo-600 font-bold truncate max-w-36 bg-indigo-50 px-1.5 py-0.2 rounded">
                                      {task.course_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Quick Move Trigger Modal */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRescheduleModalItem({
                                    id: task.id,
                                    type: 'task',
                                    title: task.title,
                                    currentDate: selectedDayCell.dateStr,
                                  });
                                  setTargetRescheduleDate(selectedDayCell.dateStr);
                                }}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                                title="手动调整排期日期"
                              >
                                <Move className="h-3.5 w-3.5" />
                              </button>

                              {isOverridden && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevertSingleOverride(task.id);
                                  }}
                                  className="p-1.5 rounded-xl hover:bg-rose-200/60 text-rose-700 transition-all cursor-pointer"
                                  title="还原到初始截止日期"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. AGENDA LIST VIEW */}
      {subViewMode === 'list' && (
        <div className="space-y-5">
          {/* List Sub-filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
            <span className="text-slate-400 text-[11px] mr-1 shrink-0">筛选清单：</span>
            <button
              onClick={() => setListFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                listFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white/60 hover:bg-white text-slate-600 border border-white/80'
              }`}
            >
              全部日程 ({monthAgendaList.length} 天有活动)
            </button>
            <button
              onClick={() => setListFilter('high_priority')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                listFilter === 'high_priority'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white/60 hover:bg-white text-rose-700 border border-white/80'
              }`}
            >
              <Flame className="h-3 w-3 fill-white" />
              <span>🔥 仅看高优待办与考试</span>
            </button>
            <button
              onClick={() => setListFilter('deadlines')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                listFilter === 'deadlines'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white/60 hover:bg-white text-rose-700 border border-white/80'
              }`}
            >
              <Timer className="h-3 w-3" />
              <span>所有待办截止日</span>
            </button>
            <button
              onClick={() => setListFilter('courses')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                listFilter === 'courses'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white/60 hover:bg-white text-blue-700 border border-white/80'
              }`}
            >
              <BookOpen className="h-3 w-3" />
              <span>仅看上课日程</span>
            </button>
            <button
              onClick={() => setListFilter('exams')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                listFilter === 'exams'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white/60 hover:bg-white text-amber-700 border border-white/80'
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              <span>仅看考试安排</span>
            </button>
          </div>

          {/* Agenda Grouped by Date */}
          {monthAgendaList.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 text-xs font-medium space-y-2">
              <CalendarCheck className="h-10 w-10 mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-700">当前筛选条件下本月无日程项</div>
              <p>请尝试切换上方筛选标签或翻至其他月份查阅。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthAgendaList.map(cell => (
                <div
                  key={`agenda-day-${cell.dateStr}`}
                  className="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-white/90 space-y-4 hover:shadow-md transition-all"
                >
                  {/* Day Date Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-2xl flex flex-col items-center justify-center font-black text-sm shadow-2xs ${
                        cell.isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                      }`}>
                        <span>{cell.dayNumber}</span>
                        <span className="text-[9px] font-bold opacity-80 leading-none">
                          {month + 1}月
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-base text-slate-900">
                            {cell.dateStr}
                          </h4>
                          <span className="text-xs font-bold text-slate-500">
                            {getFullDayName(cell.date.getDay() === 0 ? 7 : cell.date.getDay())}
                          </span>
                          {cell.isToday && (
                            <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              今日
                            </span>
                          )}
                        </div>
                        {cell.semesterWeek && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            学期第 {cell.semesterWeek} 周
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {cell.highPriorityDeadlines.length > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                          <Flame className="h-3 w-3 fill-white" />
                          <span>{cell.highPriorityDeadlines.length} 项高优</span>
                        </span>
                      )}
                      {cell.deadlines.length > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 border border-rose-500/20">
                          {cell.deadlines.length} 项待办
                        </span>
                      )}
                      {cell.courses.length > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 border border-blue-500/20">
                          {cell.courses.length} 门课
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Events Container */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* 1. Exams */}
                    {cell.exams.map(exam => (
                      <div
                        key={`agenda-exam-${exam.id}`}
                        onClick={() => onSelectCourse(exam)}
                        className="p-3 rounded-2xl bg-rose-50/70 hover:bg-rose-50 border border-rose-200/80 cursor-pointer shadow-2xs space-y-1 transition-all"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-rose-700">
                          <span>🔥 期末考试</span>
                          <span>{exam.exam_time}</span>
                        </div>
                        <div className="font-black text-xs text-slate-900 truncate">
                          {exam.course_name}
                        </div>
                        <div className="text-[11px] text-rose-600 font-medium truncate">
                          考场: {exam.exam_location}
                        </div>
                      </div>
                    ))}

                    {/* 2. Deadlines */}
                    {cell.deadlines.map(task => {
                      const autoTag = detectTaskAutoTag(task.title, task.category);
                      const TagIcon = getTaskTagIcon(task.auto_tag_icon || autoTag.iconName);
                      const isHigh = task.priority === 'high';
                      return (
                        <div
                          key={`agenda-task-${task.id}`}
                          onClick={() => onSelectTask && onSelectTask(task)}
                          className={`p-3 rounded-2xl border cursor-pointer shadow-2xs space-y-1.5 transition-all group ${
                            isHigh
                              ? 'bg-rose-50/90 hover:bg-rose-50 border-rose-300 ring-1 ring-rose-400/20'
                              : 'bg-white/80 hover:bg-white border-white/90'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.2 rounded-md border shadow-2xs ${autoTag.badgeClass}`}>
                              <TagIcon className="h-3 w-3" />
                              <span>{task.auto_tag_label || autoTag.label}</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-rose-600">
                              {task.deadline.includes(' ') ? task.deadline.split(' ')[1] : ''} 截止
                            </span>
                          </div>
                          <div className={`font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate ${task.is_completed ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                          </div>
                          {task.custom_category_name && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                              🏷️ {task.custom_category_name}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* 3. Courses */}
                    {cell.courses.map(course => {
                      const colorConfig = COURSE_COLOR_MAP[course.color] || COURSE_COLOR_MAP.blue;
                      return (
                        <div
                          key={`agenda-course-${course.id}`}
                          onClick={() => onSelectCourse(course)}
                          className="p-3 rounded-2xl bg-white/80 hover:bg-white border border-white/90 cursor-pointer shadow-2xs space-y-1.5 transition-all group"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`px-2 py-0.2 rounded-md font-black text-[10px] ${colorConfig.badge}`}>
                              第 {course.start_period}-{course.start_period + course.period_count - 1} 节
                            </span>
                            <span className="font-mono text-slate-500 font-medium">
                              {course.start_time}-{course.end_time}
                            </span>
                          </div>
                          <div className="font-black text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {course.course_name}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                            <span className="text-slate-700 font-medium truncate">{course.classroom}</span>
                            <span>·</span>
                            <span className="truncate">{course.teacher}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. QUICK RESCHEDULE MODAL (Mobile Fallback) */}
      {rescheduleModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Move className="h-4 w-4 text-indigo-600" />
                <span>调整排期日期</span>
              </h3>
              <button
                onClick={() => setRescheduleModalItem(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-xs font-black text-slate-800">{rescheduleModalItem.title}</div>
              <div className="text-[11px] text-slate-500">
                当前设定日期：<span className="font-mono font-bold text-slate-700">{rescheduleModalItem.currentDate}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">选择移动至的目标日期：</label>
              <input
                type="date"
                value={targetRescheduleDate}
                onChange={(e) => setTargetRescheduleDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleModalItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (targetRescheduleDate) {
                    executeEventMove(rescheduleModalItem, targetRescheduleDate);
                    setRescheduleModalItem(null);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              >
                确认移动排期
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MonthCalendarView;

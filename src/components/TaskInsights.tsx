import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  Calendar, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Flame,
  Award,
  Zap,
  Filter
} from 'lucide-react';
import { Task, AppSettings, TabType } from '../types';

interface TaskInsightsProps {
  tasks: Task[];
  settings: AppSettings;
  onNavigateTab?: (tab: TabType) => void;
  onSelectTask?: (task: Task) => void;
}

type TimeScope = 'semester_week' | 'current_week' | 'weekday_aggregate';
type ChartType = 'bar' | 'area';

interface DailyTaskData {
  dayKey: string;
  dayName: string;
  dateStr: string;
  fullLabel: string;
  completed: number;
  pending: number;
  total: number;
  completionRate: number;
  completedTasks: Task[];
  pendingTasks: Task[];
  isMostProductive: boolean;
  isToday: boolean;
}

export const TaskInsights: React.FC<TaskInsightsProps> = ({
  tasks,
  settings,
  onNavigateTab,
  onSelectTask,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [timeScope, setTimeScope] = useState<TimeScope>('semester_week');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);

  // Define days of week template
  const WEEKDAYS = [
    { key: '1', name: '周一', num: 1 },
    { key: '2', name: '周二', num: 2 },
    { key: '3', name: '周三', num: 3 },
    { key: '4', name: '周四', num: 4 },
    { key: '5', name: '周五', num: 5 },
    { key: '6', name: '周六', num: 6 },
    { key: '0', name: '周日', num: 7 },
  ];

  // Helper to get day-of-week index (1=Mon ... 7=Sun)
  const getTaskDayOfWeek = (deadlineStr?: string, createdStr?: string): number => {
    const targetStr = deadlineStr || createdStr;
    if (!targetStr) return 1;
    // Extract YYYY-MM-DD
    const datePart = targetStr.split(' ')[0];
    const parsed = new Date(datePart + 'T00:00:00');
    if (isNaN(parsed.getTime())) return 1;
    const day = parsed.getDay();
    return day === 0 ? 7 : day;
  };

  // Helper to match dates in Week 1 (2026-08-31 to 2026-09-06)
  const week1Dates = [
    { dayNum: 1, dateStr: '2026-08-31', label: '8/31 周一' },
    { dayNum: 2, dateStr: '2026-09-01', label: '9/01 周二' },
    { dayNum: 3, dateStr: '2026-09-02', label: '9/02 周三' },
    { dayNum: 4, dateStr: '2026-09-03', label: '9/03 周四' },
    { dayNum: 5, dateStr: '2026-09-04', label: '9/04 周五' },
    { dayNum: 6, dateStr: '2026-09-05', label: '9/05 周六' },
    { dayNum: 7, dateStr: '2026-09-06', label: '9/06 周日' },
  ];

  // Helper to get natural current week dates
  const getCurrentWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay - 1));

    return [1, 2, 3, 4, 5, 6, 7].map(dayNum => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + (dayNum - 1));
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const weekdayName = WEEKDAYS.find(w => w.num === dayNum)?.name || `周${dayNum}`;
      return {
        dayNum,
        dateStr: `${d.getFullYear()}-${month}-${date}`,
        label: `${month}/${date} ${weekdayName}`,
      };
    });
  };

  // Compute daily tasks data based on selected scope
  const chartData: DailyTaskData[] = useMemo(() => {
    const now = new Date();
    const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    if (timeScope === 'semester_week') {
      return week1Dates.map(item => {
        const completedList: Task[] = [];
        const pendingList: Task[] = [];

        tasks.forEach(t => {
          const tDate = (t.deadline || t.created_at || '').split(' ')[0];
          // Check if matches the specific date or day of week fallback
          const matchesDate = tDate === item.dateStr;
          const matchesDay = getTaskDayOfWeek(t.deadline, t.created_at) === item.dayNum;

          if (matchesDate || (!tDate.includes('2026-') && matchesDay)) {
            if (t.is_completed) {
              completedList.push(t);
            } else {
              pendingList.push(t);
            }
          }
        });

        const completed = completedList.length;
        const pending = pendingList.length;
        const total = completed + pending;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          dayKey: String(item.dayNum),
          dayName: item.label.split(' ')[1] || `周${item.dayNum}`,
          dateStr: item.dateStr,
          fullLabel: item.label,
          completed,
          pending,
          total,
          completionRate,
          completedTasks: completedList,
          pendingTasks: pendingList,
          isMostProductive: false,
          isToday: item.dayNum === todayDayOfWeek,
        };
      });
    }

    if (timeScope === 'current_week') {
      const curDates = getCurrentWeekDates();
      return curDates.map(item => {
        const completedList: Task[] = [];
        const pendingList: Task[] = [];

        tasks.forEach(t => {
          const tDate = (t.deadline || t.created_at || '').split(' ')[0];
          const matchesDate = tDate === item.dateStr;
          const matchesDay = getTaskDayOfWeek(t.deadline, t.created_at) === item.dayNum;

          if (matchesDate || matchesDay) {
            if (t.is_completed) {
              completedList.push(t);
            } else {
              pendingList.push(t);
            }
          }
        });

        const completed = completedList.length;
        const pending = pendingList.length;
        const total = completed + pending;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          dayKey: String(item.dayNum),
          dayName: item.label.split(' ')[1] || `周${item.dayNum}`,
          dateStr: item.dateStr,
          fullLabel: item.label,
          completed,
          pending,
          total,
          completionRate,
          completedTasks: completedList,
          pendingTasks: pendingList,
          isMostProductive: false,
          isToday: item.dayNum === todayDayOfWeek,
        };
      });
    }

    // Weekday aggregate (all tasks grouped by Mon-Sun)
    return WEEKDAYS.map(w => {
      const completedList: Task[] = [];
      const pendingList: Task[] = [];

      tasks.forEach(t => {
        const dayNum = getTaskDayOfWeek(t.deadline, t.created_at);
        if (dayNum === w.num) {
          if (t.is_completed) {
            completedList.push(t);
          } else {
            pendingList.push(t);
          }
        }
      });

      const completed = completedList.length;
      const pending = pendingList.length;
      const total = completed + pending;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        dayKey: w.key,
        dayName: w.name,
        dateStr: `周度${w.name}`,
        fullLabel: `${w.name}待办`,
        completed,
        pending,
        total,
        completionRate,
        completedTasks: completedList,
        pendingTasks: pendingList,
        isMostProductive: false,
        isToday: w.num === todayDayOfWeek,
      };
    });
  }, [tasks, timeScope]);

  // Identify the most productive day
  const processedData = useMemo(() => {
    let maxCompleted = -1;
    let mostProductiveIndex = -1;

    chartData.forEach((day, idx) => {
      if (day.completed > maxCompleted && day.completed > 0) {
        maxCompleted = day.completed;
        mostProductiveIndex = idx;
      } else if (day.completed === maxCompleted && day.completed > 0) {
        // Break tie using completion rate
        if (mostProductiveIndex >= 0 && day.completionRate > chartData[mostProductiveIndex].completionRate) {
          mostProductiveIndex = idx;
        }
      }
    });

    // If no completed tasks exist anywhere, pick the day with highest pending tasks as upcoming peak
    if (mostProductiveIndex === -1) {
      let maxTotal = -1;
      chartData.forEach((day, idx) => {
        if (day.total > maxTotal) {
          maxTotal = day.total;
          mostProductiveIndex = idx;
        }
      });
    }

    return chartData.map((d, idx) => ({
      ...d,
      isMostProductive: idx === mostProductiveIndex,
    }));
  }, [chartData]);

  // Overall weekly statistics
  const summary = useMemo(() => {
    const totalCompleted = tasks.filter(t => t.is_completed).length;
    const totalPending = tasks.filter(t => !t.is_completed).length;
    const totalTasks = tasks.length;
    const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    const mostProductiveDay = processedData.find(d => d.isMostProductive);
    const highPriorityPending = tasks.filter(t => !t.is_completed && t.priority === 'high').length;

    return {
      totalCompleted,
      totalPending,
      totalTasks,
      overallRate,
      mostProductiveDay,
      highPriorityPending,
    };
  }, [tasks, processedData]);

  // Selected Day Details for drill-down
  const activeDay = activeDayIndex !== null ? processedData[activeDayIndex] : null;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6 border border-white/80 shadow-md shadow-slate-900/5 relative overflow-hidden transition-all">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-indigo-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-linear-to-tr from-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-100/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                任务效能看板
              </h2>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 flex items-center gap-1 shadow-2xs">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                Task Insights
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              可视化学期周待办完成与积压走势 · 智能洞察最高效时段
            </p>
          </div>
        </div>

        {/* Controls: Chart Type, Time Scope & Collapse Toggle */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Time Scope Filter */}
          <div className="inline-flex rounded-xl bg-slate-100/90 p-1 border border-slate-200/60 shadow-2xs">
            <button
              onClick={() => setTimeScope('semester_week')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeScope === 'semester_week'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="按第1周各日期统计"
            >
              学期第 1 周
            </button>
            <button
              onClick={() => setTimeScope('weekday_aggregate')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeScope === 'weekday_aggregate'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="按周一至周日全量聚合"
            >
              周度分布
            </button>
            <button
              onClick={() => setTimeScope('current_week')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeScope === 'current_week'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="按自然日近7天统计"
            >
              当前自然周
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100/90 p-1 border border-slate-200/60 shadow-2xs">
            <button
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="柱状对比图"
            >
              柱状图
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="趋势面积图"
            >
              趋势图
            </button>
          </div>

          {/* Collapse/Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title={isExpanded ? '收起看板' : '展开看板'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 relative z-10">
        {/* Metric 1: Most Productive Day */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 backdrop-blur-xs relative overflow-hidden group shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-amber-600" />
              最富成效日
            </span>
            <span className="text-[10px] font-bold bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-800">
              Peak Day
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {summary.mostProductiveDay?.dayName || '周四'}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {summary.mostProductiveDay && summary.mostProductiveDay.completed > 0
                ? `已完 ${summary.mostProductiveDay.completed} 项`
                : `${summary.mostProductiveDay?.total || 0} 待办储备`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            {summary.mostProductiveDay && summary.mostProductiveDay.completed > 0
              ? `完工率达 ${summary.mostProductiveDay.completionRate}%，效能顶峰`
              : '建议优先集中精力攻关'}
          </p>
        </div>

        {/* Metric 2: Completion Rate */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 backdrop-blur-xs relative overflow-hidden group shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              任务完成率
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-800">
              {summary.totalCompleted}/{summary.totalTasks}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {summary.overallRate}%
            </span>
            <span className="text-xs font-bold text-slate-500">
              已清 {summary.totalCompleted} 项
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="w-full bg-emerald-950/10 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, summary.overallRate))}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Pending Tasks */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/25 backdrop-blur-xs relative overflow-hidden group shadow-2xs">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              未完成待办
            </span>
            <span className="text-[10px] font-bold bg-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-800">
              待执行
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {summary.totalPending}
            </span>
            <span className="text-xs font-bold text-rose-600">
              {summary.highPriorityPending} 项高优
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            {summary.highPriorityPending > 0 ? '建议今日优先消解高优任务' : '当前待办进度处于良性轨道'}
          </p>
        </div>

        {/* Metric 4: Total Weekly Velocity */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/25 backdrop-blur-xs relative overflow-hidden group shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              总任务负荷
            </span>
            <span className="text-[10px] font-bold bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-800">
              Total Load
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {summary.totalTasks}
            </span>
            <span className="text-xs font-bold text-blue-600">
              门类跨度广
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            包含课程实验、大作业与申报
          </p>
        </div>
      </div>

      {/* Main Chart Visualization Section (Collapsible) */}
      {isExpanded && (
        <div className="space-y-5 relative z-10">
          {/* Chart Canvas Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-emerald-500 inline-block shadow-2xs" />
                  已完成待办 (Completed)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-indigo-500 inline-block shadow-2xs" />
                  待完成待办 (Pending)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                💡 点击柱状图各日可快速钻取查看任务明细
              </div>
            </div>

            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={processedData}
                    margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
                    onClick={(e) => {
                      if (e && e.activeTooltipIndex !== undefined) {
                        const idx = typeof e.activeTooltipIndex === 'number' ? e.activeTooltipIndex : parseInt(String(e.activeTooltipIndex), 10);
                        if (!isNaN(idx)) setActiveDayIndex(idx);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dayName"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const item = processedData.find(d => d.dayName === payload.value);
                        const isPeak = item?.isMostProductive;
                        const isToday = item?.isToday;

                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={14}
                              textAnchor="middle"
                              fill={isPeak ? '#047857' : isToday ? '#2563eb' : '#64748b'}
                              fontWeight={isPeak || isToday ? 'bold' : 'normal'}
                              fontSize={12}
                            >
                              {payload.value}
                            </text>
                            {isPeak && (
                              <text x={0} y={28} textAnchor="middle" fill="#d97706" fontSize={10} fontWeight="black">
                                ★ 峰值
                              </text>
                            )}
                            {isToday && !isPeak && (
                              <text x={0} y={28} textAnchor="middle" fill="#3b82f6" fontSize={10} fontWeight="bold">
                                今天
                              </text>
                            )}
                          </g>
                        );
                      }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as DailyTaskData;
                          return (
                            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 text-xs space-y-2 min-w-56 z-50">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <span className="font-black text-slate-800 text-sm">{data.fullLabel}</span>
                                {data.isMostProductive && (
                                  <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                    🏆 最高产日
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> 已完成: {data.completed} 项
                                </span>
                                <span className="text-indigo-700 font-bold flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> 待处理: {data.pending} 项
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                日期总计: {data.total} 项任务 · 完成率: {data.completionRate}%
                              </div>
                              {data.completedTasks.length > 0 && (
                                <div className="pt-1 border-t border-slate-100">
                                  <div className="text-[10px] text-slate-400 font-bold mb-1">已完结精要:</div>
                                  <div className="space-y-1">
                                    {data.completedTasks.map(t => (
                                      <div key={t.id} className="text-[11px] text-emerald-800 truncate">
                                        ✓ {t.title}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {data.pendingTasks.length > 0 && (
                                <div className="pt-1 border-t border-slate-100">
                                  <div className="text-[10px] text-slate-400 font-bold mb-1">待办精要:</div>
                                  <div className="space-y-1">
                                    {data.pendingTasks.slice(0, 2).map(t => (
                                      <div key={t.id} className="text-[11px] text-slate-700 truncate">
                                        • {t.title}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="completed"
                      name="已完成"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    >
                      {processedData.map((entry, index) => (
                        <Cell
                          key={`cell-comp-${index}`}
                          fill={entry.isMostProductive ? '#059669' : '#10b981'}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="pending"
                      name="待完成"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    >
                      {processedData.map((entry, index) => (
                        <Cell
                          key={`cell-pend-${index}`}
                          fill={entry.isMostProductive ? '#4f46e5' : '#6366f1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart
                    data={processedData}
                    margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
                    onClick={(e) => {
                      if (e && e.activeTooltipIndex !== undefined) {
                        const idx = typeof e.activeTooltipIndex === 'number' ? e.activeTooltipIndex : parseInt(String(e.activeTooltipIndex), 10);
                        if (!isNaN(idx)) setActiveDayIndex(idx);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dayName"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as DailyTaskData;
                          return (
                            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 text-xs space-y-1.5 min-w-52 z-50">
                              <div className="font-black text-slate-800 text-sm border-b pb-1">
                                {data.fullLabel}
                              </div>
                              <div className="text-emerald-700 font-bold">已完成: {data.completed} 项</div>
                              <div className="text-indigo-700 font-bold">待完成: {data.pending} 项</div>
                              <div className="text-slate-500 text-[11px]">完成率: {data.completionRate}%</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="已完成"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      name="待完成"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorPending)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drilldown Inspector Card when a day is active / selected */}
          {activeDay && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-2xs space-y-3 transition-all animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">
                    【{activeDay.fullLabel}】任务排期详情
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700">
                    共 {activeDay.total} 项
                  </span>
                </div>
                <button
                  onClick={() => setActiveDayIndex(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                >
                  关闭明细
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Completed column */}
                <div className="space-y-1.5 bg-white/80 p-3 rounded-xl border border-emerald-100">
                  <div className="font-bold text-emerald-800 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      已完成 ({activeDay.completed})
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono">
                      {activeDay.completionRate}%
                    </span>
                  </div>
                  {activeDay.completedTasks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-1 font-medium">暂无已完成项</div>
                  ) : (
                    activeDay.completedTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask?.(t)}
                        className="p-2 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 text-slate-700 font-medium cursor-pointer transition-colors border border-emerald-100/60 truncate"
                        title={t.title}
                      >
                        ✓ {t.title}
                      </div>
                    ))
                  )}
                </div>

                {/* Pending column */}
                <div className="space-y-1.5 bg-white/80 p-3 rounded-xl border border-indigo-100">
                  <div className="font-bold text-indigo-800 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      待处理 ({activeDay.pending})
                    </span>
                    <span className="text-[10px] text-slate-400">点击可查看/编辑</span>
                  </div>
                  {activeDay.pendingTasks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-1 font-medium">该日全部已结清 🎉</div>
                  ) : (
                    activeDay.pendingTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask?.(t)}
                        className={`p-2 rounded-lg text-slate-700 font-medium cursor-pointer transition-colors border truncate ${
                          t.priority === 'high'
                            ? 'bg-rose-50/60 hover:bg-rose-50 border-rose-200/70 text-rose-900'
                            : 'bg-white hover:bg-indigo-50/40 border-slate-200/60'
                        }`}
                        title={t.title}
                      >
                        {t.priority === 'high' ? '🔥 ' : '• '}{t.title}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Productivity Pattern Discovery Snippet */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-indigo-50/80 via-white to-emerald-50/80 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <Award className="h-4 w-4" />
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                <strong>效能节律规律</strong>：数据显示，你在{' '}
                <span className="font-black text-indigo-700 underline decoration-indigo-300">
                  {summary.mostProductiveDay?.dayName || '周中'}
                </span>{' '}
                的学习产出达到峰值。建议将需要深度思考的算法大作业与前沿综述论文安排在高效日，利用精力充沛期快速攻坚！
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('ai')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                让 AI 规划高产日日程
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

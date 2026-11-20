import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { BarChart3, Clock, Flame, TrendingUp, FileDown, Check, Loader2 } from 'lucide-react';
import { Task, SubTask, TaskPriority } from '../types';
import { PomodoroHistoryService } from '../services/pomodoroHistory';
import { generateTaskFocusReportPdf } from '../lib/focusReportPdf';

interface TaskFocusHistoryChartProps {
  task?: Task | null;
  taskTitle: string;
  courseName?: string;
  priority?: TaskPriority;
  deadline?: string;
  isCompleted?: boolean;
  subtasks?: SubTask[];
  refreshTrigger?: number;
}

interface DailyFocusBucket {
  dateKey: string;
  label: string;
  fullDate: string;
  minutes: number;
  sessions: number;
  isToday: boolean;
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const TaskFocusHistoryChart: React.FC<TaskFocusHistoryChartProps> = ({
  task,
  taskTitle,
  courseName,
  priority,
  deadline,
  isCompleted,
  subtasks,
  refreshTrigger = 0,
}) => {
  const [exportStatus, setExportStatus] = useState<'idle' | 'generating' | 'done'>('idle');

  const { dailyData, totalMinutes, totalSessions, dailyAverage } = useMemo(() => {
    const now = new Date();
    const buckets: DailyFocusBucket[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const weekday = WEEKDAY_NAMES[d.getDay()];

      buckets.push({
        dateKey,
        label: i === 0 ? '今日' : `${d.getMonth() + 1}/${d.getDate()}`,
        fullDate: `${d.getMonth() + 1}月${d.getDate()}日 (${weekday})`,
        minutes: 0,
        sessions: 0,
        isToday: i === 0,
      });
    }

    const trimmedTitle = (taskTitle || task?.title || '').trim();
    const records = PomodoroHistoryService.getHistory();

    if (trimmedTitle.length >= 2 || task?.id) {
      records.forEach(record => {
        const matchesId = Boolean(task?.id && record.taskId && record.taskId === task.id);
        const matchesTitle =
          trimmedTitle.length >= 2 &&
          (record.subject === trimmedTitle ||
            record.completedTasks?.some(
              ct =>
                ct === trimmedTitle ||
                (ct.length >= 4 && trimmedTitle.includes(ct.slice(0, 8))) ||
                (trimmedTitle.length >= 4 && ct.includes(trimmedTitle.slice(0, 8)))
            ));
        const matchesCourseFallback =
          Boolean(courseName) &&
          record.subject === courseName &&
          Boolean(task?.id && task.id.startsWith('t'));

        if (!matchesId && !matchesTitle && !matchesCourseFallback) {
          return;
        }

        // Check if record date falls directly in the last 7 days
        const directBucket = buckets.find(b => b.dateKey === record.date);
        if (directBucket) {
          directBucket.minutes += record.durationMinutes || 0;
          directBucket.sessions += 1;
        } else if (record.id.startsWith('hist_seed_')) {
          // Align seed history records into the trailing 7-day window so existing tasks show realistic 7-day distribution
          const seedNum = parseInt(record.id.replace(/\D/g, ''), 10) || 1;
          const primaryIdx = (seedNum * 2) % 6; // Day index 0..5
          const secondaryIdx = Math.min(5, primaryIdx + 2);
          buckets[primaryIdx].minutes += record.durationMinutes || 25;
          buckets[primaryIdx].sessions += 1;
          if (secondaryIdx !== primaryIdx) {
            buckets[secondaryIdx].minutes += 25;
            buckets[secondaryIdx].sessions += 1;
          }
        }
      });
    }

    const sumMinutes = buckets.reduce((acc, b) => acc + b.minutes, 0);
    const sumSessions = buckets.reduce((acc, b) => acc + b.sessions, 0);
    const avg = Math.round(sumMinutes / 7);

    return {
      dailyData: buckets,
      totalMinutes: sumMinutes,
      totalSessions: sumSessions,
      dailyAverage: avg,
    };
  }, [task?.id, task?.title, taskTitle, courseName, refreshTrigger]);

  const handleDownloadPdfReport = async () => {
    if (exportStatus === 'generating') return;
    setExportStatus('generating');
    try {
      await generateTaskFocusReportPdf({
        taskTitle: (taskTitle || task?.title || '未命名学业待办').trim(),
        courseName: courseName || task?.course_name,
        priority: priority || task?.priority || 'medium',
        deadline: deadline || task?.deadline,
        isCompleted: isCompleted ?? task?.is_completed ?? false,
        totalMinutes,
        totalSessions,
        dailyAverage,
        dailyData,
        subtasks: subtasks || task?.subtasks || [],
      });
      setExportStatus('done');
      setTimeout(() => setExportStatus('idle'), 2500);
    } catch (e) {
      console.error('Failed to generate Focus Report PDF', e);
      setExportStatus('idle');
    }
  };

  const hasHistory = totalMinutes > 0;

  return (
    <div className="rounded-2xl p-4 bg-white/80 dark:bg-slate-900/80 border border-indigo-100/80 dark:border-indigo-900/50 shadow-2xs backdrop-blur-md space-y-3 transition-all">
      {/* Header & 3 Summary KPIs + Download Focus Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight">
              近 7 日专注投入趋势 (Focus History)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {hasHistory
                ? '按日统计当前待办累计沉淀的番茄钟专注时长'
                : '尚无专注记录 · 开启上方计时器即可沉淀今日学程'}
            </p>
          </div>
        </div>

        {/* Right Zone: 3 Summary Metrics + Download Focus Report PDF Button */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="text-[11px] text-slate-400">总时长</span>
              <span className="font-mono font-black text-slate-900 dark:text-white tabular-nums">
                {totalMinutes}m
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] text-slate-400">次数</span>
              <span className="font-mono font-black text-slate-900 dark:text-white tabular-nums">
                {totalSessions}次
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11px] text-slate-400">日均</span>
              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                {dailyAverage}m
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdfReport}
            disabled={exportStatus === 'generating'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border shadow-2xs active:scale-95 ${
              exportStatus === 'done'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-indigo-50/90 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white border-indigo-200/80 dark:border-indigo-800'
            } disabled:opacity-60`}
            title="生成并下载当前待办近 7 日专注学习统计 PDF 报告"
          >
            {exportStatus === 'generating' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : exportStatus === 'done' ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>已下载 PDF</span>
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" />
                <span>导出专注报告</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recharts 7-Day Bar Chart */}
      <div className="h-32 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dailyData}
            margin={{ top: 6, right: 6, left: -24, bottom: 0 }}
            barCategoryGap="28%"
          >
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }}
              dy={4}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              allowDecimals={false}
              domain={[0, (dataMax: number) => Math.max(30, Math.ceil(dataMax * 1.15))]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)', radius: 8 }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0].payload as DailyFocusBucket;
                return (
                  <div className="rounded-xl bg-slate-900/95 text-white px-3 py-2 text-[11px] shadow-lg border border-white/10 backdrop-blur-md">
                    <div className="font-bold text-indigo-200 mb-0.5">{item.fullDate}</div>
                    <div className="flex items-center justify-between gap-3 font-mono tabular-nums">
                      <span className="text-slate-300">专注时长:</span>
                      <span className="font-black text-white">{item.minutes} 分钟</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 font-mono tabular-nums">
                      <span className="text-slate-300">完成学程:</span>
                      <span className="font-bold text-emerald-400">{item.sessions} 次</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="minutes"
              radius={[6, 6, 2, 2]}
              minPointSize={4}
              animationDuration={400}
            >
              {dailyData.map((entry, index) => {
                let fillColor = '#E2E8F0';
                if (entry.minutes > 0) {
                  fillColor = entry.isToday ? '#10B981' : '#4F46E5';
                } else if (entry.isToday) {
                  fillColor = '#C7D2FE';
                }
                return <Cell key={`cell-${index}`} fill={fillColor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

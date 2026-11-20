import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  X,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Award,
  BookOpen,
  Sparkles,
  Flame,
  ArrowRight,
  Trash2,
  BarChart3,
  ListTodo
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { PomodoroHistoryRecord, PomodoroHistoryService } from '../services/pomodoroHistory';

interface PomodoroHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopicAction?: (actionQuery: string) => void;
  onStartSessionWithSubject?: (subject: string) => void;
}

export const PomodoroHistoryModal: React.FC<PomodoroHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectTopicAction,
  onStartSessionWithSubject,
}) => {
  const [historyRecords, setHistoryRecords] = useState<PomodoroHistoryRecord[]>(() =>
    PomodoroHistoryService.getHistory()
  );
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  if (!isOpen) return null;

  const stats = PomodoroHistoryService.calculateStats(historyRecords);

  // Group daily totals for trend chart
  const dailyChartData = (() => {
    const map: Record<string, number> = {};
    historyRecords.forEach(r => {
      map[r.date] = (map[r.date] || 0) + (r.durationMinutes || 0);
    });

    const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([dateStr, mins]) => {
      const parts = dateStr.split('-');
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
      const hours = +(mins / 60).toFixed(1);
      return {
        dateStr,
        label,
        minutes: mins,
        hours,
      };
    });
  })();

  const handleClear = () => {
    if (window.confirm('确定要清空历史专注记录吗？')) {
      const empty = PomodoroHistoryService.clearHistory();
      setHistoryRecords(empty);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white/95 border border-white/90 shadow-2xl shadow-purple-950/20 backdrop-blur-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 sm:p-7 border-b border-slate-100/90 relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-purple-500/25 shrink-0">
                <History className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    专注学程档案与效能趋势
                  </h2>
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 border border-purple-200">
                    Study History
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  追溯历史番茄钟自习复盘、累计学时与多维学科效能走势
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {historyRecords.length > 0 && (
                <button
                  onClick={handleClear}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                  title="清空历史"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-7">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-linear-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20">
                <div className="text-[11px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  累计专注学时
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5">
                  {stats.totalHours} <span className="text-xs font-bold text-slate-500">小时</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">共 {stats.totalMinutes} 分钟深度专注</div>
              </div>

              <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20">
                <div className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-indigo-600" />
                  番茄钟总轮数
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5">
                  {stats.totalSessions} <span className="text-xs font-bold text-slate-500">轮</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">坚持学习打卡</div>
              </div>

              <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  平均专注时长
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5">
                  {stats.avgDuration} <span className="text-xs font-bold text-slate-500">分钟</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">单次心流平均值</div>
              </div>

              <div className="p-4 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  打卡天数跨度
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1.5">
                  {stats.uniqueDays} <span className="text-xs font-bold text-slate-500">天</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">良好习惯养成中</div>
              </div>
            </div>

            {/* Recharts Productivity Trends */}
            {dailyChartData.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      每日专注学时趋势走势 (Hours / Day)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">近阶段数据</span>
                </div>

                <div className="w-full h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-slate-200 text-xs">
                                <div className="font-bold text-slate-800">{data.dateStr}</div>
                                <div className="text-purple-600 font-bold mt-1">
                                  {data.hours} 小时 ({data.minutes} 分钟)
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="hours" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={32}>
                        {dailyChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill="#7c3aed" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Subject Distribution Matrix */}
            {stats.subjectBreakdown.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  学科与自习主题投入分布
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {stats.subjectBreakdown.map((subj, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold text-slate-800 truncate">{subj.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{subj.minutes} 分钟</div>
                      </div>
                      <span className="text-xs font-black text-indigo-600 font-mono shrink-0">
                        {subj.hours}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Session Summaries List */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-emerald-600" />
                历史学程小结复盘归档 ({historyRecords.length} 篇)
              </h4>

              {historyRecords.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  暂无专注记录，完成第一个番茄钟后将自动收录于此！
                </div>
              ) : (
                <div className="space-y-3">
                  {historyRecords.map(record => {
                    const isExpanded = expandedRecordId === record.id;

                    return (
                      <div
                        key={record.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all space-y-3"
                      >
                        <div
                          onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs sm:text-sm text-slate-900">
                                  {record.subject}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                  {record.durationMinutes} 分钟
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {record.date} {record.time}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-indigo-600">
                              {isExpanded ? '收起详情' : '展开小结'}
                            </span>
                          </div>
                        </div>

                        {/* Summary details when expanded */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-100 space-y-3 text-xs animate-fadeIn">
                            {/* Summary Text */}
                            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 font-medium leading-relaxed">
                              {record.summaryText}
                            </div>

                            {/* Completed Tasks */}
                            {record.completedTasks.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  本次推进完成的任务：
                                </div>
                                <div className="space-y-1 pl-4">
                                  {record.completedTasks.map((t, idx) => (
                                    <div key={idx} className="text-slate-600 text-[11px]">
                                      • {t}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* AI Follow-up Topics */}
                            {record.followUpTopics.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-bold text-purple-800 flex items-center gap-1">
                                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                  AI 智能拓展主题：
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {record.followUpTopics.map((topic, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        if (onSelectTopicAction) {
                                          onSelectTopicAction(topic.actionQuery);
                                          onClose();
                                        }
                                      }}
                                      className="p-2.5 rounded-xl bg-purple-50/50 hover:bg-purple-50 border border-purple-100 transition-colors cursor-pointer group"
                                    >
                                      <div className="font-bold text-slate-800 group-hover:text-purple-700 truncate">
                                        {topic.title}
                                      </div>
                                      <div className="text-[10px] text-purple-600 flex items-center gap-1 mt-1 font-bold">
                                        <span>在 AI 对话中深入探究</span>
                                        <ArrowRight className="h-3 w-3" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Encouragement Quote */}
                            {record.aiEncouragement && (
                              <div className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60">
                                ✨ {record.aiEncouragement}
                              </div>
                            )}

                            {onStartSessionWithSubject && (
                              <div className="pt-1 flex justify-end">
                                <button
                                  onClick={() => {
                                    onStartSessionWithSubject(record.subject);
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 cursor-pointer"
                                >
                                  以此科目再次开始专注
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 sm:p-6 border-t border-slate-100 bg-white/80 flex items-center justify-between text-xs relative z-10">
            <span className="text-slate-400 font-medium">数据安全保存在本地浏览器端</span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              完成查看
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

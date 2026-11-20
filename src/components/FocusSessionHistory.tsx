import React, { useState, useMemo, useEffect } from 'react';
import { 
  History, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  Award, 
  Calendar, 
  BookOpen, 
  ChevronRight, 
  Filter, 
  Search, 
  ArrowUpRight,
  Zap,
  BarChart3,
  RotateCcw,
  Check,
  ChevronDown,
  Layers,
  Smile,
  X
} from 'lucide-react';
import { 
  PomodoroHistoryRecord, 
  PomodoroHistoryService, 
  getRecordEfficiencyScore, 
  getEfficiencyRating 
} from '../services/pomodoroHistory';
import { FocusConsistencyHeatmap } from './FocusConsistencyHeatmap';
import { Course, Task } from '../types';

interface FocusSessionHistoryProps {
  courses?: Course[];
  tasks?: Task[];
  onSelectCourse?: (course: Course) => void;
  onAskAI?: (prompt: string) => void;
  className?: string;
  refreshTrigger?: number; // Used to trigger reload when a timer session completes
}

export const FocusSessionHistory: React.FC<FocusSessionHistoryProps> = ({
  courses = [],
  tasks = [],
  onSelectCourse,
  onAskAI,
  className = '',
  refreshTrigger = 0,
}) => {
  const [records, setRecords] = useState<PomodoroHistoryRecord[]>(() => {
    return PomodoroHistoryService.getHistory();
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'high_efficiency' | 'long_session'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Sync records on trigger changes or storage events
  useEffect(() => {
    const loaded = PomodoroHistoryService.getHistory();
    setRecords(loaded);
  }, [refreshTrigger]);

  // Overall Statistics calculated across all records
  const stats = useMemo(() => {
    if (records.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        totalHours: '0.0',
        avgDuration: 0,
        avgEfficiency: 0,
        peakSessionsCount: 0,
      };
    }

    const totalMinutes = records.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const avgDuration = Math.round(totalMinutes / records.length);

    let efficiencySum = 0;
    let peakCount = 0;

    records.forEach(r => {
      const score = getRecordEfficiencyScore(r);
      efficiencySum += score;
      if (score >= 90) peakCount++;
    });

    const avgEfficiency = Math.round(efficiencySum / records.length);

    return {
      totalSessions: records.length,
      totalMinutes,
      totalHours,
      avgDuration,
      avgEfficiency,
      peakSessionsCount: peakCount,
    };
  }, [records]);

  // Available subjects for dropdown filtering
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set);
  }, [records]);

  // Filtered session records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Date filter from Heatmap click
      if (selectedDateFilter && r.date !== selectedDateFilter) {
        return false;
      }

      // Subject filter
      if (selectedSubject !== 'all' && r.subject !== selectedSubject) {
        return false;
      }

      const score = getRecordEfficiencyScore(r);

      // Tab filter
      if (activeFilter === 'high_efficiency') {
        return score >= 90;
      }
      if (activeFilter === 'long_session') {
        return (r.durationMinutes || 0) >= 45;
      }
      return true;
    });
  }, [records, activeFilter, selectedSubject, selectedDateFilter]);

  const handleRefresh = () => {
    const reloaded = PomodoroHistoryService.getHistory();
    setRecords(reloaded);
  };

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-white/90 space-y-6 relative overflow-hidden ${className}`}>
      
      {/* 1. Header with title & badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20 shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                学程历史与专注效能记录
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Session History
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              记录过往已完成的专注学程、总投入用时与科学计算的专注效能评分
            </p>
          </div>
        </div>

        {/* Top right quick refresh & badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="刷新历史学程"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>刷新记录</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Completed Sessions */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 space-y-1">
          <div className="flex items-center justify-between text-indigo-700 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              已完成学程
            </span>
            <span className="text-[10px] font-mono text-indigo-500">Sessions</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.totalSessions} <span className="text-xs font-normal text-slate-500">次</span>
          </div>
        </div>

        {/* Metric 2: Total Duration */}
        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100/90 space-y-1">
          <div className="flex items-center justify-between text-purple-700 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              累计专注总用时
            </span>
            <span className="text-[10px] font-mono text-purple-500">Duration</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.totalHours} <span className="text-xs font-normal text-slate-500">小时</span>
          </div>
        </div>

        {/* Metric 3: Avg Efficiency Score */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100/90 space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              平均专注效能
            </span>
            <span className="text-[10px] font-mono text-emerald-500">Efficiency</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono flex items-baseline gap-1">
            <span>{stats.avgEfficiency}</span>
            <span className="text-xs font-bold text-emerald-600">分</span>
          </div>
        </div>

        {/* Metric 4: Peak Flow Ratio */}
        <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100/90 space-y-1">
          <div className="flex items-center justify-between text-rose-700 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              高能心流学程
            </span>
            <span className="text-[10px] font-mono text-rose-500">Peak Flow</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.peakSessionsCount} <span className="text-xs font-normal text-slate-500">次 (≥90分)</span>
          </div>
        </div>
      </div>

      {/* 2.5 30-Day Calendar Heatmap View: Focus Consistency Over Last 30 Days */}
      <FocusConsistencyHeatmap
        records={records}
        selectedDateFilter={selectedDateFilter}
        onSelectDateFilter={setSelectedDateFilter}
      />

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
            }`}
          >
            全部学程 ({records.length})
          </button>

          <button
            onClick={() => setActiveFilter('high_efficiency')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'high_efficiency'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-white text-emerald-700 border border-slate-200/80'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>高能效 (≥90分)</span>
          </button>

          <button
            onClick={() => setActiveFilter('long_session')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'long_session'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-white text-purple-700 border border-slate-200/80'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>深度冲刺 (≥45m)</span>
          </button>

          {selectedDateFilter && (
            <button
              onClick={() => setSelectedDateFilter(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-purple-600 hover:bg-purple-700 text-white shadow-2xs active:scale-95"
              title="点击清除日期筛选"
            >
              <Calendar className="h-3 w-3" />
              <span>{selectedDateFilter}</span>
              <X className="h-3 w-3 ml-0.5 opacity-80" />
            </button>
          )}
        </div>

        {/* Subject Filter Dropdown */}
        {availableSubjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium shrink-0">筛选学科:</span>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">所有学科 ({records.length})</option>
              {availableSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. Session History List */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <History className="h-8 w-8 mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-700">暂无符合筛选条件的学程记录</div>
            <p className="text-xs">开启新的番茄钟或调整筛选标签以查看历史学程与效能评分。</p>
          </div>
        ) : (
          filteredRecords.map(record => {
            const efficiencyScore = getRecordEfficiencyScore(record);
            const rating = getEfficiencyRating(efficiencyScore);
            const isExpanded = expandedRecordId === record.id;

            return (
              <div
                key={record.id}
                className="group p-4 sm:p-4.5 rounded-2xl bg-white/85 hover:bg-white border border-slate-200/80 hover:border-purple-200 transition-all shadow-2xs hover:shadow-xs space-y-3"
              >
                {/* Main Card Summary Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Subject, Date, and Duration */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 group-hover:bg-purple-50 group-hover:text-purple-600 text-slate-600 flex items-center justify-center shrink-0 transition-colors">
                      <BookOpen className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                          {record.subject || '自习研讨'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Calendar className="h-3 w-3" />
                          {record.date} {record.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {/* Total Duration */}
                        <div className="flex items-center gap-1 font-mono font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100">
                          <Clock className="h-3 w-3" />
                          <span>总时长：{record.durationMinutes} 分钟</span>
                        </div>

                        {/* Tasks Count */}
                        {record.completedTasks && record.completedTasks.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span>完成 {record.completedTasks.length} 项攻坚</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Prominent Focus Efficiency Score & Badge */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Score Gauge Display */}
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold">专注效能评分</div>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                          {efficiencyScore}
                        </span>
                        <span className="text-xs font-bold text-slate-400">分</span>
                      </div>
                    </div>

                    {/* Qualitative Rating Pill */}
                    <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-black shadow-2xs flex items-center gap-1.5 ${rating.bgClass} ${rating.borderClass}`}>
                      {efficiencyScore >= 95 ? (
                        <Flame className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                      ) : (
                        <Award className="h-3.5 w-3.5" />
                      )}
                      <span>{rating.label}</span>
                    </div>

                    {/* Expand/Collapse details button */}
                    <button
                      onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={isExpanded ? '收起详情' : '展开学程复盘与任务'}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                </div>

                {/* Inline Tasks Snippet (Always visible if tasks exist) */}
                {record.completedTasks && record.completedTasks.length > 0 && (
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">攻坚达成：</span>
                    {record.completedTasks.slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md truncate max-w-xs"
                      >
                        <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{t}</span>
                      </span>
                    ))}
                    {record.completedTasks.length > 2 && (
                      <span className="text-[10px] text-slate-400">
                        +{record.completedTasks.length - 2} 项
                      </span>
                    )}
                  </div>
                )}

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                    {/* Summary text */}
                    {record.summaryText && (
                      <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-purple-600" />
                          学程小结复盘
                        </div>
                        <p>{record.summaryText}</p>
                      </div>
                    )}

                    {/* AI Encouragement */}
                    {record.aiEncouragement && (
                      <div className="text-xs text-purple-900 bg-purple-50/70 p-3 rounded-xl border border-purple-100/80 flex items-start gap-2">
                        <Smile className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">AI 心流点评：</span>
                          <span>{record.aiEncouragement}</span>
                        </div>
                      </div>
                    )}

                    {/* Follow-up topics action if any */}
                    {record.followUpTopics && record.followUpTopics.length > 0 && onAskAI && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-black text-slate-400">延伸研讨主题：</div>
                        <div className="flex flex-wrap gap-1.5">
                          {record.followUpTopics.map((topic, tidx) => (
                            <button
                              key={tidx}
                              onClick={() => onAskAI(topic.actionQuery || topic.title)}
                              className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <span>{topic.title}</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* 5. Bottom informative tip */}
      <div className="p-3.5 rounded-2xl bg-linear-to-r from-purple-50/80 to-indigo-50/80 border border-purple-100 text-xs text-slate-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-600 shrink-0" />
          <span>每次番茄钟计时圆满结束，系统将自动复盘并生成新的学程记录与专注效能评分。</span>
        </div>
      </div>

    </div>
  );
};

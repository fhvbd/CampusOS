import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Clock, 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  FileCheck, 
  Info,
  Check,
  Flame,
  Award
} from 'lucide-react';
import { UserProfile, Task, AppSettings } from '../types';
import { 
  getAggregatedStudyData, 
  exportStudyDataToCsv, 
  exportStudyDataToPdf,
  StudyExportItem,
  StudyExportSummary 
} from '../lib/studyExport';

interface StudySessionExportCardProps {
  user: UserProfile;
  tasks?: Task[];
  settings?: AppSettings;
  className?: string;
}

export const StudySessionExportCard: React.FC<StudySessionExportCardProps> = ({
  user,
  tasks = [],
  settings,
  className = '',
}) => {
  const [selectedRange, setSelectedRange] = useState<'7days' | '30days' | 'all'>('30days');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<'csv' | 'pdf' | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Compute aggregated study session and task completion data
  const { items, summary } = useMemo(() => {
    return getAggregatedStudyData(tasks, selectedRange);
  }, [tasks, selectedRange]);

  // Handle CSV Export
  const handleExportCsv = () => {
    try {
      setExportingType('csv');
      exportStudyDataToCsv(items, summary, user);
      setExportFeedback(`✅ 成功导出 CSV 表格！包含 ${items.length} 条自习与待办记录，已支持 Excel/WPS 原生显示。`);
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (err) {
      console.error('Failed to export CSV', err);
      setExportFeedback('❌ 导出 CSV 失败，请稍后重试');
    } finally {
      setExportingType(null);
    }
  };

  // Handle PDF Export
  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      await exportStudyDataToPdf(items, summary, user);
      setExportFeedback(`✅ 成功生成并下载 A4 学业专注与成长报告 PDF！`);
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (err) {
      console.error('Failed to export PDF', err);
      setExportFeedback('❌ 导出 PDF 报告失败，请稍后重试');
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm border border-white/80 relative overflow-hidden ${className}`}>
      {/* Decorative ambient background blur */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-linear-to-br from-indigo-500/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header with Title and Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25 shrink-0">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-black text-lg sm:text-xl text-slate-900">学业自习与待办数据导出</h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 border border-blue-500/25">
                PDF & CSV
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              将深度专注时长、获得学业 XP 与待办完成度归档为电子表格或官方排版 PDF 报告
            </p>
          </div>
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center bg-white/70 backdrop-blur-md p-1 rounded-2xl border border-white/90 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedRange('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedRange === '7days'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            近 7 天
          </button>
          <button
            type="button"
            onClick={() => setSelectedRange('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedRange === '30days'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            近 30 天
          </button>
          <button
            type="button"
            onClick={() => setSelectedRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedRange === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            本学期全部
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cubes for current selected range */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 relative z-10">
        {/* KPI 1: Focus Duration */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white/70 border border-white/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-500">累计专注时长</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {summary.totalFocusMinutes} <span className="text-xs font-semibold text-slate-500">分</span>
          </div>
          <div className="text-[10px] text-blue-600 font-medium">
            约 {summary.totalFocusHours} 小时专注心流
          </div>
        </div>

        {/* KPI 2: Total XP Gains */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white/70 border border-white/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-500">获得学业成长 XP</span>
            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
            +{summary.totalXpGains} <span className="text-xs font-semibold text-slate-500">XP</span>
          </div>
          <div className="text-[10px] text-amber-700 font-medium">
            赋能成长等级晋级
          </div>
        </div>

        {/* KPI 3: Completed Tasks */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white/70 border border-white/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-500">攻坚完成待办</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
            {summary.completedTasksCount} <span className="text-xs font-semibold text-slate-500">项</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-medium">
            涵盖作业、复习与习惯
          </div>
        </div>

        {/* KPI 4: Average Efficiency */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white/70 border border-white/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-500">平均专注效率</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 font-mono">
            {summary.averageEfficiency} <span className="text-xs font-semibold text-slate-500">分</span>
          </div>
          <div className="text-[10px] text-purple-700 font-medium">
            {summary.averageEfficiency >= 88 ? '高能沉浸自习状态' : '平稳自律学风'}
          </div>
        </div>
      </div>

      {/* Export Action Buttons & Preview Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200/50 relative z-10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white text-slate-700 text-xs font-bold transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span>查看明细清单 ({items.length} 条)</span>
            {isPreviewOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            已支持导出全量字段与中文编码
          </span>
        </div>

        {/* Dual Export Buttons (CSV & PDF) */}
        <div className="flex items-center gap-3">
          {/* Export CSV Button */}
          <button
            type="button"
            id="export-study-csv-btn"
            onClick={handleExportCsv}
            disabled={exportingType !== null || items.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="导出 CSV 文件，支持 Excel、WPS、Numbers、Google Sheets 完美打开"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{exportingType === 'csv' ? '正在生成 CSV...' : '导出 CSV 表格'}</span>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            id="export-study-pdf-btn"
            onClick={handleExportPdf}
            disabled={exportingType !== null || items.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-indigo-600/25 border border-white/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="生成排版精美的 A4 尺寸官方学业自律与专注度认证 PDF 报告"
          >
            <FileText className="h-4 w-4" />
            <span>{exportingType === 'pdf' ? '正在排版 PDF...' : '导出 PDF 报告'}</span>
          </button>
        </div>
      </div>

      {/* Export Success / Error Feedback Toast */}
      {exportFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 backdrop-blur-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* Collapsible Records Preview Table */}
      {isPreviewOpen && (
        <div className="space-y-3 pt-2 border-t border-slate-200/50 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>数据明细预览 ({summary.dateRangeLabel})</span>
            <span>共 {items.length} 场专注与攻坚</span>
          </div>

          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-white/50 rounded-2xl border border-white/80">
              选定区间内暂无自习记录，开启番茄钟或勾选完成待办即可生成！
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {items.map((item, idx) => (
                <div 
                  key={`${item.id}-${idx}`}
                  className="p-3 rounded-2xl bg-white/80 hover:bg-white border border-white/90 shadow-2xs flex items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      item.type === 'pomodoro_session'
                        ? 'bg-blue-500/15 text-blue-700 border border-blue-500/25'
                        : 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/25'
                    }`}>
                      {item.type === 'pomodoro_session' ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{item.date} {item.time}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                          item.type === 'pomodoro_session' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.type === 'pomodoro_session' ? '番茄专注' : '待办攻坚'}
                        </span>
                      </div>
                      <div className="font-black text-slate-900 truncate mt-0.5">
                        {item.subject}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <div className="font-black text-blue-600 font-mono">
                        {item.durationMinutes} min
                      </div>
                      <div className="text-[10px] text-amber-600 font-mono font-bold">
                        +{item.xpEarned} XP
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 hidden sm:inline">
                      {item.ratingLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

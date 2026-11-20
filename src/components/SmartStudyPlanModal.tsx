import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Target,
  Flame,
  ArrowRight,
  BookOpen,
  Timer,
  Plus,
  Compass,
  FileText
} from 'lucide-react';
import { Task, Course, UserProfile, AppSettings, TabType } from '../types';
import { 
  generateSmartStudyPlan, 
  SmartStudyPlanResult, 
  PlanMode,
  StudyScheduleBlock 
} from '../services/smartStudyPlanAI';

interface SmartStudyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  courses: Course[];
  user: UserProfile;
  settings: AppSettings;
  onNavigateTab?: (tab: TabType) => void;
  onAddTask?: (task: Task) => void;
  showToast?: (message: string) => void;
}

export const SmartStudyPlanModal: React.FC<SmartStudyPlanModalProps> = ({
  isOpen,
  onClose,
  tasks,
  courses,
  user,
  settings,
  onNavigateTab,
  onAddTask,
  showToast,
}) => {
  const [mode, setMode] = useState<PlanMode>('balanced');
  const [planResult, setPlanResult] = useState<SmartStudyPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<'timeline' | 'markdown' | 'milestones'>('timeline');
  const [copied, setCopied] = useState<boolean>(false);
  const [addedBlockIds, setAddedBlockIds] = useState<Set<string>>(new Set());

  // Generate plan when modal opens
  useEffect(() => {
    if (isOpen) {
      handleGenerate(mode);
    }
  }, [isOpen]);

  const handleGenerate = async (selectedMode: PlanMode) => {
    setIsLoading(true);
    setMode(selectedMode);
    try {
      const result = await generateSmartStudyPlan({
        tasks,
        courses,
        user,
        settings,
        mode: selectedMode,
      });
      setPlanResult(result);
    } catch (e) {
      console.error('Failed to generate smart study plan', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!planResult) return;
    navigator.clipboard.writeText(planResult.markdownContent);
    setCopied(true);
    if (showToast) showToast('规划方案已复制到剪贴板 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddBlockToTasks = (block: StudyScheduleBlock) => {
    if (!onAddTask) return;

    const newTask: Task = {
      id: `task_plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `【自习】${block.title}`,
      description: `${block.dayLabel} ${block.timeSlot} · 建议投入 ${block.pomodoroCount} 个番茄钟 (${block.pomodoroCount * 25}min)\n${block.description}`,
      category: 'homework',
      priority: block.priority,
      deadline: `${new Date().getFullYear()}-09-02 ${block.timeSlot.split(' - ')[1] || '21:00'}`,
      is_completed: false,
      course_name: block.courseName,
      created_at: new Date().toISOString().split('T')[0],
      auto_tag_label: '智能规划',
      auto_tag_icon: 'Sparkles',
    };

    onAddTask(newTask);
    setAddedBlockIds(prev => new Set([...prev, block.id]));
    if (showToast) showToast(`已将「${block.title}」加入待办清单 ✨`);
  };

  const handleAddAllToTasks = () => {
    if (!planResult || !onAddTask) return;
    let count = 0;
    planResult.scheduleBlocks.forEach((b, idx) => {
      if (!addedBlockIds.has(b.id)) {
        setTimeout(() => {
          handleAddBlockToTasks(b);
        }, idx * 100);
        count++;
      }
    });
    if (showToast && count > 0) {
      showToast(`正在批量同步 ${count} 个建议自习时段到待办清单...`);
    }
  };

  if (!isOpen) return null;

  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && !t.is_completed);

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
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white/95 border border-white/90 shadow-2xl shadow-indigo-950/20 backdrop-blur-2xl z-10 overflow-hidden"
        >
          {/* Decorative ambient gradient */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between p-6 sm:p-7 border-b border-slate-100/90 relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-indigo-600 via-purple-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/25 shrink-0">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Gemini 智能自习与备考规划
                  </h2>
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-linear-to-r from-indigo-500/15 to-purple-500/15 text-indigo-700 border border-indigo-200">
                    Smart Study Plan
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  基于您的 <span className="text-rose-600 font-bold">{highPriorityTasks.length} 项高优任务</span> 与本周课程截止点，由 Gemini 自动编排精力自适应作息表
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mode Selector & Quick Controls */}
          <div className="px-6 sm:px-7 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative z-10">
            {/* Mode Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-bold mr-1">规划倾向:</span>
              <button
                onClick={() => handleGenerate('balanced')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  mode === 'balanced'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                ⚖️ 全能均衡
              </button>
              <button
                onClick={() => handleGenerate('urgent_homework')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  mode === 'urgent_homework'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                🔥 高优作业冲刺
              </button>
              <button
                onClick={() => handleGenerate('exam_sprint')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  mode === 'exam_sprint'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                🎯 考点强攻
              </button>
            </div>

            {/* View Tabs & Refresh */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200/80 shadow-2xs">
                <button
                  onClick={() => setViewTab('timeline')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    viewTab === 'timeline' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  时间块视界
                </button>
                <button
                  onClick={() => setViewTab('milestones')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    viewTab === 'milestones' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  攻坚里程碑
                </button>
                <button
                  onClick={() => setViewTab('markdown')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    viewTab === 'markdown' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  详细文本
                </button>
              </div>

              <button
                onClick={() => handleGenerate(mode)}
                disabled={isLoading}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-indigo-600 transition-all cursor-pointer disabled:opacity-50"
                title="重新生成规划"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative">
                  <div className="h-16 w-16 rounded-3xl bg-linear-to-tr from-indigo-500 to-purple-600 animate-spin text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 text-lg">Gemini 正在分析您的待办与课表...</h3>
                  <p className="text-xs text-slate-500 max-w-md">
                    正在核算大作业截止时段、对齐高难度实验代码与空闲作息窗口，生成最优自习时间轴
                  </p>
                </div>
              </div>
            ) : !planResult ? (
              <div className="py-16 text-center text-slate-400">
                暂无规划数据，请点击上方按钮开始生成。
              </div>
            ) : (
              <>
                {/* AI Summary Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-indigo-500/10 via-purple-500/5 to-amber-500/5 border border-indigo-200/80 relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div className="space-y-1">
                      <div className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                        <span>Gemini 规划解读 ({planResult.modeLabel})</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">{planResult.generatedAt} 生成</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                        {planResult.summaryQuote}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tab Content 1: Timeline View */}
                {viewTab === 'timeline' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-600" />
                        分日精力时段排期表
                      </h4>
                      {onAddTask && (
                        <button
                          onClick={handleAddAllToTasks}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          一键将全部建议时段同步为待办
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['今日 (周一)', '明日 (周二)', '后天 (周三)'].map((dayName, dayIdx) => {
                        const dayBlocks = planResult.scheduleBlocks.filter(b => b.dayLabel === dayName);

                        return (
                          <div
                            key={dayName}
                            className="rounded-2xl p-4 bg-slate-50/70 border border-slate-200/80 space-y-3.5 relative shadow-2xs"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                              <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                {dayName}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                {dayBlocks.length} 个自习块
                              </span>
                            </div>

                            <div className="space-y-3">
                              {dayBlocks.map(block => {
                                const isAdded = addedBlockIds.has(block.id);

                                return (
                                  <div
                                    key={block.id}
                                    className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 relative group ${
                                      block.priority === 'high'
                                        ? 'bg-white border-rose-200/90 shadow-2xs hover:border-rose-300'
                                        : 'bg-white border-slate-200/80 shadow-2xs hover:border-indigo-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                        {block.timeSlot}
                                      </span>
                                      <span
                                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                          block.priority === 'high'
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        }`}
                                      >
                                        {block.periodName}
                                      </span>
                                    </div>

                                    <div className="font-bold text-slate-800 line-clamp-2 leading-snug">
                                      {block.title}
                                    </div>

                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                      {block.description}
                                    </p>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                                      <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                        <Timer className="h-3 w-3" />
                                        {block.pomodoroCount} 番茄钟 ({block.pomodoroCount * 25}m)
                                      </span>

                                      {onAddTask && (
                                        <button
                                          onClick={() => handleAddBlockToTasks(block)}
                                          disabled={isAdded}
                                          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer text-[10px] flex items-center gap-1 ${
                                            isAdded
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                              : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600'
                                          }`}
                                        >
                                          {isAdded ? (
                                            <>
                                              <Check className="h-3 w-3 text-emerald-600" />
                                              已入待办
                                            </>
                                          ) : (
                                            <>
                                              <Plus className="h-3 w-3" />
                                              加入待办
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab Content 2: Key Milestones */}
                {viewTab === 'milestones' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Target className="h-4 w-4 text-rose-600" />
                      当前关键攻坚节点与课程截止
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {planResult.keyMilestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                {m.urgentTag}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-500">
                                {m.deadline}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">
                              {m.title}
                            </h5>
                            <div className="text-[11px] text-slate-500 font-medium">
                              关联：{m.courseOrTag}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content 3: Full Markdown */}
                {viewTab === 'markdown' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                        Gemini 完整规划文本
                      </span>
                      <button
                        onClick={handleCopyMarkdown}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-all cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            已复制方案
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            复制规划文本
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 prose prose-sm max-w-none prose-slate text-xs leading-relaxed overflow-x-auto">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {planResult.markdownContent}
                      </Markdown>
                    </div>
                  </div>
                )}

                {/* AI Advice Pill Box */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-2">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    Gemini 考前防拖延与精力管理锦囊
                  </div>
                  <ul className="space-y-1 text-slate-600 pl-4 list-disc text-[11px]">
                    {planResult.aiAdvice.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 border-t border-slate-100 bg-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative z-10">
            <div className="text-slate-500 font-medium text-[11px] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              当前纳入考量的急迫任务：共 {highPriorityTasks.length} 项
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              {onNavigateTab && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab('ai');
                  }}
                  className="px-4 py-2 rounded-xl text-indigo-600 hover:bg-indigo-50 border border-indigo-200 font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Compass className="h-4 w-4" />
                  在 AI 助手深入定制
                </button>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                完成预览
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

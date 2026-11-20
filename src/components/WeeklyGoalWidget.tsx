import React, { useState, useMemo } from 'react';
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  Plus, 
  ChevronRight, 
  Sparkles, 
  Timer, 
  Clock, 
  Calendar, 
  Trophy, 
  Flame, 
  X,
  BookmarkCheck,
  Check
} from 'lucide-react';
import { Task } from '../types';
import { detectTaskAutoTag, getTaskTagIcon } from '../lib/taskTags';

export function isWeeklyGoalTask(task: Task): boolean {
  if (task.is_weekly_goal) return true;
  if (task.tags && task.tags.some(tag => {
    const t = tag.toLowerCase().trim();
    return t === 'weekly-goal' || t === 'weekly_goal' || t === 'weeklygoal' || t === '本周目标' || t === '周目标';
  })) return true;
  if (task.project_tag && ['weekly-goal', 'weekly_goal', '本周目标', '周目标'].includes(task.project_tag.toLowerCase().trim())) return true;
  if (task.custom_category_name && ['weekly-goal', 'weekly_goal', '本周目标', '周目标'].includes(task.custom_category_name.toLowerCase().trim())) return true;
  if (task.auto_tag_label === '周目标' || task.auto_tag_label === '本周目标') return true;
  return false;
}

interface WeeklyGoalWidgetProps {
  tasks: Task[];
  currentWeek: number;
  onToggleTask: (taskId: string) => void;
  onSelectTask?: (task: Task) => void;
  onOpenAddTask?: () => void;
  onSaveTask?: (task: Task) => void;
  onStartTaskFocus?: (task: Task) => void;
  showToast?: (message: string) => void;
}

export const WeeklyGoalWidget: React.FC<WeeklyGoalWidgetProps> = ({
  tasks,
  currentWeek,
  onToggleTask,
  onSelectTask,
  onOpenAddTask,
  onSaveTask,
  onStartTaskFocus,
  showToast,
}) => {
  const [isSelectGoalOpen, setIsSelectGoalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  // Pull all tasks flagged as 'weekly-goal'
  const weeklyGoalTasks = useMemo(() => {
    return tasks.filter(isWeeklyGoalTask);
  }, [tasks]);

  // Available unflagged tasks that can be added to weekly goals
  const availableTasksToFlag = useMemo(() => {
    return tasks.filter(t => !isWeeklyGoalTask(t) && !t.is_completed);
  }, [tasks]);

  const totalGoals = weeklyGoalTasks.length;
  const completedGoals = weeklyGoalTasks.filter(t => t.is_completed).length;
  const completionPercentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Filtered display list
  const displayedGoals = useMemo(() => {
    if (filterMode === 'pending') return weeklyGoalTasks.filter(t => !t.is_completed);
    if (filterMode === 'completed') return weeklyGoalTasks.filter(t => t.is_completed);
    return weeklyGoalTasks;
  }, [weeklyGoalTasks, filterMode]);

  // Flag a task as weekly-goal
  const handleFlagTaskAsGoal = (task: Task) => {
    if (!onSaveTask) return;
    const existingTags = task.tags || [];
    const updatedTags = existingTags.includes('weekly-goal') ? existingTags : [...existingTags, 'weekly-goal'];
    const updatedTask: Task = {
      ...task,
      is_weekly_goal: true,
      tags: updatedTags,
    };
    onSaveTask(updatedTask);
    setIsSelectGoalOpen(false);
    if (showToast) {
      showToast(`🎯 已将《${task.title.slice(0, 14)}...》设为第 ${currentWeek} 周专属目标！`);
    }
  };

  // Unflag a task from weekly-goal
  const handleUnflagGoal = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!onSaveTask) return;
    const updatedTags = (task.tags || []).filter(t => t.toLowerCase() !== 'weekly-goal' && t !== '本周目标');
    const updatedTask: Task = {
      ...task,
      is_weekly_goal: false,
      tags: updatedTags.length > 0 ? updatedTags : undefined,
    };
    onSaveTask(updatedTask);
    if (showToast) {
      showToast(`已从本周目标中移出《${task.title.slice(0, 12)}...》`);
    }
  };

  // Progress Bar styling and motivation copy
  const getProgressDetails = () => {
    if (totalGoals === 0) {
      return {
        gradient: 'from-slate-400 to-slate-500',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
        message: `第 ${currentWeek} 周尚未设定周目标，点击「+ 设定目标」挑选核心学业待办`,
        status: 'empty',
      };
    }
    if (completionPercentage === 100) {
      return {
        gradient: 'from-emerald-500 via-teal-400 to-green-500',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
        message: '🎉 太棒了！本周既定重点目标已全部圆满达成！',
        status: 'completed',
      };
    }
    if (completionPercentage >= 60) {
      return {
        gradient: 'from-indigo-600 via-blue-500 to-emerald-400',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300',
        message: '🚀 冲刺阶段！已达成超过半数周目标，保持高效心流节奏！',
        status: 'optimal',
      };
    }
    if (completionPercentage > 0) {
      return {
        gradient: 'from-indigo-600 via-purple-600 to-blue-500',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300',
        message: '💪 正在稳步推进中，完成每项目标都是学业成长！',
        status: 'progressing',
      };
    }
    return {
      gradient: 'from-indigo-500 to-purple-600',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
      message: '🌱 本周学习起跑，勾选或开启专属番茄钟快速进入状态！',
      status: 'started',
    };
  };

  const progressDetails = getProgressDetails();

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-white/80 relative overflow-hidden transition-all">
      {/* Decorative ambient liquid background glow */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-linear-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-lg text-slate-900 dark:text-white">
                本周目标
              </h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                第 {currentWeek} 周
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                weekly-goal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              自动聚合标记为「weekly-goal」的本周核心重点待办与学习里程碑
            </p>
          </div>
        </div>

        {/* Action Button: Add or Select Goal */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {totalGoals > 0 && (
            <div className="flex items-center gap-1 text-[11px] bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                全部 ({totalGoals})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('pending')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMode === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                未完 ({totalGoals - completedGoals})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('completed')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMode === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                已完 ({completedGoals})
              </button>
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSelectGoalOpen(!isSelectGoalOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shadow-indigo-500/20"
              title="设定新的周目标或从现有待办中添加"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>设定周目标</span>
            </button>

            {/* Dropdown to pick existing task or create brand new */}
            {isSelectGoalOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 backdrop-blur-xl z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    添加至第 {currentWeek} 周目标
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSelectGoalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {onOpenAddTask && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectGoalOpen(false);
                      onOpenAddTask();
                    }}
                    className="w-full mb-2.5 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>新建全新周目标待办...</span>
                  </button>
                )}

                <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                  从现有待办直接标记：
                </div>

                {availableTasksToFlag.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400">
                    暂无可添加的待办任务
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                    {availableTasksToFlag.slice(0, 8).map(task => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleFlagTaskAsGoal(task)}
                        className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 group text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600">
                          {task.title}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          + 设为周目标
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Metric & Bar Card */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700/80 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {completionPercentage}%
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              本周达成率
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl border shadow-2xs ${progressDetails.badgeColor}`}>
              {completionPercentage === 100 ? (
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Flame className="h-3.5 w-3.5 text-indigo-500" />
              )}
              <span>{completedGoals} / {totalGoals} 已达成</span>
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-600">
          <div 
            className={`h-full bg-linear-to-r ${progressDetails.gradient} rounded-full transition-all duration-700 relative`}
            style={{ width: `${completionPercentage}%` }}
          >
            {completionPercentage > 0 && completionPercentage < 100 && (
              <span className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* Motivational Status Message */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
          <span className="truncate">{progressDetails.message}</span>
          {totalGoals > 0 && (
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
              剩余 {totalGoals - completedGoals} 项
            </span>
          )}
        </div>
      </div>

      {/* Weekly Goal Task Items */}
      {displayedGoals.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/80 dark:border-slate-700 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 mb-1">
            <BookmarkCheck className="h-5 w-5" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {totalGoals === 0 ? '本周尚未设定周目标' : '当前筛选模式下暂无待办'}
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {totalGoals === 0 
              ? '将本周最关键的论文、作业或复习计划标记为「weekly-goal」，实时跟踪每周学术突破！'
              : '切换上方筛选标签查看全部周目标'}
          </p>
          {totalGoals === 0 && (
            <button
              type="button"
              onClick={() => setIsSelectGoalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>立即设定本周首个目标</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
          {displayedGoals.map(goal => {
            const autoTag = detectTaskAutoTag(goal.title, goal.category);
            const TagIcon = getTaskTagIcon(goal.auto_tag_icon || autoTag.iconName);
            const displayLabel = goal.auto_tag_label || autoTag.label;

            return (
              <div
                key={goal.id}
                className={`p-3 rounded-2xl border transition-all flex items-start gap-2.5 group shadow-2xs hover:shadow-xs relative ${
                  goal.is_completed
                    ? 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-70'
                    : 'bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 border-white/90 dark:border-slate-700'
                }`}
              >
                {/* Toggle Completion Checkbox */}
                <button
                  type="button"
                  onClick={() => onToggleTask(goal.id)}
                  className="mt-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0 transition-colors"
                  title={goal.is_completed ? '点击标记为未完成' : '点击标记完成本周目标'}
                >
                  {goal.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                  ) : (
                    <Circle className="h-5 w-5 hover:text-indigo-600 text-indigo-400" />
                  )}
                </button>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs shrink-0 ${autoTag.badgeClass}`}>
                      <TagIcon className="h-3 w-3" />
                      <span>{displayLabel}</span>
                    </span>

                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                      周目标
                    </span>

                    {goal.course_name && (
                      <span className="text-[10px] text-slate-500 font-medium truncate max-w-28 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {goal.course_name}
                      </span>
                    )}
                  </div>

                  <div
                    onClick={() => onSelectTask?.(goal)}
                    className={`text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug break-words group-hover:text-indigo-600 transition-colors cursor-pointer ${
                      goal.is_completed ? 'line-through opacity-60' : ''
                    }`}
                    title={onSelectTask ? '点击编辑此周目标' : undefined}
                  >
                    {goal.title}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>截止: {goal.deadline}</span>
                    </div>

                    {/* Quick Focus & Unflag Actions */}
                    <div className="flex items-center gap-1.5">
                      {!goal.is_completed && onStartTaskFocus && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartTaskFocus(goal);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800 shadow-2xs active:scale-95"
                          title="为此周目标开启专属番茄钟深度专注"
                        >
                          <Timer className="h-3 w-3 text-indigo-600" />
                          <span>专注</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleUnflagGoal(e, goal)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer"
                        title="移出本周目标"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

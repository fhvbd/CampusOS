import React from 'react';
import { 
  Share2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  AlertCircle, 
  X, 
  Check, 
  Sparkles, 
  Flame, 
  BookOpen, 
  Timer, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { SharedTaskPayload } from '../lib/taskShare';
import { detectTaskAutoTag, getTaskTagIcon } from '../lib/taskTags';

interface SharedTaskPromptModalProps {
  sharedTask: SharedTaskPayload | null;
  isOpen: boolean;
  onConfirm: (sharedTask: SharedTaskPayload) => void;
  onClose: () => void;
}

export const SharedTaskPromptModal: React.FC<SharedTaskPromptModalProps> = ({
  sharedTask,
  isOpen,
  onConfirm,
  onClose,
}) => {
  if (!isOpen || !sharedTask) return null;

  const autoTag = detectTaskAutoTag(sharedTask.title, sharedTask.category);
  const TagIcon = getTaskTagIcon(sharedTask.auto_tag_icon || autoTag.iconName);
  const isHigh = sharedTask.priority === 'high';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-white/90 backdrop-blur-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Ambient Light */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-linear-to-br from-indigo-500/20 via-blue-500/15 to-transparent blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/30 shrink-0">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl text-slate-900">
                  收到分享的学业待办
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 border border-indigo-500/25">
                  待办共享
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                来自同学分享的课程作业或攻坚日程，可一键导入您的日程表
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Details Card Preview */}
        <div className="p-5 rounded-2xl bg-white/80 border border-white/90 shadow-sm space-y-3.5 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto Tag */}
            <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-lg border shadow-2xs ${autoTag.badgeClass}`}>
              <TagIcon className="h-3.5 w-3.5" />
              <span>{sharedTask.auto_tag_label || autoTag.label}</span>
            </span>

            {/* Course Tag if any */}
            {sharedTask.course_name && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{sharedTask.course_name}</span>
              </span>
            )}

            {/* Priority Badge */}
            {isHigh ? (
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                <Flame className="h-3 w-3 fill-white" />
                <span>高优先级</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                {sharedTask.priority === 'medium' ? '中优先级' : '普通待办'}
              </span>
            )}
          </div>

          {/* Task Title */}
          <h4 className="font-black text-base sm:text-lg text-slate-900 leading-snug">
            {sharedTask.title}
          </h4>

          {/* Metadata Row: Deadline & Estimated Time */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Clock className="h-4 w-4 text-rose-500 shrink-0" />
              <span>截止：</span>
              <span className="font-mono font-bold text-slate-900">{sharedTask.deadline || '未设定'}</span>
            </div>

            {sharedTask.estimated_hours && (
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Timer className="h-4 w-4 text-blue-500 shrink-0" />
                <span>预估自习：</span>
                <span className="font-mono font-bold text-slate-900">{sharedTask.estimated_hours} 小时</span>
              </div>
            )}
          </div>

          {/* Description or Notes if provided */}
          {(sharedTask.description || sharedTask.notes) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 font-medium leading-relaxed">
              {sharedTask.description || sharedTask.notes}
            </div>
          )}

          {/* Subtasks Preview if present */}
          {sharedTask.subtasks && sharedTask.subtasks.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                <span>包含 {sharedTask.subtasks.length} 个拆解子任务步骤：</span>
                <span className="font-mono text-[10px] text-indigo-600 font-bold">
                  {sharedTask.subtasks.filter(s => s.is_completed).length}/{sharedTask.subtasks.length} 已完成
                </span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {sharedTask.subtasks.map((st, idx) => (
                  <div key={st.id || idx} className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                    <span className={`h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 border ${
                      st.is_completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {st.is_completed && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className={st.is_completed ? 'line-through text-slate-400' : 'font-medium'}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100/70 transition-colors cursor-pointer"
          >
            暂不需要
          </button>
          <button
            type="button"
            id="confirm-import-shared-task-btn"
            onClick={() => onConfirm(sharedTask)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-500/25 border border-white/30 cursor-pointer active:scale-95 transition-all"
          >
            <Check className="h-4 w-4" />
            <span>加入我的待办日程</span>
          </button>
        </div>
      </div>
    </div>
  );
};

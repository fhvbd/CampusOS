import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Tag as TagIcon, 
  AlertCircle, 
  Save, 
  BookOpen,
  Sparkles,
  Zap,
  Plus,
  Settings2,
  Trash2,
  Folder,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bookmark,
  Target,
  Award,
  Code2,
  Users,
  FileText,
  Briefcase,
  FlaskConical,
  Rocket,
  Repeat,
  Share2,
  ListTodo,
  Filter
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority, Course, CustomTaskCategory, RecurrenceFrequency, SubTask } from '../types';
import { calculateNextDeadline } from '../lib/recurringTasks';
import { copyTaskShareLink } from '../lib/taskShare';
import { 
  detectTaskAutoTag, 
  getTaskTagIcon, 
  TASK_TAG_RULES, 
  CUSTOM_CATEGORY_COLORS, 
  CATEGORY_ICON_OPTIONS, 
  getCategoryColorClasses 
} from '../lib/taskTags';
import { CampusAPI } from '../services/api';
import { INITIAL_CUSTOM_CATEGORIES } from '../mockData';
import { TaskFocusTimerCard } from './TaskFocusTimerCard';
import { TaskFocusHistoryChart } from './TaskFocusHistoryChart';
import { PomodoroHistoryService } from '../services/pomodoroHistory';
import { generateSubtasksWithGemini, ProposedSubTaskItem } from '../services/subtaskGeneratorAI';

interface TaskModalProps {
  task?: Task | null;
  courses: Course[];
  tasks?: Task[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  customCategories?: CustomTaskCategory[];
  onSaveCustomCategory?: (category: CustomTaskCategory) => void;
  onDeleteCustomCategory?: (categoryId: string) => void;
  onSelectTask?: (task: Task) => void;
  onFilterByTag?: (tagId: string) => void;
  onStartTaskFocus?: (task: Task) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  courses,
  tasks = [],
  isOpen,
  onClose,
  onSave,
  customCategories: externalCustomCategories,
  onSaveCustomCategory: externalOnSaveCategory,
  onDeleteCustomCategory: externalOnDeleteCategory,
  onSelectTask,
  onFilterByTag,
  onStartTaskFocus,
}) => {
  if (!isOpen) return null;

  // Local fallback state if categories are not passed from parent
  const [internalCategories, setInternalCategories] = useState<CustomTaskCategory[]>(INITIAL_CUSTOM_CATEGORIES);

  useEffect(() => {
    if (!externalCustomCategories) {
      CampusAPI.getCustomTaskCategories().then(data => {
        if (data && data.length > 0) {
          setInternalCategories(data);
        }
      });
    }
  }, [externalCustomCategories]);

  const activeCategories = externalCustomCategories || internalCategories;

  const [formData, setFormData] = useState<Partial<Task>>(
    task || {
      id: `t_${Date.now()}`,
      title: '',
      description: '',
      category: 'homework',
      priority: 'medium',
      deadline: `${new Date().toISOString().split('T')[0]} 23:59`,
      is_completed: false,
      course_id: '',
      course_name: '',
      created_at: new Date().toISOString().split('T')[0],
      custom_category_id: '',
      custom_category_name: '',
      project_tag: '',
    }
  );

  // Track if user manually touched category
  const [isCategoryManuallySet, setIsCategoryManuallySet] = useState(Boolean(task));

  // Category Management Panel state
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'project' | 'course' | 'custom'>('project');
  const [newCatColor, setNewCatColor] = useState<string>('purple');
  const [newCatIcon, setNewCatIcon] = useState<string>('Sparkles');
  const [newCatCourseId, setNewCatCourseId] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
  const [managementSubTab, setManagementSubTab] = useState<'manage' | 'filter'>('manage');
  const [modalFilterTagId, setModalFilterTagId] = useState<string | null>(null);

  // Compute tasks filtered by tag inside TaskModal
  const filteredModalTasks = useMemo(() => {
    if (!tasks || !modalFilterTagId) return [];
    if (modalFilterTagId === 'all') return tasks;
    return tasks.filter(t => 
      t.custom_category_id === modalFilterTagId || 
      t.custom_category_name === modalFilterTagId ||
      t.project_tag === modalFilterTagId
    );
  }, [tasks, modalFilterTagId]);

  const getTagTaskCount = (cat: CustomTaskCategory) => {
    if (!tasks) return 0;
    return tasks.filter(t => 
      t.custom_category_id === cat.id || 
      t.custom_category_name === cat.name ||
      t.project_tag === cat.name
    ).length;
  };

  // Specific Due Date & Due Time States
  const parseInitialDeadlines = () => {
    const raw = task?.deadline || `${new Date().toISOString().split('T')[0]} 23:59`;
    if (raw.includes(' ')) {
      const parts = raw.split(' ');
      return { date: parts[0], time: parts[1], specific: parts[1] !== '23:59' };
    }
    return { date: raw, time: '23:59', specific: false };
  };

  const initialD = parseInitialDeadlines();
  const [dueDate, setDueDate] = useState<string>(initialD.date);
  const [dueTime, setDueTime] = useState<string>(initialD.time);
  const [hasSpecificTime, setHasSpecificTime] = useState<boolean>(initialD.specific);
  const [isManualTextMode, setIsManualTextMode] = useState<boolean>(false);

  // Recurring Task States (Daily, Weekly, Monthly for repeating coursework & habits)
  const [isRecurring, setIsRecurring] = useState<boolean>(task?.is_recurring || false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrenceFrequency>(task?.recurrence_pattern || 'daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(task?.recurrence_interval || 1);
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>(task?.recurrence_days_of_week || []);

  // Weekly Goal flag state
  const [isWeeklyGoal, setIsWeeklyGoal] = useState<boolean>(task?.is_weekly_goal || (task?.tags?.includes('weekly-goal') ?? false));

  // Consecutive 50-min Focus Reminder state
  const [focusReminderEnabled, setFocusReminderEnabled] = useState<boolean>(task?.focus_reminder_enabled ?? true);

  // Subtasks State (Nested steps breakdown)
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>('');
  const [focusHistoryRefreshKey, setFocusHistoryRefreshKey] = useState<number>(0);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState<boolean>(false);
  const [proposedSubtasks, setProposedSubtasks] = useState<ProposedSubTaskItem[]>([]);

  // Sync formData and due times whenever modal opens or active task changes
  useEffect(() => {
    if (isOpen) {
      setProposedSubtasks([]);
      setIsGeneratingSubtasks(false);
      if (task) {
        setFormData(task);
        setIsCategoryManuallySet(true);
        setIsRecurring(task.is_recurring || false);
        setRecurrencePattern(task.recurrence_pattern || 'daily');
        setRecurrenceInterval(task.recurrence_interval || 1);
        setRecurrenceDaysOfWeek(task.recurrence_days_of_week || []);
        setIsWeeklyGoal(task.is_weekly_goal || (task.tags?.includes('weekly-goal') ?? false));
        setFocusReminderEnabled(task.focus_reminder_enabled ?? true);
        setSubtasks(task.subtasks ? [...task.subtasks] : []);
        setNewSubtaskTitle('');
        const raw = task.deadline || `${new Date().toISOString().split('T')[0]} 23:59`;
        if (raw.includes(' ')) {
          const parts = raw.split(' ');
          setDueDate(parts[0]);
          setDueTime(parts[1]);
          setHasSpecificTime(parts[1] !== '23:59');
        } else {
          setDueDate(raw);
          setDueTime('23:59');
          setHasSpecificTime(false);
        }
      } else {
        setFormData({
          id: `t_${Date.now()}`,
          title: '',
          description: '',
          category: 'homework',
          priority: 'medium',
          deadline: `${new Date().toISOString().split('T')[0]} 23:59`,
          is_completed: false,
          course_id: '',
          course_name: '',
          created_at: new Date().toISOString().split('T')[0],
          custom_category_id: '',
          custom_category_name: '',
          project_tag: '',
        });
        setIsCategoryManuallySet(false);
        setIsRecurring(false);
        setRecurrencePattern('daily');
        setRecurrenceInterval(1);
        setRecurrenceDaysOfWeek([]);
        setIsWeeklyGoal(false);
        setFocusReminderEnabled(true);
        setSubtasks([]);
        setNewSubtaskTitle('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setDueTime('23:59');
        setHasSpecificTime(false);
      }
    }
  }, [task, isOpen]);

  const handleAddSubtask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title) return;
    const item: SubTask = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    setSubtasks(prev => [...prev, item]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(prev =>
      prev.map(st => (st.id === id ? { ...st, is_completed: !st.is_completed } : st))
    );
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  // AI Subtask Breakdown Generation & Import Handlers
  const handleGenerateSubtasks = async () => {
    const currentTitle = (formData.title || '').trim();
    if (!currentTitle) {
      showNotice('请先输入待办事项标题，以便 AI 精准分析拆解步骤');
      return;
    }
    if (isGeneratingSubtasks) return;
    setIsGeneratingSubtasks(true);
    try {
      const linkedCourseName =
        courses.find(c => c.id === formData.course_id)?.course_name ||
        formData.course_name;
      const proposals = await generateSubtasksWithGemini({
        title: currentTitle,
        description: formData.description || '',
        category: formData.category,
        courseName: linkedCourseName,
      });
      setProposedSubtasks(proposals);
    } catch (e) {
      console.error('Failed to generate subtasks:', e);
      showNotice('智能拆解请求超时，请重试');
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleToggleProposedSubtask = (id: string) => {
    setProposedSubtasks(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleImportProposedSubtasks = () => {
    const selectedItems = proposedSubtasks.filter(p => p.selected);
    if (selectedItems.length === 0) {
      showNotice('请至少勾选 1 项要导入的子步骤');
      return;
    }

    const existingTitles = new Set(subtasks.map(s => s.title.trim()));
    const newItems: SubTask[] = selectedItems
      .map((p, idx) => ({
        id: `st_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
        title: `${p.title} (约${p.estimatedMinutes}m)`,
        is_completed: false,
        created_at: new Date().toISOString(),
      }))
      .filter(item => !existingTitles.has(item.title));

    setSubtasks(prev => [...prev, ...newItems]);
    setProposedSubtasks([]);
    showNotice(`✨ 已成功导入 ${newItems.length} 项 AI 拆解执行步骤！`);
  };

  const syncDeadline = (newDate: string, newTime: string, specific: boolean) => {
    setDueDate(newDate);
    setDueTime(newTime);
    setHasSpecificTime(specific);
    const combined = specific ? `${newDate} ${newTime}` : `${newDate} 23:59`;
    setFormData(prev => ({
      ...prev,
      deadline: combined,
    }));
  };

  // Quick date presets
  const getDatePreset = (type: 'today' | 'tomorrow' | 'friday' | 'monday'): string => {
    const d = new Date();
    if (type === 'today') {
      return d.toISOString().split('T')[0];
    } else if (type === 'tomorrow') {
      const tomorrow = new Date(d.getTime() + 86400000);
      return tomorrow.toISOString().split('T')[0];
    } else if (type === 'friday') {
      const day = d.getDay();
      const diff = day <= 5 ? 5 - day : 5 - day + 7;
      const fri = new Date(d.getTime() + diff * 86400000);
      return fri.toISOString().split('T')[0];
    } else {
      const day = d.getDay();
      const diff = day === 0 ? 1 : 8 - day;
      const mon = new Date(d.getTime() + diff * 86400000);
      return mon.toISOString().split('T')[0];
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Detected auto tag
  const autoTag = detectTaskAutoTag(formData.title || '', formData.category);
  const TagIconComponent = getTaskTagIcon(autoTag.iconName);

  // Auto-sync category when title changes if not manually set
  const handleTitleChange = (newTitle: string) => {
    const detected = detectTaskAutoTag(newTitle, formData.category);
    if (!isCategoryManuallySet && detected.keywordMatched) {
      setFormData(prev => ({
        ...prev,
        title: newTitle,
        category: detected.category,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        title: newTitle,
      }));
    }
  };

  const handleCategorySelect = (ruleCategory: TaskCategory, ruleLabel: string) => {
    setIsCategoryManuallySet(true);
    setFormData(prev => ({
      ...prev,
      category: ruleCategory,
    }));
  };

  // Toggle or select a custom category
  const handleCustomCategoryToggle = (category: CustomTaskCategory) => {
    if (formData.custom_category_id === category.id) {
      // Deselect
      setFormData(prev => ({
        ...prev,
        custom_category_id: undefined,
        custom_category_name: undefined,
        project_tag: prev.project_tag === category.name ? undefined : prev.project_tag,
      }));
      return;
    }

    // Select category
    const update: Partial<Task> = {
      custom_category_id: category.id,
      custom_category_name: category.name,
    };

    if (category.type === 'project') {
      update.project_tag = category.name;
    } else if (category.type === 'course' && category.course_id) {
      update.course_id = category.course_id;
      const linkedCourse = courses.find(c => c.id === category.course_id);
      if (linkedCourse) {
        update.course_name = linkedCourse.course_name;
      }
    }

    setFormData(prev => ({
      ...prev,
      ...update,
    }));
  };

  // Handle saving a brand new custom category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    let linkedCourseName: string | undefined = undefined;
    if (newCatType === 'course' && newCatCourseId) {
      const matched = courses.find(c => c.id === newCatCourseId);
      if (matched) {
        linkedCourseName = matched.course_name;
      }
    }

    const newCategory: CustomTaskCategory = {
      id: `cc_${Date.now()}`,
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      iconName: newCatIcon,
      course_id: newCatType === 'course' ? newCatCourseId : undefined,
      course_name: linkedCourseName,
      created_at: new Date().toISOString().split('T')[0],
    };

    if (externalOnSaveCategory) {
      externalOnSaveCategory(newCategory);
    } else {
      const updated = await CampusAPI.saveCustomTaskCategory(newCategory);
      setInternalCategories(updated);
    }

    // Auto-select the newly created category for the current task
    setFormData(prev => ({
      ...prev,
      custom_category_id: newCategory.id,
      custom_category_name: newCategory.name,
      project_tag: newCatType === 'project' ? newCategory.name : prev.project_tag,
      course_id: newCategory.course_id || prev.course_id,
      course_name: linkedCourseName || prev.course_name,
    }));

    setNewCatName('');
    showNotice(`分类标签「${newCategory.name}」已添加并选定！`);
  };

  // Handle deleting a custom category
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (externalOnDeleteCategory) {
      externalOnDeleteCategory(categoryId);
    } else {
      const updated = await CampusAPI.deleteCustomTaskCategory(categoryId);
      setInternalCategories(updated);
    }

    // Clear from form if current task was using it
    if (formData.custom_category_id === categoryId) {
      setFormData(prev => ({
        ...prev,
        custom_category_id: undefined,
        custom_category_name: undefined,
        project_tag: prev.project_tag === categoryName ? undefined : prev.project_tag,
      }));
    }

    showNotice(`分类「${categoryName}」已删除`);
  };

  // Batch import categories from enrolled courses
  const handleImportCoursesAsCategories = async () => {
    if (courses.length === 0) {
      showNotice('当前课表中暂无课程');
      return;
    }

    let addedCount = 0;
    for (const course of courses) {
      const exists = activeCategories.some(
        c => c.course_id === course.id || c.name === course.course_name
      );
      if (!exists) {
        const newCat: CustomTaskCategory = {
          id: `cc_course_${course.id}_${Date.now()}`,
          name: course.course_name,
          type: 'course',
          course_id: course.id,
          course_name: course.course_name,
          color: course.color === 'emerald' ? 'emerald' : course.color === 'purple' ? 'purple' : 'blue',
          iconName: 'BookOpen',
          created_at: new Date().toISOString().split('T')[0],
        };
        if (externalOnSaveCategory) {
          externalOnSaveCategory(newCat);
        } else {
          await CampusAPI.saveCustomTaskCategory(newCat);
        }
        addedCount++;
      }
    }

    if (!externalOnSaveCategory) {
      const updated = await CampusAPI.getCustomTaskCategories();
      setInternalCategories(updated);
    }

    showNotice(addedCount > 0 ? `已成功将 ${addedCount} 门课程转化为专属标签！` : '课表中的课程已全部存在标签');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const selectedCourse = courses.find(c => c.id === formData.course_id);
    const finalTag = detectTaskAutoTag(formData.title.trim(), formData.category);

    onSave({
      id: formData.id || `t_${Date.now()}`,
      title: formData.title.trim(),
      description: formData.description || '',
      category: formData.category || finalTag.category || 'homework',
      priority: formData.priority || 'medium',
      deadline: formData.deadline || `${new Date().toISOString().split('T')[0]} 23:59`,
      is_completed: formData.is_completed || false,
      course_id: formData.course_id,
      course_name: selectedCourse ? selectedCourse.course_name : formData.course_name,
      created_at: formData.created_at || new Date().toISOString().split('T')[0],
      auto_tag_label: finalTag.label,
      auto_tag_icon: finalTag.iconName,
      custom_category_id: formData.custom_category_id,
      custom_category_name: formData.custom_category_name,
      project_tag: formData.project_tag,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : 'none',
      recurrence_interval: isRecurring ? Math.max(1, recurrenceInterval) : 1,
      recurrence_days_of_week: isRecurring && recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : undefined,
      parent_recurring_id: formData.parent_recurring_id,
      recurrence_streak: formData.recurrence_streak || 0,
      is_weekly_goal: isWeeklyGoal,
      focus_reminder_enabled: focusReminderEnabled,
      tags: isWeeklyGoal 
        ? Array.from(new Set([...(formData.tags || []), 'weekly-goal']))
        : (formData.tags || []).filter(t => t !== 'weekly-goal'),
    });
    onClose();
  };

  // Handle in-modal focus timer completion
  const handleTimerSessionComplete = (durationMinutes: number) => {
    const taskTitle = formData.title?.trim() || task?.title || '待办任务';
    
    // 1. Mark all subtasks as completed
    const updatedSubtasks = subtasks.map(st => ({ ...st, is_completed: true }));
    setSubtasks(updatedSubtasks);

    // 2. Add Pomodoro history record
    PomodoroHistoryService.addSessionRecord({
      subject: taskTitle,
      durationMinutes,
      completedTasks: [taskTitle],
      summaryText: `在待办详情中完成 ${durationMinutes} 分钟专注投入，已将「${taskTitle}」及子步骤标记完结。`,
      taskId: formData.id || task?.id,
    });
    setFocusHistoryRefreshKey(prev => prev + 1);

    // 3. Mark task completed & update state
    setFormData(prev => ({ ...prev, is_completed: true }));

    const selectedCourse = courses.find(c => c.id === formData.course_id);
    const finalTag = detectTaskAutoTag(taskTitle, formData.category);

    const completedTask: Task = {
      id: formData.id || task?.id || `t_${Date.now()}`,
      title: taskTitle,
      description: formData.description || '',
      category: formData.category || finalTag.category || 'homework',
      priority: formData.priority || 'medium',
      deadline: formData.deadline || `${new Date().toISOString().split('T')[0]} 23:59`,
      is_completed: true,
      course_id: formData.course_id,
      course_name: selectedCourse ? selectedCourse.course_name : formData.course_name,
      created_at: formData.created_at || new Date().toISOString().split('T')[0],
      auto_tag_label: finalTag.label,
      auto_tag_icon: finalTag.iconName,
      custom_category_id: formData.custom_category_id,
      custom_category_name: formData.custom_category_name,
      project_tag: formData.project_tag,
      subtasks: updatedSubtasks.length > 0 ? updatedSubtasks : undefined,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : 'none',
      recurrence_interval: isRecurring ? Math.max(1, recurrenceInterval) : 1,
      recurrence_days_of_week: isRecurring && recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : undefined,
      parent_recurring_id: formData.parent_recurring_id,
      recurrence_streak: (formData.recurrence_streak || 0) + 1,
      is_weekly_goal: isWeeklyGoal,
      focus_reminder_enabled: focusReminderEnabled,
      tags: isWeeklyGoal 
        ? Array.from(new Set([...(formData.tags || []), 'weekly-goal']))
        : (formData.tags || []).filter(t => t !== 'weekly-goal'),
    };

    onSave(completedTask);
    showNotice(`🎉 专注时长 ${durationMinutes} 分钟已结算，待办与执行步骤已自动完成！`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Expand to full-screen focus mode handler
  const handleExpandFocus = () => {
    if (!onStartTaskFocus) return;
    const taskTitle = formData.title?.trim() || task?.title || '待办任务';
    const selectedCourse = courses.find(c => c.id === formData.course_id);
    const finalTag = detectTaskAutoTag(taskTitle, formData.category);

    const currentTaskState: Task = {
      id: formData.id || task?.id || `t_${Date.now()}`,
      title: taskTitle,
      description: formData.description || '',
      category: formData.category || finalTag.category || 'homework',
      priority: formData.priority || 'medium',
      deadline: formData.deadline || `${new Date().toISOString().split('T')[0]} 23:59`,
      is_completed: formData.is_completed || false,
      course_id: formData.course_id,
      course_name: selectedCourse ? selectedCourse.course_name : formData.course_name,
      created_at: formData.created_at || new Date().toISOString().split('T')[0],
      auto_tag_label: finalTag.label,
      auto_tag_icon: finalTag.iconName,
      custom_category_id: formData.custom_category_id,
      custom_category_name: formData.custom_category_name,
      project_tag: formData.project_tag,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : 'none',
      recurrence_interval: isRecurring ? Math.max(1, recurrenceInterval) : 1,
      recurrence_days_of_week: isRecurring && recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : undefined,
      parent_recurring_id: formData.parent_recurring_id,
      recurrence_streak: formData.recurrence_streak || 0,
      is_weekly_goal: isWeeklyGoal,
      focus_reminder_enabled: focusReminderEnabled,
      tags: isWeeklyGoal 
        ? Array.from(new Set([...(formData.tags || []), 'weekly-goal']))
        : (formData.tags || []).filter(t => t !== 'weekly-goal'),
    };

    onClose();
    onStartTaskFocus(currentTaskState);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full max-h-[92vh] shadow-2xl border border-white/80 backdrop-blur-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/60 bg-white/40 backdrop-blur-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
              <CheckSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">
                {task ? '编辑待办任务' : '新建待办事项'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">支持自定义项目/课程专属标签与智能语义识别</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer transition-all active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Banner if action performed */}
        {actionNotice && (
          <div className="bg-indigo-600 text-white text-[11px] font-bold px-6 py-2 flex items-center gap-1.5 animate-in slide-in-from-top duration-150 shrink-0">
            <Check className="h-3.5 w-3.5" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Form Container (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Title with live Auto-Tag hint */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">待办标题 *</label>
            <input
              type="text"
              required
              value={formData.title || ''}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="例如：周五计算机网络期末考试复习、完成离散数学大作业、挑战杯答辩会议"
              className="w-full px-4 py-2.5 border border-white/90 rounded-2xl bg-white/70 backdrop-blur-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium shadow-2xs text-slate-900 text-xs sm:text-sm"
            />

            {/* Smart Auto-Tag Detection Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-xs gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>自动标签：</span>
                </span>
                
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border shadow-2xs ${autoTag.badgeClass}`}>
                  <TagIconComponent className="h-3.5 w-3.5" />
                  <span>{autoTag.label}</span>
                </span>

                {autoTag.keywordMatched && (
                  <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
                    (匹配关键词: <strong className="text-slate-600 font-bold">「{autoTag.keywordMatched}」</strong>)
                  </span>
                )}
              </div>

              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100/60 shrink-0">
                实时语义识别
              </span>
            </div>
          </div>

          {/* SECTION: Custom Categories & Project Tags (NEW FEATURE) */}
          <div className="p-3.5 rounded-2xl bg-linear-to-br from-indigo-500/5 via-purple-500/5 to-white/70 border border-indigo-200/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TagIcon className="h-3.5 w-3.5 text-indigo-600" />
                <label className="font-black text-slate-800 text-xs">项目与课程专属分类 (自定义类别)</label>
              </div>

              <button
                type="button"
                onClick={() => setIsManagingCategories(prev => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white/80 hover:bg-white px-2.5 py-1 rounded-xl border border-indigo-200/80 shadow-2xs transition-all cursor-pointer"
              >
                <Settings2 className="h-3 w-3" />
                <span>{isManagingCategories ? '收起管理面板' : '管理与新建分类'}</span>
                {isManagingCategories ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
              </button>
            </div>

            {/* Custom Category Selection Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activeCategories.map(cat => {
                const isSelected = formData.custom_category_id === cat.id;
                const style = getCategoryColorClasses(cat.color);
                const IconComp = getTaskTagIcon(cat.iconName || (cat.type === 'course' ? 'BookOpen' : 'Folder'));

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCustomCategoryToggle(cat)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? `${style.bgClass} ${style.textClass} ${style.borderClass} ring-2 ring-indigo-500/40 shadow-xs scale-102`
                        : 'bg-white/80 hover:bg-white text-slate-700 border-white/90 shadow-2xs'
                    }`}
                  >
                    <IconComp className="h-3 w-3 shrink-0" />
                    <span>{cat.name}</span>
                    {isSelected && <Check className="h-3 w-3 text-indigo-700 shrink-0 ml-0.5" />}
                  </button>
                );
              })}

              {activeCategories.length === 0 && (
                <div className="text-[11px] text-slate-400 py-1">
                  暂无自定义分类，点击右上角「管理与新建分类」添加项目或课程标签。
                </div>
              )}
            </div>

            {/* Active Selected Category Summary Pill */}
            {formData.custom_category_name && (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-100/60">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <span>当前选定分类：</span>
                  <span className="font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-lg border border-indigo-200">
                    {formData.custom_category_name}
                  </span>
                  {formData.project_tag && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      (项目: {formData.project_tag})
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      custom_category_id: undefined,
                      custom_category_name: undefined,
                      project_tag: undefined,
                    }));
                  }}
                  className="text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                >
                  清除分类
                </button>
              </div>
            )}

            {/* EXPANDABLE CATEGORY MANAGEMENT INTERFACE */}
            {isManagingCategories && (
              <div className="mt-3 p-3.5 rounded-2xl bg-white/90 border border-indigo-200/80 shadow-inner space-y-3.5 animate-in fade-in duration-200">
                
                {/* 1. Sub-Tabs: Create & Manage Tags vs Filter Tasks by Tag */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-100">
                    <button
                      type="button"
                      onClick={() => setManagementSubTab('manage')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        managementSubTab === 'manage'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏷️ 创建与管理标签
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManagementSubTab('filter');
                        if (!modalFilterTagId && activeCategories.length > 0) {
                          setModalFilterTagId(activeCategories[0].id);
                        } else if (!modalFilterTagId) {
                          setModalFilterTagId('all');
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        managementSubTab === 'filter'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Filter className="h-3 w-3" />
                      <span>按标签筛选待办</span>
                      {modalFilterTagId && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      )}
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium">
                    共 {activeCategories.length} 个颜色标签
                  </span>
                </div>

                {managementSubTab === 'manage' && (
                  <>
                    {/* Add New Category Subsection */}
                    <div className="space-y-2.5 pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 text-[11px] flex items-center gap-1">
                          <Plus className="h-3.5 w-3.5 text-indigo-600" />
                          <span>创建新项目 / 课程分类标签</span>
                        </span>

                        <button
                          type="button"
                          onClick={handleImportCoursesAsCategories}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>从本学期课表批量导入</span>
                        </button>
                      </div>

                      {/* Input and Category Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            placeholder="输入新分类名称 (如：挑战杯项目、操作系统大作业)"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 text-xs"
                          />
                        </div>

                        <div>
                          <select
                            value={newCatType}
                            onChange={e => {
                              const t = e.target.value as 'project' | 'course' | 'custom';
                              setNewCatType(t);
                              if (t === 'course' && courses.length > 0 && !newCatName) {
                                setNewCatCourseId(courses[0].id);
                                setNewCatName(courses[0].course_name);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50/50 font-bold text-slate-800 text-xs cursor-pointer"
                          >
                            <option value="project">📁 独立项目 (Project)</option>
                            <option value="course">📚 课程专属 (Course)</option>
                            <option value="custom">🏷️ 综合分类 (Custom)</option>
                          </select>
                        </div>
                      </div>

                      {/* If Course type selected, optional course linkage */}
                      {newCatType === 'course' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 shrink-0">选择关联课程：</span>
                          <select
                            value={newCatCourseId}
                            onChange={e => {
                              const cId = e.target.value;
                              setNewCatCourseId(cId);
                              const found = courses.find(c => c.id === cId);
                              if (found && !newCatName) {
                                setNewCatName(found.course_name);
                              }
                            }}
                            className="flex-1 px-2.5 py-1 border border-slate-200 rounded-xl bg-white font-medium text-slate-800 text-[11px] cursor-pointer"
                          >
                            <option value="">-- 选择现有课程 --</option>
                            {courses.map(c => (
                              <option key={c.id} value={c.id}>{c.course_name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Color and Icon Picker Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        {/* Color Swatches */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 mr-0.5">主题色：</span>
                          {Object.values(CUSTOM_CATEGORY_COLORS).map(color => (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => setNewCatColor(color.id)}
                              title={color.label}
                              className={`h-5 w-5 rounded-full transition-all cursor-pointer border ${
                                newCatColor === color.id
                                  ? 'ring-2 ring-indigo-500 ring-offset-1 scale-115 border-slate-400'
                                  : 'opacity-70 hover:opacity-100 border-transparent'
                              }`}
                              style={{ backgroundColor: color.dotColor }}
                            />
                          ))}
                        </div>

                        {/* Icon Selection */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500">图标：</span>
                          <select
                            value={newCatIcon}
                            onChange={e => setNewCatIcon(e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 text-[10px] cursor-pointer"
                          >
                            {CATEGORY_ICON_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] shadow-xs cursor-pointer transition-all active:scale-95"
                          >
                            确认添加
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Categories Management List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>已保存的分类清单 ({activeCategories.length})</span>
                        <span className="text-[10px] text-slate-400 font-normal">点击垃圾桶可移除</span>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {activeCategories.map(cat => {
                          const colorStyle = getCategoryColorClasses(cat.color);
                          const IconComp = getTaskTagIcon(cat.iconName || 'Folder');
                          const count = getTagTaskCount(cat);

                          return (
                            <div
                              key={cat.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-[11px]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-bold ${colorStyle.badgeClass}`}>
                                  <IconComp className="h-3 w-3" />
                                  <span className="truncate max-w-36">{cat.name}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {cat.type === 'course' ? '📚 课程' : cat.type === 'project' ? '📁 项目' : '🏷️ 通用'}
                                </span>
                                {tasks.length > 0 && (
                                  <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                    {count} 待办
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="删除此分类"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Sub-Tab 2: Filter Tasks by Tag */}
                {managementSubTab === 'filter' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Filter className="h-3.5 w-3.5 text-indigo-600" />
                        <span>选择要筛选的颜色标签：</span>
                      </span>
                      {modalFilterTagId && onFilterByTag && (
                        <button
                          type="button"
                          onClick={() => {
                            if (modalFilterTagId === 'all') {
                              onFilterByTag('all');
                            } else {
                              onFilterByTag(`custom:${modalFilterTagId}`);
                            }
                            onClose();
                          }}
                          className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                        >
                          在主界面筛选此标签 ↗
                        </button>
                      )}
                    </div>

                    {/* Tag Filter Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModalFilterTagId('all')}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          modalFilterTagId === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        全部待办 ({tasks.length})
                      </button>

                      {activeCategories.map(cat => {
                        const isSelected = modalFilterTagId === cat.id;
                        const style = getCategoryColorClasses(cat.color);
                        const IconComp = getTaskTagIcon(cat.iconName || 'Folder');
                        const count = getTagTaskCount(cat);

                        return (
                          <button
                            key={`filter-pill-${cat.id}`}
                            type="button"
                            onClick={() => setModalFilterTagId(cat.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? `${style.bgClass} ${style.textClass} ${style.borderClass} ring-2 ring-indigo-500 shadow-xs scale-102`
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <IconComp className="h-3 w-3" />
                            <span>{cat.name}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/5 font-bold">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Filtered Tasks Preview List */}
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {filteredModalTasks.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400">
                          {modalFilterTagId ? '选定标签下暂无关联待办任务' : '请点击上方标签进行筛选查看'}
                        </div>
                      ) : (
                        filteredModalTasks.map(t => (
                          <div
                            key={t.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                              t.id === formData.id
                                ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                                : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  t.is_completed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {t.is_completed ? '已完成' : '待办'}
                                </span>
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {t.title}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                截止：{t.deadline} {t.subtasks && t.subtasks.length > 0 && `· ${t.subtasks.length}个子步骤`}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setFormData(t);
                                setIsCategoryManuallySet(true);
                                setSubtasks(t.subtasks ? [...t.subtasks] : []);
                                showNotice(`已载入待办《${t.title.slice(0, 12)}...》进行编辑`);
                              }}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 cursor-pointer shrink-0"
                            >
                              载入编辑
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Quick Tag Selector Chips (Original System Rules) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">系统预设标签</label>
              <span className="text-[10px] text-slate-400 font-medium">点击可快捷切换或覆盖</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TASK_TAG_RULES.map(rule => {
                const isSelected = autoTag.label === rule.label;
                const RuleIcon = getTaskTagIcon(rule.iconName);
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => handleCategorySelect(rule.category, rule.label)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? `${rule.bgClass} ${rule.textClass} ${rule.borderClass} ring-2 ring-indigo-400/40 shadow-xs scale-102`
                        : 'bg-white/50 hover:bg-white/80 text-slate-600 border-white/80'
                    }`}
                  >
                    <RuleIcon className="h-3.5 w-3.5" />
                    <span>{rule.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">系统底层类别</label>
              <select
                value={formData.category || 'homework'}
                onChange={e => {
                  setIsCategoryManuallySet(true);
                  setFormData({ ...formData, category: e.target.value as TaskCategory });
                }}
                className="w-full px-3.5 py-2.5 border border-white/90 rounded-2xl bg-white/70 backdrop-blur-md font-bold text-slate-800 shadow-2xs cursor-pointer"
              >
                <option value="homework">课程作业</option>
                <option value="exam">考试复习</option>
                <option value="campus">校园事务</option>
                <option value="personal">个人规划</option>
                <option value="project">创新项目</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">优先级</label>
              <select
                value={formData.priority || 'medium'}
                onChange={e => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3.5 py-2.5 border border-white/90 rounded-2xl bg-white/70 backdrop-blur-md font-bold text-slate-800 shadow-2xs cursor-pointer"
              >
                <option value="high">🔥 紧急重要 (高)</option>
                <option value="medium">⚡ 标准任务 (中)</option>
                <option value="low">🌱 稍后处理 (低)</option>
              </select>
            </div>
          </div>

          {/* Associated Course & Project Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">关联课程 (可选)</label>
              <select
                value={formData.course_id || ''}
                onChange={e => {
                  const cId = e.target.value;
                  const found = courses.find(c => c.id === cId);
                  setFormData({ 
                    ...formData, 
                    course_id: cId,
                    course_name: found ? found.course_name : '',
                  });
                }}
                className="w-full px-3.5 py-2.5 border border-white/90 rounded-2xl bg-white/70 backdrop-blur-md font-medium text-slate-800 shadow-2xs cursor-pointer"
              >
                <option value="">-- 无关联课程 --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.course_name} ({c.teacher})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">项目标识 / 组别标签 (可选)</label>
              <input
                type="text"
                value={formData.project_tag || ''}
                onChange={e => setFormData({ ...formData, project_tag: e.target.value })}
                placeholder="例如：挑战杯团队、智能车竞赛"
                className="w-full px-3.5 py-2.5 border border-white/90 rounded-2xl bg-white/70 backdrop-blur-md font-medium text-slate-800 shadow-2xs"
              />
            </div>
          </div>

          {/* Specific Deadline (Date & Specific Time Picker) */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span>任务截止日期与具体时点 (Due Date & Time) *</span>
              </div>

              <button
                type="button"
                onClick={() => setIsManualTextMode(!isManualTextMode)}
                className="text-[10px] text-slate-400 hover:text-indigo-600 font-medium cursor-pointer underline"
              >
                {isManualTextMode ? '返回组件选择器' : '自定义文本格式'}
              </button>
            </div>

            {isManualTextMode ? (
              <input
                type="text"
                value={formData.deadline || ''}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                placeholder="例如：2026-09-05 18:00 或 2026-09-05"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs text-slate-800"
              />
            ) : (
              <div className="space-y-2.5">
                {/* 1. Date row */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-600">截止日期</span>
                    {/* Quick date chips */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => syncDeadline(getDatePreset('today'), dueTime, hasSpecificTime)}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          dueDate === getDatePreset('today') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        今天
                      </button>
                      <button
                        type="button"
                        onClick={() => syncDeadline(getDatePreset('tomorrow'), dueTime, hasSpecificTime)}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          dueDate === getDatePreset('tomorrow') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        明天
                      </button>
                      <button
                        type="button"
                        onClick={() => syncDeadline(getDatePreset('friday'), dueTime, hasSpecificTime)}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          dueDate === getDatePreset('friday') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        周五
                      </button>
                      <button
                        type="button"
                        onClick={() => syncDeadline(getDatePreset('monday'), dueTime, hasSpecificTime)}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          dueDate === getDatePreset('monday') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        下周一
                      </button>
                    </div>
                  </div>

                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => syncDeadline(e.target.value, dueTime, hasSpecificTime)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white font-mono font-medium text-slate-800 text-xs shadow-2xs cursor-pointer"
                  />
                </div>

                {/* 2. Specific Time Toggle & Picker */}
                <div className="pt-1 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasSpecificTime}
                        onChange={e => syncDeadline(dueDate, dueTime || '22:00', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5"
                      />
                      <span>指定具体截止时点 (如上课前、正午、晚自习)</span>
                    </label>

                    {!hasSpecificTime && (
                      <span className="text-[10px] text-slate-400 font-medium">默认全天 (23:59 截止)</span>
                    )}
                  </div>

                  {hasSpecificTime && (
                    <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">精确时分：</span>
                        <input
                          type="time"
                          value={dueTime}
                          onChange={e => syncDeadline(dueDate, e.target.value, true)}
                          className="px-3 py-1.5 border border-indigo-200 rounded-xl bg-white font-mono font-bold text-indigo-900 text-xs shadow-2xs cursor-pointer"
                        />
                      </div>

                      {/* Quick Time Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">快捷时段:</span>
                        {[
                          { label: '08:00 (早课前)', time: '08:00' },
                          { label: '12:00 (正午)', time: '12:00' },
                          { label: '18:00 (课后傍晚)', time: '18:00' },
                          { label: '21:30 (晚自习)', time: '21:30' },
                          { label: '23:59 (深夜压哨)', time: '23:59' },
                        ].map(preset => (
                          <button
                            key={preset.time}
                            type="button"
                            onClick={() => syncDeadline(dueDate, preset.time, true)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              dueTime === preset.time
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-600 border-indigo-100 hover:bg-indigo-50'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Combined Preview */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px]">
                  <span className="text-slate-500 font-medium">最终生效截止时间：</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {dueDate} {hasSpecificTime ? dueTime : '23:59'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4.35 Weekly Goal Flag Checkbox */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isWeeklyGoal}
                onChange={e => setIsWeeklyGoal(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
              />
              <div className="flex items-center gap-1.5">
                <Target className={`h-4 w-4 ${isWeeklyGoal ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="font-black text-slate-800 text-xs">
                  标记为本周重点目标 (Weekly Goal)
                </span>
              </div>
            </label>
            {isWeeklyGoal && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 border border-indigo-500/25">
                已加入周目标看板
              </span>
            )}
          </div>

          {/* Recurring Task Settings (Daily, Weekly, Monthly for repeating coursework & habits) */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                />
                <div className="flex items-center gap-1.5">
                  <Repeat className={`h-4 w-4 ${isRecurring ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span className="font-black text-slate-800 text-xs">
                    设为周期循环任务 / 习惯打卡
                  </span>
                </div>
              </label>

              {isRecurring && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 border border-teal-500/25">
                  已开启自动循环
                </span>
              )}
            </div>

            {isRecurring && (
              <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                {/* Frequency selector: Daily, Weekly, Monthly */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>重复频次 (Frequency)</span>
                    <span className="text-[10px] text-slate-400">完成打卡后自动顺延生成下期待办</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecurrencePattern('daily')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                        recurrencePattern === 'daily'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-black">每天 (Daily)</span>
                      <span className={`text-[10px] ${recurrencePattern === 'daily' ? 'text-teal-100' : 'text-slate-400'}`}>
                        单词/晨读/自习
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecurrencePattern('weekly')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                        recurrencePattern === 'weekly'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-black">每周 (Weekly)</span>
                      <span className={`text-[10px] ${recurrencePattern === 'weekly' ? 'text-indigo-100' : 'text-slate-400'}`}>
                        周常作业/组会预习
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecurrencePattern('monthly')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                        recurrencePattern === 'monthly'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-black">每月 (Monthly)</span>
                      <span className={`text-[10px] ${recurrencePattern === 'monthly' ? 'text-purple-100' : 'text-slate-400'}`}>
                        月考复盘/图书续借
                      </span>
                    </button>
                  </div>
                </div>

                {/* Recurrence Interval */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-600 text-[11px]">
                    循环间隔周期：
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">每隔</span>
                    <select
                      value={recurrenceInterval}
                      onChange={e => setRecurrenceInterval(parseInt(e.target.value, 10))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold font-mono text-slate-800"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                    </select>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {recurrencePattern === 'daily' ? '天' : recurrencePattern === 'weekly' ? '周' : '个月'}
                    </span>
                  </div>
                </div>

                {/* If Weekly: Days of Week chips */}
                {recurrencePattern === 'weekly' && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span>重复星期 (可选指定特定日)：</span>
                      <span className="text-[10px] text-slate-400">默认顺延 +7 天</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { day: 1, label: '一' },
                        { day: 2, label: '二' },
                        { day: 3, label: '三' },
                        { day: 4, label: '四' },
                        { day: 5, label: '五' },
                        { day: 6, label: '六' },
                        { day: 7, label: '日' }
                      ].map(d => {
                        const isSelected = recurrenceDaysOfWeek.includes(d.day);
                        return (
                          <button
                            key={d.day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setRecurrenceDaysOfWeek(prev => prev.filter(x => x !== d.day));
                              } else {
                                setRecurrenceDaysOfWeek(prev => [...prev, d.day].sort());
                              }
                            }}
                            className={`h-7 w-7 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Next Recurrence Preview */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-teal-50/80 border border-teal-200/60 text-[11px]">
                  <span className="text-teal-800 font-medium flex items-center gap-1">
                    <Repeat className="h-3.5 w-3.5 text-teal-600" />
                    <span>下次循环截止时间预计：</span>
                  </span>
                  <span className="font-mono font-bold text-teal-900 bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                    {calculateNextDeadline(
                      `${dueDate} ${hasSpecificTime ? dueTime : '23:59'}`,
                      recurrencePattern,
                      recurrenceInterval,
                      recurrenceDaysOfWeek
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4.45. Embedded Focus Timer Card & 7-Day Focus History */}
          <div className="pt-2 space-y-3">
            <TaskFocusTimerCard
              task={task}
              taskTitle={formData.title || ''}
              taskDescription={formData.description}
              taskCategory={formData.category}
              taskPriority={formData.priority}
              courseName={
                courses.find(c => c.id === formData.course_id)?.course_name ||
                formData.course_name
              }
              subtasksCount={subtasks.length}
              onCompleteSession={handleTimerSessionComplete}
              onExpandToFullScreen={onStartTaskFocus ? handleExpandFocus : undefined}
              focusReminderEnabled={focusReminderEnabled}
              onToggleFocusReminder={setFocusReminderEnabled}
            />
            <TaskFocusHistoryChart
              task={task}
              taskTitle={formData.title || ''}
              courseName={
                courses.find(c => c.id === formData.course_id)?.course_name ||
                formData.course_name
              }
              priority={formData.priority}
              deadline={`${dueDate} ${hasSpecificTime ? dueTime : '23:59'}`}
              isCompleted={formData.is_completed}
              subtasks={subtasks}
              refreshTrigger={focusHistoryRefreshKey}
            />
          </div>

          {/* 4.5. Nested Subtasks Breakdown (Project Milestones & Steps) */}
          <div className="space-y-3 pt-3 border-t border-white/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-indigo-600" />
                <label className="font-bold text-slate-800 text-sm">
                  子任务拆解与执行步骤
                </label>
                {subtasks.length > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 border border-indigo-500/20">
                    {subtasks.filter(s => s.is_completed).length}/{subtasks.length} 已完成
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateSubtasks}
                disabled={isGeneratingSubtasks}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-indigo-700 hover:text-white bg-indigo-50/90 hover:bg-indigo-600 border border-indigo-200/80 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 disabled:opacity-60"
                title="使用 Gemini AI 分析待办标题与说明，自动推荐 3-5 个执行步骤"
              >
                {isGeneratingSubtasks ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>AI 拆解中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 group-hover:text-white" />
                    <span>AI 智能拆解</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Proposed Subtasks Interactive Checklist Drawer */}
            {proposedSubtasks.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/75 border border-indigo-200/90 shadow-xs space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Gemini 建议拆解步骤（勾选后一键导入）</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProposedSubtasks([])}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg cursor-pointer"
                    title="关闭建议面板"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {proposedSubtasks.map((prop, idx) => (
                    <div
                      key={prop.id}
                      onClick={() => handleToggleProposedSubtask(prop.id)}
                      className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        prop.selected
                          ? 'bg-white border-indigo-300 text-slate-800 shadow-2xs'
                          : 'bg-white/50 border-slate-200/70 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                            prop.selected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {prop.selected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold truncate">
                          {idx + 1}. {prop.title}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 tabular-nums shrink-0">
                        预计 {prop.estimatedMinutes}m
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateSubtasks}
                    disabled={isGeneratingSubtasks}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isGeneratingSubtasks ? 'animate-spin' : ''}`} />
                    <span>换一批拆解方案</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProposedSubtasks([])}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:bg-white/70 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleImportProposedSubtasks}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>
                        导入选中 ({proposedSubtasks.filter(p => p.selected).length} 项)
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar when subtasks exist */}
            {subtasks.length > 0 && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (subtasks.filter(s => s.is_completed).length / subtasks.length) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Subtasks Item List */}
            {subtasks.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className={`group flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border transition-all ${
                      st.is_completed
                        ? 'bg-slate-50/70 border-slate-200/70 text-slate-400'
                        : 'bg-white/80 border-white/90 text-slate-800 hover:border-indigo-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className={`h-4.5 w-4.5 rounded-md flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                          st.is_completed
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                            : 'border-slate-300 bg-white hover:border-indigo-400'
                        }`}
                        title={st.is_completed ? '标记为未完成' : '标记为已完成'}
                      >
                        {st.is_completed && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>

                      <span
                        className={`text-xs font-semibold truncate transition-all ${
                          st.is_completed ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="删除此步骤"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Subtask Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="输入子步骤并按回车（如：数据收集、草图绘制...）"
                className="flex-1 px-3.5 py-2 text-xs border border-white/90 rounded-xl bg-white/70 backdrop-blur-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => handleAddSubtask()}
                disabled={!newSubtaskTitle.trim()}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 text-xs font-black transition-all cursor-pointer border border-indigo-200/80 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>添加步骤</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">补充说明与要点</label>
            <textarea
              rows={2}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="记录具体作业题目要求、提交方式等..."
              className="w-full px-4 py-2.5 border border-white/90 rounded-2xl bg-white/70 backdrop-blur-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium text-slate-900"
            />
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-white/60">
            {task ? (
              <button
                type="button"
                onClick={async () => {
                  const res = await copyTaskShareLink(task);
                  if (res.success) {
                    setIsLinkCopied(true);
                    setTimeout(() => setIsLinkCopied(false), 3000);
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                  isLinkCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                    : 'bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-700 border-slate-200/80 shadow-2xs'
                }`}
                title="复制此待办的分享专属链接，发给同学打开即可直接导入"
              >
                {isLinkCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-indigo-600" />}
                <span>{isLinkCopied ? '已复制分享链接！' : '复制分享链接'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100/60 font-bold cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-500/25 border border-white/30 transition-all active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>保存待办</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default TaskModal;

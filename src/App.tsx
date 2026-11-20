import React, { useState, useEffect } from 'react';
import { 
  TabType, 
  Course, 
  Notice, 
  Task, 
  UserProfile, 
  AppSettings,
  CustomTaskCategory 
} from './types';
import { CampusAPI } from './services/api';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeTab } from './components/HomeTab';
import { ScheduleTab } from './components/ScheduleTab';
import { NoticeTab } from './components/NoticeTab';
import { AIAssistantTab } from './components/AIAssistantTab';
import { ProfileTab } from './components/ProfileTab';
import { CourseModal } from './components/CourseModal';
import { NoticeDetailModal } from './components/NoticeDetailModal';
import { TaskModal } from './components/TaskModal';
import { SearchModal } from './components/SearchModal';
import { CommandPalette } from './components/CommandPalette';
import { PwaModal } from './components/PwaModal';
import { GroupMessageTodoModal } from './components/GroupMessageTodoModal';
import { FocusModeView } from './components/FocusModeView';
import { SharedTaskPromptModal } from './components/SharedTaskPromptModal';
import { decodeSharedTask, SharedTaskPayload } from './lib/taskShare';
import { CheckCircle2 } from 'lucide-react';
import { INITIAL_USER, INITIAL_COURSES, INITIAL_NOTICES, INITIAL_TASKS, INITIAL_SETTINGS, INITIAL_CUSTOM_CATEGORIES } from './mockData';
import { detectTaskAutoTag } from './lib/taskTags';
import {
  getAccentTheme,
  applyAccentThemeCssVars,
  getGlassPreset,
  applyGlassPresetCssVars,
} from './lib/accentTheme';
import { awardTaskXp, revokeTaskXp } from './lib/levelSystem';
import { generateNextRecurringTask } from './lib/recurringTasks';
import { NotificationManager } from './lib/notifications';
import { MilestoneUnlockToast } from './components/MilestoneUnlockToast';
import { PomodoroHistoryService } from './services/pomodoroHistory';
import {
  evaluateFocusMilestones,
  emitMilestoneUnlockToast,
  getSimulatedUnlockedIds,
  saveEquippedBadgeId,
  checkAndEmitNewlyUnlockedMilestones,
} from './lib/focusMilestones';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [customCategories, setCustomCategories] = useState<CustomTaskCategory[]>(INITIAL_CUSTOM_CATEGORIES);

  // Modals state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [isGroupMessageModalOpen, setIsGroupMessageModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusingTaskId, setFocusingTaskId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);

  // Active Tag Filter synced with HomeTab and TaskModal
  const [homeTagFilter, setHomeTagFilter] = useState<string>('all');

  // Shared task prompt state for received share links (?share_task=...)
  const [sharedTaskToPrompt, setSharedTaskToPrompt] = useState<SharedTaskPayload | null>(null);

  // Check for shared task in URL parameters on mount or hash change
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let shareParam = urlParams.get('share_task');
      if (!shareParam && window.location.hash.includes('share_task=')) {
        const hashMatch = window.location.hash.match(/share_task=([^&]+)/);
        if (hashMatch) shareParam = hashMatch[1];
      }

      if (shareParam) {
        const decoded = decodeSharedTask(shareParam);
        if (decoded) {
          setSharedTaskToPrompt(decoded);
        }
      }
    } catch (e) {
      console.warn('Failed to parse share_task URL parameter', e);
    }
  }, []);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Listen for browser PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Initial Load from API / Storage
  useEffect(() => {
    async function loadData() {
      const [userData, coursesData, noticesData, tasksData, settingsData, categoriesData] = await Promise.all([
        CampusAPI.getUserProfile(),
        CampusAPI.getCourses(),
        CampusAPI.getNotices(),
        CampusAPI.getTasks(),
        CampusAPI.getSettings(),
        CampusAPI.getCustomTaskCategories(),
      ]);
      setUser(userData);
      setCourses(coursesData);
      setNotices(noticesData);
      setTasks(tasksData);
      setSettings(settingsData);
      if (categoriesData && categoriesData.length > 0) {
        setCustomCategories(categoriesData);
      }
    }
    loadData();
  }, []);

  // Keyboard shortcut Ctrl+K for search, Ctrl+P for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2-Hour Due Task Desktop Notification Auto-Check Engine (Browser Notification API)
  useEffect(() => {
    if (settings.notification_alert === false) return;

    const runCheck = () => {
      const { notifiedCount } = NotificationManager.checkAndNotifyDueTasks(
        tasks,
        (task) => {
          setSelectedTask(task);
          setIsTaskModalOpen(true);
        }
      );
      if (notifiedCount > 0) {
        showToast(`⏰ 已向系统桌面推送 ${notifiedCount} 项即将在 2 小时内截止的待办提醒！`, 'info');
      }
    };

    // Immediate check
    runCheck();

    // Check periodically every 60 seconds
    const interval = setInterval(runCheck, 60000);
    return () => clearInterval(interval);
  }, [tasks, settings.notification_alert]);

  // Handlers
  const handleRefreshSync = async () => {
    const now = new Date();
    const timeFormatted = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const updated = await CampusAPI.updateUserProfile({ last_sync_time: timeFormatted, cas_sync_status: 'synced' });
    setUser(updated);
    showToast('综合教务系统与校园数据已成功同步！');
  };

  const handleSaveCourse = async (course: Course) => {
    const updated = await CampusAPI.saveCourse(course);
    setCourses(updated);
    showToast(`课程《${course.course_name}》已成功保存`);
  };

  const handleDeleteCourse = async (courseId: string) => {
    const updated = await CampusAPI.deleteCourse(courseId);
    setCourses(updated);
    showToast('课程已删除');
  };

  const handleToggleNoticeStar = async (noticeId: string) => {
    const updated = await CampusAPI.toggleNoticeStar(noticeId);
    setNotices(updated);
    const n = updated.find(item => item.id === noticeId);
    showToast(n?.is_starred ? '已加入收藏列表' : '已取消收藏');
  };

  const handleToggleNoticeRead = async (noticeId: string) => {
    const updated = await CampusAPI.toggleNoticeRead(noticeId);
    setNotices(updated);
  };

  const handleConvertNoticeToTask = async (notice: Notice) => {
    const title = `【待办】${notice.title.slice(0, 30)}`;
    const initialCategory = notice.category === 'academic' ? 'homework' : 'campus';
    const autoTag = detectTaskAutoTag(title, initialCategory);

    const newTask: Task = {
      id: `t_${Date.now()}`,
      title,
      description: `来自通知《${notice.title}》：\n${notice.summary}`,
      category: autoTag.category || initialCategory,
      priority: notice.is_urgent ? 'high' : 'medium',
      deadline: notice.deadline || '2026-09-10 18:00',
      is_completed: false,
      created_at: new Date().toISOString().split('T')[0],
      auto_tag_label: autoTag.label,
      auto_tag_icon: autoTag.iconName,
    };
    const updated = await CampusAPI.saveTask(newTask);
    setTasks(updated);
    showToast(`已将《${notice.title.slice(0, 15)}...》截止事项加入待办清单！`);
  };

  const handlePromptInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('感谢安装 CampusOS！已添加到系统桌面');
          setDeferredPrompt(null);
          setIsPwaModalOpen(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const previousTask = tasks.find(item => item.id === taskId);
    const updated = await CampusAPI.toggleTaskCompleted(taskId);
    setTasks(updated);
    const t = updated.find(item => item.id === taskId);

    if (t?.is_completed) {
      const currentXp = user.xp ?? 220;
      const result = awardTaskXp(currentXp, t);
      const updatedUser = await CampusAPI.updateUserProfile({
        xp: result.newXp,
        level: result.newLevel,
      });
      setUser(updatedUser);

      if (result.leveledUp) {
        showToast(`🌟 恭喜晋级 Lv.${result.newLevel} 【${result.levelInfo.title}】！获得 +${result.gainedXp} XP 待办成长奖励！`);
      } else {
        showToast(`🎉 完成待办！获得 +${result.gainedXp} XP (当前 Lv.${result.newLevel} ${result.levelInfo.progressPercent}%)`);
      }

      // Check and trigger Milestone Unlock Celebration Toast on task completion
      const historyRecords = PomodoroHistoryService.getHistory();
      const simIds = getSimulatedUnlockedIds();
      const newlyUnlocked = checkAndEmitNewlyUnlockedMilestones(historyRecords, simIds);
      if (newlyUnlocked.length === 0 && (result.leveledUp || t.priority === 'high')) {
        const milestoneSummary = evaluateFocusMilestones(historyRecords, simIds);
        const targetBadge =
          milestoneSummary.badges.find(b => b.id === 'deep_work_master' && b.isUnlocked) ||
          milestoneSummary.badges.find(b => b.isUnlocked);
        if (targetBadge) {
          emitMilestoneUnlockToast(targetBadge);
        }
      }

      // If task is a recurring task, automatically generate next cycle's occurrence
      if (t.is_recurring && t.recurrence_pattern && t.recurrence_pattern !== 'none') {
        const nextRecurringTask = generateNextRecurringTask(t);
        if (nextRecurringTask) {
          const withNext = await CampusAPI.saveTask(nextRecurringTask);
          setTasks(withNext);
          const freqLabel = t.recurrence_pattern === 'daily' ? '每天' : t.recurrence_pattern === 'weekly' ? '每周' : '每月';
          setTimeout(() => {
            showToast(`🔄 ${freqLabel}循环任务打卡成功（已坚持 ${nextRecurringTask.recurrence_streak} 期）！已自动生成下期（${nextRecurringTask.deadline.split(' ')[0]} 截止）`);
          }, 1200);
        }
      }
    } else if (previousTask?.is_completed && !t?.is_completed) {
      const currentXp = user.xp ?? 220;
      const result = revokeTaskXp(currentXp, previousTask);
      const updatedUser = await CampusAPI.updateUserProfile({
        xp: result.newXp,
        level: result.levelInfo.level,
      });
      setUser(updatedUser);
    }
  };

  const handleSaveTask = async (task: Task) => {
    const updated = await CampusAPI.saveTask(task);
    setTasks(updated);
    showToast('待办任务已保存');
  };

  const handleConfirmImportSharedTask = (shared: SharedTaskPayload) => {
    const newTask: Task = {
      id: `task_shared_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: shared.title,
      description: shared.description || '',
      category: shared.category || 'homework',
      priority: shared.priority || 'medium',
      deadline: shared.deadline || `${new Date().toISOString().slice(0, 10)} 23:59`,
      is_completed: false,
      course_id: shared.course_id || '',
      course_name: shared.course_name || '',
      created_at: new Date().toISOString().slice(0, 10),
      estimated_hours: shared.estimated_hours,
      notes: shared.notes || '',
      auto_tag_label: shared.auto_tag_label,
      auto_tag_icon: shared.auto_tag_icon,
      tags: shared.tags || [],
      subtasks: shared.subtasks,
    };

    handleSaveTask(newTask);
    setSharedTaskToPrompt(null);
    showToast(`✅ 已成功将同学分享的待办《${shared.title.slice(0, 14)}...》添加至您的学业日程！`);

    // Clean up URL query parameter without page reload
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {
      // ignore
    }
  };

  const handleDismissSharedTask = () => {
    setSharedTaskToPrompt(null);
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {
      // ignore
    }
  };

  const handleReorderTasks = async (reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
    await CampusAPI.reorderTasks(reorderedTasks);
    showToast('📌 高优待办排序已保存');
  };

  const handleAddTaskFromAI = async (title: string, deadline?: string) => {
    const finalTitle = `【AI定制】${title}`;
    const autoTag = detectTaskAutoTag(finalTitle, 'personal');

    const newTask: Task = {
      id: `t_${Date.now()}`,
      title: finalTitle,
      category: autoTag.category || 'personal',
      priority: 'high',
      deadline: deadline || `${new Date().toISOString().split('T')[0]} 22:00`,
      is_completed: false,
      created_at: new Date().toISOString().split('T')[0],
      auto_tag_label: autoTag.label,
      auto_tag_icon: autoTag.iconName,
    };
    const updated = await CampusAPI.saveTask(newTask);
    setTasks(updated);
    showToast('已由 AI 自动生成并加入待办清单！');
  };

  const handleUpdateUser = async (updatedFields: Partial<UserProfile>) => {
    const res = await CampusAPI.updateUserProfile(updatedFields);
    setUser(res);
    showToast('个人信息与校园卡已更新');
  };

  const handleUpdateSettings = async (updatedFields: Partial<AppSettings>) => {
    const res = await CampusAPI.saveSettings({ ...settings, ...updatedFields });
    setSettings(res);
    showToast('系统设置已更新');
  };

  const handleSaveCustomCategory = async (category: CustomTaskCategory) => {
    const updated = await CampusAPI.saveCustomTaskCategory(category);
    setCustomCategories(updated);
    showToast(`分类「${category.name}」已保存`);
  };

  const handleDeleteCustomCategory = async (categoryId: string) => {
    const updated = await CampusAPI.deleteCustomTaskCategory(categoryId);
    setCustomCategories(updated);
    showToast('分类已删除');
  };

  const handleResetData = () => {
    CampusAPI.resetAllData();
    setUser(INITIAL_USER);
    setCourses(INITIAL_COURSES);
    setNotices(INITIAL_NOTICES);
    setTasks(INITIAL_TASKS);
    setSettings(INITIAL_SETTINGS);
    setCustomCategories(INITIAL_CUSTOM_CATEGORIES);
    showToast('已恢复为官方初始演示数据集');
  };

  const handleImportData = async (backupData: any) => {
    const res = await CampusAPI.importAndMergeData(backupData);
    setUser(res.user);
    setSettings(res.settings);
    setCourses(res.courses);
    setTasks(res.tasks);
    setNotices(res.notices);
    showToast('本地配置数据已成功解析并合并！');
    return res;
  };

  const handleExportBackupDirectly = () => {
    const backup = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      user,
      settings,
      courses,
      tasks,
      notices,
      stats: {
        total_courses: courses.length,
        total_tasks: tasks.length,
        total_notices: notices.length,
      }
    };
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `CampusOS_Backup_${user.student_id}_${new Date().toISOString().split('T')[0]}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已成功导出 ${courses.length} 门课程、${tasks.length} 项待办至 ${fileName}`);
  };

  const currentAccent = getAccentTheme(settings.accent_color);
  const currentGlassPreset = getGlassPreset(settings.glass_preset);

  // Apply accent theme & Liquid Glass 2.0 optical preset CSS custom variables globally
  useEffect(() => {
    applyAccentThemeCssVars(currentAccent);
  }, [settings.accent_color]);

  useEffect(() => {
    applyGlassPresetCssVars(currentGlassPreset);
  }, [settings.glass_preset]);

  // Liquid Glass 2.0 Mouse-Follow Specular Spotlight tracker for .glass-panel-interactive
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '.glass-panel-interactive'
      ) as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      target.style.setProperty('--mouse-x', `${x}px`);
      target.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  const unreadNoticeCount = notices.filter(n => !n.is_read).length;
  const pendingTaskCount = tasks.filter(t => !t.is_completed).length;

  const handleStartTaskFocus = (task: Task) => {
    setFocusingTaskId(task.id);
    setIsFocusMode(true);
    showToast(`⏱️ 已为待办《${task.title.slice(0, 16)}...》开启专属番茄钟深度专注！`);
  };

  return (
    <div 
      className="relative min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans overflow-x-hidden"
      data-accent-theme={currentAccent.id}
    >
      
      {/* Background Liquid Ambient Mesh Glow Orbs (Dynamic Theme Responsive) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Orb 1: Top Left */}
        <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full bg-linear-to-br ${currentAccent.orbs.orb1} blur-3xl animate-orb-1 transition-all duration-700`} />
        {/* Orb 2: Center Right */}
        <div className={`absolute top-1/4 -right-24 w-[32rem] h-[32rem] rounded-full bg-linear-to-bl ${currentAccent.orbs.orb2} blur-3xl animate-orb-2 transition-all duration-700`} />
        {/* Orb 3: Bottom Left */}
        <div className={`absolute bottom-12 -left-20 w-[28rem] h-[28rem] rounded-full bg-linear-to-tr ${currentAccent.orbs.orb3} blur-3xl animate-orb-3 transition-all duration-700`} />
        {/* Orb 4: Bottom Center */}
        <div className={`absolute -bottom-20 right-1/3 w-80 h-80 rounded-full bg-linear-to-t ${currentAccent.orbs.orb4} blur-3xl transition-all duration-700`} />
      </div>

      {/* Top Header */}
      <Header
        user={user}
        settings={settings}
        unreadNoticeCount={unreadNoticeCount}
        pendingTaskCount={pendingTaskCount}
        onRefreshSync={handleRefreshSync}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenNotice={() => setCurrentTab('notice')}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => {
          setIsFocusMode(prev => {
            const next = !prev;
            if (next) {
              showToast('🧘 已进入沉浸专注模式：导航已收起，仅显示待办与番茄钟');
            } else {
              showToast('已退出专注模式，已恢复全局多维视图');
            }
            return next;
          });
        }}
      />

      {/* Main Navigation (Desktop Top Bar & Mobile Bottom) - Collapsed when Focus Mode is Active */}
      {!isFocusMode && (
        <Navigation
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          unreadNoticeCount={unreadNoticeCount}
          pendingTaskCount={pendingTaskCount}
          settings={settings}
          tasks={tasks}
        />
      )}

      {/* Main Content Area - Generous Breathing Room */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {isFocusMode ? (
          <FocusModeView
            tasks={tasks}
            courses={courses}
            settings={settings}
            initialTaskId={focusingTaskId}
            onToggleTask={handleToggleTask}
            onSaveTask={handleSaveTask}
            onExitFocusMode={() => {
              setIsFocusMode(false);
              setFocusingTaskId(null);
              showToast('已退出专注模式，已恢复全局视图');
            }}
            onAskAI={() => {
              setIsFocusMode(false);
              setCurrentTab('ai');
            }}
            onNavigateTab={tab => {
              setIsFocusMode(false);
              setCurrentTab(tab);
            }}
          />
        ) : (
          <>
            {currentTab === 'home' && (
          <HomeTab
            user={user}
            settings={settings}
            courses={courses}
            notices={notices}
            tasks={tasks}
            onNavigateTab={setCurrentTab}
            onSelectCourse={c => {
              setSelectedCourse(c);
              setIsCourseModalOpen(true);
            }}
            onSelectNotice={n => {
              setSelectedNotice(n);
              setIsNoticeModalOpen(true);
            }}
            onToggleTask={handleToggleTask}
            onOpenAddTask={() => {
              setSelectedTask(null);
              setIsTaskModalOpen(true);
            }}
            onOpenAddCourse={() => {
              setSelectedCourse(null);
              setIsCourseModalOpen(true);
            }}
            onAskAI={prompt => {
              setCurrentTab('ai');
            }}
            onOpenGroupMessageTodo={() => setIsGroupMessageModalOpen(true)}
            customCategories={customCategories}
            onReorderTasks={handleReorderTasks}
            onSelectTask={t => {
              setSelectedTask(t);
              setIsTaskModalOpen(true);
            }}
            onSaveTask={handleSaveTask}
            onStartTaskFocus={handleStartTaskFocus}
            showToast={showToast}
          />
        )}

        {currentTab === 'schedule' && (
          <ScheduleTab
            courses={courses}
            settings={settings}
            tasks={tasks}
            onSelectCourse={c => {
              setSelectedCourse(c);
              setIsCourseModalOpen(true);
            }}
            onSelectTask={t => {
              setSelectedTask(t);
              setIsTaskModalOpen(true);
            }}
            onOpenAddCourse={() => {
              setSelectedCourse(null);
              setIsCourseModalOpen(true);
            }}
            onAskAIForStudyPlan={() => {
              setCurrentTab('ai');
            }}
            onSaveTask={handleSaveTask}
          />
        )}

        {currentTab === 'notice' && (
          <NoticeTab
            notices={notices}
            onSelectNotice={n => {
              setSelectedNotice(n);
              setIsNoticeModalOpen(true);
            }}
            onToggleStar={handleToggleNoticeStar}
            onToggleRead={handleToggleNoticeRead}
            onConvertNoticeToTask={handleConvertNoticeToTask}
          />
        )}

        {currentTab === 'ai' && (
          <AIAssistantTab
            courses={courses}
            tasks={tasks}
            onAddTaskFromAI={handleAddTaskFromAI}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileTab
            user={user}
            settings={settings}
            courses={courses}
            tasks={tasks}
            notices={notices}
            onUpdateUser={handleUpdateUser}
            onUpdateSettings={handleUpdateSettings}
            onResetData={handleResetData}
            onImportData={handleImportData}
            onOpenPwaModal={() => setIsPwaModalOpen(true)}
            onNavigateTab={setCurrentTab}
          />
        )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <CourseModal
        course={selectedCourse}
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={handleSaveCourse}
        onDelete={handleDeleteCourse}
      />

      <NoticeDetailModal
        notice={selectedNotice}
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        onToggleStar={handleToggleNoticeStar}
        onToggleRead={handleToggleNoticeRead}
        onConvertToTask={handleConvertNoticeToTask}
      />

      <TaskModal
        task={selectedTask}
        courses={courses}
        tasks={tasks}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        customCategories={customCategories}
        onSaveCustomCategory={handleSaveCustomCategory}
        onDeleteCustomCategory={handleDeleteCustomCategory}
        onSelectTask={t => setSelectedTask(t)}
        onFilterByTag={tagId => {
          setHomeTagFilter(tagId);
          setCurrentTab('home');
          setIsTaskModalOpen(false);
          showToast('🏷️ 已切换至主界面并按选定标签筛选待办');
        }}
        onStartTaskFocus={handleStartTaskFocus}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        courses={courses}
        notices={notices}
        tasks={tasks}
        onSelectCourse={c => {
          setSelectedCourse(c);
          setIsCourseModalOpen(true);
        }}
        onSelectNotice={n => {
          setSelectedNotice(n);
          setIsNoticeModalOpen(true);
        }}
        onAskAI={query => {
          setCurrentTab('ai');
        }}
      />

      {/* Global Command Palette (Ctrl+P / Cmd+P) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={tab => setCurrentTab(tab)}
        onOpenNewTask={() => {
          setSelectedTask(null);
          setIsTaskModalOpen(true);
        }}
        onOpenNewCourse={() => {
          setSelectedCourse(null);
          setIsCourseModalOpen(true);
        }}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onRefreshSync={handleRefreshSync}
        onExportBackup={handleExportBackupDirectly}
        onOpenImport={() => {
          setCurrentTab('profile');
          setTimeout(() => {
            const btn = document.getElementById('profile-import-data-btn');
            if (btn) btn.click();
          }, 300);
        }}
        onResetData={handleResetData}
        onTriggerAIPrompt={prompt => {
          setCurrentTab('ai');
        }}
        onOpenGroupMessageTodo={() => setIsGroupMessageModalOpen(true)}
      />

      {/* AI Group Message Todo Extractor Modal */}
      <GroupMessageTodoModal
        isOpen={isGroupMessageModalOpen}
        onClose={() => setIsGroupMessageModalOpen(false)}
        onImportToTasks={async (task) => {
          await handleSaveTask(task);
        }}
        showToast={showToast}
      />

      {/* PWA Immersion & Desktop Installation Modal */}
      <PwaModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        user={user}
        settings={settings}
        deferredPrompt={deferredPrompt}
        onPromptInstall={handlePromptInstall}
        onShowToast={showToast}
      />

      {/* Shared Task Recipient Prompt Modal */}
      <SharedTaskPromptModal
        sharedTask={sharedTaskToPrompt}
        isOpen={Boolean(sharedTaskToPrompt)}
        onConfirm={handleConfirmImportSharedTask}
        onClose={handleDismissSharedTask}
      />

      {/* Milestone Unlock Celebration Toast (Rich Badge Emblem Card + Chime + Quick Actions) */}
      <MilestoneUnlockToast
        equippedBadgeId={user.equipped_badge_id}
        onEquipBadge={async (badgeId) => {
          saveEquippedBadgeId(badgeId);
          const updatedUser = await CampusAPI.updateUserProfile({
            equipped_badge_id: badgeId,
          });
          setUser(updatedUser);
          showToast('✨ 已佩戴新解锁的专注里程碑勋章！');
        }}
        onNavigateToProfile={() => {
          setIsFocusMode(false);
          setIsTaskModalOpen(false);
          setCurrentTab('profile');
        }}
      />

      {/* Toast Alert Banner (Liquid Glass) */}
      {toastMessage && (
        <div className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-50 glass-dark text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-white/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
}
export default App;

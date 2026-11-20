import { Notice, Task } from '../types';

const NOTIFIED_KEY = 'campus_os_notified_urgent_notices_session';
const TASK_NOTIFIED_KEY = 'campus_os_notified_due_tasks_session';

function getNotifiedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedSet(set: Set<string>): void {
  try {
    sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function getTaskNotifiedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(TASK_NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveTaskNotifiedSet(set: Set<string>): void {
  try {
    sessionStorage.setItem(TASK_NOTIFIED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export interface TaskDueAlertItem {
  task: Task;
  minutesLeft: number;
  deadlineDate: Date;
}

export const NotificationManager = {
  isSupported: (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPermission: (): NotificationPermission => {
    if (!NotificationManager.isSupported()) return 'denied';
    return Notification.permission;
  },

  requestPermission: async (): Promise<NotificationPermission> => {
    if (!NotificationManager.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  },

  sendUrgentNoticeNotification: (notice: Notice, onSelectNotice?: (n: Notice) => void): boolean => {
    if (!NotificationManager.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const notifiedSet = getNotifiedSet();
    if (notifiedSet.has(notice.id)) return false;

    try {
      const title = `🚨 紧急教务预警 · ${notice.category_name || '通知中心'}`;
      const deadlineText = notice.deadline ? `\n⏳ 截止时间：${notice.deadline}` : '';
      const body = `${notice.title}${deadlineText}\n${notice.summary ? notice.summary.slice(0, 60) + '...' : ''}`;

      const notification = new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e11d48"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
        tag: `campus-os-urgent-${notice.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onSelectNotice) {
          onSelectNotice(notice);
        }
      };

      notifiedSet.add(notice.id);
      saveNotifiedSet(notifiedSet);
      return true;
    } catch (e) {
      console.warn('[CampusOS Notification Error]', e);
      return false;
    }
  },

  // 待办在指定小时（默认 2 小时）内即将截止的检索
  getTasksDueWithinHours: (tasks: Task[], hours = 2): TaskDueAlertItem[] => {
    const now = new Date();
    const result: TaskDueAlertItem[] = [];

    tasks.forEach(task => {
      if (task.is_completed || task.completed) return;
      if (!task.deadline) return;

      try {
        let deadlineDate: Date;
        const clean = task.deadline.trim();
        if (clean.includes(' ')) {
          const [dPart, tPart] = clean.split(' ');
          const [y, m, d] = dPart.split('-').map(Number);
          const [h, min] = tPart.split(':').map(Number);
          deadlineDate = new Date(y, m - 1, d, h || 23, min || 59, 0);
        } else {
          const [y, m, d] = clean.split('-').map(Number);
          deadlineDate = new Date(y, m - 1, d, 23, 59, 59);
        }

        const diffMinutes = (deadlineDate.getTime() - now.getTime()) / (1000 * 60);

        // 截止时间在未来 2 小时之内（或者刚过期 10 分钟内未标记完成）
        if (diffMinutes > -10 && diffMinutes <= hours * 60) {
          result.push({
            task,
            minutesLeft: Math.round(diffMinutes),
            deadlineDate,
          });
        }
      } catch {}
    });

    return result.sort((a, b) => a.minutesLeft - b.minutesLeft);
  },

  // 发送 2 小时内待办桌面预警弹窗
  sendTaskDueNotification: (
    task: Task, 
    minutesLeft: number, 
    onSelectTask?: (t: Task) => void,
    force = false
  ): boolean => {
    if (!NotificationManager.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const taskNotifiedSet = getTaskNotifiedSet();
    if (!force && taskNotifiedSet.has(task.id)) return false;

    try {
      const minutesText = minutesLeft <= 0 
        ? '即将截止或已临界' 
        : minutesLeft < 60 
        ? `还剩 ${minutesLeft} 分钟截止` 
        : `还剩约 ${Math.floor(minutesLeft / 60)} 小时 ${minutesLeft % 60} 分钟`;

      const title = `⏰ 待办即将截止提醒 (${minutesText})`;
      const courseInfo = task.course_name ? `【${task.course_name}】` : task.project_tag ? `【项目: ${task.project_tag}】` : '';
      const body = `${courseInfo}${task.title}\n⏳ 截止时间：${task.deadline}\n请及时在 CampusOS 中处理或勾选完成打卡！`;

      const notification = new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 15H11v-2h1.5v2zm0-4H11V7h1.5v6z"/></svg>',
        tag: `campus-os-task-due-${task.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onSelectTask) {
          onSelectTask(task);
        }
      };

      taskNotifiedSet.add(task.id);
      saveTaskNotifiedSet(taskNotifiedSet);
      return true;
    } catch (e) {
      console.warn('[CampusOS Task Due Notification Error]', e);
      return false;
    }
  },

  // 扫描所有任务并在发现符合 2 小时内截止的任务时自动推送桌面弹窗
  checkAndNotifyDueTasks: (
    tasks: Task[], 
    onSelectTask?: (t: Task) => void
  ): { notifiedCount: number; dueItems: TaskDueAlertItem[] } => {
    const dueItems = NotificationManager.getTasksDueWithinHours(tasks, 2);
    let notifiedCount = 0;

    if (NotificationManager.getPermission() === 'granted') {
      dueItems.forEach(item => {
        const sent = NotificationManager.sendTaskDueNotification(
          item.task, 
          item.minutesLeft, 
          onSelectTask
        );
        if (sent) notifiedCount++;
      });
    }

    return { notifiedCount, dueItems };
  },

  // 清除待办会话通知记录，允许测试
  resetTaskNotifiedSession: () => {
    try {
      sessionStorage.removeItem(TASK_NOTIFIED_KEY);
    } catch {}
  },

  // 清除紧急通知会话记录，允许重发测试
  resetNotifiedSession: () => {
    try {
      sessionStorage.removeItem(NOTIFIED_KEY);
    } catch {}
  },
};

import { Task, RecurrenceFrequency } from '../types';

/**
 * Helper to calculate the next deadline based on recurrence pattern
 */
export function calculateNextDeadline(
  currentDeadlinestr: string,
  pattern: RecurrenceFrequency = 'daily',
  interval: number = 1,
  daysOfWeek?: number[]
): string {
  if (!currentDeadlinestr) {
    const now = new Date();
    currentDeadlinestr = `${now.toISOString().split('T')[0]} 23:59`;
  }

  const parts = currentDeadlinestr.trim().split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '23:59';

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const baseDate = new Date(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1,
    parseInt(dayStr, 10),
    12, // midday to prevent DST shift
    0,
    0
  );

  const nextDate = new Date(baseDate);

  if (pattern === 'daily') {
    if (daysOfWeek && daysOfWeek.length > 0) {
      // Find the next matching day of week (1=Mon ... 7=Sun)
      let found = false;
      for (let offset = 1; offset <= 14; offset++) {
        const testD = new Date(baseDate);
        testD.setDate(baseDate.getDate() + offset);
        const jsDay = testD.getDay();
        const campusDay = jsDay === 0 ? 7 : jsDay;
        if (daysOfWeek.includes(campusDay)) {
          nextDate.setTime(testD.getTime());
          found = true;
          break;
        }
      }
      if (!found) {
        nextDate.setDate(baseDate.getDate() + Math.max(1, interval));
      }
    } else {
      nextDate.setDate(baseDate.getDate() + Math.max(1, interval));
    }
  } else if (pattern === 'weekly') {
    nextDate.setDate(baseDate.getDate() + 7 * Math.max(1, interval));
  } else if (pattern === 'monthly') {
    nextDate.setMonth(baseDate.getMonth() + Math.max(1, interval));
  }

  const y = nextDate.getFullYear();
  const m = String(nextDate.getMonth() + 1).padStart(2, '0');
  const d = String(nextDate.getDate()).padStart(2, '0');

  return `${y}-${m}-${d} ${timePart}`;
}

/**
 * Creates the next iteration of a recurring task
 */
export function generateNextRecurringTask(completedTask: Task): Task | null {
  if (!completedTask.is_recurring || !completedTask.recurrence_pattern || completedTask.recurrence_pattern === 'none') {
    return null;
  }

  const nextDeadline = calculateNextDeadline(
    completedTask.deadline,
    completedTask.recurrence_pattern,
    completedTask.recurrence_interval || 1,
    completedTask.recurrence_days_of_week
  );

  const nextStreak = (completedTask.recurrence_streak || 0) + 1;

  const nextTask: Task = {
    ...completedTask,
    id: `t_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    deadline: nextDeadline,
    is_completed: false,
    completed: false,
    created_at: new Date().toISOString().split('T')[0],
    parent_recurring_id: completedTask.parent_recurring_id || completedTask.id,
    recurrence_streak: nextStreak,
  };

  return nextTask;
}

/**
 * Returns user-facing label and styling for recurrence frequency
 */
export function getRecurrenceLabel(
  pattern?: RecurrenceFrequency,
  interval: number = 1
): {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  switch (pattern) {
    case 'daily':
      return {
        label: interval > 1 ? `每 ${interval} 天` : '每天循环',
        badgeBg: 'bg-teal-500/10',
        badgeText: 'text-teal-700',
        badgeBorder: 'border-teal-500/25',
      };
    case 'weekly':
      return {
        label: interval > 1 ? `每 ${interval} 周` : '每周循环',
        badgeBg: 'bg-indigo-500/10',
        badgeText: 'text-indigo-700',
        badgeBorder: 'border-indigo-500/25',
      };
    case 'monthly':
      return {
        label: interval > 1 ? `每 ${interval} 月` : '每月循环',
        badgeBg: 'bg-purple-500/10',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-500/25',
      };
    default:
      return {
        label: '单次任务',
        badgeBg: 'bg-slate-500/10',
        badgeText: 'text-slate-600',
        badgeBorder: 'border-slate-500/20',
      };
  }
}

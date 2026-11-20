import { Task, TaskCategory, TaskPriority, SubTask } from '../types';

export interface SharedTaskPayload {
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  deadline: string;
  course_name?: string;
  course_id?: string;
  estimated_hours?: number;
  notes?: string;
  auto_tag_label?: string;
  auto_tag_icon?: string;
  tags?: string[];
  subtasks?: SubTask[];
  shared_by?: string;
  created_at?: string;
}

/**
 * Safely encode a task payload into a URL-safe Base64 string
 */
export function encodeSharedTask(task: Task, sharedBy?: string): string {
  const payload: SharedTaskPayload = {
    title: task.title,
    description: task.description || '',
    category: task.category,
    priority: task.priority,
    deadline: task.deadline,
    course_name: task.course_name,
    course_id: task.course_id,
    estimated_hours: task.estimated_hours,
    notes: task.notes,
    auto_tag_label: task.auto_tag_label,
    auto_tag_icon: task.auto_tag_icon,
    tags: task.tags,
    subtasks: task.subtasks,
    shared_by: sharedBy || '同学',
    created_at: new Date().toISOString(),
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // URL-safe base64 encoding with UTF-8 support
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return encodeURIComponent(base64);
  } catch (e) {
    console.error('Failed to encode shared task', e);
    return '';
  }
}

/**
 * Decode a URL-safe Base64 string into a SharedTaskPayload
 */
export function decodeSharedTask(encodedStr: string): SharedTaskPayload | null {
  if (!encodedStr) return null;
  try {
    const base64 = decodeURIComponent(encodedStr);
    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const payload = JSON.parse(jsonStr) as SharedTaskPayload;
    if (payload && typeof payload.title === 'string' && payload.title.trim().length > 0) {
      return payload;
    }
  } catch (e) {
    console.warn('Failed to parse shared task URL parameter', e);
  }
  return null;
}

/**
 * Generate full share link for a task
 */
export function generateTaskShareLink(task: Task, sharedBy?: string): string {
  const encoded = encodeSharedTask(task, sharedBy);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?share_task=${encoded}`;
}

/**
 * Copy task share link to clipboard with native API + textarea fallback
 */
export async function copyTaskShareLink(task: Task, sharedBy?: string): Promise<{ success: boolean; url: string }> {
  const url = generateTaskShareLink(task, sharedBy);
  
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(url);
      return { success: true, url };
    } catch (e) {
      console.warn('Navigator clipboard write failed, trying fallback', e);
    }
  }

  // Fallback using temporary textarea
  try {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return { success: successful, url };
  } catch (err) {
    console.error('Copy fallback failed', err);
    return { success: false, url };
  }
}

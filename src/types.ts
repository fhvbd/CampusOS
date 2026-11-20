export type TabType = 'home' | 'schedule' | 'notice' | 'notices' | 'ai' | 'profile';
export type TabKey = TabType;

export type CourseColorKey = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'teal' | 'slate';

export interface UserProfile {
  student_id: string;
  username: string;
  avatar?: string;
  university: string;
  college: string;
  major: string;
  grade: string;
  class_name: string;
  gpa: number;
  credits_earned: number;
  credits_total: number;
  campus_card_balance: number;
  library_books_borrowed: number;
  dormitory_room: string;
  net_status: 'online' | 'offline';
  cas_sync_status: 'synced' | 'syncing' | 'error';
  last_sync_time: string;
  xp?: number;
  level?: number;
  equipped_badge_id?: string;
}

export interface Course {
  id: string;
  course_name: string;
  course_code?: string;
  teacher: string;
  classroom: string;
  building: string;
  day_of_week: number; // 1 = Monday, 7 = Sunday
  start_period: number; // 1 to 10
  period_count: number; // usually 2 or 3
  start_time: string; // e.g., "08:00"
  end_time: string; // e.g., "09:40"
  weeks: number[]; // e.g. [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
  color: string; // theme color key (e.g. "blue", "indigo", "emerald", "amber", "rose", "purple", "cyan")
  credits: number;
  exam_date?: string;
  exam_time?: string;
  exam_location?: string;
  notes?: string;
}

export type NoticeCategory = 'all' | 'academic' | 'college' | 'competition' | 'scholarship' | 'internship';

export interface Notice {
  id: string;
  title: string;
  category: NoticeCategory;
  category_name: string;
  source_department: string;
  publish_time: string;
  summary: string;
  content: string;
  is_read: boolean;
  is_starred: boolean;
  is_urgent?: boolean;
  deadline?: string;
  attachment_count?: number;
  attachments?: { name: string; size: string; url?: string }[];
  tags?: string[];
}

export type TaskCategory = 'homework' | 'exam' | 'campus' | 'personal' | 'notice' | 'project';
export type TaskPriority = 'high' | 'medium' | 'low';
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CustomTaskCategory {
  id: string;
  name: string;
  color?: string; // e.g. 'purple' | 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'blue' | 'slate'
  iconName?: string;
  type?: 'project' | 'course' | 'custom';
  course_id?: string;
  course_name?: string;
  created_at?: string;
}

export interface SubTask {
  id: string;
  title: string;
  is_completed: boolean;
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  deadline: string; // YYYY-MM-DD or YYYY-MM-DD HH:mm
  is_completed: boolean;
  completed?: boolean;
  course_id?: string;
  course_name?: string;
  created_at: string;
  remind_before_hours?: number;
  estimated_hours?: number;
  notes?: string;
  auto_tag_label?: string;
  auto_tag_icon?: string;
  custom_category_id?: string;
  custom_category_name?: string;
  project_tag?: string;
  tags?: string[];
  // Nested Subtasks Breakdown
  subtasks?: SubTask[];
  // Recurring Task Logic
  is_recurring?: boolean;
  recurrence_pattern?: RecurrenceFrequency; // 'daily' | 'weekly' | 'monthly'
  recurrence_interval?: number; // e.g. 1
  recurrence_days_of_week?: number[]; // [1, 2, 3, 4, 5] for Mon-Fri
  parent_recurring_id?: string;
  recurrence_streak?: number;
  // Weekly Goal flag
  is_weekly_goal?: boolean;
  // Consecutive 50-min Focus Reminder flag
  focus_reminder_enabled?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  thought?: string;
  suggested_actions?: string[];
}

export interface AIStudyTool {
  id: string;
  title: string;
  icon: string;
  description: string;
  prompt_template: string;
  category: 'summary' | 'exam' | 'plan' | 'career';
}

export type AccentColorKey = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'cyan';
export type GlassPresetKey = 'matte_frost' | 'high_gloss' | 'deep_depth' | 'crystal' | 'frosted' | 'prismatic';

export interface AppSettings {
  theme: 'light' | 'dark' | 'paper';
  accent_color?: AccentColorKey;
  glass_preset?: GlassPresetKey;
  current_week: number;
  semester_name: string;
  semester_start_date: string;
  auto_sync_cas: boolean;
  notification_alert: boolean;
  sound_enabled: boolean;
  ai_model: string;
}

// ==========================================
// AI 群消息待办模块相关类型定义
// ==========================================
export type ChatPlatform = 'qq' | 'wechat' | 'wework';

export interface ChatGroup {
  id: string;
  platform: ChatPlatform;
  group_name: string;
  group_id: string;
  member_count?: number;
}

export interface RawGroupMessage {
  id: string;
  group_id: string;
  group_name: string;
  platform: ChatPlatform;
  sender_name: string;
  sender_role?: string; // 班长 / 团支书 / 辅导员 / 教师 / 同学
  content: string;
  message_time: string; // YYYY-MM-DD HH:mm:ss
  processed: boolean;
}

export type TodoActionType = 'submit' | 'signup' | 'meeting' | 'checkin' | 'payment' | 'form' | 'confirm' | 'other';
export type TodoExtractCategory = 'academic' | 'meeting' | 'activity' | 'payment' | 'admin' | 'other';
export type TodoExtractStatus = 'active' | 'completed' | 'cancelled' | 'false_positive' | 'imported';

export interface AIExtractedTodo {
  id: string;
  title: string; // 15字以内简短标题
  detail: string; // 具体要求和条件描述
  action_type: TodoActionType;
  deadline: string | null; // ISO 或者 YYYY-MM-DD HH:mm
  location: string | null;
  priority: 'high' | 'medium' | 'low';
  category: TodoExtractCategory;
  confidence: number; // 0.0 - 1.0
  reason: string; // 判断依据一句话
  source_group_id?: string;
  source_group_name: string;
  source_sender: string;
  source_message_id?: string;
  status: TodoExtractStatus;
  user_modified?: boolean;
  created_at: string;
  imported_task_id?: string;
}

export interface AIRule {
  id: string;
  rule_type: 'include_keyword' | 'exclude_keyword';
  keyword: string;
  weight: number;
  description?: string;
}

export interface TodoExtractionStats {
  total_processed: number;
  todos_extracted: number;
  false_positives: number;
  completion_rate: number;
}

export interface LeaderboardStudent {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  college: string;
  major: string;
  grade: string;
  dailyFocusMinutes: number;
  weeklyFocusMinutes: number;
  sessionsCount: number;
  efficiencyScore: number;
  streakDays: number;
  status: 'focusing' | 'resting' | 'completed';
  cheerCount: number;
  isCurrentUser?: boolean;
}

export interface FocusLeaderboardData {
  updatedAt: string;
  students: LeaderboardStudent[];
  userRank: {
    rank: number;
    totalParticipants: number;
    percentile: number;
    minutesToNextRank: number;
  };
}


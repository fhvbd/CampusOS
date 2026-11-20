import { Task, Course, UserProfile, AppSettings } from '../types';
import { CampusAPI } from './api';

export type PlanMode = 'balanced' | 'urgent_homework' | 'exam_sprint';

export interface StudyScheduleBlock {
  id: string;
  dayLabel: string; // e.g. "今日 (周一)", "明日 (周二)", "周三"
  dateStr?: string;
  timeSlot: string; // e.g. "08:30 - 10:00"
  periodName: '清晨早读' | '上午深度' | '午后巩固' | '傍晚复盘' | '晚间攻坚';
  title: string;
  description: string;
  relatedTaskTitle?: string;
  courseName?: string;
  priority: 'high' | 'medium';
  pomodoroCount: number; // suggested focus sessions
  isBreak?: boolean;
}

export interface SmartStudyPlanResult {
  id: string;
  generatedAt: string;
  mode: PlanMode;
  modeLabel: string;
  summaryQuote: string;
  highPriorityTasksCount: number;
  upcomingDeadlinesCount: number;
  scheduleBlocks: StudyScheduleBlock[];
  keyMilestones: {
    deadline: string;
    title: string;
    courseOrTag: string;
    urgentTag: string;
  }[];
  markdownContent: string;
  aiAdvice: string[];
}

export async function generateSmartStudyPlan({
  tasks,
  courses,
  user,
  settings,
  mode = 'balanced',
}: {
  tasks: Task[];
  courses: Course[];
  user: UserProfile;
  settings: AppSettings;
  mode?: PlanMode;
}): Promise<SmartStudyPlanResult> {
  // 1. Filter high-priority and pending tasks
  const highPriorityPending = tasks.filter(t => t.priority === 'high' && !t.is_completed);
  const otherPending = tasks.filter(t => t.priority !== 'high' && !t.is_completed);
  const allPending = [...highPriorityPending, ...otherPending];

  // 2. Extract upcoming course exams or deadlines
  const coursesWithExams = courses.filter(c => c.exam_date || c.exam_time);

  // 3. Prepare AI prompt
  const modeDescriptions: Record<PlanMode, string> = {
    balanced: '兼顾课后作业深度钻研与日常课程复习，预留健康作息与运动缓冲',
    urgent_homework: '优先紧急攻坚截止期在即的大作业与代码实验，时间块集中突击',
    exam_sprint: '强化高数、数据结构等核心课考点刷题与难点突破，高强度记忆与自测',
  };

  const highPriorityListText = highPriorityPending.length > 0
    ? highPriorityPending.map(t => `- [高优先] ${t.title} (截止: ${t.deadline || '无具体时点'}${t.course_name ? `, 课程: ${t.course_name}` : ''})`).join('\n')
    : '暂无未完成的高优先级任务，建议推进常规学业任务。';

  const otherPendingText = otherPending.slice(0, 5).map(t => `- ${t.title} (截止: ${t.deadline || '无'}, 课程: ${t.course_name || '综合'})`).join('\n');

  const courseScheduleText = courses.slice(0, 6).map(c => `- ${c.course_name}: 周${c.day_of_week} 第${c.start_period}-${c.start_period + c.period_count - 1}节 (${c.start_time}-${c.end_time}, ${c.classroom})`).join('\n');

  const prompt = `请作为 CampusOS 专属智能学业规划导师，为中国高校大学生（专业：${user.major}，学期第 ${settings.current_week} 周，当前目标 GPA 3.8+）定制一份科学、严谨、可落地的【专属智能自习备考时间表 (Smart Study Schedule)】。

【学生当前急迫待办事项与课程日程】：
1. 高优待办清单（紧急高权重大作业/申报）：
${highPriorityListText}

2. 次优待办事项（选摘）：
${otherPendingText || '无'}

3. 当前日常课表关键安排：
${courseScheduleText}

4. 规划模式设定：${modeDescriptions[mode]}

【输出要求】：
1. 请运用结构化 Markdown，输出一份为期 3~5 天的日程时间块（Time-blocking）方案；
2. 每天细分【清晨/上午/下午/晚间】核心学习块，明确标注与哪项【高优任务】或【课程截止】紧密对齐；
3. 为每个自习块标注建议的番茄钟专注轮数（如 2~3 个 25分钟心流周期）；
4. 包含【阶段攻坚里程碑】与【防拖延效能锦囊】。`;

  try {
    const aiResponse = await CampusAPI.sendAIChat(prompt, {
      type: 'smart_study_plan',
      mode,
      highPriorityCount: highPriorityPending.length,
      pendingCount: allPending.length,
      current_week: settings.current_week,
    });

    if (aiResponse && aiResponse.reply && aiResponse.reply.length > 80) {
      return parseAIResponseToPlan(aiResponse.reply, highPriorityPending, allPending, courses, mode);
    }
  } catch (err) {
    console.warn('[SmartStudyPlanAI] API call failed, generating localized plan', err);
  }

  // Fallback intelligent generator
  return generateLocalizedSmartPlan(highPriorityPending, allPending, courses, user, settings, mode);
}

function parseAIResponseToPlan(
  rawMarkdown: string,
  highPriorityTasks: Task[],
  allPendingTasks: Task[],
  courses: Course[],
  mode: PlanMode
): SmartStudyPlanResult {
  const blocks = buildSmartScheduleBlocks(highPriorityTasks, allPendingTasks, courses, mode);
  const milestones = buildKeyMilestones(highPriorityTasks, allPendingTasks, courses);

  const modeLabels: Record<PlanMode, string> = {
    balanced: '全能均衡规划',
    urgent_homework: '大作业/实验紧急冲刺',
    exam_sprint: '期末/考点强化模式',
  };

  return {
    id: `plan_${Date.now()}`,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    mode,
    modeLabel: modeLabels[mode],
    summaryQuote: 'Gemini 已精准编排各高优任务与课程截止点，遵循认知精力波动曲线合理分配专注区间。',
    highPriorityTasksCount: highPriorityTasks.length,
    upcomingDeadlinesCount: allPendingTasks.length,
    scheduleBlocks: blocks,
    keyMilestones: milestones,
    markdownContent: rawMarkdown,
    aiAdvice: [
      '将最消耗脑力的高难度代码实验或数学推导安排在上半段专注力峰值期（09:00 - 11:30）；',
      '每个专注块遵循 25 分钟番茄钟 + 5 分钟微闭目放松，避免视疲劳与认知衰退；',
      '大作业提交前至少预留 2 小时作为缓冲兜底期，预防格式排版或机房排队偶发状况。',
    ],
  };
}

function generateLocalizedSmartPlan(
  highPriorityTasks: Task[],
  allPendingTasks: Task[],
  courses: Course[],
  user: UserProfile,
  settings: AppSettings,
  mode: PlanMode
): SmartStudyPlanResult {
  const blocks = buildSmartScheduleBlocks(highPriorityTasks, allPendingTasks, courses, mode);
  const milestones = buildKeyMilestones(highPriorityTasks, allPendingTasks, courses);

  const modeLabels: Record<PlanMode, string> = {
    balanced: '全能均衡规划',
    urgent_homework: '大作业/实验紧急冲刺',
    exam_sprint: '期末/考点强化模式',
  };

  const topTask1 = highPriorityTasks[0]?.title || '课业核心重点复习';
  const topTask2 = highPriorityTasks[1]?.title || '课程实验与大作业准备';

  const markdownContent = `### 📅 CampusOS 专属智能自习与备考规划表
*已根据您的 ${highPriorityTasks.length} 项高优任务与本周课程截止动态生成*

---

#### 🎯 阶段核心攻坚目标
1. **优先拿下首要高优任务**：聚焦《${topTask1}》，利用上午黄金心流时间段一气呵成。
2. **跟进第二梯队里程碑**：分段攻坚《${topTask2}》，提前落实工程规范与代码验证。
3. **保持课表学习节律**：紧密结合第 ${settings.current_week} 周课程排期，实现“课前预读—课中吸收—课后及时自习消化”的闭环。

---

#### ⏰ 分时段精细化排期规划

| 日程周期 | 推荐时段 | 核心任务定位 | 关联高优待办 / 课程 | 专注节奏建议 |
| :--- | :--- | :--- | :--- | :--- |
${blocks.map(b => `| **${b.dayLabel}** | \`${b.timeSlot}\` | ${b.periodName} | ${b.title} | ${b.pomodoroCount} 个番茄钟 (${b.pomodoroCount * 25}min) |`).join('\n')}

---

#### 💡 Gemini 效能教练提示
- 🧠 **精力波峰利用**：早晨与上午 8:30-11:30 前额叶皮层活跃度最高，务必用来处理最艰深的算法题与综述论文；
- 🍅 **番茄心流结合**：每学习 50 分钟离开座位拉伸 5 分钟，补充温水；
- ⚡ **敏捷待办核销**：每完成一个时段，点击勾选首页待办清单，收获即时正反馈！`;

  return {
    id: `plan_${Date.now()}`,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    mode,
    modeLabel: modeLabels[mode],
    summaryQuote: '基于多维待办优先级与课程日程交叉分析，为您定制的精力自适应学习规划方案。',
    highPriorityTasksCount: highPriorityTasks.length,
    upcomingDeadlinesCount: allPendingTasks.length,
    scheduleBlocks: blocks,
    keyMilestones: milestones,
    markdownContent,
    aiAdvice: [
      '高优任务截止前 24 小时必须完成第一轮交付物初稿；',
      '实验代码撰写务必在本地环境先跑通边界用例与单元测试；',
      '晚上自习结束后花 5 分钟在系统内复盘当日完成进度，保持掌控感。',
    ],
  };
}

function buildSmartScheduleBlocks(
  highPriorityTasks: Task[],
  allPendingTasks: Task[],
  courses: Course[],
  mode: PlanMode
): StudyScheduleBlock[] {
  const blocks: StudyScheduleBlock[] = [];

  const days = [
    { label: '今日 (周一)', dateOffset: 0 },
    { label: '明日 (周二)', dateOffset: 1 },
    { label: '后天 (周三)', dateOffset: 2 },
  ];

  let taskPointer = 0;
  const pool = highPriorityTasks.length > 0 ? highPriorityTasks : allPendingTasks;

  days.forEach((day, dayIdx) => {
    // Block 1: Morning Focus (08:30 - 11:30)
    const taskForMorning = pool[taskPointer % pool.length];
    taskPointer++;
    blocks.push({
      id: `blk_${dayIdx}_1`,
      dayLabel: day.label,
      timeSlot: '08:30 - 11:00',
      periodName: '上午深度',
      title: taskForMorning ? `高优攻坚：${taskForMorning.title}` : '核心理论课重难点推导与自研',
      description: '大脑精力最充沛时段，专攻数学证明、算法手写或核心实验设计。',
      relatedTaskTitle: taskForMorning?.title,
      courseName: taskForMorning?.course_name || '计算机核心课',
      priority: 'high',
      pomodoroCount: 3,
    });

    // Block 2: Afternoon Course & Lab Review (14:30 - 17:00)
    const taskForAfternoon = pool[taskPointer % pool.length];
    taskPointer++;
    blocks.push({
      id: `blk_${dayIdx}_2`,
      dayLabel: day.label,
      timeSlot: '14:30 - 17:00',
      periodName: '午后巩固',
      title: taskForAfternoon ? `实战突破：${taskForAfternoon.title}` : '实验课代码编写与随堂作业清零',
      description: '完成编程OJ提交、工程制图图纸绘制或外语长难句精听打卡。',
      relatedTaskTitle: taskForAfternoon?.title,
      courseName: taskForAfternoon?.course_name || '专业基础课',
      priority: taskForAfternoon?.priority === 'high' ? 'high' : 'medium',
      pomodoroCount: 2,
    });

    // Block 3: Evening Sprint & Consolidation (19:00 - 21:30)
    const taskForEvening = pool[taskPointer % pool.length];
    taskPointer++;
    blocks.push({
      id: `blk_${dayIdx}_3`,
      dayLabel: day.label,
      timeSlot: '19:00 - 21:30',
      periodName: '晚间攻坚',
      title: taskForEvening ? `闭环冲刺：${taskForEvening.title}` : '大作业排版校验与第二日课表预读',
      description: '查漏补缺，将今日完成的学习成果提交至平台或整理为康奈尔知识卡片。',
      relatedTaskTitle: taskForEvening?.title,
      courseName: taskForEvening?.course_name,
      priority: 'medium',
      pomodoroCount: 2,
    });
  });

  return blocks;
}

function buildKeyMilestones(
  highPriorityTasks: Task[],
  allPendingTasks: Task[],
  courses: Course[]
) {
  const milestones: {
    deadline: string;
    title: string;
    courseOrTag: string;
    urgentTag: string;
  }[] = [];

  const urgentTasks = highPriorityTasks.length > 0 ? highPriorityTasks : allPendingTasks;

  urgentTasks.slice(0, 4).forEach(t => {
    milestones.push({
      deadline: t.deadline || '本周内',
      title: t.title,
      courseOrTag: t.course_name || t.custom_category_name || '学业大作业',
      urgentTag: t.priority === 'high' ? '🔥 极高优' : '⏳ 待节点',
    });
  });

  courses.forEach(c => {
    if (c.exam_date) {
      milestones.push({
        deadline: `${c.exam_date} ${c.exam_time || ''}`.trim(),
        title: `《${c.course_name}》期中/期末考`,
        courseOrTag: c.classroom,
        urgentTag: '🎯 考点迎战',
      });
    }
  });

  return milestones;
}

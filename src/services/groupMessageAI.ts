import { 
  RawGroupMessage, 
  AIExtractedTodo, 
  AIRule, 
  TodoExtractionStats, 
  TodoActionType, 
  TodoExtractCategory,
  Task 
} from '../types';
import { 
  INITIAL_RAW_MESSAGES, 
  INITIAL_EXTRACTED_TODOS, 
  INITIAL_AI_RULES, 
  INITIAL_EXTRACTION_STATS,
  INITIAL_CHAT_GROUPS
} from '../mockGroupMessages';

const STORAGE_KEYS = {
  RAW_MESSAGES: 'campus_os_raw_group_messages_v1',
  EXTRACTED_TODOS: 'campus_os_ai_extracted_todos_v1',
  RULES: 'campus_os_ai_rules_v1',
  STATS: 'campus_os_todo_extraction_stats_v1',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[CampusOS GroupAI] Storage save error for ${key}:`, e);
  }
}

// 核心 Prompt 模板定义
export const PROMPTS = {
  MESSAGE_TODO_EXTRACT_PROMPT: `你是 CampusOS 校园助手的群消息待办识别引擎。
【你的任务】
判断下面这条校园群聊消息，是否包含【学生本人需要亲自完成的具体行动事项】。

【判断标准】
✅ 是待办（is_todo = true）：
- 明确通知某个时间/地点/对象要做某事（如"周五前交思修作业""周三下午2点综合楼开会"）
- 有截止时间的任务、报名、提交材料、缴费、签到
- 班长/团支书/班委/老师发出的需要本班同学响应的通知
- 需要本人填写表单、扫码、投票、确认参加的事项
- "收到请回复"类必须响应的通知

❌ 不是待办（is_todo = false）：
- 闲聊（"有人一起吃饭吗？""中午吃什么"）
- 纯通知但不需要本人行动（"今天下午停水停电"——知道就行）
- 转发的新闻/文章但不是强制要求
- 已读即可的公告（"放假安排如下"）
- 别人之间的对话，与本人无关
- 表情包、问候、打卡

【优先级规则】
- 高：有明确截止时间且在3天内、涉及成绩/学分/罚款/考勤
- 中：有截止时间但在3天以上、需要报名/提交材料
- 低：只是确认参加、自愿性质、时间充裕

【输出格式】严格 JSON，不要任何多余文字：
{
  "is_todo": true,
  "title": "15字以内简短标题",
  "detail": "具体要求和条件描述",
  "action_type": "submit|signup|meeting|checkin|payment|form|confirm|other",
  "deadline": "2026-10-10T23:59:00 或 null",
  "location": "地点 或 null",
  "priority": "high|medium|low",
  "category": "academic|meeting|activity|payment|admin|other",
  "confidence": 0.0-1.0,
  "reason": "判断依据一句话"
}`,
};

// 本地智能启发式解析引擎（高鲁棒性后备支持）
function heuristicExtract(msg: RawGroupMessage): AIExtractedTodo | null {
  const content = msg.content;
  const lower = content.toLowerCase();

  // 1. 过滤明显闲聊与知悉型非待办
  const negativeKeywords = [
    '有人一起', '吃什么', '拼单', '带伞', '多穿点', '保暖', 
    '停水', '停电', '施工', '特此告知', '收到！', '收到!', '哈哈', '表情包'
  ];
  for (const kw of negativeKeywords) {
    if (content.includes(kw)) {
      return null;
    }
  }

  // 2. 检测待办信号
  const hasSubmit = /提交|发至邮箱|发送到|邮件主题|交作业|上交|汇总/.test(content);
  const hasForm = /问卷|青年大学习|填写|填报|问卷星|打卡|普查/.test(content);
  const hasMeeting = /开会|会议|研讨|评审会|到场|集合/.test(content);
  const hasPayment = /班费|交费|缴费|收款|每人收|群收款/.test(content);
  const hasCheckin = /小测|随堂测验|闭卷|考试|签到|考勤/.test(content);
  const hasDeadline = /前|截止|逾期|务必在|于.*完成/.test(content);

  if (!hasSubmit && !hasForm && !hasMeeting && !hasPayment && !hasCheckin && !hasDeadline) {
    return null;
  }

  // 3. 确定 Action Type
  let action_type: TodoActionType = 'other';
  let category: TodoExtractCategory = 'admin';
  let priority: 'high' | 'medium' | 'low' = 'medium';

  if (hasCheckin) {
    action_type = 'checkin';
    category = 'academic';
    priority = 'high';
  } else if (hasSubmit) {
    action_type = 'submit';
    category = 'academic';
    priority = 'high';
  } else if (hasMeeting) {
    action_type = 'meeting';
    category = 'meeting';
    priority = /今晚|紧急|重要/.test(content) ? 'high' : 'medium';
  } else if (hasPayment) {
    action_type = 'payment';
    category = 'payment';
    priority = 'medium';
  } else if (hasForm) {
    action_type = 'form';
    category = 'admin';
    priority = /逾期扣分|综测|影响/.test(content) ? 'high' : 'medium';
  }

  // 4. 抽取标题 (15字以内)
  let title = '群通知事项待办';
  if (hasSubmit) {
    const match = content.match(/《(.*?)》/);
    title = match ? `提交《${match[1]}》` : '提交群通知作业报告';
  } else if (hasForm) {
    if (content.includes('青年大学习')) title = '完成青年大学习并填报截图';
    else if (content.includes('心理')) title = '完成心理健康适应测评问卷';
    else title = '完成在线表单与信息填报';
  } else if (hasCheckin) {
    title = '准时参加课程随堂测验';
  } else if (hasPayment) {
    const payMatch = content.match(/(\d+)\s*元/);
    title = payMatch ? `缴纳班费 ${payMatch[1]} 元` : '完成群通知班费缴纳';
  } else if (hasMeeting) {
    title = '参加群通知重要会议';
  }

  // 5. 抽取截止时间与地点
  let deadline: string | null = null;
  const timeMatch = content.match(/(明天|周[一二三四五六日天]|今晚|\d+月\d+日)\s*([0-2]?\d[:：][0-5]\d)?/);
  if (timeMatch) {
    const today = new Date();
    const timeStr = timeMatch[2] ? timeMatch[2].replace('：', ':') : '22:00';
    if (timeMatch[1].includes('明天')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      deadline = `${tomorrow.getFullYear()}-${m}-${d} ${timeStr}`;
    } else if (timeMatch[1].includes('今晚')) {
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      deadline = `${today.getFullYear()}-${m}-${d} ${timeStr}`;
    } else if (timeMatch[1].includes('月')) {
      const monthDayMatch = timeMatch[1].match(/(\d+)月(\d+)日/);
      if (monthDayMatch) {
        const m = String(monthDayMatch[1]).padStart(2, '0');
        const d = String(monthDayMatch[2]).padStart(2, '0');
        deadline = `2026-${m}-${d} ${timeStr}`;
      }
    } else {
      deadline = `2026-09-08 18:00`;
    }
  }

  let location: string | null = null;
  const locMatch = content.match(/【(.*?)】/) || content.match(/在\s*([^，,。]{3,15}(?:楼|室|中心|空间|教室))/);
  if (locMatch) {
    location = locMatch[1];
  }

  return {
    id: `et_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    detail: content.slice(0, 150),
    action_type,
    deadline,
    location,
    priority,
    category,
    confidence: 0.92,
    reason: `由【${msg.sender_name}】在【${msg.group_name}】发布，包含明确行动指令与时间地点要求。`,
    source_group_id: msg.group_id,
    source_group_name: msg.group_name,
    source_sender: msg.sender_name,
    source_message_id: msg.id,
    status: 'active',
    created_at: msg.message_time || new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
}

export const GroupMessageAIService = {
  // 获取群聊列表
  getChatGroups: () => {
    return INITIAL_CHAT_GROUPS;
  },

  // 获取原始群消息
  getRawMessages: (): RawGroupMessage[] => {
    return loadStorage<RawGroupMessage[]>(STORAGE_KEYS.RAW_MESSAGES, INITIAL_RAW_MESSAGES);
  },

  // 保存原始消息
  saveRawMessages: (messages: RawGroupMessage[]) => {
    saveStorage(STORAGE_KEYS.RAW_MESSAGES, messages);
  },

  // 获取已提取待办
  getExtractedTodos: (): AIExtractedTodo[] => {
    return loadStorage<AIExtractedTodo[]>(STORAGE_KEYS.EXTRACTED_TODOS, INITIAL_EXTRACTED_TODOS);
  },

  // 保存提取待办
  saveExtractedTodos: (todos: AIExtractedTodo[]) => {
    saveStorage(STORAGE_KEYS.EXTRACTED_TODOS, todos);
  },

  // 获取规则
  getRules: (): AIRule[] => {
    return loadStorage<AIRule[]>(STORAGE_KEYS.RULES, INITIAL_AI_RULES);
  },

  // 保存规则
  saveRules: (rules: AIRule[]) => {
    saveStorage(STORAGE_KEYS.RULES, rules);
  },

  // 获取统计
  getStats: (): TodoExtractionStats => {
    return loadStorage<TodoExtractionStats>(STORAGE_KEYS.STATS, INITIAL_EXTRACTION_STATS);
  },

  // 单条消息提取流程
  extractTodoFromMessage: async (msg: RawGroupMessage): Promise<AIExtractedTodo | null> => {
    const rules = GroupMessageAIService.getRules();

    // 1. 本地规则检查
    for (const rule of rules) {
      if (rule.rule_type === 'exclude_keyword' && msg.content.includes(rule.keyword)) {
        return null;
      }
    }

    // 2. 调用系统 AI 网关（如有网络且服务器可用）
    try {
      const prompt = `${PROMPTS.MESSAGE_TODO_EXTRACT_PROMPT}

【输入消息】
群名：${msg.group_name}
发送人：${msg.sender_name}
时间：${msg.message_time}
内容：${msg.content}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawReply = data.reply || '';
        // 尝试解析 JSON
        const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.is_todo) {
            return {
              id: `et_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              title: parsed.title || '群通知待办',
              detail: parsed.detail || msg.content,
              action_type: parsed.action_type || 'other',
              deadline: parsed.deadline || null,
              location: parsed.location || null,
              priority: parsed.priority || 'medium',
              category: parsed.category || 'other',
              confidence: parsed.confidence || 0.95,
              reason: parsed.reason || 'AI模型结构化识别',
              source_group_id: msg.group_id,
              source_group_name: msg.group_name,
              source_sender: msg.sender_name,
              source_message_id: msg.id,
              status: 'active',
              created_at: msg.message_time,
            };
          }
          return null;
        }
      }
    } catch {
      // 容错走启发式解析引擎
    }

    // 3. 本地高精度启发式引擎解析
    return heuristicExtract(msg);
  },

  // 批量分析群消息
  reanalyzeMessages: async (messages?: RawGroupMessage[]): Promise<{
    extracted: AIExtractedTodo[];
    stats: { processed: number; newTodos: number; filtered: number };
  }> => {
    const targetMsgs = messages || GroupMessageAIService.getRawMessages();
    const existingTodos = GroupMessageAIService.getExtractedTodos();
    const existingMsgIds = new Set(existingTodos.map(t => t.source_message_id));

    const newExtracted: AIExtractedTodo[] = [];
    let filteredCount = 0;

    for (const msg of targetMsgs) {
      const todo = await GroupMessageAIService.extractTodoFromMessage(msg);
      if (todo) {
        // 去重：同一消息不重复生成
        if (!existingMsgIds.has(msg.id)) {
          newExtracted.push(todo);
          existingMsgIds.add(msg.id);
        }
      } else {
        filteredCount++;
      }
    }

    const updated = [...newExtracted, ...existingTodos];
    GroupMessageAIService.saveExtractedTodos(updated);

    // 更新统计
    const stats = GroupMessageAIService.getStats();
    stats.total_processed += targetMsgs.length;
    stats.todos_extracted += newExtracted.length;
    GroupMessageAIService.saveStats(stats);

    return {
      extracted: updated,
      stats: {
        processed: targetMsgs.length,
        newTodos: newExtracted.length,
        filtered: filteredCount,
      },
    };
  },

  // 导入单条提取待办到系统已有的 Task 表
  convertTodoToTask: (todo: AIExtractedTodo): Task => {
    const categoryMap: Record<TodoExtractCategory, Task['category']> = {
      academic: 'homework',
      meeting: 'campus',
      activity: 'campus',
      payment: 'campus',
      admin: 'campus',
      other: 'personal',
    };

    return {
      id: `task_from_group_${Date.now()}`,
      title: `【群待办】${todo.title}`,
      description: `来源：${todo.source_group_name} (${todo.source_sender})\n详情：${todo.detail}${todo.location ? `\n地点：${todo.location}` : ''}`,
      category: categoryMap[todo.category] || 'campus',
      priority: todo.priority,
      deadline: todo.deadline || '2026-09-08 20:00',
      is_completed: false,
      created_at: new Date().toISOString().split('T')[0],
      auto_tag_label: todo.category === 'academic' ? '作业提交' : todo.action_type === 'meeting' ? '会议研讨' : '群聊事项',
      auto_tag_icon: todo.action_type === 'meeting' ? 'Users' : todo.action_type === 'payment' ? 'CreditCard' : 'CheckSquare',
    };
  },

  // 标记误判并学习偏好
  markAsFalsePositive: (todoId: string, reasonKeyword?: string): AIExtractedTodo[] => {
    const todos = GroupMessageAIService.getExtractedTodos();
    const target = todos.find(t => t.id === todoId);
    if (!target) return todos;

    const updated = todos.map(t => t.id === todoId ? { ...t, status: 'false_positive' as const } : t);
    GroupMessageAIService.saveExtractedTodos(updated);

    // 自动学习新规则
    const kw = reasonKeyword || target.title.slice(0, 6);
    if (kw) {
      const rules = GroupMessageAIService.getRules();
      if (!rules.some(r => r.keyword === kw)) {
        const newRule: AIRule = {
          id: `rule_${Date.now()}`,
          rule_type: 'exclude_keyword',
          keyword: kw,
          weight: 0.95,
          description: `基于用户手动将《${target.title}》标记为误判后自动学习`,
        };
        rules.push(newRule);
        GroupMessageAIService.saveRules(rules);
      }
    }

    // 统计更新
    const stats = GroupMessageAIService.getStats();
    stats.false_positives += 1;
    GroupMessageAIService.saveStats(stats);

    return updated;
  },

  // 保存统计
  saveStats: (stats: TodoExtractionStats) => {
    saveStorage(STORAGE_KEYS.STATS, stats);
  },

  // 模拟从剪贴板或手工粘贴新群聊消息
  ingestCustomMessage: async (groupName: string, senderName: string, content: string): Promise<AIExtractedTodo | null> => {
    const newMsg: RawGroupMessage = {
      id: `msg_${Date.now()}`,
      group_id: 'g_custom',
      group_name: groupName || '【外部导入】群聊消息',
      platform: 'wechat',
      sender_name: senderName || '同学/班委',
      content,
      message_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      processed: true,
    };

    const msgs = GroupMessageAIService.getRawMessages();
    GroupMessageAIService.saveRawMessages([newMsg, ...msgs]);

    const extracted = await GroupMessageAIService.extractTodoFromMessage(newMsg);
    if (extracted) {
      const todos = GroupMessageAIService.getExtractedTodos();
      GroupMessageAIService.saveExtractedTodos([extracted, ...todos]);
    }
    return extracted;
  },
};

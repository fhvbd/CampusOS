import { TaskCategory, TaskPriority } from '../types';
import { CampusAPI } from './api';

export interface BreakSuggestionItem {
  id: string;
  activityTitle: string;
  englishCue: string;
  complexityTag: string;
  reason: string;
}

export interface GenerateBreakSuggestionParams {
  title: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  courseName?: string;
  subtasksCount?: number;
  excludeIds?: string[];
}

export async function generateBreakSuggestionWithGemini(
  params: GenerateBreakSuggestionParams
): Promise<BreakSuggestionItem> {
  const cleanTitle = (params.title || '当前学习任务').trim();
  const cleanDesc = (params.description || '').trim();
  const courseCtx = params.courseName ? `关联课程：${params.courseName}` : '';
  const priorityLabel =
    params.priority === 'high' ? '高优先级/紧急' : params.priority === 'low' ? '常规低负荷' : '中等负荷';
  const subtaskInfo =
    typeof params.subtasksCount === 'number' && params.subtasksCount > 0
      ? `包含 ${params.subtasksCount} 个子步骤`
      : '单步执行任务';
  const excludedHint =
    params.excludeIds && params.excludeIds.length > 0
      ? `\n请勿重复以下已推荐过的休息活动：${params.excludeIds.join('、')}`
      : '';

  const prompt = `请作为大学学业健康与认知科学助手，分析以下学生已连续专注 50 分钟的待办任务复杂度，并为接下来的 5 分钟小憩推荐 1 项最匹配的恢复活动（例如：Stretch your shoulders、Drink water、Look at something 20 feet away、Box breathing 等）。

任务标题：${cleanTitle}
${cleanDesc ? `任务说明：${cleanDesc}\n` : ''}${courseCtx ? `${courseCtx}\n` : ''}任务属性：${priorityLabel} · ${subtaskInfo}${excludedHint}

请严格仅输出一个 JSON 对象（不要输出额外解释文字），包含以下字段：
- "activityTitle": 具体的 5 分钟休息动作标题（中文，10~24字，例如 "远眺 20 英尺外景物并连续眨眼放松" 或 "环绕拉伸双肩与斜方肌 5 分钟"）
- "englishCue": 对应的简短英文动作提示（如 "Look at something 20 feet away", "Stretch your shoulders", "Drink water"）
- "complexityTag": 任务复杂度与疲劳类型标签（如 "高脑力与视觉负荷 · 深度推导/屏幕凝视"）
- "reason": 一句话科学解释为什么该任务适合这项 5 分钟恢复活动（25~55字）`;

  try {
    const res = await CampusAPI.sendAIChat(prompt, {
      type: 'proactive_break_suggestion',
      taskTitle: cleanTitle,
      taskDescription: cleanDesc,
      priority: params.priority,
      courseName: params.courseName,
    });

    if (res && res.reply) {
      const parsed = parseGeminiBreakSuggestion(res.reply, params.excludeIds);
      if (parsed) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[BreakSuggestionAI] Gemini proxy fallback triggered:', err);
  }

  return buildComplexityAwareBreakSuggestion(params);
}

function parseGeminiBreakSuggestion(
  replyText: string,
  excludeIds?: string[]
): BreakSuggestionItem | null {
  if (replyText.includes('CampusOS 智能校园解答')) {
    return null;
  }

  const jsonMatch = replyText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return null;

  try {
    const obj = JSON.parse(jsonMatch[0]);
    if (
      obj &&
      typeof obj.activityTitle === 'string' &&
      obj.activityTitle.trim().length > 0 &&
      typeof obj.reason === 'string' &&
      obj.reason.trim().length > 0
    ) {
      const title = obj.activityTitle.trim();
      if (excludeIds && excludeIds.includes(title)) {
        return null;
      }
      return {
        id: title,
        activityTitle: title,
        englishCue:
          typeof obj.englishCue === 'string' && obj.englishCue.trim().length > 0
            ? obj.englishCue.trim()
            : 'Take a mindful 5-minute break',
        complexityTag:
          typeof obj.complexityTag === 'string' && obj.complexityTag.trim().length > 0
            ? obj.complexityTag.trim()
            : '中高专注负荷 · 连续 50m 深度投入',
        reason: obj.reason.trim(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function buildComplexityAwareBreakSuggestion(
  params: GenerateBreakSuggestionParams
): BreakSuggestionItem {
  const combined = `${params.title || ''} ${params.description || ''} ${params.courseName || ''}`.toLowerCase();
  const isHighComplexity =
    params.priority === 'high' || (params.subtasksCount && params.subtasksCount >= 3);

  const candidates: BreakSuggestionItem[] = [];

  // 1. Visual-heavy tasks: CAD, Coding, Debugging, Slides
  if (
    combined.includes('cad') ||
    combined.includes('制图') ||
    combined.includes('图纸') ||
    combined.includes('代码') ||
    combined.includes('算法') ||
    combined.includes('链表') ||
    combined.includes('编程') ||
    combined.includes('实验')
  ) {
    candidates.push(
      {
        id: 'look_20_feet',
        activityTitle: '远眺 20 英尺（6 米）外景物并缓慢眨眼',
        englishCue: 'Look at something 20 feet away',
        complexityTag: '高视觉与逻辑负荷 · 精密图形/代码专注',
        reason: `「${(params.title || '当前任务').slice(0, 12)}」涉及高频屏幕细节凝视，遵循 20-20-20 法则远眺可快速解除睫状肌痉挛。`,
      },
      {
        id: 'stretch_shoulders',
        activityTitle: '起身环绕拉伸双肩、斜方肌与手腕关节',
        englishCue: 'Stretch your shoulders & wrists',
        complexityTag: '高键鼠操作负荷 · 连续编码与制图',
        reason: '长时间维持键鼠操作易导致肩颈前倾与腕管紧绷，5 分钟肩部扩展能迅速恢复上肢血液循环。',
      },
      {
        id: 'drink_warm_water',
        activityTitle: '离开座位接一杯温水并小口慢饮补水',
        englishCue: 'Drink water & walk briefly',
        complexityTag: '高认知负荷 · 连续算法与逻辑推演',
        reason: '高强度逻辑调试会加速大脑水分与电解质消耗，起身饮水既能打断久坐又能恢复前额叶专注度。',
      }
    );
  }

  // 2. Heavy analytical / math / exam tasks
  if (
    combined.includes('高数') ||
    combined.includes('数学') ||
    combined.includes('推导') ||
    combined.includes('习题') ||
    combined.includes('极限') ||
    combined.includes('复习') ||
    combined.includes('考试') ||
    params.category === 'exam'
  ) {
    candidates.push(
      {
        id: 'drink_water_math',
        activityTitle: '起身补充 200ml 温水并进行 4-4-4 深呼吸',
        englishCue: 'Drink water & take deep breaths',
        complexityTag: '高工作记忆负荷 · 密集公式推导与解题',
        reason: '连续 50 分钟数学推导对大脑工作记忆消耗极大，补水结合深呼吸可提升血氧饱和度并缓解思维卡壳。',
      },
      {
        id: 'look_20_feet_math',
        activityTitle: '凭窗远眺 20 英尺外开阔处，放空大脑 5 分钟',
        englishCue: 'Look at something 20 feet away',
        complexityTag: '高抽象思维负荷 · 连续解题演算',
        reason: '短暂切断高密度符号输入并远眺自然景物，有助于大脑默认模式网络（DMN）后台整合解题思路。',
      },
      {
        id: 'stretch_shoulders_math',
        activityTitle: '站立后仰伸展肩背与颈椎，缓解伏案压力',
        englishCue: 'Stretch your shoulders & back',
        complexityTag: '高伏案演算负荷 · 长时间低头书写',
        reason: '连续低头演算习题会使颈后肌群持续受压，站立扩胸与肩部拉伸能有效预防颈源性疲劳。',
      }
    );
  }

  // 3. Reading / Writing / Papers / English
  if (
    combined.includes('论文') ||
    combined.includes('综述') ||
    combined.includes('文献') ||
    combined.includes('报告') ||
    combined.includes('英语') ||
    combined.includes('六级') ||
    combined.includes('听力')
  ) {
    candidates.push(
      {
        id: 'stretch_shoulders_reading',
        activityTitle: '起身做肩颈环绕与扩胸拉伸，放松上背部',
        englishCue: 'Stretch your shoulders',
        complexityTag: '中高阅读与语言负荷 · 长文精读/撰写',
        reason: '长时间保持固定阅读姿态容易造成肩颈僵硬，5 分钟动态肩部拉伸能迅速唤醒身体活力。',
      },
      {
        id: 'look_20_feet_reading',
        activityTitle: '离开文字屏幕，远眺 20 英尺外视野放松眼肌',
        englishCue: 'Look at something 20 feet away',
        complexityTag: '高密集文本扫视负荷 · 文献阅读与写作',
        reason: '密集文字检索会让双眼长期处于近距离调节状态，远眺 6 米外物体能显著降低视觉疲劳感。',
      },
      {
        id: 'drink_water_reading',
        activityTitle: '走到窗边喝一杯温水，闭目养神片刻',
        englishCue: 'Drink water & rest your eyes',
        complexityTag: '持续信息整合负荷 · 学术综述与听力',
        reason: '温和补水配合短暂闭目能帮助海马体巩固刚刚摄入的语言与文献要点。',
      }
    );
  }

  // 4. Universal fallback pool covering the core examples
  candidates.push(
    {
      id: 'universal_stretch',
      activityTitle: '起身舒展双肩与颈部（Stretch your shoulders）',
      englishCue: 'Stretch your shoulders',
      complexityTag: isHighComplexity ? '高复杂度多步骤任务 · 深度专注' : '标准学业负荷 · 连续 50m 投入',
      reason: '连续 50 分钟专注后进行双肩下沉与扩胸拉伸，能快速释放斜方肌张力并预防久坐疲劳。',
    },
    {
      id: 'universal_water',
      activityTitle: '起身补充一杯温水（Drink water）',
      englishCue: 'Drink water',
      complexityTag: isHighComplexity ? '高脑力消耗任务 · 持续输出' : '中度专注负荷 · 稳步推进',
      reason: '大脑在高专注状态下对水分极为敏感，起身倒水并慢饮能迅速恢复清醒度与注意力。',
    },
    {
      id: 'universal_20feet',
      activityTitle: '远眺 20 英尺外物体 20 秒以上（Look 20 feet away）',
      englishCue: 'Look at something 20 feet away',
      complexityTag: isHighComplexity ? '高强度视觉与认知负荷' : '常规屏幕专注负荷 · 护眼恢复',
      reason: '通过注视 20 英尺（约 6 米）外的远景，让持续收缩的眼部睫状肌得到充分放松。',
    }
  );

  const excludeSet = new Set(params.excludeIds || []);
  const available = candidates.filter(
    c => !excludeSet.has(c.id) && !excludeSet.has(c.activityTitle)
  );

  return available.length > 0 ? available[0] : candidates[0];
}

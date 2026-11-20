import { TaskCategory } from '../types';
import { CampusAPI } from './api';

export interface ProposedSubTaskItem {
  id: string;
  title: string;
  estimatedMinutes: number;
  selected: boolean;
}

export interface GenerateSubtasksParams {
  title: string;
  description?: string;
  category?: TaskCategory;
  courseName?: string;
}

export async function generateSubtasksWithGemini(
  params: GenerateSubtasksParams
): Promise<ProposedSubTaskItem[]> {
  const cleanTitle = params.title.trim();
  const cleanDesc = (params.description || '').trim();
  const courseCtx = params.courseName ? `关联课程：${params.courseName}` : '';

  const prompt = `请作为大学学业规划与项目拆解助手，针对以下待办任务标题和补充说明，将其拆解为 4 个逻辑递进、可直接执行的子任务步骤（Subtasks）。

待办标题：${cleanTitle}
${cleanDesc ? `补充说明：${cleanDesc}\n` : ''}${courseCtx ? `${courseCtx}\n` : ''}
请严格仅输出 JSON 数组格式（不要包含其它寒暄文字），每个元素包含：
- "title": 具体可执行的步骤名称（12~28个字，动宾结构清晰）
- "estimatedMinutes": 建议投入的专注分钟数（整数，如 20, 25, 30, 45）

示例格式：
[
  {"title": "精读题目要求并梳理核心解题思路与公式", "estimatedMinutes": 20},
  {"title": "完成主体内容编写与关键步骤推导验证", "estimatedMinutes": 35},
  {"title": "检查边界条件、格式规范并整理最终提交文件", "estimatedMinutes": 15}
]`;

  try {
    const res = await CampusAPI.sendAIChat(prompt, {
      type: 'subtask_breakdown',
      taskTitle: cleanTitle,
      taskDescription: cleanDesc,
      courseName: params.courseName,
    });

    if (res && res.reply) {
      const parsed = parseGeminiSubtasksReply(res.reply);
      if (parsed.length >= 3) {
        return parsed.slice(0, 5);
      }
    }
  } catch (err) {
    console.warn('[SubtaskGeneratorAI] Gemini proxy fallback triggered:', err);
  }

  return buildDomainAwareSubtasks(cleanTitle, cleanDesc, params.category, params.courseName);
}

function parseGeminiSubtasksReply(replyText: string): ProposedSubTaskItem[] {
  // 1. Try extracting JSON array block
  const jsonMatch = replyText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) {
        const items: ProposedSubTaskItem[] = arr
          .filter(item => item && typeof item.title === 'string' && item.title.trim().length > 0)
          .slice(0, 5)
          .map((item, idx) => ({
            id: `prop_ai_${Date.now()}_${idx}`,
            title: String(item.title).trim().replace(/^\d+[\.\、\s]*/, ''),
            estimatedMinutes: Number(item.estimatedMinutes) > 0 ? Math.min(90, Math.max(10, Math.round(Number(item.estimatedMinutes)))) : 25,
            selected: true,
          }));
        if (items.length >= 3) {
          return items;
        }
      }
    } catch {
      // Fall through to line parser
    }
  }

  // 2. Fallback: only parse structured bullet lines if it wasn't the generic canned server fallback
  if (replyText.includes('CampusOS 智能校园解答')) {
    return [];
  }

  const lines = replyText
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^(\d+[\.\、]|[-*•])\s+/.test(l));

  if (lines.length >= 3) {
    return lines.slice(0, 5).map((line, idx) => {
      const cleaned = line
        .replace(/^(\d+[\.\、]|[-*•])\s+/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .trim();
      const minMatch = cleaned.match(/(\d+)\s*(分钟|min|m)/i);
      const mins = minMatch ? Math.min(90, Math.max(10, parseInt(minMatch[1], 10))) : 25;
      return {
        id: `prop_line_${Date.now()}_${idx}`,
        title: cleaned.slice(0, 42),
        estimatedMinutes: mins,
        selected: true,
      };
    });
  }

  return [];
}

function buildDomainAwareSubtasks(
  title: string,
  description: string,
  category?: TaskCategory,
  courseName?: string
): ProposedSubTaskItem[] {
  const combined = `${title} ${description} ${courseName || ''}`.toLowerCase();
  const now = Date.now();

  // 1. CAD / Engineering Drawing
  if (combined.includes('cad') || combined.includes('制图') || combined.includes('轴测图') || combined.includes('图纸')) {
    return [
      { id: `prop_${now}_1`, title: `审阅《${title.slice(0, 12)}》尺寸基准与图层线宽规范`, estimatedMinutes: 20, selected: true },
      { id: `prop_${now}_2`, title: '完成主体几何轮廓构建与中心轴线定位绘制', estimatedMinutes: 35, selected: true },
      { id: `prop_${now}_3`, title: '添加剖面符号、尺寸公差标注及标准标题栏', estimatedMinutes: 25, selected: true },
      { id: `prop_${now}_4`, title: '复核图幅比例并导出 DWG 源文件与高分 PDF 图纸', estimatedMinutes: 15, selected: true },
    ];
  }

  // 2. Coding / Data Structures / Algorithms / Lab
  if (
    combined.includes('代码') ||
    combined.includes('算法') ||
    combined.includes('链表') ||
    combined.includes('数据结构') ||
    combined.includes('实验') ||
    combined.includes('c++') ||
    combined.includes('python') ||
    combined.includes('oj')
  ) {
    return [
      { id: `prop_${now}_1`, title: '剖析实验题目数据结构定义与时间/空间复杂度约束', estimatedMinutes: 20, selected: true },
      { id: `prop_${now}_2`, title: '编写核心接口实现代码与关键指针/状态转移逻辑', estimatedMinutes: 40, selected: true },
      { id: `prop_${now}_3`, title: '构造极端边界测试用例（空集、单节点、环路）并完成本地联调', estimatedMinutes: 25, selected: true },
      { id: `prop_${now}_4`, title: '提交 OJ 平台评测通过并整理实验报告核心流程图', estimatedMinutes: 20, selected: true },
    ];
  }

  // 3. Research Paper / Literature Review / Thesis Proposal
  if (
    combined.includes('论文') ||
    combined.includes('综述') ||
    combined.includes('开题') ||
    combined.includes('报告') ||
    combined.includes('文献') ||
    combined.includes('cvpr')
  ) {
    return [
      { id: `prop_${now}_1`, title: '检索并精读核心参考文献，提炼方法演进脉络与对比表', estimatedMinutes: 35, selected: true },
      { id: `prop_${now}_2`, title: '搭建报告章节大纲（研究背景、核心方法、实验分析与展望）', estimatedMinutes: 25, selected: true },
      { id: `prop_${now}_3`, title: '撰写核心技术原理阐述与创新点对比段落初稿', estimatedMinutes: 45, selected: true },
      { id: `prop_${now}_4`, title: '统一图表编号与参考文献引用格式（GB/T 7714 或 IEEE）并润色定稿', estimatedMinutes: 25, selected: true },
    ];
  }

  // 4. English / CET-6 / IELTS / Language Prep
  if (
    combined.includes('英语') ||
    combined.includes('六级') ||
    combined.includes('四级') ||
    combined.includes('听力') ||
    combined.includes('长难句') ||
    combined.includes('单词')
  ) {
    return [
      { id: `prop_${now}_1`, title: '限时完成第一遍盲听测试并标记连读、弱读与生词卡点', estimatedMinutes: 25, selected: true },
      { id: `prop_${now}_2`, title: '对照原文逐句精听跟读，拆解 5 个核心学术长难句语法结构', estimatedMinutes: 25, selected: true },
      { id: `prop_${now}_3`, title: '整理 20 个高频核心词汇与同义替换表达至复习卡片', estimatedMinutes: 20, selected: true },
      { id: `prop_${now}_4`, title: '脱稿复述段落主旨并完成今日记忆巩固自测', estimatedMinutes: 15, selected: true },
    ];
  }

  // 5. Math / Calculus / Discrete Math / Physics Problem Sets
  if (
    combined.includes('高数') ||
    combined.includes('高等数学') ||
    combined.includes('习题') ||
    combined.includes('极限') ||
    combined.includes('离散') ||
    combined.includes('微积分')
  ) {
    return [
      { id: `prop_${now}_1`, title: '回顾本章节核心定理、等价代换公式与典型例题推导过程', estimatedMinutes: 20, selected: true },
      { id: `prop_${now}_2`, title: '独立限时完成基础组与综合计算题，规范书写推导步骤', estimatedMinutes: 35, selected: true },
      { id: `prop_${now}_3`, title: '集中攻坚证明题与压轴题，归纳辅助函数或构造技巧', estimatedMinutes: 30, selected: true },
      { id: `prop_${now}_4`, title: '核对标准答案订正易错计算细节，并将典型题摘入错题本', estimatedMinutes: 15, selected: true },
    ];
  }

  // 6. Competition / Scholarship / Campus Application / Meeting
  if (
    category === 'campus' ||
    combined.includes('奖学金') ||
    combined.includes('挑战杯') ||
    combined.includes('申报') ||
    combined.includes('研讨') ||
    combined.includes('会议')
  ) {
    return [
      { id: `prop_${now}_1`, title: `核查「${title.slice(0, 12)}」通知细则、时间节点与必备材料清单`, estimatedMinutes: 20, selected: true },
      { id: `prop_${now}_2`, title: '整理个人/团队核心成果数据、佐证附件及申请表初稿', estimatedMinutes: 35, selected: true },
      { id: `prop_${now}_3`, title: '与指导老师或团队成员对齐核心亮点并修订汇报/申报文档', estimatedMinutes: 25, selected: true },
      { id: `prop_${now}_4`, title: '完成最终格式校验并按时提交至对应评审/教务平台', estimatedMinutes: 15, selected: true },
    ];
  }

  // 7. General Academic Task Decomposition
  return [
    { id: `prop_${now}_1`, title: `明确「${title.slice(0, 14)}」核心目标、交付标准与参考资料`, estimatedMinutes: 20, selected: true },
    { id: `prop_${now}_2`, title: '集中精力完成第一阶段核心内容撰写或练习突破', estimatedMinutes: 30, selected: true },
    { id: `prop_${now}_3`, title: '攻克重点难点模块并补全细节论证或计算过程', estimatedMinutes: 30, selected: true },
    { id: `prop_${now}_4`, title: '全面复盘检查完成质量，整理归档并确认提交', estimatedMinutes: 15, selected: true },
  ];
}

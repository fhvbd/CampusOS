import { Task, Course } from '../types';

export interface FollowUpStudyTopic {
  title: string;
  description: string;
  category?: string;
  difficulty: '基础巩固' | '进阶提升' | '考前冲刺';
  actionQuery: string;
}

export interface SessionSummaryData {
  id: string;
  completedAt: string;
  subject: string;
  durationMinutes: number;
  completedSessionsToday: number;
  totalFocusMinutesToday: number;
  tasksRecap: {
    matchedTasks: string[];
    completedTasks: string[];
    summaryText: string;
  };
  followUpTopics: FollowUpStudyTopic[];
  aiEncouragement: string;
}

interface GenerateSummaryParams {
  subject: string;
  duration: number;
  completedSessionsToday: number;
  totalFocusMinutesToday: number;
  tasks?: Task[];
  courses?: Course[];
}

// Preset domain topics for popular campus curriculum
const DOMAIN_FOLLOWUP_TOPICS: Record<string, FollowUpStudyTopic[]> = {
  math: [
    {
      title: '泰勒公式高阶展开与皮亚诺余项应用',
      description: '掌握利用麦克劳林展开式快速求解未定式极限的方法，重点对比罗必达法则的运算效率。',
      difficulty: '进阶提升',
      actionQuery: '帮我深入解析泰勒公式展开式记忆口诀及常见未定式极限例题',
    },
    {
      title: '微分中值定理在等式与不等式证明中的构造技巧',
      description: '针对柯西中值定理与拉格朗日中值定理，总结辅助函数构造的 3 类经典常考模型。',
      difficulty: '考前冲刺',
      actionQuery: '为我归纳高等数学微分中值定理证明题的常见辅助函数构造方法',
    },
    {
      title: '多元函数偏导数、隐函数求导及条件极值拉格朗日乘数法',
      description: '梳理多元复合函数链式法则，针对多元函数极值求解步骤开展巩固练习。',
      difficulty: '进阶提升',
      actionQuery: '请出两道关于拉格朗日乘数法求条件极值的典型例题并带详细解析',
    },
    {
      title: '定积分换元法与分部积分法高频错题盘点',
      description: '回顾三角代换、根式代换的上下限变换，避免奇偶函数区间积分常见丢分点。',
      difficulty: '基础巩固',
      actionQuery: '为我总结定积分换元法与分部积分法的易错点和避坑指南',
    },
  ],
  cs: [
    {
      title: '平衡二叉树（AVL树与红黑树）旋转修正机制比对',
      description: '深入理解 LL/RR/LR/RL 四种旋转逻辑，分析红黑树五大特性与近似平衡设计优势。',
      difficulty: '进阶提升',
      actionQuery: '请图解对比AVL树与红黑树的旋转平衡过程，说明它们的使用场景区别',
    },
    {
      title: '经典图论最短路径算法（Dijkstra vs Floyd）实操',
      description: '掌握单源最短路径贪心策略与多源最短路径动态规划思想，手写核心松弛操作代码。',
      difficulty: '考前冲刺',
      actionQuery: '帮我用伪代码和步骤详解 Dijkstra 最短路径算法并分析时间复杂度',
    },
    {
      title: '动态规划状态转移方程推导与经典背包模型',
      description: '从0-1背包到完全背包，练习多维数组到滚动数组的空间压缩优化技巧。',
      difficulty: '进阶提升',
      actionQuery: '为我讲解动态规划0-1背包问题的状态转移方程推导与一维空间压缩技巧',
    },
    {
      title: '排序算法稳定性、时间复杂度与边界优化汇总',
      description: '对比快速排序三数取中枢轴与归并排序分治合并，梳理期末常考选择题考点。',
      difficulty: '基础巩固',
      actionQuery: '为我输出一份经典十大排序算法的稳定性、时空复杂度对比全景表',
    },
  ],
  english: [
    {
      title: '学术英语长难句主干抽离与倒装结构精析',
      description: '练习从定语从句、同位语从句与分词短语中迅速锁定谓语动词与核心意群。',
      difficulty: '基础巩固',
      actionQuery: '帮我精析 3 句考研/六级真题中典型的倒装与嵌套定语从句长难句',
    },
    {
      title: '学术论文摘要（Abstract）高频衔接词与被动语态规范',
      description: '整理常用过渡连接词（Conversely, Consequently, Notably）及科学陈述规范。',
      difficulty: '进阶提升',
      actionQuery: '请列举英语学术论文摘要中高频的 15 个高级逻辑衔接词组及例句',
    },
    {
      title: '听力讲座题（Lecture）转折与结论信号词速记符号',
      description: '熟练运用缩写与箭头符号，在听到“However/Turn out/Crucially”时快速记下考点。',
      difficulty: '考前冲刺',
      actionQuery: '传授一套高效的英语听力 Lecture 结构笔记速记符号体系',
    },
  ],
  physics: [
    {
      title: '静电场高斯定理对称性分析与介质电容积分',
      description: '熟练掌握球对称、柱对称与平面对称的高斯面构建方法与场强分布公式推导。',
      difficulty: '进阶提升',
      actionQuery: '请详细推导柱对称带电导体柱在电介质中的高斯定理场强分布',
    },
    {
      title: '刚体定轴转动转动惯量与角动量守恒定理综合应用',
      description: '分析平行轴定理应用条件，结合质点与刚体碰撞模型推导角速度变化。',
      difficulty: '考前冲刺',
      actionQuery: '帮我总结大学物理刚体定轴转动与角动量守恒的典型综合力学题解法',
    },
    {
      title: '波动光学双缝干涉与单缝衍射条纹光强分布规律',
      description: '梳理半波损失产生的物理条件，对比干涉亮条纹与衍射中央明纹宽度关系。',
      difficulty: '基础巩固',
      actionQuery: '为我梳理大学物理中半波损失的产生条件与单缝衍射主极大公式推导',
    },
  ],
  general: [
    {
      title: '核心概念知识树梳理与思维导图构建',
      description: '运用费曼学习法对刚才专注攻克的核心概念进行口头复述，查漏补缺。',
      difficulty: '基础巩固',
      actionQuery: '帮我为刚刚学习的知识点梳理一个层级分明的复习思维导图',
    },
    {
      title: '对应章节典型例题自测与错题归因分析',
      description: '选取 3-5 道课后典型习题检测概念掌握度，整理易错概念卡片。',
      difficulty: '进阶提升',
      actionQuery: '针对本主题出 3 道考察核心概念理解的选择与简答自测题',
    },
    {
      title: '期末考点预测与核心公式/定义速查卡片制作',
      description: '提炼本节内容在期末或考核中的高频分值分布与重点攻坚要点。',
      difficulty: '考前冲刺',
      actionQuery: '根据当前主题提炼 5 个期末必考的核心记忆要点与公式卡片',
    },
  ],
};

export function generateSessionSummary({
  subject,
  duration,
  completedSessionsToday,
  totalFocusMinutesToday,
  tasks = [],
  courses = [],
}: GenerateSummaryParams): SessionSummaryData {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const subjectClean = subject.trim();

  // 1. Identify relevant tasks from user's todo list
  const matchedTasks = tasks.filter(t => {
    const inTitle = t.title.toLowerCase().includes(subjectClean.toLowerCase());
    const inCourse = t.course_name ? t.course_name.toLowerCase().includes(subjectClean.toLowerCase()) : false;
    const inCat = t.custom_category_name ? t.custom_category_name.toLowerCase().includes(subjectClean.toLowerCase()) : false;
    const inProject = t.project_tag ? t.project_tag.toLowerCase().includes(subjectClean.toLowerCase()) : false;
    return inTitle || inCourse || inCat || inProject;
  });

  const completedTaskList = matchedTasks.filter(t => t.is_completed).map(t => t.title);
  const pendingTaskList = matchedTasks.filter(t => !t.is_completed).map(t => t.title);

  // 2. Build summary recap text
  let recapText = '';
  if (completedTaskList.length > 0) {
    recapText = `在本次 ${duration} 分钟深度专注中，您成功攻克了 ${completedTaskList.length} 项关键任务（包括《${completedTaskList.slice(0, 2).join('》、《')}》等），深度心流推进状态极佳！`;
  } else if (pendingTaskList.length > 0) {
    recapText = `本次专注时长 ${duration} 分钟，重点聚焦于《${subjectClean}》学习目标。已对关联待办《${pendingTaskList[0]}》进行了扎实的研读与知识消化，完成了一轮深度输入。`;
  } else {
    recapText = `本次针对《${subjectClean}》完成了 ${duration} 分钟的高效专注，系统梳理了对应章节的核心概念与定理逻辑，有效巩固了认知记忆链路。`;
  }

  // 3. Match domain follow-up study topics
  let selectedTopics: FollowUpStudyTopic[] = [];
  const sLower = subjectClean.toLowerCase();

  if (sLower.includes('数') || sLower.includes('微积分') || sLower.includes('代数') || sLower.includes('算')) {
    selectedTopics = DOMAIN_FOLLOWUP_TOPICS.math;
  } else if (sLower.includes('数据结构') || sLower.includes('算法') || sLower.includes('程序') || sLower.includes('计算机') || sLower.includes('代码')) {
    selectedTopics = DOMAIN_FOLLOWUP_TOPICS.cs;
  } else if (sLower.includes('英语') || sLower.includes('六级') || sLower.includes('四级') || sLower.includes('english') || sLower.includes('雅思') || sLower.includes('托福')) {
    selectedTopics = DOMAIN_FOLLOWUP_TOPICS.english;
  } else if (sLower.includes('物') || sLower.includes('力学') || sLower.includes('电磁') || sLower.includes('光学')) {
    selectedTopics = DOMAIN_FOLLOWUP_TOPICS.physics;
  } else {
    // Generate tailored dynamic topics using subject title
    selectedTopics = [
      {
        title: `《${subjectClean}》核心知识树与考点体系梳理`,
        description: `运用结构化思维，将刚刚学习的要点与本章节的主干知识进行串联，绘制概念关系图。`,
        difficulty: '基础巩固',
        actionQuery: `请帮我系统梳理《${subjectClean}》的核心知识架构与重点概念体系`,
      },
      {
        title: `《${subjectClean}》疑难盲点与易错题型专项突破`,
        description: `排查刚才专注自习过程中遇到的卡点与模糊概念，进行精准查漏补缺。`,
        difficulty: '进阶提升',
        actionQuery: `为我精析《${subjectClean}》学习中常见的易错易混淆概念与难点`,
      },
      {
        title: `《${subjectClean}》实战模拟题与概念应用自测`,
        description: `生成 3 道贴合教学大纲的检验性习题，即刻检验本次专注周期的吸收转化率。`,
        difficulty: '考前冲刺',
        actionQuery: `请为我出 3 道关于《${subjectClean}》重点考查内容的自测题并附详解`,
      },
    ];
  }

  // 4. Cognitive encouragement
  const encouragementOptions = [
    `今日已累计专注 ${totalFocusMinutesToday} 分钟（${completedSessionsToday} 个番茄钟周期）。保持这种高效心流节奏，学业 GPA 稳步提升！`,
    `持续的高质量专注是形成长期记忆的最强武器！今日达成 ${completedSessionsToday} 轮专注冲刺，休息片刻继续征服新知识！`,
    `出色的自控力与执行力！当前专注时间已达 ${totalFocusMinutesToday} 分钟，大脑突触正高效构建神经连接，为你点赞！`,
  ];
  const aiEncouragement = encouragementOptions[(completedSessionsToday - 1) % encouragementOptions.length] || encouragementOptions[0];

  return {
    id: `summary_${Date.now()}`,
    completedAt: timeStr,
    subject: subjectClean,
    durationMinutes: duration,
    completedSessionsToday,
    totalFocusMinutesToday,
    tasksRecap: {
      matchedTasks: matchedTasks.map(t => t.title),
      completedTasks: completedTaskList,
      summaryText: recapText,
    },
    followUpTopics: selectedTopics,
    aiEncouragement,
  };
}

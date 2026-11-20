export type TimeOfDayPeriod = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export interface QuickBreakActivity {
  id: string;
  title: string;
  englishTitle: string;
  iconName: string; // Lucide icon identifier
  category: 'physical' | 'hydration' | 'eye_care' | 'stretching' | 'breathing';
  categoryLabel: string;
  durationText: string;
  instruction: string;
  healthBenefit: string;
  suitedPeriods: TimeOfDayPeriod[];
  caloriesOrCount?: string;
  colorClass: string;
}

export const QUICK_ACTIVITIES: QuickBreakActivity[] = [
  // Morning (06:00 - 11:59)
  {
    id: 'morning_jumping_jacks',
    title: '开合跳 10 次 (Jumping Jacks)',
    englishTitle: 'Do 10 jumping jacks',
    iconName: 'Activity',
    category: 'physical',
    categoryLabel: '晨间激活',
    durationText: '1 分钟',
    instruction: '双脚并拢站立，跳起时双脚分开比肩宽，双手在头顶击掌，连续做 10 次。',
    healthBenefit: '迅速唤醒沉睡的心肺循环，促进脑部多巴胺分泌，提升上午思维敏捷度。',
    suitedPeriods: ['morning'],
    caloriesOrCount: '10 次 / 消耗约 8 大卡',
    colorClass: 'from-amber-500 to-rose-500 text-rose-700 bg-rose-50 border-rose-200',
  },
  {
    id: 'morning_lemon_water',
    title: '喝一杯温柠檬水 / 温开水',
    englishTitle: 'Drink a glass of water',
    iconName: 'Droplets',
    category: 'hydration',
    categoryLabel: '水合唤醒',
    durationText: '1 分钟',
    instruction: '慢饮 250ml 约 40℃ 温开水，可加一片新鲜柠檬片。',
    healthBenefit: '补充夜间与早自习蒸发的水分，加速体内代谢，唤醒消化系统与专注神经。',
    suitedPeriods: ['morning'],
    caloriesOrCount: '250 ml 纯净补水',
    colorClass: 'from-blue-500 to-cyan-500 text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    id: 'morning_chest_opener',
    title: '立式扩胸深吸气 5 次',
    englishTitle: 'Standing chest opener & deep breath',
    iconName: 'Smile',
    category: 'breathing',
    categoryLabel: '扩胸呼吸',
    durationText: '2 分钟',
    instruction: '站立面向阳光或窗外，双臂向两侧大方展开，深吸气 4 秒展开胸腔，呼气慢沉。',
    healthBenefit: '纠正早自习含胸伏案姿态，增加肺泡通气量，迅速驱散早晨未散的残余睡意。',
    suitedPeriods: ['morning'],
    caloriesOrCount: '5 次循环深呼吸',
    colorClass: 'from-amber-500 to-orange-500 text-amber-700 bg-amber-50 border-amber-200',
  },

  // Midday / Noon (12:00 - 14:29)
  {
    id: 'noon_eye_palming',
    title: '手掌熨目 60 秒 (Eye Palming)',
    englishTitle: 'Warm eye palming & eye rest',
    iconName: 'Eye',
    category: 'eye_care',
    categoryLabel: '视力舒缓',
    durationText: '2 分钟',
    instruction: '双手手掌快速用力搓热，随后轻轻虚扣在闭合的双眼上，感受温热滋养眼周肌肉。',
    healthBenefit: '彻底隔绝屏幕蓝光刺激，放松睫状肌痉挛，缓解上午连轴用眼的干涩酸痛。',
    suitedPeriods: ['noon'],
    caloriesOrCount: '闭目放松 60 秒',
    colorClass: 'from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'noon_warm_tea',
    title: '温水慢饮与起立漫步 3 分钟',
    englishTitle: 'Slow water sip & 3-min slow walk',
    iconName: 'Droplets',
    category: 'hydration',
    categoryLabel: '午后润燥',
    durationText: '3 分钟',
    instruction: '小口饮用 200ml 温水，离开书桌在走廊或阳台慢步 50 步。',
    healthBenefit: '促进午饭后的胃肠道蠕动，防止久坐下肢静脉曲张，平稳午后血糖骤升。',
    suitedPeriods: ['noon'],
    caloriesOrCount: '漫步约 80 步',
    colorClass: 'from-teal-500 to-cyan-500 text-teal-700 bg-teal-50 border-teal-200',
  },

  // Late Afternoon (14:30 - 17:59)
  {
    id: 'afternoon_jumping_jacks',
    title: '原地开合跳 15 次 / 自重深蹲 10 次',
    englishTitle: 'Do 15 jumping jacks or squats',
    iconName: 'Activity',
    category: 'physical',
    categoryLabel: '强效破困',
    durationText: '2 分钟',
    instruction: '站离书桌，做 15 次节奏轻快的开合跳或 10 次徒手深蹲，膝盖对准脚尖。',
    healthBenefit: '强力击碎下午“饭困”与能量低谷，将下肢血液泵送回心脏与脑部，重拾攻坚斗志。',
    suitedPeriods: ['afternoon'],
    caloriesOrCount: '15 次开合跳 / 12 大卡',
    colorClass: 'from-rose-500 to-purple-600 text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    id: 'afternoon_cold_water',
    title: '冷水拂面 + 大口喝水 300ml',
    englishTitle: 'Cold water splash & hydrate',
    iconName: 'Droplets',
    category: 'hydration',
    categoryLabel: '冷感提神',
    durationText: '2 分钟',
    instruction: '用洗手间清凉冷水洗一把脸，随后大口补充半杯常温水。',
    healthBenefit: '迷走神经受冷感温和刺激，心率即刻恢复高警觉水平，击退昏睡感。',
    suitedPeriods: ['afternoon'],
    caloriesOrCount: '300 ml 能量清泉',
    colorClass: 'from-blue-600 to-indigo-600 text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'afternoon_wrist_stretch',
    title: '键盘手前臂与手腕伸展 60 秒',
    englishTitle: 'Keyboard forearm & wrist stretch',
    iconName: 'Zap',
    category: 'stretching',
    categoryLabel: '键盘手舒展',
    durationText: '1.5 分钟',
    instruction: '手臂向前伸直，手掌向上立起，另一只手轻轻向后扳手指标指，左右交替各 30 秒。',
    healthBenefit: '拉伸腕管肌腱，缓解敲击代码与手写作业造成的鼠标手酸胀麻木。',
    suitedPeriods: ['afternoon'],
    caloriesOrCount: '双臂各 30 秒',
    colorClass: 'from-indigo-500 to-violet-600 text-indigo-700 bg-indigo-50 border-indigo-200',
  },

  // Evening (18:00 - 21:59)
  {
    id: 'evening_torso_twist',
    title: '坐姿脊柱扭转与颈椎米字操',
    englishTitle: 'Seated spinal twist & neck stretch',
    iconName: 'Smile',
    category: 'stretching',
    categoryLabel: '脊柱减压',
    durationText: '2 分钟',
    instruction: '端坐椅上，右手搭在左膝外侧向左后方扭转躯干保持 15 秒，左右各 2 组。',
    healthBenefit: '释放一整天久坐积压的腰椎剪切力，促进椎间盘微循环，避免晚自习腰背酸痛。',
    suitedPeriods: ['evening'],
    caloriesOrCount: '左右各 2 组',
    colorClass: 'from-purple-500 to-indigo-600 text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    id: 'evening_warm_water',
    title: '慢饮半杯温蜂蜜水 / 热茶',
    englishTitle: 'Drink warm honey water or herbal tea',
    iconName: 'Droplets',
    category: 'hydration',
    categoryLabel: '润喉抚神',
    durationText: '2 分钟',
    instruction: '泡一杯温热的大麦茶或蜂蜜水，端起杯子慢慢闻香并分口咽下。',
    healthBenefit: '温热饮品安抚过度兴奋的中枢交感神经，滋润长期思考干燥的咽喉黏膜。',
    suitedPeriods: ['evening'],
    caloriesOrCount: '200 ml 舒缓热饮',
    colorClass: 'from-amber-500 to-emerald-500 text-amber-700 bg-amber-50 border-amber-200',
  },

  // Night / Late Night (22:00 - 05:59)
  {
    id: 'night_acupressure',
    title: '按揉风池穴与太阳穴 60 秒',
    englishTitle: 'Temple & neck acupressure massage',
    iconName: 'Eye',
    category: 'eye_care',
    categoryLabel: '深夜安神',
    durationText: '2 分钟',
    instruction: '双手拇指按揉后颈窝风池穴，食指中指轻轻打圈按揉双侧太阳穴，力度以微酸胀为宜。',
    healthBenefit: '改善后脑供血，缓解深夜赶 DDL 导致的偏头痛与眼压升高，避免剧烈运动影响入眠。',
    suitedPeriods: ['night'],
    caloriesOrCount: '60 秒深度指压',
    colorClass: 'from-indigo-600 to-slate-700 text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'night_warm_water',
    title: '小口饮 150ml 温水 (切忌冰水)',
    englishTitle: 'Small sips of warm water',
    iconName: 'Droplets',
    category: 'hydration',
    categoryLabel: '夜间润液',
    durationText: '1 分钟',
    instruction: '小口啜饮约 150ml 温水，切勿大口牛饮以免夜间起夜。',
    healthBenefit: '防止深夜大脑缺水引起的情绪焦躁与血液粘稠，保持神经系统平稳运转。',
    suitedPeriods: ['night'],
    caloriesOrCount: '150 ml 温和补水',
    colorClass: 'from-blue-500 to-purple-600 text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    id: 'night_breathing',
    title: '4-7-8 腹式减压呼吸法 4 组',
    englishTitle: '4-7-8 deep relaxation breathing',
    iconName: 'Smile',
    category: 'breathing',
    categoryLabel: '心率平复',
    durationText: '2 分钟',
    instruction: '舌抵上颚，鼻子深吸气 4 秒，屏住呼吸 7 秒，嘴巴缓慢平稳吐气 8 秒，重复 4 次。',
    healthBenefit: '医学证实能迅速下调心率与皮质醇，让紧绷的自主神经系统从“战斗”回归“宁静”。',
    suitedPeriods: ['night'],
    caloriesOrCount: '4 轮经典节律',
    colorClass: 'from-purple-600 to-indigo-800 text-purple-700 bg-purple-50 border-purple-200',
  },
];

// Helper to determine the current time period
export function getCurrentTimePeriod(date: Date = new Date()): {
  period: TimeOfDayPeriod;
  label: string;
  timeRange: string;
  badgeClass: string;
  greeting: string;
  iconName: string;
} {
  const hours = date.getHours();

  if (hours >= 6 && hours < 12) {
    return {
      period: 'morning',
      label: '清晨/上午时段',
      timeRange: '06:00 - 12:00',
      badgeClass: 'bg-amber-500 text-white',
      greeting: '晨光破晓·活力唤醒',
      iconName: 'Sun',
    };
  }
  if (hours >= 12 && hours < 14.5) {
    return {
      period: 'noon',
      label: '正午/午休时段',
      timeRange: '12:00 - 14:30',
      badgeClass: 'bg-emerald-600 text-white',
      greeting: '午间蓄能·柔和休整',
      iconName: 'Coffee',
    };
  }
  if (hours >= 14.5 && hours < 18) {
    return {
      period: 'afternoon',
      label: '下午/能量低谷期',
      timeRange: '14:30 - 18:00',
      badgeClass: 'bg-indigo-600 text-white',
      greeting: '下午冲刺·驱散困倦',
      iconName: 'Zap',
    };
  }
  if (hours >= 18 && hours < 22) {
    return {
      period: 'evening',
      label: '傍晚/夜幕初上',
      timeRange: '18:00 - 22:00',
      badgeClass: 'bg-purple-600 text-white',
      greeting: '晚间研讨·脊柱释压',
      iconName: 'Moon',
    };
  }
  return {
    period: 'night',
    label: '深夜/宁静自习期',
    timeRange: '22:00 - 06:00',
    badgeClass: 'bg-slate-800 text-white',
    greeting: '夜深人静·温和安神',
    iconName: 'Sparkles',
  };
}

// Get activities matching a time period
export function getTimeBasedActivities(period?: TimeOfDayPeriod): QuickBreakActivity[] {
  const currentPeriod = period || getCurrentTimePeriod().period;
  return QUICK_ACTIVITIES.filter(a => a.suitedPeriods.includes(currentPeriod));
}

// Get the top recommended activity for right now
export function getRecommendedQuickActivity(date: Date = new Date(), preferredIndex: number = 0): QuickBreakActivity {
  const { period } = getCurrentTimePeriod(date);
  const matched = getTimeBasedActivities(period);
  if (matched.length === 0) return QUICK_ACTIVITIES[0];
  return matched[preferredIndex % matched.length];
}

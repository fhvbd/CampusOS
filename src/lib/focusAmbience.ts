export type FocusAmbienceTheme = 
  | 'default' 
  | 'misty_forest' 
  | 'deep_twilight' 
  | 'nordic_aurora' 
  | 'warm_dawn' 
  | 'zen_slate';

export interface FocusAmbienceConfig {
  id: FocusAmbienceTheme;
  name: string;
  englishName: string;
  type: 'gradient' | 'nature_blur';
  typeLabel: string;
  description: string;
  swatchGradient: string;
  screenBackdropClass: string;
  orb1Class: string;
  orb2Class: string;
  orb3Class: string;
  accentPillClass: string;
  soundscapeRecommendation?: string;
}

export const FOCUS_AMBIENCE_THEMES: FocusAmbienceConfig[] = [
  {
    id: 'default',
    name: '默认流光',
    englishName: 'Fluid Glass',
    type: 'gradient',
    typeLabel: '经典微光',
    description: '通透轻盈的液态玻璃微光，保留系统默认明朗专注基调。',
    swatchGradient: 'from-purple-500 via-indigo-500 to-blue-500',
    screenBackdropClass: 'bg-transparent',
    orb1Class: 'from-purple-500/15 via-pink-500/5 to-transparent',
    orb2Class: 'from-indigo-500/10 via-blue-500/5 to-transparent',
    orb3Class: 'from-rose-500/10 via-transparent to-transparent',
    accentPillClass: 'bg-purple-600 text-white border-purple-500',
  },
  {
    id: 'misty_forest',
    name: '幽邃雨林',
    englishName: 'Misty Forest',
    type: 'nature_blur',
    typeLabel: '自然虚化',
    description: '青苔与冷杉林深处的静谧绿光，宛如步入晨雾弥漫的森林原野。',
    swatchGradient: 'from-emerald-600 via-teal-700 to-green-800',
    screenBackdropClass: 'bg-radial from-emerald-950/15 via-teal-900/10 to-slate-900/5',
    orb1Class: 'from-emerald-500/25 via-teal-600/15 to-transparent',
    orb2Class: 'from-green-600/20 via-emerald-700/10 to-transparent',
    orb3Class: 'from-teal-400/15 via-emerald-800/10 to-transparent',
    accentPillClass: 'bg-emerald-700 text-white border-emerald-600 shadow-emerald-500/20',
    soundscapeRecommendation: 'forest',
  },
  {
    id: 'deep_twilight',
    name: '深邃夜幕',
    englishName: 'Deep Twilight',
    type: 'gradient',
    typeLabel: '极简极暗',
    description: '暗靛蓝与深紫交融的纯粹暮色，彻底过滤杂光，直达零干扰心流。',
    swatchGradient: 'from-indigo-900 via-slate-900 to-purple-950',
    screenBackdropClass: 'bg-radial from-indigo-950/25 via-slate-950/20 to-purple-950/15',
    orb1Class: 'from-indigo-600/20 via-purple-700/15 to-transparent',
    orb2Class: 'from-violet-700/20 via-indigo-900/10 to-transparent',
    orb3Class: 'from-blue-600/15 via-purple-800/10 to-transparent',
    accentPillClass: 'bg-indigo-800 text-white border-indigo-700 shadow-indigo-500/20',
    soundscapeRecommendation: 'white_noise',
  },
  {
    id: 'nordic_aurora',
    name: '极光微澜',
    englishName: 'Nordic Aurora',
    type: 'nature_blur',
    typeLabel: '自然虚化',
    description: '冰岛夜空泛起的青绿与薄紫柔光，宛如极光在天际轻缓舒卷。',
    swatchGradient: 'from-cyan-500 via-teal-500 to-indigo-600',
    screenBackdropClass: 'bg-radial from-cyan-950/20 via-teal-950/15 to-indigo-950/10',
    orb1Class: 'from-cyan-400/20 via-teal-500/15 to-transparent',
    orb2Class: 'from-indigo-500/20 via-purple-600/10 to-transparent',
    orb3Class: 'from-teal-300/15 via-cyan-600/10 to-transparent',
    accentPillClass: 'bg-teal-700 text-white border-teal-600 shadow-teal-500/20',
    soundscapeRecommendation: 'rain',
  },
  {
    id: 'warm_dawn',
    name: '晨曦暖阳',
    englishName: 'Warm Dawn',
    type: 'gradient',
    typeLabel: '极简渐变',
    description: '地平线上温和柔和的初升红晕与暖杏色微光，营造安心宁神的研读氛围。',
    swatchGradient: 'from-amber-400 via-orange-400 to-rose-400',
    screenBackdropClass: 'bg-radial from-amber-950/10 via-orange-950/5 to-rose-950/5',
    orb1Class: 'from-amber-400/20 via-orange-400/15 to-transparent',
    orb2Class: 'from-rose-400/15 via-amber-500/10 to-transparent',
    orb3Class: 'from-yellow-300/15 via-orange-300/10 to-transparent',
    accentPillClass: 'bg-amber-600 text-white border-amber-500 shadow-amber-500/20',
    soundscapeRecommendation: 'cafe',
  },
  {
    id: 'zen_slate',
    name: '极简水墨',
    englishName: 'Zen Slate',
    type: 'gradient',
    typeLabel: '极简渐变',
    description: '灰黑岩石与宣纸留白的素雅灰度阶梯，心无旁骛，重返专注本质。',
    swatchGradient: 'from-slate-700 via-stone-800 to-zinc-900',
    screenBackdropClass: 'bg-radial from-slate-950/20 via-zinc-950/15 to-neutral-950/10',
    orb1Class: 'from-slate-500/15 via-zinc-600/10 to-transparent',
    orb2Class: 'from-stone-500/15 via-slate-700/10 to-transparent',
    orb3Class: 'from-zinc-400/10 via-neutral-600/5 to-transparent',
    accentPillClass: 'bg-slate-800 text-white border-slate-700 shadow-slate-500/20',
  },
];

export const STORAGE_KEY_FOCUS_AMBIENCE = 'campus_os_focus_ambient_bg_v1';

export function getFocusAmbienceConfig(themeId: FocusAmbienceTheme): FocusAmbienceConfig {
  return FOCUS_AMBIENCE_THEMES.find(t => t.id === themeId) || FOCUS_AMBIENCE_THEMES[0];
}

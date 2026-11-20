import { AccentColorKey, GlassPresetKey } from '../types';

export interface AccentThemeScheme {
  id: AccentColorKey;
  name: string;
  englishName: string;
  tagline: string;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  gradientFrom: string;
  gradientTo: string;
  // UI Tailwind utility classes
  gradientClass: string;
  activeNavClass: string;
  mobileActiveNavClass: string;
  heroGradientClass: string;
  badgeClass: string;
  ringClass: string;
  borderClass: string;
  glowClass: string;
  shadowClass: string;
  textClass: string;
  bgLightClass: string;
  // Dynamic Background Mesh Orbs
  orbs: {
    orb1: string; // Top Left
    orb2: string; // Center Right
    orb3: string; // Bottom Left
    orb4: string; // Bottom Center
  };
  // CSS Custom Properties for global elements
  cssVars: {
    '--accent-primary': string;
    '--accent-secondary': string;
    '--accent-gradient': string;
    '--accent-glow': string;
    '--accent-border': string;
    '--accent-bg-subtle': string;
  };
}

export const ACCENT_THEMES: Record<AccentColorKey, AccentThemeScheme> = {
  blue: {
    id: 'blue',
    name: '经典校园蓝',
    englishName: 'Classic Ocean Blue',
    tagline: '沉稳博雅 · 理工求实',
    description: '以深邃纯正的校园宝蓝与靛蓝为基底，融合自然通透的液态玻璃微光',
    primaryHex: '#2563eb',
    secondaryHex: '#4f46e5',
    gradientFrom: '#2563eb',
    gradientTo: '#4f46e5',
    gradientClass: 'from-blue-600 to-indigo-600',
    activeNavClass: 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-white/30',
    mobileActiveNavClass: 'text-blue-300',
    heroGradientClass: 'from-blue-600/90 via-indigo-600/90 to-purple-700/90',
    badgeClass: 'bg-blue-500/15 text-blue-700 border-blue-500/25',
    ringClass: 'ring-blue-500',
    borderClass: 'border-blue-500/30',
    glowClass: 'shadow-blue-500/20',
    shadowClass: 'shadow-blue-500/25',
    textClass: 'text-blue-600',
    bgLightClass: 'bg-blue-50/80',
    orbs: {
      orb1: 'from-blue-400/30 via-indigo-400/25 to-transparent',
      orb2: 'from-purple-400/25 via-indigo-300/20 to-transparent',
      orb3: 'from-cyan-400/20 via-sky-300/20 to-transparent',
      orb4: 'from-rose-300/15 via-purple-300/15 to-transparent',
    },
    cssVars: {
      '--accent-primary': '#2563eb',
      '--accent-secondary': '#4f46e5',
      '--accent-gradient': 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 50%, #6366f1 100%)',
      '--accent-glow': 'rgba(37, 99, 235, 0.3)',
      '--accent-border': 'rgba(59, 130, 246, 0.4)',
      '--accent-bg-subtle': 'rgba(37, 99, 235, 0.08)',
    },
  },
  emerald: {
    id: 'emerald',
    name: '极光翡翠绿',
    englishName: 'Aurora Emerald',
    tagline: '生机勃勃 · 清新青翠',
    description: '初夏林荫道与常春藤的青翠绿意，带来清爽专注的晨读心流感',
    primaryHex: '#059669',
    secondaryHex: '#0d9488',
    gradientFrom: '#059669',
    gradientTo: '#0d9488',
    gradientClass: 'from-emerald-600 to-teal-600',
    activeNavClass: 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 border border-white/30',
    mobileActiveNavClass: 'text-emerald-300',
    heroGradientClass: 'from-emerald-600/90 via-teal-600/90 to-cyan-700/90',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25',
    ringClass: 'ring-emerald-500',
    borderClass: 'border-emerald-500/30',
    glowClass: 'shadow-emerald-500/20',
    shadowClass: 'shadow-emerald-500/25',
    textClass: 'text-emerald-600',
    bgLightClass: 'bg-emerald-50/80',
    orbs: {
      orb1: 'from-emerald-400/30 via-teal-400/25 to-transparent',
      orb2: 'from-cyan-400/25 via-emerald-300/20 to-transparent',
      orb3: 'from-teal-400/20 via-sky-300/20 to-transparent',
      orb4: 'from-lime-300/15 via-emerald-300/15 to-transparent',
    },
    cssVars: {
      '--accent-primary': '#059669',
      '--accent-secondary': '#0d9488',
      '--accent-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
      '--accent-glow': 'rgba(5, 150, 105, 0.3)',
      '--accent-border': 'rgba(16, 185, 129, 0.4)',
      '--accent-bg-subtle': 'rgba(5, 150, 105, 0.08)',
    },
  },
  purple: {
    id: 'purple',
    name: '星云紫晶',
    englishName: 'Nebula Violet',
    tagline: '探索创新 · 灵感迸发',
    description: '深邃高贵的紫罗兰星云与兰花紫辉，激发学术创意与极客灵感',
    primaryHex: '#7c3aed',
    secondaryHex: '#9333ea',
    gradientFrom: '#7c3aed',
    gradientTo: '#9333ea',
    gradientClass: 'from-violet-600 to-purple-600',
    activeNavClass: 'bg-linear-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-purple-500/25 border border-white/30',
    mobileActiveNavClass: 'text-purple-300',
    heroGradientClass: 'from-violet-600/90 via-purple-600/90 to-fuchsia-700/90',
    badgeClass: 'bg-purple-500/15 text-purple-700 border-purple-500/25',
    ringClass: 'ring-purple-500',
    borderClass: 'border-purple-500/30',
    glowClass: 'shadow-purple-500/20',
    shadowClass: 'shadow-purple-500/25',
    textClass: 'text-purple-600',
    bgLightClass: 'bg-purple-50/80',
    orbs: {
      orb1: 'from-violet-400/30 via-purple-400/25 to-transparent',
      orb2: 'from-fuchsia-400/25 via-purple-300/20 to-transparent',
      orb3: 'from-indigo-400/20 via-violet-300/20 to-transparent',
      orb4: 'from-pink-300/15 via-purple-300/15 to-transparent',
    },
    cssVars: {
      '--accent-primary': '#7c3aed',
      '--accent-secondary': '#9333ea',
      '--accent-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #a855f7 100%)',
      '--accent-glow': 'rgba(124, 58, 237, 0.3)',
      '--accent-border': 'rgba(139, 92, 246, 0.4)',
      '--accent-bg-subtle': 'rgba(124, 58, 237, 0.08)',
    },
  },
  amber: {
    id: 'amber',
    name: '晨曦暖阳金',
    englishName: 'Sunrise Amber',
    tagline: '热情朝气 · 破晓晨曦',
    description: '如图书馆初升朝霞般的温润琥珀与暖橘，让每一次学习充满暖意与干劲',
    primaryHex: '#d97706',
    secondaryHex: '#ea580c',
    gradientFrom: '#d97706',
    gradientTo: '#ea580c',
    gradientClass: 'from-amber-500 to-orange-600',
    activeNavClass: 'bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 border border-white/30',
    mobileActiveNavClass: 'text-amber-300',
    heroGradientClass: 'from-amber-600/90 via-orange-600/90 to-rose-700/90',
    badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/25',
    ringClass: 'ring-amber-500',
    borderClass: 'border-amber-500/30',
    glowClass: 'shadow-amber-500/20',
    shadowClass: 'shadow-amber-500/25',
    textClass: 'text-amber-600',
    bgLightClass: 'bg-amber-50/80',
    orbs: {
      orb1: 'from-amber-400/30 via-orange-400/25 to-transparent',
      orb2: 'from-rose-400/25 via-amber-300/20 to-transparent',
      orb3: 'from-yellow-400/20 via-amber-300/20 to-transparent',
      orb4: 'from-orange-300/15 via-amber-300/15 to-transparent',
    },
    cssVars: {
      '--accent-primary': '#d97706',
      '--accent-secondary': '#ea580c',
      '--accent-gradient': 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #ea580c 100%)',
      '--accent-glow': 'rgba(217, 119, 6, 0.3)',
      '--accent-border': 'rgba(245, 158, 11, 0.4)',
      '--accent-bg-subtle': 'rgba(217, 119, 6, 0.08)',
    },
  },
  rose: {
    id: 'rose',
    name: '落樱绯红',
    englishName: 'Sakura Crimson',
    tagline: '浪漫明媚 · 青春飞扬',
    description: '春日校园樱花大道与绯红云霞的交织，充满活力与青春温度的个性色调',
    primaryHex: '#e11d48',
    secondaryHex: '#db2777',
    gradientFrom: '#e11d48',
    gradientTo: '#db2777',
    gradientClass: 'from-rose-600 to-pink-600',
    activeNavClass: 'bg-linear-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/25 border border-white/30',
    mobileActiveNavClass: 'text-rose-300',
    heroGradientClass: 'from-rose-600/90 via-pink-600/90 to-purple-700/90',
    badgeClass: 'bg-rose-500/15 text-rose-700 border-rose-500/25',
    ringClass: 'ring-rose-500',
    borderClass: 'border-rose-500/30',
    glowClass: 'shadow-rose-500/20',
    shadowClass: 'shadow-rose-500/25',
    textClass: 'text-rose-600',
    bgLightClass: 'bg-rose-50/80',
    orbs: {
      orb1: 'from-rose-400/30 via-pink-400/25 to-transparent',
      orb2: 'from-purple-400/25 via-rose-300/20 to-transparent',
      orb3: 'from-pink-400/20 via-rose-300/20 to-transparent',
      orb4: 'from-red-300/15 via-pink-300/15 to-transparent',
    },
    cssVars: {
      '--accent-primary': '#e11d48',
      '--accent-secondary': '#db2777',
      '--accent-gradient': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #db2777 100%)',
      '--accent-glow': 'rgba(225, 29, 72, 0.3)',
      '--accent-border': 'rgba(244, 63, 94, 0.4)',
      '--accent-bg-subtle': 'rgba(225, 29, 72, 0.08)',
    },
  },
  cyan: {
    id: 'cyan',
    name: '赛博青黛',
    englishName: 'Cyber Cyan',
    tagline: '极客未来 · 清澈冷静',
    description: '电子科技视界里的冷冽湖蓝与赛博青，通透明澈，极具现代前沿感',
    primaryHex: '#0891b2',
    secondaryHex: '#0284c7',
    gradientFrom: '#0891b2',
    gradientTo: '#0284c7',
    gradientClass: 'from-cyan-600 to-blue-600',
    activeNavClass: 'bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25 border border-white/30',
    mobileActiveNavClass: 'text-cyan-300',
    heroGradientClass: 'from-cyan-600/90 via-sky-600/90 to-indigo-700/90',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/25',
    ringClass: 'ring-cyan-500',
    borderClass: 'border-cyan-500/30',
    glowClass: 'shadow-cyan-500/20',
    shadowClass: 'shadow-cyan-500/25',
    textClass: 'text-cyan-600',
    bgLightClass: 'bg-cyan-50/80',
    orbs: {
      orb1: 'from-cyan-400/30 via-sky-400/25 to-transparent',
      orb2: 'from-blue-400/25 via-cyan-300/20 to-transparent',
      orb3: 'from-teal-400/20 via-cyan-300/20 to-transparent',
      orb4: 'from-indigo-300/15 via-cyan-300/15 to-transparent',
    },
    cssVars: {
      '--accent-primary': '#0891b2',
      '--accent-secondary': '#0284c7',
      '--accent-gradient': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0284c7 100%)',
      '--accent-glow': 'rgba(8, 145, 178, 0.3)',
      '--accent-border': 'rgba(6, 182, 212, 0.4)',
      '--accent-bg-subtle': 'rgba(8, 145, 178, 0.08)',
    },
  },
};

export const DEFAULT_ACCENT_KEY: AccentColorKey = 'blue';

export function getAccentTheme(key?: AccentColorKey): AccentThemeScheme {
  if (key && ACCENT_THEMES[key]) {
    return ACCENT_THEMES[key];
  }
  return ACCENT_THEMES[DEFAULT_ACCENT_KEY];
}

export function applyAccentThemeCssVars(scheme: AccentThemeScheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(scheme.cssVars).forEach(([varName, val]) => {
    root.style.setProperty(varName, val);
  });
  root.setAttribute('data-accent-theme', scheme.id);
}

// ==========================================
// Liquid Glass 2.0 Optical Material Presets
// ==========================================
export type PrimaryGlassPresetKey = 'matte_frost' | 'high_gloss' | 'deep_depth';

export interface GlassPresetScheme {
  id: PrimaryGlassPresetKey;
  name: string;
  englishName: 'Matte Frost' | 'High Gloss' | 'Deep Depth';
  tagline: string;
  description: string;
  opticalMetrics: string;
  telemetry: {
    blurLabel: string;
    saturationLabel: string;
    ambientOpacityLabel: string;
    specularLabel: string;
  };
  mobileTooltip: {
    visualImpact: string;
    performanceTradeoff: string;
    mobileRating: string;
    impactLabel: string;
    impactHintZh: string;
    impactLevel: 1 | 2 | 3;
    ratingTone: 'emerald' | 'amber' | 'rose';
    recommendedFor: string;
  };
  cssVars: {
    '--glass-bg': string;
    '--glass-hover-bg': string;
    '--glass-blur': string;
    '--glass-saturate': string;
    '--glass-border': string;
    '--glass-hover-border': string;
    '--glass-border-image': string;
    '--glass-specular-top': string;
    '--glass-specular-bottom': string;
    '--glass-ambient-opacity': string;
    '--glass-pill-bg': string;
  };
}

export const PRIMARY_GLASS_PRESET_KEYS: PrimaryGlassPresetKey[] = [
  'matte_frost',
  'high_gloss',
  'deep_depth',
];

export const GLASS_PRESETS: Record<PrimaryGlassPresetKey, GlassPresetScheme> = {
  matte_frost: {
    id: 'matte_frost',
    name: '雾面磨砂',
    englishName: 'Matte Frost',
    tagline: '温润凝脂柔焦 · 漫射消光护眼',
    description: '高阶 32px 深度磨砂柔焦与低眩光缎面内边缘，弱化背景噪点干扰，适合长时间沉浸阅读与课表规划',
    opticalMetrics: '模糊 32px · 饱和度 180% · 环境光 α 0.52',
    telemetry: {
      blurLabel: '32px',
      saturationLabel: '180%',
      ambientOpacityLabel: '0.52',
      specularLabel: 'Satin Soft',
    },
    mobileTooltip: {
      visualImpact: '32px 深度柔焦配合低眩光缎面漫射，有效过滤底层色彩干扰，显著提升手机小屏的文字清晰度与阅读舒适度。',
      performanceTradeoff: '大半径 backdrop-filter(32px) 在移动端快速滚动时会增加 GPU 像素采样带宽，续航与发热略高于 High Gloss。',
      mobileRating: '移动端负载：中等',
      impactLabel: 'Medium Impact',
      impactHintZh: '中负载',
      impactLevel: 2,
      ratingTone: 'amber',
      recommendedFor: '长时间阅读通知、核对课表与护眼自习',
    },
    cssVars: {
      '--glass-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.84) 0%, rgba(255, 255, 255, 0.68) 55%, rgba(255, 255, 255, 0.78) 100%)',
      '--glass-hover-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.78) 55%, rgba(255, 255, 255, 0.86) 100%)',
      '--glass-blur': '32px',
      '--glass-saturate': '180%',
      '--glass-border': 'rgba(255, 255, 255, 0.90)',
      '--glass-hover-border': 'rgba(255, 255, 255, 0.98)',
      '--glass-border-image':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(226, 232, 240, 0.75) 50%, var(--accent-border, rgba(99, 102, 241, 0.32)) 100%)',
      '--glass-specular-top': 'rgba(255, 255, 255, 0.92)',
      '--glass-specular-bottom': 'rgba(255, 255, 255, 0.45)',
      '--glass-ambient-opacity': '0.52',
      '--glass-pill-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.84) 0%, rgba(255, 255, 255, 0.68) 100%)',
    },
  },
  high_gloss: {
    id: 'high_gloss',
    name: '高光镜面',
    englishName: 'High Gloss',
    tagline: '高透水滴折射 · 锐利镜面流光',
    description: '清澈 18px 晶体高透光率配合高锐度白钻镜面切边，底层流光色球与鼠标追光高光清晰折光',
    opticalMetrics: '模糊 18px · 饱和度 235% · 环境光 α 0.68',
    telemetry: {
      blurLabel: '18px',
      saturationLabel: '235%',
      ambientOpacityLabel: '0.68',
      specularLabel: 'Crisp Mirror',
    },
    mobileTooltip: {
      visualImpact: '18px 高透水滴质感与锐利白钻镜面切边，底层极光色彩透射通透、界面轻盈利落。',
      performanceTradeoff: '较小模糊半径搭配轻量阴影层，移动浏览器合成耗时最短、滚动帧率最稳且最省电，推荐手机端首选。',
      mobileRating: '移动端负载：低（推荐）',
      impactLabel: 'Low Impact',
      impactHintZh: '低耗省电',
      impactLevel: 1,
      ratingTone: 'emerald',
      recommendedFor: '手机端高频滑动、长续航及中低端机型',
    },
    cssVars: {
      '--glass-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 48%, rgba(255, 255, 255, 0.64) 100%)',
      '--glass-hover-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.54) 48%, rgba(255, 255, 255, 0.78) 100%)',
      '--glass-blur': '18px',
      '--glass-saturate': '235%',
      '--glass-border': 'rgba(255, 255, 255, 0.98)',
      '--glass-hover-border': 'rgba(255, 255, 255, 1)',
      '--glass-border-image':
        'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, var(--accent-border, rgba(59, 130, 246, 0.62)) 45%, rgba(255, 255, 255, 0.96) 100%)',
      '--glass-specular-top': 'rgba(255, 255, 255, 1)',
      '--glass-specular-bottom': 'rgba(255, 255, 255, 0.72)',
      '--glass-ambient-opacity': '0.68',
      '--glass-pill-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(255, 255, 255, 0.50) 100%)',
    },
  },
  deep_depth: {
    id: 'deep_depth',
    name: '深邃景深',
    englishName: 'Deep Depth',
    tagline: '五重悬浮阴影 · 棱镜色散光晕',
    description: '默认启用 Liquid Glass 2.0 标志性五层悬浮景深与色彩衍射光环，呈现强烈的空间多层立体悬浮感',
    opticalMetrics: '模糊 24px · 饱和度 240% · 环境光 α 0.72',
    telemetry: {
      blurLabel: '24px',
      saturationLabel: '240%',
      ambientOpacityLabel: '0.72',
      specularLabel: '5-Layer Prism',
    },
    mobileTooltip: {
      visualImpact: '五层悬浮阴影、主题色衍射光环与 24px 棱镜折射叠加，呈现最强的 Liquid Glass 2.0 空间立体浮空层次。',
      performanceTradeoff: '多重 box-shadow 与 color-mix 实时模糊在移动端 GPU 合成开销较高，老旧机型快速滚动时可能出现轻微掉帧或耗电增加。',
      mobileRating: '移动端负载：中高',
      impactLabel: 'High GPU Usage',
      impactHintZh: '高 GPU',
      impactLevel: 3,
      ratingTone: 'rose',
      recommendedFor: '桌面端大屏、旗舰手机与沉浸视觉展示',
    },
    cssVars: {
      '--glass-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(255, 255, 255, 0.48) 45%, var(--accent-bg-subtle, rgba(59, 130, 246, 0.12)) 100%)',
      '--glass-hover-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(255, 255, 255, 0.62) 45%, var(--accent-bg-subtle, rgba(59, 130, 246, 0.16)) 100%)',
      '--glass-blur': '24px',
      '--glass-saturate': '240%',
      '--glass-border': 'rgba(255, 255, 255, 0.95)',
      '--glass-hover-border': 'rgba(255, 255, 255, 1)',
      '--glass-border-image':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, var(--accent-border, rgba(99, 102, 241, 0.52)) 48%, rgba(56, 189, 248, 0.44) 78%, rgba(255, 255, 255, 0.92) 100%)',
      '--glass-specular-top': 'rgba(255, 255, 255, 1)',
      '--glass-specular-bottom': 'var(--accent-glow, rgba(59, 130, 246, 0.28))',
      '--glass-ambient-opacity': '0.72',
      '--glass-pill-bg':
        'linear-gradient(135deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.54) 100%)',
    },
  },
};

export const DEFAULT_GLASS_PRESET: PrimaryGlassPresetKey = 'deep_depth';

export function normalizeGlassPresetKey(key?: GlassPresetKey): PrimaryGlassPresetKey {
  if (!key) return DEFAULT_GLASS_PRESET;
  if (key === 'matte_frost' || key === 'frosted') return 'matte_frost';
  if (key === 'high_gloss' || key === 'crystal') return 'high_gloss';
  if (key === 'deep_depth' || key === 'prismatic') return 'deep_depth';
  return DEFAULT_GLASS_PRESET;
}

export function getGlassPreset(key?: GlassPresetKey): GlassPresetScheme {
  const normalized = normalizeGlassPresetKey(key);
  return GLASS_PRESETS[normalized] || GLASS_PRESETS[DEFAULT_GLASS_PRESET];
}

export function applyGlassPresetCssVars(preset: GlassPresetScheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(preset.cssVars).forEach(([varName, val]) => {
    root.style.setProperty(varName, val);
  });
  root.setAttribute('data-glass-preset', preset.id);
}



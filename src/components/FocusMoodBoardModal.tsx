import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Headphones, 
  Sparkles, 
  CloudRain, 
  Coffee, 
  Radio, 
  Trees, 
  Waves, 
  Flame, 
  Volume2, 
  VolumeX, 
  Moon, 
  Sun, 
  Compass, 
  Wind, 
  Check, 
  X, 
  Sliders, 
  Play, 
  Pause, 
  Maximize2, 
  Eye, 
  Music,
  CheckCircle2,
  Zap,
  Activity
} from 'lucide-react';
import { 
  FocusAmbienceTheme, 
  FOCUS_AMBIENCE_THEMES, 
  getFocusAmbienceConfig 
} from '../lib/focusAmbience';
import { 
  GlobalSoundscapeEngine, 
  SOUNDSCAPE_OPTIONS, 
  SoundscapeOption 
} from '../lib/soundscapes';

interface FocusMoodBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmbience: FocusAmbienceTheme;
  onSelectAmbience: (theme: FocusAmbienceTheme) => void;
}

interface MoodPreset {
  id: string;
  name: string;
  englishName: string;
  emoji: string;
  sound: SoundscapeOption;
  soundLabel: string;
  ambience: FocusAmbienceTheme;
  ambienceLabel: string;
  tag: string;
  description: string;
  gradient: string;
}

export const MOOD_BOARD_PRESETS: MoodPreset[] = [
  {
    id: 'rainy_study',
    name: '雨夜书房',
    englishName: 'Rainy Sanctuary',
    emoji: '🌧️',
    sound: 'rain',
    soundLabel: '图书馆细雨 (Rainfall)',
    ambience: 'misty_forest',
    ambienceLabel: '幽邃雨林 (自然虚化)',
    tag: '平息焦虑',
    description: '窗外淅沥微雨交织青苔冷杉晨雾，抚平躁动，迅速进入深潜心流。',
    gradient: 'from-blue-600/20 via-emerald-600/20 to-teal-800/30',
  },
  {
    id: 'cafe_flow',
    name: '街角咖啡',
    englishName: 'Afternoon Cafe',
    emoji: '☕',
    sound: 'cafe',
    soundLabel: '街角咖啡馆 (Coffee Shop)',
    ambience: 'warm_dawn',
    ambienceLabel: '晨曦暖阳 (极简渐变)',
    tag: '灵感迸发',
    description: '醇厚黑胶共鸣与温暖晨曦微光，模拟高知研讨自习室氛围。',
    gradient: 'from-amber-600/20 via-orange-500/20 to-rose-600/20',
  },
  {
    id: 'zen_void',
    name: '零噪无极',
    englishName: 'Zen Monolith',
    emoji: '📻',
    sound: 'white_noise',
    soundLabel: '纯净白噪音 (White Noise)',
    ambience: 'zen_slate',
    ambienceLabel: '极简水墨 (极简素雅)',
    tag: '抗噪首选',
    description: '全频均衡抗噪屏蔽外界杂音，水墨宣纸素雅黑白，心无旁骛。',
    gradient: 'from-slate-700/20 via-zinc-800/20 to-neutral-900/30',
  },
  {
    id: 'nordic_aurora_tide',
    name: '极光潮汐',
    englishName: 'Nordic Aurora & Tides',
    emoji: '🌌',
    sound: 'waves',
    soundLabel: '深海潮汐 (Ocean Waves)',
    ambience: 'nordic_aurora',
    ambienceLabel: '极光微澜 (自然虚化)',
    tag: '深度冥想',
    description: '呼吸式潮水韵律促发阿尔法脑波，天际轻灵极光舒卷，缓解高压。',
    gradient: 'from-cyan-600/20 via-teal-600/20 to-indigo-800/30',
  },
  {
    id: 'midnight_hearth',
    name: '深夜守炉',
    englishName: 'Midnight Hearth',
    emoji: '🪵',
    sound: 'fireplace',
    soundLabel: '暖意壁炉 (Fireplace)',
    ambience: 'deep_twilight',
    ambienceLabel: '深邃夜幕 (极简极暗)',
    tag: '深夜攻坚',
    description: '松木柴火轻微噼啪声伴随纯粹暗夜暮色，适合期末硬核解题攻坚。',
    gradient: 'from-rose-700/20 via-indigo-900/20 to-purple-950/30',
  },
  {
    id: 'clean_fluid',
    name: '流光明境',
    englishName: 'Fluid Clarity',
    emoji: '✨',
    sound: 'forest',
    soundLabel: '晨曦森林 (Forest)',
    ambience: 'default',
    ambienceLabel: '默认流光 (经典微光)',
    tag: '清爽通透',
    description: '松涛微风拂面搭配通透液态玻璃微光，保持最开朗专注的状态。',
    gradient: 'from-purple-600/20 via-indigo-600/20 to-blue-600/20',
  },
];

export const FocusMoodBoardModal: React.FC<FocusMoodBoardModalProps> = ({
  isOpen,
  onClose,
  currentAmbience,
  onSelectAmbience,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  
  // Real-time Soundscape Engine state
  const [currentSound, setCurrentSound] = useState<SoundscapeOption>(() => {
    return GlobalSoundscapeEngine.getCurrentSoundscape();
  });
  const [volume, setVolume] = useState<number>(() => {
    return GlobalSoundscapeEngine.getVolume();
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return GlobalSoundscapeEngine.isPlaying();
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return GlobalSoundscapeEngine.getIsMuted();
  });

  // Track applied feedback toast
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = GlobalSoundscapeEngine.subscribe(() => {
      setCurrentSound(GlobalSoundscapeEngine.getCurrentSoundscape());
      setVolume(GlobalSoundscapeEngine.getVolume());
      setIsPlaying(GlobalSoundscapeEngine.isPlaying());
      setIsMuted(GlobalSoundscapeEngine.getIsMuted());
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const currentAmbienceConfig = getFocusAmbienceConfig(currentAmbience);

  const showToast = (msg: string) => {
    setAppliedNotice(msg);
    setTimeout(() => setAppliedNotice(null), 2500);
  };

  const handleApplyPreset = (preset: MoodPreset) => {
    // 1. Apply visual aesthetic
    onSelectAmbience(preset.ambience);

    // 2. Apply soundscape theme
    if (preset.sound === 'none') {
      GlobalSoundscapeEngine.stop();
    } else {
      GlobalSoundscapeEngine.play(preset.sound, isMuted ? 0 : volume);
    }

    showToast(`已切换至「${preset.name}」情绪画板：${preset.soundLabel.split(' ')[0]} + ${preset.ambienceLabel.split(' ')[0]}`);
  };

  const handleSelectSoundTheme = (soundId: SoundscapeOption) => {
    if (soundId === currentSound && isPlaying) {
      GlobalSoundscapeEngine.stop();
      showToast('已暂停背景音景');
    } else {
      GlobalSoundscapeEngine.play(soundId, isMuted ? 0 : volume);
      const opt = SOUNDSCAPE_OPTIONS.find(s => s.id === soundId);
      showToast(`已开启「${opt?.name || soundId}」背景白噪音景`);
    }
  };

  const handleSelectAestheticTheme = (themeId: FocusAmbienceTheme) => {
    onSelectAmbience(themeId);
    const cfg = getFocusAmbienceConfig(themeId);
    showToast(`已更换视觉美学：「${cfg.name}」`);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    GlobalSoundscapeEngine.setVolume(val);
  };

  const getSoundIcon = (id: SoundscapeOption) => {
    switch (id) {
      case 'rain':
        return <CloudRain className="h-4 w-4" />;
      case 'cafe':
        return <Coffee className="h-4 w-4" />;
      case 'white_noise':
        return <Radio className="h-4 w-4" />;
      case 'forest':
        return <Trees className="h-4 w-4" />;
      case 'waves':
        return <Waves className="h-4 w-4" />;
      case 'fireplace':
        return <Flame className="h-4 w-4" />;
      default:
        return <VolumeX className="h-4 w-4" />;
    }
  };

  const getAestheticIcon = (id: FocusAmbienceTheme) => {
    switch (id) {
      case 'misty_forest':
        return <Trees className="h-4 w-4 text-emerald-600" />;
      case 'deep_twilight':
        return <Moon className="h-4 w-4 text-indigo-400" />;
      case 'nordic_aurora':
        return <Wind className="h-4 w-4 text-teal-500" />;
      case 'warm_dawn':
        return <Sun className="h-4 w-4 text-amber-500" />;
      case 'zen_slate':
        return <Compass className="h-4 w-4 text-slate-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white/95 rounded-3xl border border-white/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Dynamic Atmospheric Glow Banner at the top */}
        <div className={`p-6 sm:p-7 bg-linear-to-r ${currentAmbienceConfig.swatchGradient} text-white relative overflow-hidden shrink-0`}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-xs" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                    专注情绪画板 (Mood Board)
                  </h2>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/25 border border-white/30 text-white font-mono">
                    PRO SENSES
                  </span>
                </div>
                <p className="text-xs text-white/85 font-medium mt-0.5">
                  自选自习背景音景与视觉美学，沉浸式营造零杂念深度心流
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current Live Atmosphere Pill */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/70 font-medium">当前自习氛围：</span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white font-bold text-xs">
              {getSoundIcon(currentSound)}
              <span>音景: {SOUNDSCAPE_OPTIONS.find(s => s.id === currentSound)?.name || '未播放'}</span>
              {isPlaying && currentSound !== 'none' && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              )}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white font-bold text-xs">
              {getAestheticIcon(currentAmbience)}
              <span>视觉: {currentAmbienceConfig.name} ({currentAmbienceConfig.typeLabel})</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Volume Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white text-indigo-700 shadow-xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>灵感调性预设 (Mood Presets)</span>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white text-indigo-700 shadow-xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>自由混搭调配 (Mix & Match)</span>
            </button>
          </div>

          {/* Quick Volume Slider */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => {
                if (isPlaying) {
                  GlobalSoundscapeEngine.stop();
                } else if (currentSound !== 'none') {
                  GlobalSoundscapeEngine.play(currentSound, volume);
                } else {
                  GlobalSoundscapeEngine.play('rain', volume);
                }
              }}
              className="text-indigo-600 hover:text-indigo-800 cursor-pointer p-0.5"
              title={isPlaying ? '暂停音景' : '播放音景'}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <Volume2 className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="font-mono text-[10px] text-slate-500 w-7 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: CURATED MOOD PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>精选声画一体化调配预设，一键装载声学底噪与环境视觉：</span>
                <span className="font-bold text-indigo-600">点击卡片立即生效</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {MOOD_BOARD_PRESETS.map((preset) => {
                  const isCurrentActive = currentSound === preset.sound && currentAmbience === preset.ambience;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 ${
                        isCurrentActive
                          ? 'bg-linear-to-br from-indigo-50/90 to-purple-50/70 border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-1.5 rounded-xl bg-slate-100/80 group-hover:scale-110 transition-transform">
                            {preset.emoji}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {preset.name}
                              </h4>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                                {preset.tag}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {preset.englishName}
                            </span>
                          </div>
                        </div>

                        {isCurrentActive ? (
                          <span className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            载入 →
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        {preset.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 text-slate-700 font-bold">
                          {getSoundIcon(preset.sound)}
                          {preset.soundLabel}
                        </span>
                        <span className="flex items-center gap-1 text-purple-700 font-bold">
                          {getAestheticIcon(preset.ambience)}
                          {preset.ambienceLabel.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MODULAR MIX & MATCH */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              
              {/* 1. Ambient Soundscape Theme Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-indigo-600" />
                    <h3 className="font-black text-sm text-slate-900">
                      1. 背景声学音景 (Ambient Soundscape Theme)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    由 Web Audio API 实时程序化合成，无外链延迟
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SOUNDSCAPE_OPTIONS.map((snd) => {
                    const isSelected = currentSound === snd.id;

                    return (
                      <button
                        key={snd.id}
                        type="button"
                        onClick={() => handleSelectSoundTheme(snd.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {getSoundIcon(snd.id)}
                          </div>
                          {isSelected && isPlaying && snd.id !== 'none' && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                              播放中
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            {snd.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {snd.englishName}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Visual Aesthetic Theme Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-600" />
                    <h3 className="font-black text-sm text-slate-900">
                      2. 视觉美学背景 (Visual Aesthetic & Glow)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    微光流体渲染，过滤杂讯光干扰
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FOCUS_AMBIENCE_THEMES.map((theme) => {
                    const isSelected = currentAmbience === theme.id;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectAestheticTheme(theme.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-purple-50/90 border-purple-500 shadow-xs ring-2 ring-purple-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="h-6 w-10 rounded-lg bg-linear-to-r overflow-hidden shadow-2xs border border-black/10" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}>
                            <div className={`w-full h-full bg-linear-to-r ${theme.swatchGradient}`} />
                          </div>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                            {getAestheticIcon(theme.id)}
                            <span>{theme.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {theme.typeLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions & Toast notification */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {appliedNotice ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {appliedNotice}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                所选情绪画板与背景音景将在整个番茄钟自习期间持续生效
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95"
          >
            完成设定并沉浸自习
          </button>
        </div>

      </div>
    </div>
  );
};

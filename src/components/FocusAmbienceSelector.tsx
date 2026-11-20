import React, { useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  Check, 
  Trees, 
  Moon, 
  Sun, 
  Wind, 
  Compass,
  ChevronDown,
  Layers,
  X
} from 'lucide-react';
import { 
  FocusAmbienceTheme, 
  FOCUS_AMBIENCE_THEMES, 
  getFocusAmbienceConfig 
} from '../lib/focusAmbience';

interface FocusAmbienceSelectorProps {
  currentTheme: FocusAmbienceTheme;
  onSelectTheme: (theme: FocusAmbienceTheme) => void;
  className?: string;
}

export const FocusAmbienceSelector: React.FC<FocusAmbienceSelectorProps> = ({
  currentTheme,
  onSelectTheme,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const activeConfig = getFocusAmbienceConfig(currentTheme);

  const getThemeIcon = (id: FocusAmbienceTheme) => {
    switch (id) {
      case 'misty_forest':
        return <Trees className="h-3.5 w-3.5 text-emerald-600" />;
      case 'deep_twilight':
        return <Moon className="h-3.5 w-3.5 text-indigo-400" />;
      case 'nordic_aurora':
        return <Wind className="h-3.5 w-3.5 text-teal-500" />;
      case 'warm_dawn':
        return <Sun className="h-3.5 w-3.5 text-amber-500" />;
      case 'zen_slate':
        return <Compass className="h-3.5 w-3.5 text-slate-500" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/80 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/80 shadow-2xs transition-all cursor-pointer active:scale-95 hover:border-slate-300"
        title="更换专注背景氛围（极简渐变 / 自然虚化）"
      >
        <Palette className="h-3.5 w-3.5 text-indigo-600" />
        <span className="hidden sm:inline text-slate-500 text-[11px] font-normal">氛围背景:</span>
        <span className="flex items-center gap-1 text-slate-900 font-black">
          {getThemeIcon(currentTheme)}
          <span>{activeConfig.name}</span>
        </span>
        <span className={`h-2.5 w-2.5 rounded-full bg-linear-to-tr ${activeConfig.swatchGradient} ring-1 ring-black/10`} />
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl p-3.5 space-y-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
            <div className="flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-900">专注背景与自然虚化</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 px-1 font-medium leading-relaxed">
            选择舒缓的极简渐变或自然虚化背景，过滤视觉杂讯，提升深度学习心流：
          </p>

          {/* Theme Options Grid */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
            {FOCUS_AMBIENCE_THEMES.map(theme => {
              const isSelected = currentTheme === theme.id;

              return (
                <div
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/20 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Swatch circle */}
                    <div className={`h-8 w-8 rounded-xl bg-linear-to-tr ${theme.swatchGradient} shadow-xs shrink-0 flex items-center justify-center text-white ring-1 ring-black/10`}>
                      {getThemeIcon(theme.id)}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {theme.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {theme.englishName}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          theme.type === 'nature_blur'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {theme.typeLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">
                        {theme.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};

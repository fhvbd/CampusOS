import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1,
  Radio, 
  CloudRain, 
  Trees, 
  Coffee, 
  Waves, 
  Flame, 
  Sparkles, 
  Check, 
  Zap,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { 
  GlobalSoundscapeEngine, 
  SOUNDSCAPE_OPTIONS, 
  SoundscapeOption, 
  SoundscapeItem 
} from '../lib/soundscapes';

interface AmbientSoundPanelProps {
  className?: string;
  isPomodoroRunning?: boolean;
}

export const AmbientSoundPanel: React.FC<AmbientSoundPanelProps> = ({
  className = '',
  isPomodoroRunning = false,
}) => {
  const [activeSound, setActiveSound] = useState<SoundscapeOption>(() => {
    return GlobalSoundscapeEngine.getCurrentSoundscape();
  });
  const [volume, setVolume] = useState<number>(() => {
    return GlobalSoundscapeEngine.getVolume();
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return GlobalSoundscapeEngine.getIsMuted();
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return GlobalSoundscapeEngine.isPlaying();
  });
  const [autoSyncWithTimer, setAutoSyncWithTimer] = useState<boolean>(false);

  // Subscribe to GlobalSoundscapeEngine events
  useEffect(() => {
    const unsubscribe = GlobalSoundscapeEngine.subscribe(() => {
      setActiveSound(GlobalSoundscapeEngine.getCurrentSoundscape());
      setVolume(GlobalSoundscapeEngine.getVolume());
      setIsMuted(GlobalSoundscapeEngine.getIsMuted());
      setIsPlaying(GlobalSoundscapeEngine.isPlaying());
    });
    return () => unsubscribe();
  }, []);

  // Auto-sync with timer when enabled
  useEffect(() => {
    if (autoSyncWithTimer) {
      if (isPomodoroRunning && activeSound !== 'none') {
        if (!GlobalSoundscapeEngine.isPlaying()) {
          GlobalSoundscapeEngine.play(activeSound, isMuted ? 0 : volume);
        }
      } else if (!isPomodoroRunning && GlobalSoundscapeEngine.isPlaying()) {
        GlobalSoundscapeEngine.stop();
      }
    }
  }, [isPomodoroRunning, autoSyncWithTimer, activeSound, isMuted, volume]);

  const handleSelectSound = (id: SoundscapeOption) => {
    if (id === activeSound && isPlaying) {
      // Toggle stop
      GlobalSoundscapeEngine.stop();
      setActiveSound('none');
    } else {
      setActiveSound(id);
      GlobalSoundscapeEngine.play(id, isMuted ? 0 : volume);
    }
  };

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      GlobalSoundscapeEngine.stop();
    } else {
      const target = activeSound !== 'none' ? activeSound : 'white_noise';
      setActiveSound(target);
      GlobalSoundscapeEngine.play(target, isMuted ? 0 : volume);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    GlobalSoundscapeEngine.setVolume(val);
    if (isMuted && val > 0) {
      setIsMuted(false);
      GlobalSoundscapeEngine.setMuted(false);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    GlobalSoundscapeEngine.setMuted(nextMuted);
  };

  // Get icon component
  const getSoundIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radio': return Radio;
      case 'CloudRain': return CloudRain;
      case 'Trees': return Trees;
      case 'Coffee': return Coffee;
      case 'Waves': return Waves;
      case 'Flame': return Flame;
      default: return Volume2;
    }
  };

  const volumePercent = Math.round(volume * 100);
  const activeSoundItem = SOUNDSCAPE_OPTIONS.find(s => s.id === activeSound);

  return (
    <div className={`glass-panel rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm border border-white/90 relative overflow-hidden ${className}`}>
      
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-teal-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Master Power Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-teal-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20 shrink-0">
            <Headphones className={`h-5 w-5 ${isPlaying ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                专注原声音景面板 (Ambient Soundscape)
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                ⚡ 原生 Web Audio 合成
              </span>
              {isPlaying && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs flex items-center gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  <span>正在播放</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              纯本地振荡器实时声波合成，零网络延迟与音频流量，构建抗干扰沉浸自习声场
            </p>
          </div>
        </div>

        {/* Master Play/Pause and Mute Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            onClick={handleToggleMute}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
              isMuted 
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : 'bg-white/80 hover:bg-white text-slate-600 border-slate-200/80 shadow-2xs'
            }`}
            title={isMuted ? '取消静音' : '快速静音 (快捷键 M)'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            onClick={handleTogglePlayPause}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 ${
              isPlaying
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                : 'bg-linear-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white shadow-teal-600/25'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-white" />
                <span>暂停音景</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>开启音景</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6 Procedural Soundscape Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
        {SOUNDSCAPE_OPTIONS.filter(s => s.id !== 'none').map(item => {
          const Icon = getSoundIcon(item.icon);
          const isSelected = activeSound === item.id;
          const isCurrentlyActive = isSelected && isPlaying;

          return (
            <div
              key={item.id}
              onClick={() => handleSelectSound(item.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group select-none shadow-2xs ${
                isCurrentlyActive
                  ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-md shadow-teal-500/10'
                  : isSelected
                  ? 'bg-white border-indigo-300 shadow-xs'
                  : 'bg-white/70 hover:bg-white border-slate-200/70 hover:border-slate-300'
              }`}
            >
              {/* Active Sound Indicator Glow */}
              {isCurrentlyActive && (
                <div className={`absolute top-0 right-0 w-24 h-24 bg-linear-to-bl ${item.colorScheme} opacity-15 rounded-full blur-xl pointer-events-none`} />
              )}

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 transition-transform group-hover:scale-105 bg-linear-to-tr ${item.colorScheme}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.englishName}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 mt-1 inline-block">
                      {item.tag}
                    </span>
                  </div>
                </div>

                {/* Right Status / Equalizer */}
                <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                  {isCurrentlyActive ? (
                    <div className="flex items-end gap-0.5 h-4 mb-1">
                      <span className="w-1 bg-teal-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                      <span className="w-1 bg-teal-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-4" />
                      <span className="w-1 bg-teal-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2" />
                      <span className="w-1 bg-teal-500 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3.5" />
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-slate-400 group-hover:text-teal-600 transition-colors">
                      {isSelected ? '已选定' : '点击播放'}
                    </div>
                  )}

                  {item.frequencyHint && (
                    <span className="text-[9px] font-mono text-slate-400">
                      {item.frequencyHint.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-3 relative z-10">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Volume Slider & Soundscape Parameters Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Volume Slider */}
        <div className="flex items-center gap-3 flex-1 max-w-sm">
          <button
            onClick={handleToggleMute}
            className="text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-500" />
            ) : volume < 0.5 ? (
              <Volume1 className="h-4 w-4 text-teal-600" />
            ) : (
              <Volume2 className="h-4 w-4 text-teal-600" />
            )}
          </button>

          <span className="text-xs font-bold text-slate-600 shrink-0">音量：</span>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-hidden"
          />

          <span className="text-xs font-mono font-bold text-slate-700 w-9 text-right shrink-0">
            {isMuted ? '0%' : `${volumePercent}%`}
          </span>
        </div>

        {/* Right: Sound Engine Status & Off Button */}
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {activeSoundItem && activeSound !== 'none' && (
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-slate-400">当前声景：</span>
              <span className="font-bold text-slate-800">{activeSoundItem.name}</span>
            </div>
          )}

          {activeSound !== 'none' && (
            <button
              onClick={() => handleSelectSound('none')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              关闭声景 (静音)
            </button>
          )}
        </div>

      </div>

    </div>
  );
};

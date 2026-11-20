import React, { useState, useEffect, useRef } from 'react';
import { 
  Headphones, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Radio, 
  CloudRain, 
  Coffee, 
  Trees, 
  Music, 
  Sparkles, 
  ExternalLink,
  Sliders,
  Check
} from 'lucide-react';

export interface SoundscapePreset {
  id: string;
  name: string;
  category: 'lofi' | 'ambient' | 'nature' | 'brainwave';
  icon: any;
  description: string;
  color: string;
  type: 'rain' | 'cafe' | 'forest' | 'piano' | 'alpha';
  externalUrl?: string;
}

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: 'lofi_cafe',
    name: '街角 Lo-Fi 咖啡馆',
    category: 'lofi',
    icon: Coffee,
    description: '温润的黑胶底噪与温暖和弦，营造成熟沉浸的自习氛围',
    color: 'amber',
    type: 'cafe',
    externalUrl: 'https://music.163.com/#/playlist?id=2619366284',
  },
  {
    id: 'rainy_library',
    name: '图书馆窗外细雨',
    category: 'ambient',
    icon: CloudRain,
    description: '粉红噪音拟真雨滴声，隔绝自习室外界杂音，屏蔽干扰',
    color: 'blue',
    type: 'rain',
    externalUrl: 'https://www.bilibili.com/video/BV1Gf4y1U719',
  },
  {
    id: 'deep_forest',
    name: '晨曦森林流泉',
    category: 'nature',
    icon: Trees,
    description: '清脆流水与鸟鸣共振，舒缓大脑焦虑，促进多巴胺分泌',
    color: 'emerald',
    type: 'forest',
  },
  {
    id: 'minimal_piano',
    name: '极简专注泛音钢琴',
    category: 'lofi',
    icon: Music,
    description: '慢节拍和弦泛音，引导脑电波进入阿尔法（Alpha）专注状态',
    color: 'purple',
    type: 'piano',
  },
  {
    id: 'alpha_wave',
    name: '432Hz 深度双耳节拍',
    category: 'brainwave',
    icon: Radio,
    description: '纯净双耳共振微调，助力攻坚长难数学证明与算法代码',
    color: 'indigo',
    type: 'alpha',
  },
];

interface FocusMusicPlayerProps {
  isPomodoroRunning?: boolean;
  pomodoroMode?: 'work' | 'shortBreak' | 'longBreak';
  onSyncPlayState?: (isPlaying: boolean) => void;
  className?: string;
}

export const FocusMusicPlayer: React.FC<FocusMusicPlayerProps> = ({
  isPomodoroRunning = false,
  pomodoroMode = 'work',
  onSyncPlayState,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<SoundscapePreset>(SOUNDSCAPE_PRESETS[0]);
  const [volume, setVolume] = useState<number>(0.6);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoSyncWithPomodoro, setAutoSyncWithPomodoro] = useState<boolean>(true);

  // Web Audio Context & Node references for realistic real-time ambient sound generation
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const generatorNodesRef = useRef<any[]>([]);

  // Init Audio Context safely upon user gesture
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
        masterGainRef.current = audioCtxRef.current.createGain();
        masterGainRef.current.gain.setValueAtTime(isMuted ? 0 : volume, audioCtxRef.current.currentTime);
        masterGainRef.current.connect(audioCtxRef.current.destination);
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Stop current active generator nodes
  const stopGenerator = () => {
    generatorNodesRef.current.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    generatorNodesRef.current = [];
  };

  // Start sound generator based on selected preset
  const startSoundscape = (preset: SoundscapePreset) => {
    initAudio();
    stopGenerator();

    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    if (preset.type === 'rain') {
      // Noise buffer generator for rain simulation
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.15;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter for rain tone (Lowpass filter)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(master);
      whiteNoise.start();
      generatorNodesRef.current = [whiteNoise, filter];
    } else if (preset.type === 'cafe') {
      // Warm vinyl & subtle resonance
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(196.00, ctx.currentTime); // G3

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      gain1.gain.setValueAtTime(0.08, ctx.currentTime);

      osc1.connect(gain1);
      osc2.connect(gain1);
      gain1.connect(filter);
      filter.connect(master);

      osc1.start();
      osc2.start();
      generatorNodesRef.current = [osc1, osc2, gain1, filter];
    } else if (preset.type === 'forest') {
      // High-frequency delicate breeze & stream
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.05;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1200, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(master);
      noise.start();
      generatorNodesRef.current = [noise, bandpass];
    } else if (preset.type === 'piano') {
      // Harmonic slow chord pulsation
      const freqs = [261.63, 329.63, 392.00]; // C - E - G chord
      const nodes: any[] = [];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0.03, ctx.currentTime);
        osc.connect(g);
        g.connect(master);
        osc.start();
        nodes.push(osc, g);
      });
      generatorNodesRef.current = nodes;
    } else {
      // 432Hz Alpha brainwave binaural tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      generatorNodesRef.current = [osc, gain];
    }
  };

  // Toggle playback
  const togglePlay = () => {
    if (isPlaying) {
      stopGenerator();
      setIsPlaying(false);
      onSyncPlayState?.(false);
    } else {
      startSoundscape(selectedPreset);
      setIsPlaying(true);
      onSyncPlayState?.(true);
    }
  };

  // Handle preset change
  const handleSelectPreset = (preset: SoundscapePreset) => {
    setSelectedPreset(preset);
    if (isPlaying) {
      startSoundscape(preset);
    }
  };

  // Volume slider update
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(isMuted ? 0 : newVol, audioCtxRef.current.currentTime);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(nextMuted ? 0 : volume, audioCtxRef.current.currentTime);
    }
  };

  // Synchronize with Pomodoro timer flow automatically
  useEffect(() => {
    if (!autoSyncWithPomodoro) return;

    if (isPomodoroRunning && pomodoroMode === 'work') {
      if (!isPlaying) {
        startSoundscape(selectedPreset);
        setIsPlaying(true);
        onSyncPlayState?.(true);
      }
    } else if (pomodoroMode !== 'work' || !isPomodoroRunning) {
      if (isPlaying && pomodoroMode !== 'work') {
        // Pause during break
        stopGenerator();
        setIsPlaying(false);
        onSyncPlayState?.(false);
      }
    }
  }, [isPomodoroRunning, pomodoroMode, autoSyncWithPomodoro]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopGenerator();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className={`glass-panel rounded-3xl p-6 sm:p-7 space-y-5 border border-white/80 shadow-md shadow-slate-900/5 relative overflow-hidden ${className}`}>
      {/* Decorative subtle ambient glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-linear-to-bl from-purple-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-100/90 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20 shrink-0">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                Focus Music 专注白噪音与 Lo-Fi
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 border border-purple-500/20 flex items-center gap-1 shadow-2xs">
                <Sparkles className="h-3 w-3 text-purple-600" />
                番茄钟心流伴侣
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              高保真沉浸声学与 Lo-Fi 自习歌单，支持跟随番茄钟自适应启停
            </p>
          </div>
        </div>

        {/* Master Play/Pause Controller */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={togglePlay}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all shadow-md cursor-pointer active:scale-95 ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 ring-2 ring-rose-300'
                : 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/25'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span>暂停音乐</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>播放 {selectedPreset.name}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Soundscapes Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative z-10">
        {SOUNDSCAPE_PRESETS.map(preset => {
          const isSelected = selectedPreset.id === preset.id;
          const PresetIcon = preset.icon;

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-50/80 border-purple-300 shadow-xs ring-1 ring-purple-400'
                  : 'bg-white/70 hover:bg-white border-white/90 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-100 text-purple-700 group-hover:bg-purple-200'
                    }`}
                  >
                    <PresetIcon className="h-4 w-4" />
                  </div>
                  {isSelected && isPlaying && (
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-purple-600 animate-pulse rounded-full" />
                      <span className="w-1 h-4 bg-purple-600 animate-bounce rounded-full" />
                      <span className="w-1 h-2 bg-purple-600 animate-pulse rounded-full" />
                    </div>
                  )}
                </div>

                <div className="text-xs font-black text-slate-800 group-hover:text-purple-700">
                  {preset.name}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-2 mt-1 font-medium leading-relaxed">
                  {preset.description}
                </div>
              </div>

              {preset.externalUrl && (
                <a
                  href={preset.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <span>在线专属自习电台</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls Bar: Volume & Timer Auto-Sync Option */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100/90 text-xs relative z-10 bg-slate-50/60 p-3.5 rounded-2xl">
        {/* Left: Volume Slider */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4 text-purple-600" />}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-24 sm:w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="font-mono text-[11px] text-slate-500 w-8">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

        {/* Right: Flow Automation Options */}
        <div className="flex items-center gap-4 flex-wrap text-slate-600 font-medium text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSyncWithPomodoro}
              onChange={(e) => setAutoSyncWithPomodoro(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>联动番茄钟：专注开始自动播放，休息时淡出</span>
          </label>
        </div>
      </div>
    </div>
  );
};

// Web Audio API Soundscape Generator for CampusOS Pomodoro Focus Sessions
// Generates real-time procedural soundscapes (Rain, Cafe, White Noise, Forest) without external assets

export type SoundscapeOption = 'none' | 'white_noise' | 'rain' | 'forest' | 'cafe' | 'library' | 'waves' | 'fireplace';

export interface SoundscapeItem {
  id: SoundscapeOption;
  name: string;
  englishName: string;
  icon: string;
  description: string;
  tag: string;
  frequencyHint?: string;
  colorScheme: string;
}

export const SOUNDSCAPE_OPTIONS: SoundscapeItem[] = [
  {
    id: 'white_noise',
    name: '纯净白噪音',
    englishName: 'White Noise',
    icon: 'Radio',
    description: '全频均衡平稳抗噪流，有效屏蔽自习室交谈与走动干扰',
    tag: '抗噪首选',
    frequencyHint: '20Hz - 20kHz 全频遮蔽',
    colorScheme: 'from-slate-600 to-indigo-600',
  },
  {
    id: 'rain',
    name: '图书馆细雨',
    englishName: 'Rain',
    icon: 'CloudRain',
    description: '拟真落窗细雨低通粉红噪，温润淅沥，快速沉浸深度心流',
    tag: '平息焦虑',
    frequencyHint: '500Hz - 2kHz 温润中低频',
    colorScheme: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'forest',
    name: '晨曦森林',
    englishName: 'Forest',
    icon: 'Trees',
    description: '清幽松涛微风与流泉共鸣，唤醒自然生机，舒缓备考压力',
    tag: '自然治愈',
    frequencyHint: '1.2kHz - 4kHz 空间高频',
    colorScheme: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'cafe',
    name: '街角咖啡馆',
    englishName: 'Cafe',
    icon: 'Coffee',
    description: '温暖低频黑胶共鸣与泛音底噪，营造成熟自习室静谧氛围',
    tag: '自习氛围',
    frequencyHint: '130Hz - 320Hz 醇厚暖音',
    colorScheme: 'from-amber-600 to-orange-600',
  },
  {
    id: 'library',
    name: '静谧图书馆',
    englishName: 'Library',
    icon: 'BookOpen',
    description: '极其轻柔的空间室温底噪与细微翻页空气感，高度还原阅览室沉浸声场',
    tag: '深度阅读',
    frequencyHint: '180Hz - 600Hz 柔和室内残响',
    colorScheme: 'from-indigo-600 to-violet-600',
  },
  {
    id: 'waves',
    name: '深海潮汐',
    englishName: 'Ocean Waves',
    icon: 'Waves',
    description: '超低频呼吸式潮水起伏，规律节拍促进阿尔法深度脑电波',
    tag: '节奏冥想',
    frequencyHint: '0.1Hz 节律低通律动',
    colorScheme: 'from-cyan-600 to-blue-700',
  },
  {
    id: 'fireplace',
    name: '暖意壁炉',
    englishName: 'Fireplace',
    icon: 'Flame',
    description: '松木柴火柔和噼啪声与低频暖意，适合夜间攻坚长难课业',
    tag: '深夜陪伴',
    frequencyHint: '400Hz 带通微爆破点',
    colorScheme: 'from-rose-600 to-amber-700',
  },
  {
    id: 'none',
    name: '静音专注',
    englishName: 'Off',
    icon: 'VolumeX',
    description: '保持纯粹安静，无任何背景生成音景',
    tag: '关闭',
    colorScheme: 'from-slate-400 to-slate-600',
  },
];

class SoundscapeEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: any[] = [];
  private currentSoundscape: SoundscapeOption = 'none';
  private currentVolume: number = 0.5;
  private isMuted: boolean = false;
  private listeners: Set<() => void> = new Set();

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {}
    });
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public stop() {
    this.activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
    this.currentSoundscape = 'none';
    this.notify();
  }

  public play(type: SoundscapeOption, volume: number = 0.5) {
    this.currentVolume = volume;
    if (type === 'none') {
      this.stop();
      return;
    }

    this.initContext();
    this.stop();

    const ctx = this.audioCtx;
    const master = this.masterGain;
    if (!ctx || !master) return;

    this.currentSoundscape = type;
    
    // Smooth fade in
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(this.isMuted ? 0.001 : Math.max(0.01, this.currentVolume), ctx.currentTime + 0.3);

    if (type === 'white_noise') {
      // 1. White Noise: Uniform broadband noise with gentle bandpass filter
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.09;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1000, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.5, ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(master);
      noise.start();
      this.activeNodes = [noise, bandpass];
    } else if (type === 'rain') {
      // 2. Rain: Lowpass filtered pink-white noise with gentle variance
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.16;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(master);
      whiteNoise.start();
      this.activeNodes = [whiteNoise, filter];
    } else if (type === 'forest') {
      // 3. Forest: Delicate breeze & stream with dual bandpass resonance
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
      bandpass.frequency.setValueAtTime(1400, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.9, ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(master);
      noise.start();
      this.activeNodes = [noise, bandpass];
    } else if (type === 'cafe') {
      // 4. Cafe: Warm vinyl ambience & dual harmonic tones
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
      this.activeNodes = [osc1, osc2, gain1, filter];
    } else if (type === 'waves') {
      // 5. Ocean Waves: Lowpass filter modulated by a 0.12Hz slow sine LFO
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.12;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      filter.Q.setValueAtTime(2.0, ctx.currentTime);

      // LFO for wave ebb and flow swells
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 second ocean wave cycle
      lfoGain.gain.setValueAtTime(300, ctx.currentTime);

      lfo.connect(filter.frequency);
      noise.connect(filter);
      filter.connect(master);

      noise.start();
      lfo.start();
      this.activeNodes = [noise, filter, lfo, lfoGain];
    } else if (type === 'fireplace') {
      // 6. Fireplace: Warm filtered brown noise with sporadic crackle bursts
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        // Occasional crackle impulse
        const crackle = Math.random() > 0.9985 ? (Math.random() * 1.5 - 0.75) : 0;
        output[i] = (last * 2.5 + crackle) * 0.08;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, ctx.currentTime);

      noise.connect(filter);
      filter.connect(master);
      noise.start();
      this.activeNodes = [noise, filter];
    } else if (type === 'library') {
      // 7. Library: Ultra-soft room tone brown noise + subtle warm air resonance
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.015 * white) / 1.015;
        const pageRustle = Math.random() > 0.9994 ? (Math.random() * 0.4 - 0.2) : 0;
        output[i] = (last * 1.8 + pageRustle) * 0.06;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, ctx.currentTime);

      noise.connect(filter);
      filter.connect(master);
      noise.start();
      this.activeNodes = [noise, filter];
    }

    this.notify();
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.currentVolume,
        this.audioCtx.currentTime
      );
    }
    this.notify();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.currentVolume,
        this.audioCtx.currentTime
      );
    }
    this.notify();
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentSoundscape(): SoundscapeOption {
    return this.currentSoundscape;
  }

  public isPlaying(): boolean {
    return this.currentSoundscape !== 'none' && this.activeNodes.length > 0;
  }
}

export const GlobalSoundscapeEngine = new SoundscapeEngine();

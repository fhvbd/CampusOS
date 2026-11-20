import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  User, 
  CreditCard, 
  BookOpen, 
  Wifi, 
  Building, 
  Settings, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck, 
  Info, 
  Moon, 
  Sun, 
  Volume2, 
  Bell, 
  Award,
  Sparkles,
  ExternalLink,
  Monitor,
  Palette,
  Check,
  Zap,
  Layers
} from 'lucide-react';
import { UserProfile, AppSettings, Course, Task, Notice, AccentColorKey, GlassPresetKey, TabType } from '../types';
import {
  ACCENT_THEMES,
  AccentThemeScheme,
  getAccentTheme,
  GLASS_PRESETS,
  GlassPresetScheme,
  PRIMARY_GLASS_PRESET_KEYS,
  PrimaryGlassPresetKey,
  getGlassPreset,
  normalizeGlassPresetKey,
  applyGlassPresetCssVars,
} from '../lib/accentTheme';
import { calculateLevelInfo, getAcademicRankProgress } from '../lib/levelSystem';
import { StudyStreakTracker } from './StudyStreakTracker';
import { NextRankProgressSection } from './NextRankProgressSection';
import { WeeklyProductivityOverview } from './WeeklyProductivityOverview';
import { WeeklyFocusTrendsChart } from './WeeklyFocusTrendsChart';
import { ThirtyDayTaskCompletionChart } from './ThirtyDayTaskCompletionChart';
import { ProfileFocusTaskInsightsSection } from './ProfileFocusTaskInsightsSection';
import { StudySessionExportCard } from './StudySessionExportCard';
import { NotificationManager } from '../lib/notifications';
import { PomodoroHistoryService } from '../services/pomodoroHistory';
import {
  evaluateFocusMilestones,
  getSavedEquippedBadgeId,
  saveEquippedBadgeId,
  getSimulatedUnlockedIds,
  toggleSimulatedUnlockId,
  MILESTONE_EQUIP_CHANGED_EVENT,
} from '../lib/focusMilestones';
import {
  FocusMilestoneShowcase,
  renderMilestoneIcon,
} from './FocusMilestoneShowcase';
import { FocusHeatmapCalendar } from './FocusHeatmapCalendar';

interface ProfileTabProps {
  user: UserProfile;
  settings: AppSettings;
  courses?: Course[];
  tasks?: Task[];
  notices?: Notice[];
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onResetData: () => void;
  onImportData?: (backupData: any) => Promise<any>;
  onOpenPwaModal?: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

interface LiquidGlassLivePreviewCardProps {
  preset: GlassPresetScheme;
  accent: AccentThemeScheme;
  onCyclePreset: () => void;
}

const GLASS_MATERIAL_METRICS: Record<
  PrimaryGlassPresetKey,
  {
    transmittanceRange: string;
    hoverTransmittanceRange: string;
    shadowLayersLabel: string;
    elevationClassRest: string;
    elevationClassLift: string;
  }
> = {
  matte_frost: {
    transmittanceRange: '16–32%',
    hoverTransmittanceRange: '8–22%',
    shadowLayersLabel: '2-Layer Soft',
    elevationClassRest: 'translate-y-0',
    elevationClassLift: '-translate-y-0.5',
  },
  high_gloss: {
    transmittanceRange: '28–60%',
    hoverTransmittanceRange: '12–46%',
    shadowLayersLabel: '3-Layer Specular',
    elevationClassRest: 'translate-y-0',
    elevationClassLift: '-translate-y-1',
  },
  deep_depth: {
    transmittanceRange: '24–52%',
    hoverTransmittanceRange: '10–38%',
    shadowLayersLabel: '5-Layer Floating',
    elevationClassRest: '-translate-y-0.5',
    elevationClassLift: '-translate-y-1.5',
  },
};

const LiquidGlassLivePreviewCard: React.FC<LiquidGlassLivePreviewCardProps> = ({
  preset,
  accent,
  onCyclePreset,
}) => {
  const [pointer, setPointer] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });
  const [isShadowBoosted, setIsShadowBoosted] = useState(false);
  const [actionPulse, setActionPulse] = useState(false);

  const isElevated = pointer.active || isShadowBoosted;
  const ambientOpacity = Number(preset.cssVars['--glass-ambient-opacity']) || 0.65;
  const metrics = GLASS_MATERIAL_METRICS[preset.id];

  const liveCardStyle = useMemo<React.CSSProperties>(() => {
    const isMatte = preset.id === 'matte_frost';
    const isGloss = preset.id === 'high_gloss';
    const surfaceBg = isElevated ? preset.cssVars['--glass-hover-bg'] : preset.cssVars['--glass-bg'];
    const spotlightOpacity = isGloss ? '0.80' : isMatte ? '0.42' : '0.68';
    const spotlightLayer = pointer.active
      ? `radial-gradient(240px circle at ${pointer.x}% ${pointer.y}%, rgba(255, 255, 255, ${spotlightOpacity}) 0%, ${accent.primaryHex}${
          isMatte ? '12' : '24'
        } 45%, transparent 78%), `
      : '';

    if (isMatte) {
      return {
        background: `${spotlightLayer}${surfaceBg}`,
        backdropFilter: `blur(${preset.cssVars['--glass-blur']}) saturate(${preset.cssVars['--glass-saturate']})`,
        WebkitBackdropFilter: `blur(${preset.cssVars['--glass-blur']}) saturate(${preset.cssVars['--glass-saturate']})`,
        border: `1.5px solid ${isElevated ? preset.cssVars['--glass-hover-border'] : preset.cssVars['--glass-border']}`,
        boxShadow: isElevated
          ? '0 6px 18px -4px rgba(15, 23, 42, 0.09), 0 12px 24px -8px rgba(15, 23, 42, 0.06), inset 0 1.5px 2px rgba(255, 255, 255, 0.94), inset 0 -1px 2px rgba(255, 255, 255, 0.48)'
          : '0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 8px 18px -6px rgba(15, 23, 42, 0.04), inset 0 1.5px 2px rgba(255, 255, 255, 0.88), inset 0 -1px 2px rgba(255, 255, 255, 0.40)',
      };
    }

    if (isGloss) {
      return {
        background: `${spotlightLayer}${surfaceBg}`,
        backdropFilter: `blur(${preset.cssVars['--glass-blur']}) saturate(${preset.cssVars['--glass-saturate']})`,
        WebkitBackdropFilter: `blur(${preset.cssVars['--glass-blur']}) saturate(${preset.cssVars['--glass-saturate']})`,
        border: `1.5px solid ${isElevated ? preset.cssVars['--glass-hover-border'] : preset.cssVars['--glass-border']}`,
        boxShadow: isElevated
          ? `0 14px 32px -6px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(255, 255, 255, 1), 0 12px 28px -6px ${accent.primaryHex}38, inset 0 3px 3px rgba(255, 255, 255, 1), inset 0 -1.5px 2px rgba(255, 255, 255, 0.86)`
          : '0 8px 22px -4px rgba(15, 23, 42, 0.10), 0 0 0 1px rgba(255, 255, 255, 0.95), inset 0 3px 3px rgba(255, 255, 255, 1), inset 0 -1.5px 2px rgba(255, 255, 255, 0.78)',
      };
    }

    // Deep Depth (default)
    return {
      background: `${spotlightLayer}${surfaceBg} padding-box, ${preset.cssVars['--glass-border-image']} border-box`,
      backdropFilter: `blur(${preset.cssVars['--glass-blur']}) saturate(${preset.cssVars['--glass-saturate']})`,
      WebkitBackdropFilter: `blur(${preset.cssVars['--glass-blur']}) saturate(${preset.cssVars['--glass-saturate']})`,
      border: '1.5px solid transparent',
      boxShadow: isElevated
        ? `0 4px 10px -2px rgba(15, 23, 42, 0.09), 0 18px 38px -6px rgba(15, 23, 42, 0.13), 0 28px 56px -8px ${accent.primaryHex}62, inset 0 3px 4px rgba(255, 255, 255, 1), inset 0 -2px 4px ${accent.secondaryHex}58`
        : `0 2px 6px -1px rgba(15, 23, 42, 0.06), 0 14px 28px -6px rgba(15, 23, 42, 0.09), 0 22px 44px -8px ${accent.primaryHex}48, inset 0 2.5px 3px rgba(255, 255, 255, 1), inset 0 -1.5px 3px ${accent.secondaryHex}44`,
    };
  }, [preset, accent, pointer, isElevated]);

  return (
    <div className="relative rounded-2xl p-5 sm:p-6 overflow-hidden border border-slate-200/80 bg-linear-to-br from-slate-100/95 via-white/65 to-slate-200/75">
      {/* Transparency calibration pattern: dot matrix + subtle diagonal contrast band */}
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.18) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-56 -skew-x-12 transition-opacity duration-500"
        style={{
          background: `linear-gradient(180deg, ${accent.primaryHex}26 0%, ${accent.secondaryHex}30 50%, ${accent.primaryHex}18 100%)`,
          opacity: ambientOpacity,
        }}
      />
      {/* Ambient chromatic light orbs modulated directly by --glass-ambient-opacity */}
      <div
        className="pointer-events-none absolute -top-10 left-8 h-40 w-40 rounded-full blur-2xl transition-all duration-500"
        style={{
          background: accent.primaryHex,
          opacity: Math.min(0.75, ambientOpacity * 0.92),
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-12 right-8 h-44 w-44 rounded-full blur-2xl transition-all duration-500"
        style={{
          background: accent.secondaryHex,
          opacity: Math.min(0.75, ambientOpacity * 0.92),
        }}
      />

      {/* Interactive Real-Time Live Preview Glass Card */}
      <div
        onPointerMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
          setPointer({ x, y, active: true });
        }}
        onPointerLeave={() => setPointer(prev => ({ ...prev, active: false }))}
        style={liveCardStyle}
        className={`relative z-10 w-full max-w-xl mx-auto rounded-2xl p-4 sm:p-5 transition-all duration-300 space-y-4 overflow-hidden ${
          isElevated ? metrics.elevationClassLift : metrics.elevationClassRest
        }`}
      >
        {/* Preset-Specific Optical Surface Overlay */}
        {preset.id === 'high_gloss' && (
          <div
            className={`pointer-events-none absolute -inset-y-8 left-1/4 w-20 bg-linear-to-r from-transparent via-white/70 to-transparent -skew-x-24 transition-transform duration-500 ${
              isElevated ? 'translate-x-10' : 'translate-x-0'
            }`}
          />
        )}
        {preset.id === 'matte_frost' && (
          <div className="pointer-events-none absolute inset-0 bg-white/15" />
        )}

        {/* Top Row: Live Preview Header + Interactive Controls */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 shrink-0" style={{ color: accent.primaryHex }} />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                Live Preview · {preset.englishName} ({preset.name})
              </div>
              <div className="text-[11px] text-slate-600 truncate">
                实时呈现当前材质的阴影层次与玻璃透明度，移动指针或点击切换悬浮状态
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsShadowBoosted(prev => !prev)}
              aria-pressed={isShadowBoosted}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer active:scale-95 whitespace-nowrap flex items-center gap-1 ${
                isShadowBoosted
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white/80 hover:bg-white text-slate-700 border-white/90'
              }`}
            >
              <Layers className="h-3 w-3 shrink-0" />
              <span>{isShadowBoosted ? '悬浮阴影：开' : '悬浮阴影'}</span>
            </button>

            <button
              type="button"
              onClick={onCyclePreset}
              className="px-2.5 py-1.5 rounded-xl bg-white/85 hover:bg-white text-slate-800 border border-white text-[11px] font-bold shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              切换下一材质
            </button>
          </div>
        </div>

        {/* Interactive Specimen Row (Accent Action, Status Labels, Progress Bar) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <button
            type="button"
            onClick={() => {
              setActionPulse(true);
              setTimeout(() => setActionPulse(false), 600);
            }}
            className={`w-full py-2 px-3 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer transition-all duration-200 active:scale-95 whitespace-nowrap ${
              actionPulse ? 'scale-[1.03] ring-2 ring-white/80' : ''
            }`}
            style={{
              background: `linear-gradient(135deg, ${accent.primaryHex}, ${accent.secondaryHex})`,
            }}
          >
            {actionPulse ? '已触发心流预览' : '开始深度自习心流'}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs font-bold">
            <span style={{ color: accent.primaryHex }}>重点课程</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span style={{ color: accent.secondaryHex }}>待办进行中</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>学期进度</span>
              <span className="font-mono tabular-nums text-slate-800">72%</span>
            </div>
            <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden border border-white/80">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: '72%',
                  background: `linear-gradient(to right, ${accent.primaryHex}, ${accent.secondaryHex})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Real-Time Shadow & Transparency Telemetry Strip */}
        <div className="relative z-10 pt-2.5 border-t border-slate-900/10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-mono text-slate-600 tabular-nums">
          <span>
            Shadow:{' '}
            <strong className="text-slate-900">
              {metrics.shadowLayersLabel} · {isElevated ? 'Elevated' : 'Resting'}
            </strong>
          </span>
          <span>
            Transparency:{' '}
            <strong className="text-slate-900">
              {isElevated ? metrics.hoverTransmittanceRange : metrics.transmittanceRange}
            </strong>
          </span>
          <span>
            Ambient α: <strong className="text-indigo-700">{preset.cssVars['--glass-ambient-opacity']}</strong>
          </span>
          <span>
            Blur: <strong className="text-slate-900">{preset.cssVars['--glass-blur']}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  settings,
  courses = [],
  tasks = [],
  notices = [],
  onUpdateUser,
  onUpdateSettings,
  onResetData,
  onImportData,
  onOpenPwaModal,
  onNavigateTab,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(user.username);
  const [tempMajor, setTempMajor] = useState(user.major);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('50');
  const [backupSuccessInfo, setBackupSuccessInfo] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [themeSwitchFeedback, setThemeSwitchFeedback] = useState<string | null>(null);
  const [openMaterialTooltip, setOpenMaterialTooltip] = useState<PrimaryGlassPresetKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentAccent = getAccentTheme(settings.accent_color);
  const activeGlassKey = normalizeGlassPresetKey(settings.glass_preset);
  const currentGlassPreset = getGlassPreset(settings.glass_preset);
  const levelInfo = calculateLevelInfo(user.xp ?? 220);

  const handleCycleGlassPreset = () => {
    const idx = PRIMARY_GLASS_PRESET_KEYS.indexOf(activeGlassKey);
    const nextKey = PRIMARY_GLASS_PRESET_KEYS[(idx + 1) % PRIMARY_GLASS_PRESET_KEYS.length];
    handleSelectGlassPreset(nextKey);
  };

  // Focus Milestone Cosmetic Badges State
  const [equippedBadgeId, setEquippedBadgeId] = useState<string>(() => {
    return user.equipped_badge_id || getSavedEquippedBadgeId();
  });
  const [simulatedUnlockIds, setSimulatedUnlockIds] = useState<string[]>(() => {
    return getSimulatedUnlockedIds();
  });

  useEffect(() => {
    if (user.equipped_badge_id && user.equipped_badge_id !== equippedBadgeId) {
      setEquippedBadgeId(user.equipped_badge_id);
    }
  }, [user.equipped_badge_id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleEquipChange = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ badgeId: string }>;
      if (customEvt.detail?.badgeId) {
        setEquippedBadgeId(customEvt.detail.badgeId);
      }
    };
    window.addEventListener(MILESTONE_EQUIP_CHANGED_EVENT, handleEquipChange);
    return () => window.removeEventListener(MILESTONE_EQUIP_CHANGED_EVENT, handleEquipChange);
  }, []);

  const milestoneSummary = useMemo(() => {
    const records = PomodoroHistoryService.getHistory();
    return evaluateFocusMilestones(records, simulatedUnlockIds);
  }, [tasks.length, simulatedUnlockIds]);

  const activeEquippedBadge = useMemo(() => {
    return (
      milestoneSummary.badges.find(b => b.id === equippedBadgeId && b.isUnlocked) ||
      milestoneSummary.badges.find(b => b.isUnlocked) ||
      milestoneSummary.badges[0]
    );
  }, [milestoneSummary, equippedBadgeId]);

  const handleEquipMilestoneBadge = (badgeId: string) => {
    setEquippedBadgeId(badgeId);
    saveEquippedBadgeId(badgeId);
    onUpdateUser({ equipped_badge_id: badgeId });
  };

  const handleToggleSimulateUnlock = (badgeId: string) => {
    const records = PomodoroHistoryService.getHistory();
    const updated = toggleSimulatedUnlockId(badgeId, records);
    setSimulatedUnlockIds(updated);
    if (updated.includes(badgeId)) {
      handleEquipMilestoneBadge(badgeId);
    }
  };

  // 2-Hour Due Tasks Alert state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return NotificationManager.getPermission();
  });

  const dueTasks2h = useMemo(() => {
    return NotificationManager.getTasksDueWithinHours(tasks, 2);
  }, [tasks]);

  useEffect(() => {
    setNotifPermission(NotificationManager.getPermission());
  }, []);

  const handleSelectAccentTheme = (themeKey: AccentColorKey) => {
    onUpdateSettings({ accent_color: themeKey });
    const targetTheme = ACCENT_THEMES[themeKey];
    setThemeSwitchFeedback(`已切换至「${targetTheme.name}」全局强调色`);
    setTimeout(() => setThemeSwitchFeedback(null), 3000);
  };

  const handleSelectGlassPreset = (presetKey: PrimaryGlassPresetKey) => {
    const targetPreset = GLASS_PRESETS[presetKey];
    applyGlassPresetCssVars(targetPreset);
    onUpdateSettings({ glass_preset: presetKey });
    setThemeSwitchFeedback(`✨ 已切换至「${targetPreset.name} (${targetPreset.englishName})」液态玻璃光学材质`);
    setTimeout(() => setThemeSwitchFeedback(null), 3000);
  };

  const handleSaveProfile = () => {
    onUpdateUser({
      username: tempName,
      major: tempMajor,
    });
    setIsEditing(false);
  };

  const handleRecharge = () => {
    const val = parseFloat(rechargeAmount) || 0;
    if (val > 0) {
      onUpdateUser({
        campus_card_balance: user.campus_card_balance + val,
      });
      setShowRechargeModal(false);
    }
  };

  const handleExportData = () => {
    const backup = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      user,
      settings,
      courses,
      tasks,
      notices,
      stats: {
        total_courses: courses.length,
        total_tasks: tasks.length,
        total_notices: notices.length,
      }
    };
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `CampusOS_Backup_${user.student_id}_${new Date().toISOString().split('T')[0]}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setBackupSuccessInfo(`已成功导出 ${courses.length} 门课程、${tasks.length} 项待办、${notices.length} 条通知到 ${fileName}`);
    setTimeout(() => {
      setBackupSuccessInfo(null);
    }, 5000);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error('选取的不是合法的 JSON 格式文件');
      }

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('JSON 根节点必须为配置对象');
      }

      if (onImportData) {
        const result = await onImportData(parsed);
        const stats = result?.stats;
        let details = '';
        if (stats) {
          details = `（课程+${stats.addedCourses}更新${stats.updatedCourses}，待办+${stats.addedTasks}更新${stats.updatedTasks}，通知+${stats.addedNotices}）`;
        }
        setImportStatus({
          type: 'success',
          message: `🎉 已成功导入并合并备份文件 [${file.name}] ${details}`,
        });
      }
    } catch (err: any) {
      console.error('[CampusOS] Import failed:', err);
      setImportStatus({
        type: 'error',
        message: `导入失败：${err.message || '文件解析错误，请确保使用 CampusOS 导出的 JSON 备份文件。'}`,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => {
        setImportStatus(null);
      }, 6000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      
      {/* ========================================================================
          TIER 1: BALANCED 12-COLUMN HUB — USER IDENTITY & STATS + THEME CUSTOMIZER
          ======================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN (5 cols): User Identity, Academic Stats & Campus Systems */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 1A. Student Identity & Core User Stats Card (Liquid Dark Glass Obsidian) */}
          <div className="relative overflow-hidden rounded-3xl glass-dark text-white p-6 sm:p-7 shadow-2xl border border-white/20 backdrop-blur-2xl flex-1 flex flex-col justify-between gap-6">
            {/* Specular Ambient Liquid Orbs inside card */}
            <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 left-1/4 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Top: Avatar, Identity & Quick Edit Trigger */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/30 border-2 border-white/40 backdrop-blur-md">
                      {user.username.slice(0, 1)}
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-xs"
                      title="在线认证中"
                    >
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-xs truncate">
                        {user.username}
                      </h2>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/25 text-blue-300 border border-blue-400/40 whitespace-nowrap">
                        {user.grade}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono tabular-nums truncate">
                      {user.student_id} · {user.class_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate">
                      {user.university} · {user.major}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold backdrop-blur-xl border border-white/25 transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                >
                  {isEditing ? '取消' : '编辑资料'}
                </button>
              </div>

              {/* Active Level & Equipped Milestone Summary Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg bg-linear-to-r ${levelInfo.badgeGradient} text-white border border-white/30 shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap`}>
                  <Zap className="h-3 w-3 fill-white" />
                  <span>Lv.{levelInfo.level} {levelInfo.title}</span>
                </span>
                {activeEquippedBadge && (
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-sm inline-flex items-center gap-1.5 backdrop-blur-xs whitespace-nowrap ${activeEquippedBadge.headerBadgeClass}`}
                    title={`当前佩戴专注里程碑勋章：${activeEquippedBadge.name} (${activeEquippedBadge.englishName})`}
                  >
                    {renderMilestoneIcon(activeEquippedBadge.iconKey, 'h-3 w-3')}
                    <span>{activeEquippedBadge.name}</span>
                  </span>
                )}
              </div>

              {/* Edit Profile Drawer if active */}
              {isEditing && (
                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 space-y-3 backdrop-blur-md">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">姓名</label>
                      <input
                        type="text"
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">专业方向</label>
                      <input
                        type="text"
                        value={tempMajor}
                        onChange={e => setTempMajor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-blue-500/30 transition-all active:scale-95"
                    >
                      保存变更
                    </button>
                  </div>
                </div>
              )}

              {/* Level Progression & Task XP Progress Bar */}
              <div className="pt-4 border-t border-white/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-7 w-7 rounded-xl bg-linear-to-tr ${levelInfo.badgeGradient} text-white flex items-center justify-center shadow-sm border border-white/30 shrink-0`}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        成长进度 · {levelInfo.perkDescription}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        距 <span className="text-amber-300 font-semibold">{levelInfo.nextLevelTitle}</span> 还需{' '}
                        <span className="font-mono text-white font-bold tabular-nums">{levelInfo.xpNeededForNextLevel} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-xs font-black text-amber-300">
                      {levelInfo.totalXp} <span className="text-[10px] font-normal text-slate-400">/ {levelInfo.nextLevelXp}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-300">{levelInfo.progressPercent}%</div>
                  </div>
                </div>

                <div className="w-full bg-black/40 h-2.5 rounded-full p-0.5 border border-white/15 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full bg-linear-to-r ${levelInfo.badgeGradient} shadow-md transition-all duration-700 ease-out`}
                    style={{ width: `${Math.max(3, levelInfo.progressPercent)}%` }}
                  />
                </div>
              </div>

              {/* 2×2 User Academic & Campus Stats Grid */}
              <div className="pt-4 border-t border-white/15 grid grid-cols-2 gap-3">
                <div className="bg-white/10 hover:bg-white/15 transition-all backdrop-blur-xl rounded-2xl p-4 border border-white/15">
                  <div className="text-[11px] text-slate-300 font-semibold">当前学分绩点 GPA</div>
                  <div className="text-2xl font-black text-amber-300 font-mono tabular-nums mt-1">
                    {user.gpa.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white/10 hover:bg-white/15 transition-all backdrop-blur-xl rounded-2xl p-4 border border-white/15">
                  <div className="text-[11px] text-slate-300 font-semibold">已修学分 / 毕业要求</div>
                  <div className="text-2xl font-black text-white font-mono tabular-nums mt-1">
                    {user.credits_earned}
                    <span className="text-sm font-semibold text-slate-400"> / {user.credits_total}</span>
                  </div>
                </div>
                <div className="bg-white/10 hover:bg-white/15 transition-all backdrop-blur-xl rounded-2xl p-4 border border-white/15">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-slate-300 font-semibold">一卡通余额</span>
                    <button
                      type="button"
                      onClick={() => setShowRechargeModal(true)}
                      className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-2 cursor-pointer"
                    >
                      充值
                    </button>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums mt-1">
                    ¥{user.campus_card_balance.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white/10 hover:bg-white/15 transition-all backdrop-blur-xl rounded-2xl p-4 border border-white/15">
                  <div className="text-[11px] text-slate-300 font-semibold">图书馆在借图书</div>
                  <div className="text-2xl font-black text-blue-300 font-mono tabular-nums mt-1">
                    {user.library_books_borrowed} <span className="text-xs font-semibold text-slate-300">本</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Unlocked Focus Milestone Cosmetic Badges Strip */}
            <div className="relative z-10 pt-4 border-t border-white/15 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-300" />
                  <span>已解锁专注里程碑</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {milestoneSummary.unlockedCount}/{milestoneSummary.totalCount}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {milestoneSummary.badges
                  .filter(b => b.isUnlocked)
                  .map(badge => {
                    const isEquipped = activeEquippedBadge?.id === badge.id;
                    return (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => handleEquipMilestoneBadge(badge.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                          isEquipped
                            ? `bg-linear-to-r ${badge.medallionGradient} text-white border-white/60 shadow-md`
                            : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
                        }`}
                        title={`点击切换佩戴「${badge.name} (${badge.englishName})」至个人资料名片`}
                      >
                        {renderMilestoneIcon(badge.iconKey, 'h-3 w-3')}
                        <span>{badge.name}</span>
                        {isEquipped && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* 1B. Integrated Campus Systems Matrix (Compact 2×2 Grid Paired Below User Stats) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-700 flex items-center justify-center shrink-0">
                  <Building className="h-4 w-4" />
                </div>
                <span>校园系统集成状态</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                同步：{user.last_sync_time.split(' ')[1] || user.last_sync_time}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* CAS Academic */}
              <div className="p-3.5 rounded-2xl glass-panel-interactive flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">已同步</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">综合教务 CAS</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">课表与成绩自动更新</div>
                </div>
              </div>

              {/* Campus Card */}
              <div className="p-3.5 rounded-2xl glass-panel-interactive flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRechargeModal(true)}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
                    快捷充值
                  </button>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">一卡通消费码</div>
                  <div className="text-[10px] text-slate-500 font-mono tabular-nums mt-0.5">
                    余额 ¥{user.campus_card_balance.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Library */}
              <div className="p-3.5 rounded-2xl glass-panel-interactive flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-700 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 tabular-nums">在借 {user.library_books_borrowed} 本</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">图书馆借阅</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">《算法导论》9月20日到期</div>
                </div>
              </div>

              {/* Dorm & Network */}
              <div className="p-3.5 rounded-2xl glass-panel-interactive flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-700 flex items-center justify-center shrink-0">
                    <Wifi className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-cyan-700">网络在线</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">宿舍与校园网</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">{user.dormitory_room}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Theme Customizer + Liquid Glass Material Picker & Central Live Preview */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-5 relative flex-1 flex flex-col justify-between">
            {/* Subtle ambient light isolated inside its own clipped backdrop layer so tooltips never clip */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div
                className="absolute -top-14 -right-14 w-64 h-64 rounded-full blur-3xl opacity-25 transition-all duration-700"
                style={{ background: currentAccent.primaryHex }}
              />
            </div>

            {/* Header */}
            <div className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-2xl flex items-center justify-center font-bold shadow-md text-white transition-all duration-500 shrink-0"
                    style={{ background: `linear-gradient(135deg, ${currentAccent.primaryHex}, ${currentAccent.secondaryHex})` }}
                  >
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900">
                      界面主色调与液态玻璃定制
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Theme Customizer · 强调色与 Liquid Glass 2.0 光学材质全站实时联动
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-600 self-start sm:self-auto shrink-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: `linear-gradient(135deg, ${currentAccent.primaryHex}, ${currentAccent.secondaryHex})` }}
                  />
                  <span className="font-bold text-slate-800">{currentAccent.name}</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-indigo-700">{currentGlassPreset.englishName}</span>
                </div>
              </div>

              {/* Feedback Alert When Changed */}
              {themeSwitchFeedback && (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-bold flex items-center gap-2 backdrop-blur-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{themeSwitchFeedback}</span>
                </div>
              )}

              {/* Compact 6 Accent Theme Swatches (3×2 Grid) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-800">全局强调色方案 (Accent Palette)</span>
                  <span className="text-[11px] text-slate-400 font-mono">6 套主题色</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(ACCENT_THEMES) as AccentColorKey[]).map(themeKey => {
                    const theme = ACCENT_THEMES[themeKey];
                    const isSelected = (settings.accent_color || 'blue') === themeKey;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectAccentTheme(theme.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer group flex flex-col justify-between gap-2 select-none ${
                          isSelected
                            ? 'bg-white/95 border-slate-900 ring-2 ring-slate-900/15 shadow-sm'
                            : 'bg-white/60 hover:bg-white/95 border-white/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="h-7 w-7 rounded-xl shadow-xs border border-white/50 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                              style={{ background: `linear-gradient(135deg, ${theme.primaryHex}, ${theme.secondaryHex})` }}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 truncate">{theme.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium truncate">{theme.tagline.split(' · ')[0]}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-100/80">
                          <span className="truncate">{theme.primaryHex}</span>
                          <span
                            className="h-1.5 w-10 rounded-full shrink-0"
                            style={{ background: `linear-gradient(to right, ${theme.primaryHex}, ${theme.secondaryHex})` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ====================================================================
                LIQUID GLASS MATERIAL PICKER (Swatches + Central Interactive Live Preview)
                ==================================================================== */}
            <div className="pt-4 border-t border-slate-200/70 space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Liquid Glass Material Picker · 液态玻璃光学材质
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    切换 Matte Frost、High Gloss 或 Deep Depth，实时更新全局 :root 模糊、边框折射与阴影层级
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-600 tabular-nums shrink-0">
                  {currentGlassPreset.telemetry.blurLabel} · {currentGlassPreset.telemetry.saturationLabel} · α {currentGlassPreset.telemetry.ambientOpacityLabel}
                </span>
              </div>

              {/* 3 Interactive Material Swatch Cards with Informative Visual & Mobile Performance Tooltips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRIMARY_GLASS_PRESET_KEYS.map(presetKey => {
                  const preset = GLASS_PRESETS[presetKey];
                  const isSelected = activeGlassKey === presetKey;
                  const isMatte = preset.id === 'matte_frost';
                  const isGloss = preset.id === 'high_gloss';
                  const isDeep = preset.id === 'deep_depth';
                  const isTooltipOpen = openMaterialTooltip === preset.id;

                  const tooltipAlignClass = isMatte
                    ? 'left-0'
                    : isGloss
                      ? 'left-0 sm:left-1/2 sm:-translate-x-1/2'
                      : 'left-0 sm:left-auto sm:right-0';

                  const arrowAlignClass = isMatte
                    ? 'left-8'
                    : isGloss
                      ? 'left-8 sm:left-1/2 sm:-translate-x-1/2'
                      : 'left-8 sm:left-auto sm:right-8';

                  const ratingColorClass =
                    preset.mobileTooltip.ratingTone === 'emerald'
                      ? 'text-emerald-300'
                      : preset.mobileTooltip.ratingTone === 'amber'
                        ? 'text-amber-300'
                        : 'text-rose-300';

                  const impactTextClass =
                    preset.mobileTooltip.ratingTone === 'emerald'
                      ? 'text-emerald-700'
                      : preset.mobileTooltip.ratingTone === 'amber'
                        ? 'text-amber-700'
                        : 'text-rose-700';

                  const impactBarFillClass =
                    preset.mobileTooltip.ratingTone === 'emerald'
                      ? 'bg-emerald-500'
                      : preset.mobileTooltip.ratingTone === 'amber'
                        ? 'bg-amber-500'
                        : 'bg-rose-500';

                  return (
                    <div
                      key={preset.id}
                      className="relative"
                      onMouseEnter={() => setOpenMaterialTooltip(preset.id)}
                      onMouseLeave={() => setOpenMaterialTooltip(prev => (prev === preset.id ? null : prev))}
                    >
                      {/* Informative Visual Impact & Mobile Performance Tooltip */}
                      {isTooltipOpen && (
                        <div
                          id={`material-tooltip-${preset.id}`}
                          role="tooltip"
                          className={`absolute bottom-full mb-2.5 z-40 w-full sm:w-72 ${tooltipAlignClass} rounded-2xl bg-slate-900/95 text-slate-100 border border-white/15 shadow-2xl backdrop-blur-xl p-3.5 space-y-2.5 pointer-events-none`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                            <span className="text-xs font-black text-white tracking-tight">
                              {preset.englishName} · {preset.name}
                            </span>
                            <span className={`text-[10px] font-bold font-mono whitespace-nowrap ${ratingColorClass}`}>
                              {preset.mobileTooltip.mobileRating}
                            </span>
                          </div>

                          <div className="space-y-2 text-[11px] leading-relaxed">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400">视觉表现 (Visual Impact)</div>
                              <p className="text-slate-200 mt-0.5">{preset.mobileTooltip.visualImpact}</p>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400">移动端性能权衡 (Mobile Trade-off)</div>
                              <p className="text-slate-200 mt-0.5">{preset.mobileTooltip.performanceTradeoff}</p>
                            </div>
                            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[10px]">
                              <span className="text-slate-400 shrink-0">推荐场景：</span>
                              <span className="text-slate-100 font-semibold text-right">
                                {preset.mobileTooltip.recommendedFor}
                              </span>
                            </div>
                          </div>

                          {/* Subtle Downward Caret */}
                          <span
                            aria-hidden="true"
                            className={`absolute -bottom-1.5 ${arrowAlignClass} h-3 w-3 rotate-45 bg-slate-900/95 border-r border-b border-white/15`}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        aria-describedby={isTooltipOpen ? `material-tooltip-${preset.id}` : undefined}
                        onFocus={() => setOpenMaterialTooltip(preset.id)}
                        onBlur={() => setOpenMaterialTooltip(prev => (prev === preset.id ? null : prev))}
                        onClick={() => handleSelectGlassPreset(preset.id)}
                        className={`w-full h-full group p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 ${
                          isSelected
                            ? 'bg-white/95 border-slate-900 ring-2 ring-slate-900/15 shadow-md'
                            : 'bg-white/60 hover:bg-white/90 border-white/80 hover:border-slate-300'
                        }`}
                      >
                        {/* Miniature Optical Preview Stage */}
                        <div className="relative h-14 w-full rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900/5 flex items-center justify-center p-2">
                          <div
                            className={`absolute -top-2.5 left-3 h-10 w-10 rounded-full transition-transform duration-500 group-hover:scale-110 ${
                              isMatte ? 'blur-md opacity-45' : isGloss ? 'blur-[2px] opacity-85' : 'blur-xs opacity-75'
                            }`}
                            style={{ background: currentAccent.primaryHex }}
                          />
                          <div
                            className={`absolute -bottom-2.5 right-3 h-10 w-10 rounded-full transition-transform duration-500 group-hover:scale-110 ${
                              isMatte ? 'blur-md opacity-45' : isGloss ? 'blur-[2px] opacity-85' : 'blur-xs opacity-75'
                            }`}
                            style={{ background: currentAccent.secondaryHex }}
                          />
                          {isDeep && (
                            <div
                              className="absolute inset-x-4 top-3 bottom-1.5 rounded-lg border border-white/50 opacity-70"
                              style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)' }}
                            />
                          )}
                          <div
                            className="relative z-10 w-full h-full rounded-lg flex items-center justify-between px-2.5 overflow-hidden"
                            style={{
                              background: preset.cssVars['--glass-bg'],
                              backdropFilter: `blur(${isMatte ? '14px' : isGloss ? '4px' : '8px'}) saturate(${preset.cssVars['--glass-saturate']})`,
                              WebkitBackdropFilter: `blur(${isMatte ? '14px' : isGloss ? '4px' : '8px'}) saturate(${preset.cssVars['--glass-saturate']})`,
                              border: isGloss
                                ? '1.5px solid rgba(255, 255, 255, 1)'
                                : isDeep
                                  ? `1.5px solid ${currentAccent.primaryHex}60`
                                  : '1px solid rgba(255, 255, 255, 0.85)',
                              boxShadow: isDeep
                                ? `0 6px 14px -3px ${currentAccent.primaryHex}50, inset 0 1.5px 2px rgba(255,255,255,1)`
                                : isGloss
                                  ? '0 3px 10px -2px rgba(15,23,42,0.10), inset 0 2px 2px rgba(255,255,255,1)'
                                  : '0 2px 5px -1px rgba(15,23,42,0.05), inset 0 1px 1.5px rgba(255,255,255,0.85)',
                            }}
                          >
                            {isGloss && (
                              <div className="pointer-events-none absolute -inset-y-4 left-1/3 w-7 bg-linear-to-r from-transparent via-white/90 to-transparent -skew-x-24 transition-transform duration-500 group-hover:translate-x-8" />
                            )}
                            <span className="relative z-10 text-[10px] font-mono font-black text-slate-800 tracking-wide">
                              {preset.englishName}
                            </span>
                            <span className="relative z-10 text-[9px] font-mono font-bold text-slate-600 tabular-nums">
                              {preset.telemetry.blurLabel}
                            </span>
                          </div>
                        </div>

                        {/* Title & Active Check */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                              <span>{preset.name}</span>
                              {isDeep && <span className="text-[10px] font-semibold text-indigo-600">· 默认</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {preset.tagline.split(' · ')[0]}
                            </div>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              应用
                            </span>
                          )}
                        </div>

                        {/* Compact Mobile Performance Impact Indicator */}
                        <div
                          className="flex items-center justify-between gap-1.5 text-[10px]"
                          aria-label={`移动端性能评估：${preset.mobileTooltip.impactLabel}（${preset.mobileTooltip.impactHintZh}）`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-flex items-end gap-0.5 h-2.5 shrink-0" aria-hidden="true">
                              <span
                                className={`w-1 h-1.5 rounded-[1px] ${
                                  preset.mobileTooltip.impactLevel >= 1 ? impactBarFillClass : 'bg-slate-200'
                                }`}
                              />
                              <span
                                className={`w-1 h-2 rounded-[1px] ${
                                  preset.mobileTooltip.impactLevel >= 2 ? impactBarFillClass : 'bg-slate-200'
                                }`}
                              />
                              <span
                                className={`w-1 h-2.5 rounded-[1px] ${
                                  preset.mobileTooltip.impactLevel >= 3 ? impactBarFillClass : 'bg-slate-200'
                                }`}
                              />
                            </span>
                            <span className={`font-mono font-bold tracking-tight truncate ${impactTextClass}`}>
                              {preset.mobileTooltip.impactLabel}
                            </span>
                          </div>
                          <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">
                            {preset.mobileTooltip.impactHintZh}
                          </span>
                        </div>

                        {/* Compact Optical Spec Row (with space reserved for mobile info toggle) */}
                        <div className="pt-2 pr-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500 tabular-nums">
                          <span>Sat {preset.telemetry.saturationLabel}</span>
                          <span className="text-indigo-600 font-bold">α {preset.telemetry.ambientOpacityLabel}</span>
                        </div>
                      </button>

                      {/* Accessible Touch-Friendly Info Button for Mobile Tooltip Inspection */}
                      <button
                        type="button"
                        aria-label={`查看 ${preset.englishName} 视觉效果与移动端性能说明`}
                        aria-expanded={isTooltipOpen}
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMaterialTooltip(prev => (prev === preset.id ? null : preset.id));
                        }}
                        className={`absolute bottom-2.5 right-2.5 z-20 h-6 w-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isTooltipOpen
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/90'
                        }`}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* CENTRAL INTERACTIVE 'LIVE PREVIEW' CARD COMPONENT */}
              <LiquidGlassLivePreviewCard
                preset={currentGlassPreset}
                accent={currentAccent}
                onCyclePreset={handleCycleGlassPreset}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          TIER 2: FOCUS MILESTONES & HEATMAP CALENDAR
          ======================================================================== */}
      <FocusMilestoneShowcase
        summary={milestoneSummary}
        equippedBadgeId={activeEquippedBadge?.id || equippedBadgeId}
        onEquipBadge={handleEquipMilestoneBadge}
        onToggleSimulateUnlock={handleToggleSimulateUnlock}
        onNavigateTab={onNavigateTab}
      />

      <FocusHeatmapCalendar
        settings={settings}
        tasks={tasks}
        onNavigateTab={onNavigateTab}
      />

      {/* ========================================================================
          TIER 3: ACADEMIC GROWTH, STUDY STREAK & PRODUCTIVITY ANALYTICS
          ======================================================================== */}
      <NextRankProgressSection
        rankProgress={getAcademicRankProgress(levelInfo.level, levelInfo.totalXp)}
        onNavigateTab={onNavigateTab}
      />

      <StudyStreakTracker
        user={user}
        settings={settings}
        onNavigateTab={onNavigateTab}
      />

      <WeeklyProductivityOverview
        tasks={tasks}
        settings={settings}
        onNavigateTab={onNavigateTab}
      />

      <WeeklyFocusTrendsChart
        tasks={tasks}
        settings={settings}
        onNavigateTab={onNavigateTab}
      />

      <ThirtyDayTaskCompletionChart
        tasks={tasks}
        settings={settings}
        onNavigateTab={onNavigateTab}
      />

      <ProfileFocusTaskInsightsSection
        tasks={tasks}
        settings={settings}
        onNavigateTab={onNavigateTab}
      />

      <StudySessionExportCard
        user={user}
        tasks={tasks}
        settings={settings}
      />

      {/* ========================================================================
          TIER 4: BALANCED 12-COLUMN OPERATIONS ROW — SYSTEM PREFERENCES & ABOUT
          ======================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* System Preferences & Settings (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h3 className="font-black text-lg sm:text-xl text-slate-900 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-500/15 border border-slate-500/25 text-slate-700 flex items-center justify-center font-bold">
              <Settings className="h-4.5 w-4.5" />
            </div>
            <span>系统与偏好设置</span>
          </h3>

          <div className="divide-y divide-white/60 text-xs sm:text-sm">
            
            {/* Current Semester */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800">学期与开学周次</div>
                <div className="text-slate-500 text-[11px] sm:text-xs font-medium mt-0.5">当前处于：{settings.semester_name}</div>
              </div>
              <select
                value={settings.current_week}
                onChange={e => onUpdateSettings({ current_week: parseInt(e.target.value, 10) })}
                className="px-4 py-2.5 rounded-xl border border-white/80 bg-white/70 backdrop-blur-md font-bold text-slate-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>
                    第 {w} 周
                  </option>
                ))}
              </select>
            </div>

            {/* Auto CAS sync */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800">自动同步教务数据</div>
                <div className="text-slate-500 text-[11px] sm:text-xs font-medium mt-0.5">每次启动时自动检查课表变更与考试更新</div>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_sync_cas}
                onChange={e => onUpdateSettings({ auto_sync_cas: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer"
              />
            </div>

            {/* Notification alerts & 2-Hour Due Desktop Alert System */}
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-800 flex flex-wrap items-center gap-2">
                    <span>考勤与待办桌面预警推送 (Browser Notification API)</span>
                    <span className="text-[11px] font-semibold text-amber-700">· 2小时临界桌面弹窗</span>
                  </div>
                  <div className="text-slate-500 text-[11px] sm:text-xs font-medium mt-0.5">
                    待办任务距截止时间小于 2 小时时，自动利用浏览器 Notification API 发送系统级桌面横幅告警
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notification_alert}
                  onChange={e => onUpdateSettings({ notification_alert: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer shrink-0"
                />
              </div>

              {/* Browser Permission & Quick Test Sub-Card */}
              <div className="p-3.5 rounded-2xl bg-white/60 border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                        <span>系统桌面通知权限：</span>
                        <span className={`font-semibold ${
                          notifPermission === 'granted'
                            ? 'text-emerald-700'
                            : notifPermission === 'denied'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}>
                          {notifPermission === 'granted' ? '已授权 (Active)' : notifPermission === 'denied' ? '已拦截 (Denied)' : '待授权 (Default)'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {dueTasks2h.length > 0
                          ? `当前检测到 ${dueTasks2h.length} 项待办将在 2 小时内截止`
                          : '当前暂无 2 小时内截止的紧迫待办，后台每 60 秒自动静默轮询监控'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {notifPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const p = await NotificationManager.requestPermission();
                          setNotifPermission(p);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
                      >
                        授权系统通知
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        NotificationManager.resetTaskNotifiedSession();
                        if (dueTasks2h.length > 0) {
                          NotificationManager.sendTaskDueNotification(dueTasks2h[0].task, dueTasks2h[0].minutesLeft, undefined, true);
                        } else {
                          const demoTask: Task = (tasks && tasks[0]) || {
                            id: 'demo_test',
                            title: '高等数学第一章极限课后习题',
                            category: 'homework',
                            priority: 'high',
                            deadline: '今日 23:59',
                            is_completed: false,
                            created_at: '2026-10-12',
                            course_name: '高等数学 (上)'
                          };
                          NotificationManager.sendTaskDueNotification(demoTask, 45, undefined, true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>测试待办弹窗</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add to Desktop / PWA Immersion Setting */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800">添加到桌面 & PWA 沉浸模式</div>
                <div className="text-slate-500 text-[11px] sm:text-xs font-medium mt-0.5">
                  支持一键“添加到桌面”并导出轻量化 PWA 配置文件 (manifest.json)
                </div>
              </div>
              <button
                id="profile-pwa-install-btn"
                type="button"
                onClick={() => {
                  if (onOpenPwaModal) onOpenPwaModal();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto whitespace-nowrap"
              >
                <Monitor className="h-4 w-4" />
                <span>添加到桌面 / 导出 PWA</span>
              </button>
            </div>

            {/* Data Backup & Reset */}
            <div className="py-5 space-y-3 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-800">数据管理与本地备份 / 恢复 (JSON)</div>
                  <div className="text-slate-500 text-[11px] sm:text-xs font-medium mt-0.5">
                    一键导出或解析合并外部 JSON 备份文件（涵盖课表、待办、通知与个性化设置）
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Hidden File Input for Import */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />

                  {/* Export Button */}
                  <button
                    id="profile-backup-data-btn"
                    type="button"
                    onClick={handleExportData}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black cursor-pointer transition-all shadow-md shadow-blue-500/25 border border-white/30 active:scale-95 whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>备份 JSON</span>
                  </button>

                  {/* Import Button */}
                  <button
                    id="profile-import-data-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-800 text-xs font-black cursor-pointer transition-all shadow-sm border border-slate-200/80 active:scale-95 whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5 text-indigo-600" />
                    <span>导入合并</span>
                  </button>

                  {/* Reset Demo Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('确认恢复所有演示课表与通知数据吗？')) {
                        onResetData();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-700 text-xs font-bold cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>重置演示</span>
                  </button>
                </div>
              </div>

              {/* Export Success Feedback Toast */}
              {backupSuccessInfo && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-medium flex items-center gap-2.5 backdrop-blur-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{backupSuccessInfo}</span>
                </div>
              )}

              {/* Import Status Feedback Toast */}
              {importStatus && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2.5 backdrop-blur-xs ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800'
                  }`}
                >
                  {importStatus.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* About CampusOS & Local Dataset Summary (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="font-black text-slate-900 text-base flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-600 flex items-center justify-center shrink-0">
                <Info className="h-4 w-4" />
              </div>
              <span>关于 CampusOS v2.0</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              CampusOS 是面向大学生的新一代智能校园操作系统，以“信息聚合、零学习成本、AI 赋能”为核心，无缝整合教务、学工、课表、竞赛与实习雷达，助力提升大学生的学习与科研效率。
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-200/70">
            <div className="text-xs font-black text-slate-800">当前本地数据集概览</div>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-white/65 border border-white/90">
                <div className="text-lg font-black font-mono text-slate-900 tabular-nums">{courses.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">已同步课程</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/65 border border-white/90">
                <div className="text-lg font-black font-mono text-slate-900 tabular-nums">{tasks.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">待办事项</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/65 border border-white/90">
                <div className="text-lg font-black font-mono text-slate-900 tabular-nums">{notices.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">校园通知</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/70 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Liquid Glass 2.0</span>
            <span className="font-bold text-slate-700">{currentGlassPreset.englishName}</span>
          </div>
        </div>
      </div>

      {/* Recharge Modal (Frosted Liquid Glass Modal) */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-5 shadow-2xl border border-white/80 backdrop-blur-2xl">
            <h4 className="font-black text-lg text-slate-900">一卡通快捷充值模拟</h4>
            <p className="text-xs text-slate-500 font-medium">
              当前账户余额：<span className="font-bold text-emerald-600 font-mono">¥{user.campus_card_balance.toFixed(2)}</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              {['20', '50', '100'].map(amt => (
                <button
                  key={amt}
                  onClick={() => setRechargeAmount(amt)}
                  className={`py-3 rounded-2xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                    rechargeAmount === amt
                      ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white border-white/40 shadow-md shadow-blue-500/25'
                      : 'bg-white/70 text-slate-700 border-white/90 hover:bg-white'
                  }`}
                >
                  ¥{amt}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowRechargeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100/60 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleRecharge}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/25 border border-white/30 cursor-pointer active:scale-95"
              >
                确认充值
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

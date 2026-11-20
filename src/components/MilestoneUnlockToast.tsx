import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Check,
  X,
  ArrowUpRight,
  Award,
} from 'lucide-react';
import {
  FocusMilestoneBadge,
  MILESTONE_UNLOCK_EVENT,
  getSavedEquippedBadgeId,
  saveEquippedBadgeId,
} from '../lib/focusMilestones';
import { renderMilestoneIcon } from './FocusMilestoneShowcase';

interface MilestoneUnlockToastProps {
  equippedBadgeId?: string;
  onEquipBadge: (badgeId: string) => void;
  onNavigateToProfile: () => void;
}

export const MilestoneUnlockToast: React.FC<MilestoneUnlockToastProps> = ({
  equippedBadgeId,
  onEquipBadge,
  onNavigateToProfile,
}) => {
  const [queue, setQueue] = useState<FocusMilestoneBadge[]>([]);
  const [currentEquippedId, setCurrentEquippedId] = useState<string>(
    () => equippedBadgeId || getSavedEquippedBadgeId()
  );

  useEffect(() => {
    if (equippedBadgeId) {
      setCurrentEquippedId(equippedBadgeId);
    }
  }, [equippedBadgeId]);

  const playMilestoneFanfareChime = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playNote = (freq: number, startDelay: number, duration: number, gainPeak = 0.18) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + startDelay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration + 0.04);
      };

      // Uplifting C5 -> E5 -> G5 -> B5 -> C6 milestone fanfare arpeggio
      playNote(523.25, 0, 0.28, 0.16);
      playNote(659.25, 0.11, 0.28, 0.17);
      playNote(783.99, 0.22, 0.32, 0.18);
      playNote(987.77, 0.34, 0.36, 0.18);
      playNote(1046.5, 0.46, 0.75, 0.22);
    } catch {
      // Ignore browser autoplay restrictions
    }
  }, []);

  useEffect(() => {
    const handleMilestoneUnlocked = (event: Event) => {
      const customEvt = event as CustomEvent<FocusMilestoneBadge>;
      const badge = customEvt.detail;
      if (!badge || !badge.id) return;

      playMilestoneFanfareChime();
      setQueue(prev => {
        const filtered = prev.filter(item => item.id !== badge.id);
        return [...filtered, badge];
      });
    };

    window.addEventListener(MILESTONE_UNLOCK_EVENT, handleMilestoneUnlocked);
    return () => {
      window.removeEventListener(MILESTONE_UNLOCK_EVENT, handleMilestoneUnlocked);
    };
  }, [playMilestoneFanfareChime]);

  const activeBadge = queue[0] || null;

  // Auto-dismiss active milestone toast after 9 seconds if not interacted with
  useEffect(() => {
    if (!activeBadge) return;
    const timer = setTimeout(() => {
      setQueue(prev => prev.slice(1));
    }, 9000);
    return () => clearTimeout(timer);
  }, [activeBadge]);

  if (!activeBadge) return null;

  const isEquipped = currentEquippedId === activeBadge.id;

  const handleDismiss = () => {
    setQueue(prev => prev.slice(1));
  };

  const handleEquipClick = () => {
    setCurrentEquippedId(activeBadge.id);
    saveEquippedBadgeId(activeBadge.id);
    onEquipBadge(activeBadge.id);
  };

  const handleViewInProfileClick = () => {
    onNavigateToProfile();
    setQueue([]);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl glass-dark text-white p-4 sm:p-5 shadow-2xl border border-white/25 backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-200"
    >
      {/* Top Kicker Row */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-white/15">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 tracking-wide">
          <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span>新专注里程碑达成 · MILESTONE UNLOCKED</span>
        </div>

        <div className="flex items-center gap-2">
          {queue.length > 1 && (
            <span className="text-[10px] font-mono font-bold text-slate-300 tabular-nums">
              1/{queue.length}
            </span>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="关闭里程碑通知"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Badge Emblem & Description */}
      <div className="flex items-start gap-3.5">
        <div
          className={`h-14 w-14 rounded-2xl bg-linear-to-br ${activeBadge.medallionGradient} text-white flex items-center justify-center shrink-0 shadow-lg border border-white/40`}
        >
          {renderMilestoneIcon(activeBadge.iconKey, 'h-7 w-7')}
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <h4 className="font-black text-base text-white tracking-tight">
              {activeBadge.name}
            </h4>
            <span className="text-xs font-mono font-bold text-amber-300">
              ({activeBadge.englishName})
            </span>
          </div>

          <div className="text-[11px] text-slate-300 font-medium">
            {activeBadge.rarityLabel} · {activeBadge.streakGoalRequirement}
          </div>

          <p className="text-xs text-slate-200/90 leading-relaxed pt-0.5">
            {activeBadge.description}
          </p>
        </div>
      </div>

      {/* Interactive Actions Row */}
      <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleEquipClick}
          disabled={isEquipped}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
            isEquipped
              ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95'
          }`}
        >
          {isEquipped ? (
            <>
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>已佩戴至个人主页</span>
            </>
          ) : (
            <>
              <Award className="h-3.5 w-3.5" />
              <span>立即佩戴勋章</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleViewInProfileClick}
          className="inline-flex items-center gap-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer whitespace-nowrap active:scale-95"
        >
          <span>查看勋章馆</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="py-2 px-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { 
  Keyboard, 
  X, 
  Sparkles, 
  Timer, 
  Coffee, 
  Palette, 
  Volume2, 
  CheckCircle2, 
  Zap, 
  Info,
  CornerDownLeft,
  Activity
} from 'lucide-react';

interface FocusModeShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lastPressedKey?: string | null;
}

interface ShortcutItem {
  keyLabel: string[];
  description: string;
  actionNote?: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ElementType;
  badgeClass: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: '番茄钟计时控制',
    icon: Timer,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    items: [
      {
        keyLabel: ['Space / 空格'],
        description: '暂停 / 继续专注计时',
        actionNote: '极速切换自习心流状态',
      },
      {
        keyLabel: ['R'],
        description: '重置当前周期倒计时',
        actionNote: '回到当前周期预设时长',
      },
      {
        keyLabel: ['S'],
        description: '准备休息 / 提前结束学程',
        actionNote: '即刻切换至微休息周期',
      },
    ],
  },
  {
    title: '舒缓休息与待办攻坚',
    icon: Activity,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    items: [
      {
        keyLabel: ['B'],
        description: '开启 5 分钟拉伸微提醒 Toast',
        actionNote: '触发科学肩颈活动跟练',
      },
      {
        keyLabel: ['T'],
        description: '展开 / 收起待办快速录入框',
        actionNote: '聚焦当前正在攻坚的课业',
      },
      {
        keyLabel: ['Esc'],
        description: '退出专注模式 (恢复全览)',
        actionNote: '或关闭当前已打开的浮窗',
      },
    ],
  },
  {
    title: '白噪音氛围与界面',
    icon: Volume2,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    items: [
      {
        keyLabel: ['M'],
        description: '静音 / 恢复白噪音音景',
        actionNote: '一键静噪或恢复沉浸声场',
      },
      {
        keyLabel: ['?', '或 Shift + /'],
        description: '打开 / 关闭本快捷键清单',
        actionNote: '随时随地召唤键位指南',
      },
    ],
  },
];

export const FocusModeShortcutsOverlay: React.FC<FocusModeShortcutsOverlayProps> = ({
  isOpen,
  onClose,
  lastPressedKey,
}) => {
  const [activePressedKey, setActivePressedKey] = useState<string | null>(lastPressedKey || null);

  useEffect(() => {
    if (lastPressedKey) {
      setActivePressedKey(lastPressedKey);
      const timer = setTimeout(() => setActivePressedKey(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [lastPressedKey]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-purple-200/80 shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle Ambient Glowing Orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-purple-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-linear-to-tr from-emerald-500/10 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/25 shrink-0">
              <Keyboard className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                  专注模式快捷键指南 (Focus Shortcuts)
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                  <span>盲操监听中</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                支持键盘极速盲操，无需移动鼠标即可掌控计时、休息与自习节奏
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="关闭 (Esc)"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Live Keypress Visualizer Bar */}
        <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="text-slate-600 font-medium">实时按键响应反馈：</span>
            {activePressedKey ? (
              <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs animate-bounce">
                刚刚触发了 [{activePressedKey}]
              </span>
            ) : (
              <span className="text-slate-400 italic">在键盘上按下任意快捷键测试...</span>
            )}
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Input 聚焦时自动避让
          </span>
        </div>

        {/* Grouped Shortcuts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {SHORTCUT_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  {/* Category Title */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{cat.title}</span>
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${cat.badgeClass}`}>
                      {cat.items.length} 个快捷键
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2.5">
                    {cat.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-slate-800">
                            {item.description}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.keyLabel.map((lbl, lIdx) => (
                              <kbd 
                                key={lIdx}
                                className={`px-2 py-0.5 rounded-md font-mono font-black text-[11px] border shadow-2xs transition-all ${
                                  activePressedKey && activePressedKey.toLowerCase() === lbl.toLowerCase().charAt(0)
                                    ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400'
                                    : 'bg-white text-slate-800 border-slate-300'
                                }`}
                              >
                                {lbl}
                              </kbd>
                            ))}
                          </div>
                        </div>
                        {item.actionNote && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {item.actionNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100 pt-3 relative z-10">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span>输入框录入待办或编辑文字时，系统将智能禁用字母快捷键，避免误触发。</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 self-end sm:self-auto shrink-0"
          >
            知道了 (Esc)
          </button>
        </div>

      </div>
    </div>
  );
};

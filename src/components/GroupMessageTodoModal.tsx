import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  ArrowRight, 
  Clock, 
  MapPin, 
  Filter, 
  RefreshCw, 
  Layers, 
  ShieldCheck, 
  Trash2, 
  Send, 
  Users, 
  FileText, 
  CreditCard, 
  ChevronRight,
  ExternalLink,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Tag
} from 'lucide-react';
import { 
  AIExtractedTodo, 
  RawGroupMessage, 
  AIRule, 
  TodoExtractionStats, 
  ChatGroup, 
  TodoActionType, 
  Task 
} from '../types';
import { GroupMessageAIService } from '../services/groupMessageAI';

interface GroupMessageTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportToTasks: (task: Task) => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}

export const GroupMessageTodoModal: React.FC<GroupMessageTodoModalProps> = ({
  isOpen,
  onClose,
  onImportToTasks,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'todos' | 'ingest' | 'rules'>('todos');
  const [todos, setTodos] = useState<AIExtractedTodo[]>([]);
  const [stats, setStats] = useState<TodoExtractionStats>(GroupMessageAIService.getStats());
  const [rules, setRules] = useState<AIRule[]>(GroupMessageAIService.getRules());
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>(GroupMessageAIService.getChatGroups());
  
  // Filtering in todo list
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Input states for custom message ingest
  const [inputGroupName, setInputGroupName] = useState('【计卓261】官方班级通知群');
  const [inputSender, setInputSender] = useState('班长 · 王楚然');
  const [inputContent, setInputContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTodos(GroupMessageAIService.getExtractedTodos());
      setStats(GroupMessageAIService.getStats());
      setRules(GroupMessageAIService.getRules());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtered todos
  const filteredTodos = todos.filter(t => {
    if (t.status === 'false_positive') return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
    return true;
  });

  const activeTodoCount = todos.filter(t => t.status === 'active').length;
  const importedCount = todos.filter(t => t.status === 'imported').length;

  // Handlers
  const handleImportSingle = (todo: AIExtractedTodo) => {
    const newTask = GroupMessageAIService.convertTodoToTask(todo);
    onImportToTasks(newTask);
    
    // Mark todo as imported
    const updated = todos.map(t => t.id === todo.id ? { ...t, status: 'imported' as const } : t);
    setTodos(updated);
    GroupMessageAIService.saveExtractedTodos(updated);

    showToast(`🎉 已将《${todo.title}》同步至您的系统待办清单！`);
  };

  const handleMarkFalsePositive = (todo: AIExtractedTodo) => {
    const updated = GroupMessageAIService.markAsFalsePositive(todo.id);
    setTodos(updated);
    setStats(GroupMessageAIService.getStats());
    setRules(GroupMessageAIService.getRules());
    showToast(`🛡️ 已将该项标记为误判，系统已学习过滤偏好规则！`, 'info');
  };

  const handleManualIngest = async () => {
    if (!inputContent.trim()) {
      showToast('请输入要解析的群消息内容', 'info');
      return;
    }
    setIsAnalyzing(true);
    try {
      const extracted = await GroupMessageAIService.ingestCustomMessage(
        inputGroupName,
        inputSender,
        inputContent.trim()
      );
      setTodos(GroupMessageAIService.getExtractedTodos());
      setStats(GroupMessageAIService.getStats());
      setIsAnalyzing(false);
      setInputContent('');

      if (extracted) {
        showToast(`✨ 成功提取到新待办：《${extracted.title}》！`);
        setActiveTab('todos');
      } else {
        showToast('💡 消息已分析，未检测到需要本人亲自完成的具体待办事项（已过滤闲聊/公告）', 'info');
      }
    } catch {
      setIsAnalyzing(false);
      showToast('解析失败，请重试', 'info');
    }
  };

  const handleReanalyzeAll = async () => {
    setIsAnalyzing(true);
    const result = await GroupMessageAIService.reanalyzeMessages();
    setTodos(result.extracted);
    setStats(GroupMessageAIService.getStats());
    setIsAnalyzing(false);
    showToast(`🔄 重新分析完成！共扫描 ${result.stats.processed} 条群消息，提取 ${result.stats.newTodos} 项待办。`);
  };

  const handleAddCustomRule = () => {
    if (!newRuleKeyword.trim()) return;
    const currentRules = GroupMessageAIService.getRules();
    const newRule: AIRule = {
      id: `rule_${Date.now()}`,
      rule_type: 'exclude_keyword',
      keyword: newRuleKeyword.trim(),
      weight: 1.0,
      description: '用户自定义排除规则',
    };
    const updated = [...currentRules, newRule];
    GroupMessageAIService.saveRules(updated);
    setRules(updated);
    setNewRuleKeyword('');
    showToast(`已添加过滤规则：排除包含 "${newRule.keyword}" 的消息`);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updated = rules.filter(r => r.id !== ruleId);
    GroupMessageAIService.saveRules(updated);
    setRules(updated);
    showToast('已移除该过滤规则');
  };

  const getActionTypeBadge = (actionType: TodoActionType) => {
    const map: Record<TodoActionType, { label: string; color: string }> = {
      submit: { label: '提交材料', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      form: { label: '填写表单', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      meeting: { label: '线下会议', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      checkin: { label: '随堂测验', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      payment: { label: '班费缴纳', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      signup: { label: '报名申请', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      confirm: { label: '回复确认', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      other: { label: '常规行动', color: 'bg-slate-50 text-slate-700 border-slate-200' },
    };
    const item = map[actionType] || map.other;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.color}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl glass-panel bg-white/95 border border-white/80 shadow-2xl overflow-hidden">
        
        {/* Header Ribbon */}
        <div className="relative z-10 p-5 sm:p-6 pb-4 border-b border-slate-200/80 bg-linear-to-r from-indigo-900/5 via-purple-900/5 to-blue-900/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/25 shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    AI 群消息待办提取中心
                  </h2>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 border border-indigo-500/25">
                    大模型智能解析
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  智能抓取班级群、年级群与答疑群聊天记录，自动识别作业、会议、表单并剔除闲聊
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-3 border-t border-slate-200/60">
            <div className="bg-white/70 rounded-xl p-2.5 border border-white/80 text-center shadow-2xs">
              <div className="text-[10px] text-slate-500 font-bold uppercase">已处理群消息</div>
              <div className="text-base sm:text-lg font-mono font-black text-slate-900">{stats.total_processed} 条</div>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 border border-white/80 text-center shadow-2xs">
              <div className="text-[10px] text-indigo-600 font-bold uppercase">成功提取待办</div>
              <div className="text-base sm:text-lg font-mono font-black text-indigo-700">{todos.length} 项</div>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 border border-white/80 text-center shadow-2xs">
              <div className="text-[10px] text-rose-500 font-bold uppercase">误判过滤拦截</div>
              <div className="text-base sm:text-lg font-mono font-black text-rose-600">{stats.false_positives} 次</div>
            </div>
            <div className="bg-white/70 rounded-xl p-2.5 border border-white/80 text-center shadow-2xs">
              <div className="text-[10px] text-emerald-600 font-bold uppercase">识别准确率</div>
              <div className="text-base sm:text-lg font-mono font-black text-emerald-700">{(stats.completion_rate * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 mt-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white/70 text-slate-600 hover:bg-white'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>待办提取看板 ({filteredTodos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'ingest'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/70 text-slate-600 hover:bg-white'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>消息粘贴与测试导入</span>
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white/70 text-slate-600 hover:bg-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>防误判规则与群组 ({rules.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* TAB 1: Todos Kanban */}
          {activeTab === 'todos' && (
            <div className="space-y-4">
              {/* Filter Row & Re-analyze button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" /> 分类：
                  </span>
                  {['all', 'academic', 'meeting', 'admin', 'payment'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      {cat === 'all' ? '全部' : cat === 'academic' ? '学业作业' : cat === 'meeting' ? '开会研讨' : cat === 'admin' ? '综合表单' : '班费事务'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleReanalyzeAll}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/80 shadow-2xs cursor-pointer active:scale-95 transition-all self-end sm:self-auto shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? '正在扫描解析...' : '重新分析历史群消息'}</span>
                </button>
              </div>

              {/* Todo Items List */}
              {filteredTodos.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">当前分类下暂无群消息待办</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    可以前往“消息粘贴与测试导入”尝试粘贴班级通知或催交通告，AI 将自动抽取结构化行动项。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredTodos.map(todo => {
                    const isImported = todo.status === 'imported';

                    return (
                      <div
                        key={todo.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 shadow-2xs ${
                          isImported 
                            ? 'bg-slate-50/70 border-slate-200/80 opacity-80' 
                            : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {getActionTypeBadge(todo.action_type)}
                              {todo.priority === 'high' && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                  🔥 高优先
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                置信度 {(todo.confidence * 100).toFixed(0)}%
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-500 font-mono truncate max-w-32">
                              {todo.source_group_name.slice(0, 10)}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm font-black text-slate-900 leading-snug">
                            {todo.title}
                          </h4>

                          {/* Detail summary */}
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {todo.detail}
                          </p>

                          {/* Meta: Deadline & Location & Sender */}
                          <div className="space-y-1 pt-1 text-[11px] text-slate-500 font-medium">
                            {todo.deadline && (
                              <div className="flex items-center gap-1.5 text-rose-600 font-bold font-mono">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>截止时间: {todo.deadline}</span>
                              </div>
                            )}
                            {todo.location && (
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span>地点: {todo.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              <span>发送人: {todo.source_sender}</span>
                            </div>
                          </div>

                          {/* AI reasoning tooltip box */}
                          <div className="p-2 rounded-xl bg-slate-50 text-[10px] text-slate-500 border border-slate-200/50">
                            💡 <strong>识别依据</strong>：{todo.reason}
                          </div>
                        </div>

                        {/* Actions Bottom Bar */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleMarkFalsePositive(todo)}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                            title="标记为误判，系统将学习此规则不再打扰"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>误判忽略</span>
                          </button>

                          <button
                            onClick={() => handleImportSingle(todo)}
                            disabled={isImported}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isImported
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs active:scale-95'
                            }`}
                          >
                            {isImported ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>已同步待办</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span>同步至待办清单</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Ingest & Test Message */}
          {activeTab === 'ingest' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              {/* Presets buttons */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-700 uppercase">
                  快捷模拟校园群聊消息（点击一键填入测试）：
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setInputGroupName('【计卓261】官方班级通知群');
                      setInputSender('学委 · 张婷');
                      setInputContent('@全员 通知：计算机系统基础课程作业第二期已发布在OJ平台，要求完成汇编反编译逆向题目3道，提交截止时间为周五晚23:59，逾期提交按0分计，请大家务必抓紧时间！');
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border text-left cursor-pointer transition-all"
                  >
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span>📘 模拟课程大作业催交通知</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">周五晚23:59截止，逾期0分</div>
                  </button>

                  <button
                    onClick={() => {
                      setInputGroupName('【信科院】团总支评优推优通知群');
                      setInputSender('团支书 · 林晨');
                      setInputContent('【志愿服务时长录入】请本学期参加了迎新志愿者活动的同学，于明天下午17:00前在志愿汇APP生成个人服务时长证书，并上传至学院问卷星，用于抵扣志愿学时。');
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border text-left cursor-pointer transition-all"
                  >
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span>🎗️ 模拟志愿学时填报通知</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">明天下午17:00前生成证书上传</div>
                  </button>

                  <button
                    onClick={() => {
                      setInputGroupName('【计卓261】日常交流群');
                      setInputSender('李同学');
                      setInputContent('中午第二节下课有没有人一起去一食堂三楼吃水饺啊？二缺二！');
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border text-left cursor-pointer transition-all"
                  >
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span>🍜 模拟闲聊约饭 (测试误判拦截)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">无待办要求，AI应自动判定为 false</div>
                  </button>

                  <button
                    onClick={() => {
                      setInputGroupName('【计卓261】官方班级通知群');
                      setInputSender('生活委员');
                      setInputContent('大家注意，今天下午宿管巡查宿舍卫生，请离开宿舍时关好门窗拔掉插座，保持桌面整洁。');
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border text-left cursor-pointer transition-all"
                  >
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span>🧹 模拟知悉型温馨提示 (测试过滤)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">纯知悉要求，无需生成专门待办</div>
                  </button>
                </div>
              </div>

              {/* Input Form */}
              <div className="space-y-3 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">来源群聊名称</label>
                    <input
                      type="text"
                      value={inputGroupName}
                      onChange={e => setInputGroupName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">发送人姓名/角色</label>
                    <input
                      type="text"
                      value={inputSender}
                      onChange={e => setInputSender(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    群消息文本内容（可直接粘贴 QQ/微信/企业微信 消息）
                  </label>
                  <textarea
                    rows={4}
                    value={inputContent}
                    onChange={e => setInputContent(e.target.value)}
                    placeholder="例如：@全员 请各位同学在明天下午18:00前在问卷星提交高等数学课后习题反馈表..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-indigo-500 leading-relaxed font-medium"
                  />
                </div>

                <button
                  onClick={handleManualIngest}
                  disabled={isAnalyzing || !inputContent.trim()}
                  className="w-full py-3 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? '大模型正在深度提取待办要素...' : '立即调用 AI 进行结构化提取'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Rules & Chat Groups */}
          {activeTab === 'rules' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Bound Groups List */}
              <div className="space-y-3">
                <div className="text-xs font-black text-slate-700 uppercase flex items-center justify-between">
                  <span>已绑定的群聊来源平台 ({chatGroups.length})</span>
                  <span className="text-[10px] text-slate-400">本地私密存储 · 数据不离设备</span>
                </div>

                <div className="space-y-2">
                  {chatGroups.map(group => (
                    <div
                      key={group.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-[11px] ${
                          group.platform === 'wechat' ? 'bg-emerald-600' : group.platform === 'qq' ? 'bg-blue-600' : 'bg-indigo-600'
                        }`}>
                          {group.platform === 'wechat' ? '微信' : group.platform === 'qq' ? 'QQ' : '企微'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{group.group_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">成员 {group.member_count} 人 · 实时监听中</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        运行正常
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* False Positive Rules List */}
              <div className="space-y-3">
                <div className="text-xs font-black text-slate-700 uppercase">
                  防误判与偏好学习过滤规则表 ({rules.length})
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuleKeyword}
                    onChange={e => setNewRuleKeyword(e.target.value)}
                    placeholder="输入要自动过滤的关键词（例如：拼车、奶茶、打牌）"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-indigo-500 font-medium"
                  />
                  <button
                    onClick={handleAddCustomRule}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 cursor-pointer transition-all"
                  >
                    添加规则
                  </button>
                </div>

                <div className="space-y-2">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            rule.rule_type === 'exclude_keyword' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {rule.rule_type === 'exclude_keyword' ? '排除关键词' : '待办触发词'}
                          </span>
                          <span className="font-bold text-slate-900 font-mono">"{rule.keyword}"</span>
                        </div>
                        {rule.description && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{rule.description}</div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                        title="删除规则"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            💡 提示：AI 提取结果会经过二次置信度校验与去重过滤，确认无误可一键同步至系统待办中心。
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer self-end sm:self-auto"
          >
            完成并关闭
          </button>
        </div>

      </div>
    </div>
  );
};

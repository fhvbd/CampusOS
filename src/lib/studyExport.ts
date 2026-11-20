import { jsPDF } from 'jspdf';
import { UserProfile, Task } from '../types';
import { PomodoroHistoryService, PomodoroHistoryRecord, getRecordEfficiencyScore, getEfficiencyRating } from '../services/pomodoroHistory';
import { calculateLevelInfo } from './levelSystem';

export interface StudyExportItem {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  subject: string;
  durationMinutes: number;
  xpEarned: number;
  completedTasks: string[];
  efficiencyScore: number;
  ratingLabel: string;
  type: 'pomodoro_session' | 'task_completion';
  notes?: string;
}

export interface StudyExportSummary {
  totalFocusMinutes: number;
  totalFocusHours: string;
  totalXpGains: number;
  completedTasksCount: number;
  averageEfficiency: number;
  totalRecordsCount: number;
  dateRangeLabel: string;
}

/**
 * Aggregate all study session data (Pomodoro focus sessions + completed tasks)
 */
export function getAggregatedStudyData(
  tasks: Task[] = [],
  range: '7days' | '30days' | 'all' = '30days'
): { items: StudyExportItem[]; summary: StudyExportSummary } {
  const now = new Date();
  const cutoff = new Date();
  if (range === '7days') {
    cutoff.setDate(now.getDate() - 7);
  } else if (range === '30days') {
    cutoff.setDate(now.getDate() - 30);
  } else {
    cutoff.setFullYear(2020, 0, 1);
  }

  const rawHistory: PomodoroHistoryRecord[] = PomodoroHistoryService.getHistory();
  const items: StudyExportItem[] = [];

  // 1. Process Pomodoro focus history sessions
  for (const rec of rawHistory) {
    const recDate = new Date(rec.date);
    if (range !== 'all' && recDate < cutoff) continue;

    const effScore = getRecordEfficiencyScore(rec);
    const rating = getEfficiencyRating(effScore);
    // Standard XP for a focus session: 50 base + 2 XP per minute + bonus for tasks
    const xp = Math.round(30 + rec.durationMinutes * 1.5 + (rec.completedTasks?.length || 0) * 20);

    items.push({
      id: rec.id,
      date: rec.date,
      time: rec.time || '12:00',
      subject: rec.subject || '自习深度专注',
      durationMinutes: rec.durationMinutes || 25,
      xpEarned: xp,
      completedTasks: rec.completedTasks || [],
      efficiencyScore: effScore,
      ratingLabel: rating.label,
      type: 'pomodoro_session',
      notes: rec.summaryText || rec.aiEncouragement || '',
    });
  }

  // 2. Process completed tasks that may not have pomodoro sessions
  for (const task of tasks) {
    if (!task.is_completed) continue;
    const taskDateStr = task.deadline?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const taskDate = new Date(taskDateStr);
    if (range !== 'all' && taskDate < cutoff) continue;

    // Check if task is already mentioned in pomodoro completedTasks to avoid double-counting
    const alreadyIncluded = items.some(it => 
      it.completedTasks.some(ct => ct.includes(task.title.slice(0, 12)))
    );

    if (!alreadyIncluded) {
      const taskXp = task.priority === 'high' ? 80 : task.priority === 'medium' ? 60 : 40;
      const estimatedMins = (task.estimated_hours || 1) * 45;

      items.push({
        id: `task_${task.id}`,
        date: taskDateStr,
        time: task.deadline?.slice(11, 16) || '18:00',
        subject: task.course_name ? `[${task.course_name}] ${task.title}` : task.title,
        durationMinutes: estimatedMins,
        xpEarned: taskXp,
        completedTasks: [task.title],
        efficiencyScore: task.priority === 'high' ? 92 : 86,
        ratingLabel: task.priority === 'high' ? '极佳攻坚 (Peak)' : '沉浸完成 (Good)',
        type: 'task_completion',
        notes: task.notes || '独立攻坚完成待办',
      });
    }
  }

  // Sort descending by date and time
  items.sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return b.time.localeCompare(a.time);
  });

  // Calculate summary stats
  const totalFocusMinutes = items.reduce((sum, it) => sum + it.durationMinutes, 0);
  const totalXpGains = items.reduce((sum, it) => sum + it.xpEarned, 0);
  
  const allCompletedTaskTitles = new Set<string>();
  items.forEach(it => {
    it.completedTasks.forEach(t => allCompletedTaskTitles.add(t));
  });
  const completedTasksCount = Math.max(allCompletedTaskTitles.size, items.filter(i => i.completedTasks.length > 0).length);

  const avgEff = items.length > 0 
    ? Math.round(items.reduce((sum, it) => sum + it.efficiencyScore, 0) / items.length)
    : 85;

  const summary: StudyExportSummary = {
    totalFocusMinutes,
    totalFocusHours: (totalFocusMinutes / 60).toFixed(1),
    totalXpGains,
    completedTasksCount,
    averageEfficiency: avgEff,
    totalRecordsCount: items.length,
    dateRangeLabel: range === '7days' ? '最近 7 天' : range === '30days' ? '最近 30 天' : '本学期全部记录',
  };

  return { items, summary };
}

/**
 * Export study session data as a CSV file with UTF-8 BOM
 */
export function exportStudyDataToCsv(
  items: StudyExportItem[],
  summary: StudyExportSummary,
  user?: UserProfile,
  filenamePrefix: string = 'CampusOS_学业专注与待办记录'
): void {
  const headers = [
    '记录序号',
    '日期',
    '时间',
    '学习科目 / 待办任务',
    '专注时长(分钟)',
    '获得经验(XP)',
    '已完成待办项',
    '心流效率评分',
    '心流状态评级',
    '记录类别',
    '学习复盘与心得'
  ];

  const rows = items.map((item, idx) => {
    const cleanSubject = `"${(item.subject || '').replace(/"/g, '""')}"`;
    const cleanCompleted = `"${(item.completedTasks.join('; ') || '').replace(/"/g, '""')}"`;
    const cleanNotes = `"${(item.notes || '').replace(/"/g, '""')}"`;
    const typeLabel = item.type === 'pomodoro_session' ? '番茄钟专注' : '独立待办攻坚';

    return [
      idx + 1,
      item.date,
      item.time,
      cleanSubject,
      item.durationMinutes,
      item.xpEarned,
      cleanCompleted,
      item.efficiencyScore,
      `"${item.ratingLabel}"`,
      `"${typeLabel}"`,
      cleanNotes
    ].join(',');
  });

  // Summary header block in CSV
  const summaryBlock = [
    `# CampusOS 智能校园操作系统 - 学业自习专注与待办完成度归档`,
    `# 导出学生: ${user?.username || '学生'} (学号: ${user?.student_id || '-'}) | 统计区间: ${summary.dateRangeLabel}`,
    `# 累计专注时长: ${summary.totalFocusMinutes} 分钟 (${summary.totalFocusHours} 小时) | 累计XP: +${summary.totalXpGains} XP | 攻坚待办: ${summary.completedTasksCount} 项 | 平均心流评分: ${summary.averageEfficiency} 分`,
    `# 导出时间: ${new Date().toLocaleString('zh-CN')}`,
    ''
  ].join('\r\n');

  const csvContent = summaryBlock + '\r\n' + headers.join(',') + '\r\n' + rows.join('\r\n');
  
  // Prepend UTF-8 BOM (\uFEFF) so Excel opens Chinese text correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.download = `${filenamePrefix}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export study session data as a high-fidelity PDF transcript report using Canvas + jsPDF
 */
export async function exportStudyDataToPdf(
  items: StudyExportItem[],
  summary: StudyExportSummary,
  user?: UserProfile,
  filenamePrefix: string = 'CampusOS_学业专注报告'
): Promise<void> {
  // Use high-resolution HTML5 Canvas to render full Chinese fonts crisply
  const canvas = document.createElement('canvas');
  const width = 1600;
  const height = 2260; // 1 : 1.4125 A4 proportion
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D rendering context not available');
  }

  // 1. Background (Pure clean paper gradient with subtle blue tint)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Decorative soft top accent gradient
  const topGrad = ctx.createLinearGradient(0, 0, width, 0);
  topGrad.addColorStop(0, '#2563eb');
  topGrad.addColorStop(0.5, '#4f46e5');
  topGrad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 18);

  // 2. Header Area
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(60, 48, width - 120, 160, 24);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Logo Badge
  const badgeGrad = ctx.createLinearGradient(90, 80, 160, 150);
  badgeGrad.addColorStop(0, '#3b82f6');
  badgeGrad.addColorStop(1, '#6366f1');
  ctx.fillStyle = badgeGrad;
  ctx.beginPath();
  ctx.roundRect(90, 78, 90, 90, 20);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OS', 135, 136);

  // Title & Subtitle
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('CampusOS 学业专注与待办攻坚归档报告', 205, 115);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 20px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('Academic Study Sessions & Productivity Transcript · 个人学业自律档案', 205, 152);

  // Timestamp badge on top-right
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(width - 440, 80, 350, 44, 12);
  ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  const exportDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  ctx.fillText(`归档生成日期：${exportDate}`, width - 265, 108);

  // 3. Student Profile Info Strip
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(60, 230, width - 120, 110, 20);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const levelInfo = calculateLevelInfo(user?.xp ?? 220);
  const studentMeta = [
    { label: '学生姓名', value: user?.username || '演示同学' },
    { label: '学号', value: user?.student_id || '2024010888' },
    { label: '专业班级', value: `${user?.major || '计算机科学与技术'} · ${user?.class_name || '2401班'}` },
    { label: '当前等级', value: `Lv.${levelInfo.level} ${levelInfo.title}` },
    { label: '统计区间', value: summary.dateRangeLabel }
  ];

  ctx.textAlign = 'left';
  const metaColWidth = (width - 160) / studentMeta.length;
  studentMeta.forEach((item, i) => {
    const x = 90 + i * metaColWidth;
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(item.label, x, 268);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(item.value, x, 305);
  });

  // 4. Summary KPI 4-Cubes Block
  const kpiItems = [
    { label: '累计自习专注时长', value: `${summary.totalFocusMinutes} 分钟`, sub: `约合 ${summary.totalFocusHours} 深度学时`, color: '#2563eb', bg: '#eff6ff' },
    { label: '累计获得学业 XP', value: `+${summary.totalXpGains} XP`, sub: `已达到 Lv.${levelInfo.level} 晋升要求`, color: '#d97706', bg: '#fffbeb' },
    { label: '攻坚完成待办项', value: `${summary.completedTasksCount} 项`, sub: '全科目课业及个人自律', color: '#059669', bg: '#ecfdf5' },
    { label: '平均心流效率得分', value: `${summary.averageEfficiency} 分`, sub: summary.averageEfficiency >= 88 ? '高能专注沉浸 (Optimal)' : '良好自习状态 (Good)', color: '#7c3aed', bg: '#f5f3ff' }
  ];

  const kpiBoxWidth = (width - 120 - 3 * 24) / 4;
  kpiItems.forEach((kpi, idx) => {
    const x = 60 + idx * (kpiBoxWidth + 24);
    const y = 360;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x, y, kpiBoxWidth, 140, 20);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top indicator pill
    ctx.fillStyle = kpi.bg;
    ctx.beginPath();
    ctx.roundRect(x + 16, y + 16, kpiBoxWidth - 32, 28, 8);
    ctx.fill();

    ctx.fillStyle = kpi.color;
    ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(kpi.label, x + 26, y + 36);

    // Big Value
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(kpi.value, x + 20, y + 94);

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '500 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(kpi.sub, x + 20, y + 124);
  });

  // 5. Table Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('学业自习专注与攻坚明细记录清单', 60, 545);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`共 ${items.length} 条记录`, width - 60, 545);
  ctx.textAlign = 'left';

  // Table Container
  const tableTop = 565;
  const tableHeight = 1540;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(60, tableTop, width - 120, tableHeight, 20);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Table Header Row
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(61, tableTop + 1, width - 122, 54, 20);
  ctx.fill();
  ctx.fillRect(61, tableTop + 30, width - 122, 25); // square bottom

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('日期与时间', 90, tableTop + 34);
  ctx.fillText('学习科目 / 攻坚任务', 300, tableTop + 34);
  ctx.fillText('时长', 840, tableTop + 34);
  ctx.fillText('获得 XP', 960, tableTop + 34);
  ctx.fillText('完成待办项', 1100, tableTop + 34);
  ctx.fillText('效率评分', 1390, tableTop + 34);

  // Render Rows (up to top 24 records that fit on standard page)
  const displayItems = items.slice(0, 23);
  const rowHeight = 60;
  displayItems.forEach((item, rIdx) => {
    const y = tableTop + 55 + rIdx * rowHeight;

    // Zebra striping
    if (rIdx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(62, y, width - 124, rowHeight);
    }

    // Row bottom separator line
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, y + rowHeight);
    ctx.lineTo(width - 80, y + rowHeight);
    ctx.stroke();

    // Col 1: Date & Time
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(item.date, 90, y + 36);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(item.time, 195, y + 36);

    // Col 2: Subject / Task (truncated safely)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    const cleanSub = item.subject.length > 26 ? item.subject.slice(0, 25) + '...' : item.subject;
    ctx.fillText(cleanSub, 300, y + 36);

    // Col 3: Duration
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`${item.durationMinutes} min`, 840, y + 36);

    // Col 4: XP
    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`+${item.xpEarned} XP`, 960, y + 36);

    // Col 5: Completed Tasks (truncated)
    ctx.fillStyle = '#475569';
    ctx.font = '500 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    const taskSummary = item.completedTasks.length > 0
      ? (item.completedTasks[0].length > 15 ? item.completedTasks[0].slice(0, 14) + '...' : item.completedTasks[0])
      : '-';
    ctx.fillText(taskSummary, 1100, y + 36);

    // Col 6: Efficiency Pill
    const effX = 1390;
    const isPeak = item.efficiencyScore >= 90;
    ctx.fillStyle = isPeak ? '#ecfdf5' : '#f5f3ff';
    ctx.beginPath();
    ctx.roundRect(effX, y + 16, 95, 28, 8);
    ctx.fill();

    ctx.fillStyle = isPeak ? '#059669' : '#7c3aed';
    ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`${item.efficiencyScore} 分`, effX + 22, y + 36);
  });

  // If there are more items, show hint
  if (items.length > displayItems.length) {
    const hintY = tableTop + 55 + displayItems.length * rowHeight + 25;
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`注：报告展示前 ${displayItems.length} 项典型记录。全部 ${items.length} 项详尽数据可通过 CSV 导出完整查阅。`, width / 2, hintY);
    ctx.textAlign = 'left';
  }

  // 6. Footer & Certification Stamp
  const footerY = height - 80;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, footerY);
  ctx.lineTo(width - 60, footerY);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 14px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('CampusOS 智能校园操作系统 · 学业自律与专注成长数字化凭证 (Official Student Productivity Record)', 60, footerY + 36);

  ctx.textAlign = 'right';
  ctx.fillText('Page 1 of 1 · Verified by CampusOS Local Engine', width - 60, footerY + 36);

  // Convert canvas to image and build PDF
  const imgData = canvas.toDataURL('image/png', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // A4 dimensions: 210 x 297 mm
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  pdf.save(`${filenamePrefix}_${dateStr}.pdf`);
}

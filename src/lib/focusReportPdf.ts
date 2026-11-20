import { jsPDF } from 'jspdf';
import { SubTask, TaskPriority } from '../types';

export interface DailyFocusReportRow {
  dateKey: string;
  label: string;
  fullDate: string;
  minutes: number;
  sessions: number;
  isToday: boolean;
}

export interface TaskFocusReportPayload {
  taskTitle: string;
  courseName?: string;
  priority?: TaskPriority;
  deadline?: string;
  isCompleted?: boolean;
  totalMinutes: number;
  totalSessions: number;
  dailyAverage: number;
  dailyData: DailyFocusReportRow[];
  subtasks?: SubTask[];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 0 && ctx.measureText(clipped + '...').width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '...';
}

export async function generateTaskFocusReportPdf(payload: TaskFocusReportPayload): Promise<void> {
  // Create a 2x Retina A4 canvas (1588 x 2246 px -> 794 x 1123 logical px)
  const scale = 2;
  const pageWidth = 794;
  const pageHeight = 1123;

  const canvas = document.createElement('canvas');
  canvas.width = pageWidth * scale;
  canvas.height = pageHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.scale(scale, scale);

  const fontSans = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif';
  const fontMono = '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';

  // 1. Page Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, pageWidth, pageHeight);

  // 2. Top Header Banner
  const headerGrad = ctx.createLinearGradient(0, 0, pageWidth, 148);
  headerGrad.addColorStop(0, '#312E81');
  headerGrad.addColorStop(0.55, '#4338CA');
  headerGrad.addColorStop(1, '#2563EB');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, pageWidth, 148);

  // Header Kicker
  ctx.fillStyle = '#C7D2FE';
  ctx.font = `bold 12px ${fontSans}`;
  ctx.fillText('CAMPUS OS · 7-DAY TASK FOCUS ANALYTICS REPORT', 48, 42);

  // Report Main Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 24px ${fontSans}`;
  const cleanTitle = (payload.taskTitle || '未命名学业待办').trim();
  ctx.fillText(truncateText(ctx, `专项专注学习报告：${cleanTitle}`, pageWidth - 96), 48, 80);

  // Metadata Subtitle Row
  const priorityLabel =
    payload.priority === 'high' ? '高优先级 (High)' : payload.priority === 'low' ? '低优先级 (Low)' : '普通优先级 (Medium)';
  const statusLabel = payload.isCompleted ? '已完成 (Completed)' : '进行中 (In Progress)';
  const courseLabel = payload.courseName ? `关联课程：${payload.courseName}` : '关联分类：学业专项待办';
  const deadlineLabel = payload.deadline ? `截止时间：${payload.deadline}` : '截止时间：未设定';

  ctx.fillStyle = '#E0E7FF';
  ctx.font = `600 12px ${fontSans}`;
  ctx.fillText(
    truncateText(
      ctx,
      `${courseLabel}   ·   优先级：${priorityLabel}   ·   状态：${statusLabel}   ·   ${deadlineLabel}`,
      pageWidth - 96
    ),
    48,
    114
  );

  // 3. Section 1: 7-Day KPI Summary Cards
  let cursorY = 176;
  ctx.fillStyle = '#0F172A';
  ctx.font = `900 15px ${fontSans}`;
  ctx.fillText('一、近 7 日专注效能总览 (7-Day Focus KPIs)', 48, cursorY);

  cursorY += 16;
  const activeDaysCount = payload.dailyData.filter(d => d.minutes > 0).length;
  const kpiItems = [
    { label: '近 7 日累计时长', value: `${payload.totalMinutes} 分钟`, sub: `约 ${(payload.totalMinutes / 60).toFixed(1)} 学时`, accent: '#4F46E5' },
    { label: '完成番茄学程', value: `${payload.totalSessions} 次`, sub: '完整专注打卡', accent: '#0EA5E9' },
    { label: '日均专注投入', value: `${payload.dailyAverage} 分钟/天`, sub: '近 7 日均值', accent: '#10B981' },
    { label: '活跃专注天数', value: `${activeDaysCount} / 7 天`, sub: `出勤率 ${Math.round((activeDaysCount / 7) * 100)}%`, accent: '#F59E0B' },
  ];

  const cardGap = 14;
  const cardWidth = (pageWidth - 96 - cardGap * 3) / 4;
  const cardHeight = 92;

  kpiItems.forEach((item, idx) => {
    const x = 48 + idx * (cardWidth + cardGap);
    drawRoundedRect(ctx, x, cursorY, cardWidth, cardHeight, 12);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    // Top accent bar
    drawRoundedRect(ctx, x, cursorY, cardWidth, 4, 2);
    ctx.fillStyle = item.accent;
    ctx.fill();

    // Label
    ctx.fillStyle = '#64748B';
    ctx.font = `bold 11px ${fontSans}`;
    ctx.fillText(item.label, x + 14, cursorY + 26);

    // Value
    ctx.fillStyle = '#0F172A';
    ctx.font = `900 20px ${fontMono}`;
    ctx.fillText(item.value, x + 14, cursorY + 56);

    // Sub
    ctx.fillStyle = '#94A3B8';
    ctx.font = `600 10px ${fontSans}`;
    ctx.fillText(item.sub, x + 14, cursorY + 76);
  });

  // 4. Section 2: 7-Day Daily Breakdown Table & Visual Progress Bars
  cursorY += cardHeight + 34;
  ctx.fillStyle = '#0F172A';
  ctx.font = `900 15px ${fontSans}`;
  ctx.fillText('二、近 7 日每日专注时长明细 (Daily Focus Breakdown)', 48, cursorY);

  cursorY += 14;
  const tableWidth = pageWidth - 96;
  const rowHeight = 38;
  const tableHeight = rowHeight * (payload.dailyData.length + 1);

  drawRoundedRect(ctx, 48, cursorY, tableWidth, tableHeight, 12);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  // Table Header Row
  drawRoundedRect(ctx, 48, cursorY, tableWidth, rowHeight, 12);
  ctx.fillStyle = '#F1F5F9';
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.font = `bold 11px ${fontSans}`;
  ctx.fillText('日期 (Date)', 68, cursorY + 24);
  ctx.fillText('专注次数 (Sessions)', 230, cursorY + 24);
  ctx.fillText('专注时长 (Minutes)', 365, cursorY + 24);
  ctx.fillText('时长占比分布 (Visual Distribution)', 500, cursorY + 24);

  const maxDayMinutes = Math.max(30, ...payload.dailyData.map(d => d.minutes));

  payload.dailyData.forEach((row, idx) => {
    const rowY = cursorY + (idx + 1) * rowHeight;

    // Alternating row tint
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(49, rowY, tableWidth - 2, rowHeight - (idx === payload.dailyData.length - 1 ? 6 : 0));
    }

    // Row divider line
    ctx.beginPath();
    ctx.moveTo(48, rowY);
    ctx.lineTo(48 + tableWidth, rowY);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Date cell
    ctx.fillStyle = row.isToday ? '#4F46E5' : '#1E293B';
    ctx.font = `${row.isToday ? '900' : '600'} 12px ${fontSans}`;
    ctx.fillText(`${row.fullDate}${row.isToday ? ' [今日]' : ''}`, 68, rowY + 24);

    // Sessions cell
    ctx.fillStyle = row.sessions > 0 ? '#0F172A' : '#94A3B8';
    ctx.font = `bold 12px ${fontMono}`;
    ctx.fillText(`${row.sessions} 次`, 230, rowY + 24);

    // Minutes cell
    ctx.fillStyle = row.minutes > 0 ? '#0F172A' : '#94A3B8';
    ctx.font = `bold 12px ${fontMono}`;
    ctx.fillText(`${row.minutes} min`, 365, rowY + 24);

    // Visual Bar cell
    const barX = 500;
    const barY = rowY + 13;
    const barMaxW = 215;
    const barH = 12;

    drawRoundedRect(ctx, barX, barY, barMaxW, barH, 6);
    ctx.fillStyle = '#E2E8F0';
    ctx.fill();

    if (row.minutes > 0) {
      const fillW = Math.max(12, Math.min(barMaxW, (row.minutes / maxDayMinutes) * barMaxW));
      drawRoundedRect(ctx, barX, barY, fillW, barH, 6);
      ctx.fillStyle = row.isToday ? '#10B981' : '#4F46E5';
      ctx.fill();
    }
  });

  // 5. Section 3: Subtasks Execution Breakdown
  cursorY += tableHeight + 34;
  const subtasks = payload.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.is_completed).length;

  ctx.fillStyle = '#0F172A';
  ctx.font = `900 15px ${fontSans}`;
  ctx.fillText(
    `三、子任务拆解与执行步骤 (${subtasks.length > 0 ? `已完成 ${completedSubtasks}/${subtasks.length}` : '无拆解步骤'})`,
    48,
    cursorY
  );

  cursorY += 14;
  const maxSubtasksToShow = Math.min(subtasks.length, 6);
  const subtaskBoxHeight = subtasks.length === 0 ? 58 : Math.max(58, maxSubtasksToShow * 34 + 20);

  drawRoundedRect(ctx, 48, cursorY, tableWidth, subtaskBoxHeight, 12);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  if (subtasks.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = `600 12px ${fontSans}`;
    ctx.fillText('当前待办暂未拆分子步骤，所有专注学程均直接计入主任务。', 68, cursorY + 34);
  } else {
    subtasks.slice(0, maxSubtasksToShow).forEach((st, idx) => {
      const itemY = cursorY + 14 + idx * 34;

      // Status badge circle/box
      drawRoundedRect(ctx, 68, itemY + 4, 18, 18, 5);
      ctx.fillStyle = st.is_completed ? '#10B981' : '#F1F5F9';
      ctx.fill();
      ctx.strokeStyle = st.is_completed ? '#059669' : '#CBD5E1';
      ctx.stroke();

      if (st.is_completed) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 11px ${fontSans}`;
        ctx.fillText('✓', 73, itemY + 17);
      }

      ctx.fillStyle = st.is_completed ? '#64748B' : '#1E293B';
      ctx.font = `600 12px ${fontSans}`;
      const stText = truncateText(ctx, st.title, tableWidth - 160);
      ctx.fillText(stText, 96, itemY + 18);

      ctx.fillStyle = st.is_completed ? '#059669' : '#6366F1';
      ctx.font = `bold 11px ${fontSans}`;
      ctx.fillText(st.is_completed ? '已完结' : '待执行', 48 + tableWidth - 64, itemY + 18);
    });
  }

  // 6. Footer Timestamp & Signature
  const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });
  ctx.fillStyle = '#94A3B8';
  ctx.font = `600 11px ${fontSans}`;
  ctx.fillText(`报告生成时间：${nowStr}   ·   由 CampusOS 智能校园学习专注引擎自动统计导出`, 48, pageHeight - 32);

  // 7. Convert Canvas to PDF and trigger download
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

  const safeTitle = cleanTitle.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 20) || 'Task';
  const dateSuffix = new Date().toISOString().split('T')[0];
  pdf.save(`CampusOS_Focus_Report_${safeTitle}_${dateSuffix}.pdf`);
}

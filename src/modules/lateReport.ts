import { ExtendedContext, permissionMiddleware } from '@/bot/middleware';
import { Bot, InlineKeyboard } from 'grammy';
import { 
  detectLateKeywords, 
  extractLateReason, 
  getTaiwanTime, 
  isBeforeNineAM, 
  formatTaiwanTime 
} from '@/utils';

export function setupLateReportModule(bot: Bot<ExtendedContext>) {
  // 處理所有文字訊息，檢測遲到關鍵字
  bot.on('message:text', async (ctx) => {
    // 只在群組中處理，且群組必須啟用遲到回報功能
    if (!ctx.botContext.isGroup || !ctx.group?.is_active) {
      return;
    }

    // 檢查群組是否啟用遲到回報功能
    const hasPermission = await ctx.db.hasGroupPermission(ctx.group.id, 'late_report');
    if (!hasPermission) {
      return;
    }

    const messageText = ctx.message.text;
    const isLateMessage = detectLateKeywords(messageText);

    if (!isLateMessage) {
      return;
    }

    // 獲取用戶和時間資訊
    const user = ctx.user;
    if (!user) {
      return;
    }

    const reportTime = getTaiwanTime();
    const isBeforeNine = isBeforeNineAM(reportTime);
    const reason = extractLateReason(messageText);

    try {
      // 創建遲到回報記錄
      const lateReport = await ctx.db.createLateReport({
        user_id: user.id,
        group_id: ctx.group.id,
        employee_name: user.display_name || user.first_name || `用戶${user.telegram_id.slice(-4)}`,
        is_before_nine: isBeforeNine,
        report_time: reportTime.toISOString(),
        reason: reason || messageText,
        status: 'pending'
      });

      // 向用戶確認遲到回報
      let confirmMessage = '⏰ **遲到回報確認**\n\n';
      confirmMessage += `👤 員工姓名: ${lateReport.employee_name}\n`;
      confirmMessage += `📅 回報時間: ${formatTaiwanTime(reportTime)}\n`;
      confirmMessage += `⏰ 09:00前通知: ${isBeforeNine ? '✅ 是' : '❌ 否'}\n`;
      confirmMessage += `📝 原因說明: ${reason || '無具體說明'}\n\n`;
      
      if (!reason || reason.length < 10) {
        confirmMessage += '❓ **系統需要更詳細的遲到原因**\n';
        confirmMessage += '請選擇下方選項或回覆更詳細的說明：';
      } else {
        confirmMessage += '✅ **系統已記錄您的遲到回報**\n';
        confirmMessage += '管理員將收到通知，請確認資訊是否正確：';
      }

      const keyboard = new InlineKeyboard();

      if (!reason || reason.length < 10) {
        // 提供常見遲到原因選項
        keyboard.text('🚗 交通問題', `late_reason_${lateReport.id}_traffic`)
          .text('🏥 身體不適', `late_reason_${lateReport.id}_health`).row();
        keyboard.text('🏠 家庭事務', `late_reason_${lateReport.id}_family`)
          .text('⚠️ 緊急事件', `late_reason_${lateReport.id}_emergency`).row();
        keyboard.text('😴 睡過頭', `late_reason_${lateReport.id}_overslept`)
          .text('📝 其他原因', `late_reason_${lateReport.id}_other`).row();
      } else {
        keyboard.text('✅ 確認送出', `confirm_late_${lateReport.id}`)
          .text('✏️ 修改原因', `edit_reason_${lateReport.id}`).row();
      }
      
      keyboard.text('❌ 取消回報', `cancel_late_${lateReport.id}`).row();

      await ctx.reply(confirmMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      });

      await ctx.logger.info('檢測到遲到回報', user.telegram_id, ctx.group.telegram_id, {
        employee_name: lateReport.employee_name,
        is_before_nine: isBeforeNine,
        has_reason: !!reason,
        report_id: lateReport.id
      });

    } catch (error) {
      await ctx.logger.error('處理遲到回報失敗', user?.telegram_id, ctx.group?.telegram_id, { error });
    }
  });

  // 處理遲到原因選擇
  bot.callbackQuery(/^late_reason_(\d+)_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const reportId = parseInt(ctx.match[1]);
    const reasonType = ctx.match[2];

    try {
      // 獲取遲到回報
      const report = await ctx.db.db.prepare('SELECT * FROM late_reports WHERE id = ?').bind(reportId).first() as any;
      if (!report) {
        return ctx.editMessageText('❌ 找不到對應的遲到回報記錄');
      }

      let reasonText = '';
      switch (reasonType) {
        case 'traffic':
          reasonText = '交通問題（塞車、公車延誤、交通意外等）';
          break;
        case 'health':
          reasonText = '身體不適（感冒、頭痛、身體不舒服等）';
          break;
        case 'family':
          reasonText = '家庭事務（照顧家人、家中突發狀況等）';
          break;
        case 'emergency':
          reasonText = '緊急事件（突發狀況需要處理）';
          break;
        case 'overslept':
          reasonText = '睡過頭（鬧鐘沒響、晚睡導致起晚等）';
          break;
        case 'other':
          // 等待用戶輸入自訂原因
          await ctx.editMessageText(
            '📝 **請回覆此訊息說明遲到原因**\n\n' +
            '範例：「因為小孩突然發燒需要送醫」\n' +
            '請盡量詳細說明，以便管理員了解狀況。',
            { 
              parse_mode: 'Markdown',
              reply_markup: new InlineKeyboard().text('❌ 取消', `cancel_late_${reportId}`) 
            }
          );

          // 設定等待用戶輸入狀態
          await ctx.db.db.prepare(`
            INSERT OR REPLACE INTO settings (key, value) 
            VALUES (?, ?)
          `).bind(`waiting_late_reason_${ctx.user?.telegram_id}`, reportId.toString()).run();

          return;
      }

      // 更新遲到回報原因
      await ctx.db.updateLateReport(reportId, { reason: reasonText });

      // 顯示確認頁面
      let message = '⏰ **遲到回報已更新**\n\n';
      message += `👤 員工姓名: ${report.employee_name}\n`;
      message += `📅 回報時間: ${formatTaiwanTime(new Date(report.report_time))}\n`;
      message += `⏰ 09:00前通知: ${report.is_before_nine ? '✅ 是' : '❌ 否'}\n`;
      message += `📝 遲到原因: ${reasonText}\n\n`;
      message += '請確認資訊是否正確：';

      const keyboard = new InlineKeyboard()
        .text('✅ 確認送出', `confirm_late_${reportId}`)
        .text('✏️ 重新選擇', `edit_reason_${reportId}`).row()
        .text('❌ 取消回報', `cancel_late_${reportId}`).row();

      await ctx.editMessageText(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      });

    } catch (error) {
      await ctx.editMessageText('❌ 更新遲到原因失敗');
      await ctx.logger.error('更新遲到原因失敗', ctx.user?.telegram_id, undefined, { error, reportId });
    }
  });

  // 確認遲到回報
  bot.callbackQuery(/^confirm_late_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('✅ 遲到回報已送出');
    
    const reportId = parseInt(ctx.match[1]);

    try {
      // 獲取完整的遲到回報資訊
      const report = await ctx.db.db.prepare(`
        SELECT lr.*, u.display_name as user_name, g.title as group_title
        FROM late_reports lr
        JOIN users u ON lr.user_id = u.id
        JOIN groups g ON lr.group_id = g.id
        WHERE lr.id = ?
      `).bind(reportId).first() as any;

      if (!report) {
        return ctx.editMessageText('❌ 找不到對應的遲到回報記錄');
      }

      // 更新回報狀態為已處理
      await ctx.db.updateLateReport(reportId, { 
        status: 'processed',
        admin_notified: true 
      });

      // 組織管理員通知訊息
      let adminMessage = '⏰ **遲到回報通知**\n\n';
      adminMessage += `**員工資訊**\n`;
      adminMessage += `👤 員工姓名: ${report.employee_name}\n`;
      adminMessage += `🆔 用戶 ID: \`${report.user_name}\`\n`;
      adminMessage += `👥 群組: ${report.group_title}\n\n`;
      
      adminMessage += `**回報詳情**\n`;
      adminMessage += `📅 回報時間: ${formatTaiwanTime(new Date(report.report_time))}\n`;
      adminMessage += `⏰ 09:00前通知: ${report.is_before_nine ? '✅ 是' : '❌ 否'}\n`;
      adminMessage += `📝 遲到原因: ${report.reason || '無具體說明'}\n\n`;
      
      adminMessage += `**系統資訊**\n`;
      adminMessage += `🆔 回報編號: ${reportId}\n`;
      adminMessage += `📊 處理狀態: 已確認\n`;
      adminMessage += `⏰ 通知時間: ${formatTaiwanTime(new Date())}`;

      // 發送給所有管理員
      const admins = await ctx.db.db.prepare(`
        SELECT telegram_id, display_name 
        FROM users 
        WHERE user_type IN ('superadmin', 'admin') AND is_active = 1
      `).all();

      let notifiedCount = 0;
      for (const admin of admins.results || []) {
        try {
          await ctx.api.sendMessage((admin as any).telegram_id, adminMessage, { 
            parse_mode: 'Markdown' 
          });
          notifiedCount++;
        } catch (error) {
          console.error(`Failed to notify admin ${(admin as any).telegram_id}:`, error);
        }
      }

      // 更新用戶確認訊息
      let successMessage = '✅ **遲到回報已成功送出**\n\n';
      successMessage += `📋 回報編號: ${reportId}\n`;
      successMessage += `👤 員工姓名: ${report.employee_name}\n`;
      successMessage += `📅 回報時間: ${formatTaiwanTime(new Date(report.report_time))}\n`;
      successMessage += `⏰ 09:00前通知: ${report.is_before_nine ? '✅ 是' : '❌ 否'}\n`;
      successMessage += `📝 遲到原因: ${report.reason}\n\n`;
      successMessage += `📧 已通知 ${notifiedCount} 位管理員\n`;
      successMessage += `⏰ 處理時間: ${formatTaiwanTime(new Date())}`;

      await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });

      await ctx.logger.info('遲到回報已確認送出', ctx.user?.telegram_id, report.group_title, {
        report_id: reportId,
        employee_name: report.employee_name,
        notified_admins: notifiedCount,
        is_before_nine: report.is_before_nine
      });

    } catch (error) {
      await ctx.editMessageText('❌ 送出遲到回報失敗');
      await ctx.logger.error('送出遲到回報失敗', ctx.user?.telegram_id, undefined, { error, reportId });
    }
  });

  // 取消遲到回報
  bot.callbackQuery(/^cancel_late_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('❌ 已取消遲到回報');
    
    const reportId = parseInt(ctx.match[1]);

    try {
      await ctx.db.updateLateReport(reportId, { status: 'cancelled' });
      
      await ctx.editMessageText('❌ 遲到回報已取消\n\n如需重新回報，請再次在群組中說明遲到情況');

      await ctx.logger.info('取消遲到回報', ctx.user?.telegram_id, ctx.group?.telegram_id, {
        report_id: reportId
      });

    } catch (error) {
      await ctx.editMessageText('❌ 取消遲到回報失敗');
      await ctx.logger.error('取消遲到回報失敗', ctx.user?.telegram_id, undefined, { error, reportId });
    }
  });

  // 處理自訂遲到原因輸入
  bot.on('message:text', async (ctx) => {
    if (!ctx.user) return;
    
    const waitingSetting = await ctx.db.getSetting(`waiting_late_reason_${ctx.user.telegram_id}`);
    if (!waitingSetting) return;
    
    const reportId = parseInt(waitingSetting);
    const customReason = ctx.message.text.trim();
    
    if (customReason.length < 5 || customReason.length > 200) {
      await ctx.reply('❌ 遲到原因長度必須在 5-200 字元之間，請重新輸入');
      return;
    }
    
    try {
      // 更新遲到回報原因
      await ctx.db.updateLateReport(reportId, { reason: customReason });
      
      // 清除等待狀態
      await ctx.db.db.prepare('DELETE FROM settings WHERE key = ?')
        .bind(`waiting_late_reason_${ctx.user.telegram_id}`).run();
      
      // 獲取更新後的回報資訊
      const report = await ctx.db.db.prepare('SELECT * FROM late_reports WHERE id = ?').bind(reportId).first() as any;
      
      let message = '✅ **遲到原因已更新**\n\n';
      message += `👤 員工姓名: ${report.employee_name}\n`;
      message += `📅 回報時間: ${formatTaiwanTime(new Date(report.report_time))}\n`;
      message += `⏰ 09:00前通知: ${report.is_before_nine ? '✅ 是' : '❌ 否'}\n`;
      message += `📝 遲到原因: ${customReason}\n\n`;
      message += '請確認資訊是否正確：';

      const keyboard = new InlineKeyboard()
        .text('✅ 確認送出', `confirm_late_${reportId}`)
        .text('✏️ 重新輸入', `edit_reason_${reportId}`).row()
        .text('❌ 取消回報', `cancel_late_${reportId}`).row();

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      });

      await ctx.logger.info('更新遲到原因', ctx.user.telegram_id, ctx.group?.telegram_id, {
        report_id: reportId,
        custom_reason: customReason
      });

    } catch (error) {
      await ctx.reply('❌ 更新遲到原因失敗，請重新嘗試');
      await ctx.logger.error('更新遲到原因失敗', ctx.user.telegram_id, undefined, { error, reportId });
    }
  });

  // 管理員查看遲到回報指令
  bot.command('late_reports', async (ctx) => {
    if (!ctx.botContext.isAdmin) {
      await ctx.reply('❌ 只有管理員可以查看遲到回報');
      return;
    }

    const args = ctx.message?.text?.split(' ');
    const limit = args && args[1] ? parseInt(args[1]) : 10;

    if (limit > 50) {
      await ctx.reply('❌ 最多只能查看 50 筆記錄');
      return;
    }

    try {
      const reports = await ctx.db.getLateReports(limit);
      
      if (reports.length === 0) {
        await ctx.reply('📝 目前沒有遲到回報記錄');
        return;
      }

      let message = `⏰ **最近 ${reports.length} 筆遲到回報**\n\n`;
      
      for (const report of reports) {
        const statusEmoji = report.status === 'processed' ? '✅' : 
                           report.status === 'cancelled' ? '❌' : '⏳';
        const timeEmoji = report.is_before_nine ? '✅' : '❌';
        
        message += `${statusEmoji} **${(report as any).user_name}** (${(report as any).group_title})\n`;
        message += `📅 ${formatTaiwanTime(new Date(report.report_time))}\n`;
        message += `⏰ 09:00前: ${timeEmoji} | 狀態: ${getStatusText(report.status)}\n`;
        message += `📝 原因: ${report.reason || '無說明'}\n\n`;
      }

      message += `\n📊 統計時間: ${formatTaiwanTime(new Date())}`;

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      await ctx.reply('❌ 獲取遲到回報失敗');
      await ctx.logger.error('獲取遲到回報失敗', ctx.user?.telegram_id, undefined, { error });
    }
  });
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': '⏳ 待處理',
    'processed': '✅ 已處理',
    'cancelled': '❌ 已取消'
  };
  return statusMap[status] || '❓ 未知狀態';
}
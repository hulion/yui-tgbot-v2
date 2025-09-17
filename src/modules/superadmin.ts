import { ExtendedContext, permissionMiddleware } from '@/bot/middleware';
import { Bot, InlineKeyboard } from 'grammy';
import { formatTaiwanTime, getEnvironment } from '@/utils';

export function setupSuperadminModule(bot: Bot<ExtendedContext>) {
  // 超級管理員主面板
  bot.command('superadmin', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 你沒有超級管理員權限');
      return;
    }

    let message = '🔧 **超級管理員面板**\n\n';
    message += `👤 管理員: ${ctx.user?.display_name}\n`;
    message += `🌐 環境: ${ctx.env.ENVIRONMENT}\n`;
    message += `⏰ 當前時間: ${formatTaiwanTime(new Date())}\n\n`;
    
    message += '**🛠️ 系統管理功能**\n';
    message += '• /env - 檢查系統環境\n';
    message += '• /stats - 系統統計資訊\n';
    message += '• /logs [數量] - 查看系統日誌\n';
    message += '• /users - 管理用戶\n';
    message += '• /groups - 管理群組\n\n';
    
    message += '**👥 用戶管理**\n';
    message += '• /promote [用戶ID] [權限] - 提升權限\n';
    message += '• /demote [用戶ID] - 降低權限\n';
    message += '• /ban [用戶ID] - 禁用用戶\n';
    message += '• /unban [用戶ID] - 解除禁用\n\n';
    
    message += '**🏢 群組管理**\n';
    message += '• /enable_group [群組ID] - 啟用群組\n';
    message += '• /disable_group [群組ID] - 停用群組\n';
    message += '• /group_modules [群組ID] - 設定群組功能\n\n';
    
    message += '**⚙️ 系統設定**\n';
    message += '• /set_welcome [訊息] - 設定歡迎訊息\n';
    message += '• /broadcast [訊息] - 廣播訊息';

    const keyboard = new InlineKeyboard()
      .text('📊 系統統計', 'admin_stats').text('📝 系統日誌', 'admin_logs').row()
      .text('👥 用戶管理', 'admin_users').text('🏢 群組管理', 'admin_groups').row()
      .text('⚙️ 系統設定', 'admin_settings').text('🔄 重新整理', 'admin_refresh').row();

    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard 
    });

    await ctx.logger.info('進入超級管理員面板', ctx.user?.telegram_id);
  });

  // 環境檢查
  bot.command('env', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 權限不足');
      return;
    }

    const environment = getEnvironment(ctx.env);
    
    let message = '🌐 **系統環境資訊**\n\n';
    message += `**當前環境:** ${environment === 'production' ? '🟢 正式環境' : '🟡 開發環境'}\n`;
    message += `**環境變數:** ${ctx.env.ENVIRONMENT}\n`;
    message += `**Bot Token:** ${ctx.env.BOT_TOKEN.substring(0, 20)}...\n`;
    message += `**Webhook Secret:** ${ctx.env.WEBHOOK_SECRET ? '已設定' : '未設定'}\n\n`;
    
    message += `**資料庫狀態:** ${ctx.env.DB ? '✅ 已連接' : '❌ 未連接'}\n`;
    message += `**快取狀態:** ${ctx.env.CACHE ? '✅ 已連接' : '❌ 未連接'}\n\n`;
    
    message += `**時間資訊:**\n`;
    message += `• 系統時間: ${new Date().toISOString()}\n`;
    message += `• 台北時間: ${formatTaiwanTime(new Date())}\n`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // 系統統計
  bot.command('stats', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 權限不足');
      return;
    }

    try {
      // 獲取各種統計數據
      const totalUsers = await ctx.db.db.prepare('SELECT COUNT(*) as count FROM users').first() as { count: number };
      const activeUsers = await ctx.db.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first() as { count: number };
      const totalGroups = await ctx.db.db.prepare('SELECT COUNT(*) as count FROM groups').first() as { count: number };
      const activeGroups = await ctx.db.db.prepare('SELECT COUNT(*) as count FROM groups WHERE is_active = 1').first() as { count: number };
      const todayLogs = await ctx.db.db.prepare('SELECT COUNT(*) as count FROM logs WHERE date(created_at) = date("now")').first() as { count: number };
      const todayLateReports = await ctx.db.db.prepare('SELECT COUNT(*) as count FROM late_reports WHERE date(created_at) = date("now")').first() as { count: number };

      let message = '📊 **系統統計資訊**\n\n';
      message += `**👥 用戶統計**\n`;
      message += `• 總用戶數: ${totalUsers.count}\n`;
      message += `• 活躍用戶: ${activeUsers.count}\n`;
      message += `• 停用用戶: ${totalUsers.count - activeUsers.count}\n\n`;
      
      message += `**🏢 群組統計**\n`;
      message += `• 總群組數: ${totalGroups.count}\n`;
      message += `• 已啟用群組: ${activeGroups.count}\n`;
      message += `• 未啟用群組: ${totalGroups.count - activeGroups.count}\n\n`;
      
      message += `**📝 今日統計**\n`;
      message += `• 系統日誌: ${todayLogs.count} 條\n`;
      message += `• 遲到回報: ${todayLateReports.count} 筆\n\n`;
      
      message += `**🔧 系統狀態**\n`;
      message += `• 環境: ${ctx.env.ENVIRONMENT}\n`;
      message += `• 更新時間: ${formatTaiwanTime(new Date())}`;

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      await ctx.reply(`❌ 獲取統計資訊失敗: ${error}`);
      await ctx.logger.error('獲取統計資訊失敗', ctx.user?.telegram_id, undefined, { error });
    }
  });

  // 系統日誌
  bot.command('logs', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 權限不足');
      return;
    }

    const args = ctx.message?.text?.split(' ');
    const limit = args && args[1] ? parseInt(args[1]) : 20;

    if (limit > 100) {
      await ctx.reply('❌ 最多只能查看 100 條日誌');
      return;
    }

    try {
      const logs = await ctx.db.getLogs(limit);
      
      if (logs.length === 0) {
        await ctx.reply('📝 目前沒有日誌記錄');
        return;
      }

      let message = `📝 **最近 ${logs.length} 條系統日誌**\n\n`;
      
      logs.forEach((log, index) => {
        const emoji = getLogLevelEmoji(log.level);
        const time = formatTaiwanTime(new Date(log.created_at));
        message += `${emoji} \`${time}\`\n`;
        message += `**[${log.module || 'system'}]** ${log.message}\n`;
        if (log.user_id) message += `👤 用戶: ${log.user_id}\n`;
        if (log.group_id) message += `👥 群組: ${log.group_id}\n`;
        message += '\n';
      });

      // 分割長訊息
      if (message.length > 4000) {
        const parts = message.match(/.{1,4000}/g) || [];
        for (const part of parts) {
          await ctx.reply(part, { parse_mode: 'Markdown' });
        }
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown' });
      }

    } catch (error) {
      await ctx.reply(`❌ 獲取日誌失敗: ${error}`);
      await ctx.logger.error('獲取日誌失敗', ctx.user?.telegram_id, undefined, { error });
    }
  });

  // 管理群組權限
  bot.command('enable_group', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 權限不足');
      return;
    }

    const args = ctx.message?.text?.split(' ');
    if (!args || args.length < 2) {
      await ctx.reply('❌ 請提供群組 ID\n使用方法: /enable_group [群組ID]');
      return;
    }

    const groupId = args[1];
    
    try {
      const group = await ctx.db.getGroup(groupId);
      if (!group) {
        await ctx.reply('❌ 找不到指定的群組');
        return;
      }

      const newStatus = await ctx.db.toggleGroupStatus(groupId);
      
      await ctx.reply(`✅ 群組「${group.title}」已${newStatus ? '啟用' : '停用'}`);
      
      await ctx.logger.info(`${newStatus ? '啟用' : '停用'}群組`, ctx.user?.telegram_id, groupId, {
        group_title: group.title,
        new_status: newStatus
      });

    } catch (error) {
      await ctx.reply(`❌ 操作失敗: ${error}`);
      await ctx.logger.error('群組權限操作失敗', ctx.user?.telegram_id, undefined, { error, groupId });
    }
  });

  // 別名指令
  bot.command('disable_group', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 權限不足');
      return;
    }
    
    // 重定向到 enable_group（toggle 功能）
    return bot.handleUpdate({
      ...ctx.update,
      message: {
        ...ctx.update.message,
        text: ctx.message?.text?.replace('/disable_group', '/enable_group'),
        entities: [{ type: 'bot_command', offset: 0, length: 13 }]
      }
    } as any);
  });

  // 設定歡迎訊息
  bot.command('set_welcome', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 權限不足');
      return;
    }

    const text = ctx.message?.text;
    if (!text) {
      await ctx.reply('❌ 請提供歡迎訊息內容');
      return;
    }

    const welcomeMessage = text.replace('/set_welcome', '').trim();
    if (!welcomeMessage) {
      await ctx.reply('❌ 歡迎訊息不能為空\n使用方法: /set_welcome 你的歡迎訊息');
      return;
    }

    try {
      await ctx.db.setSetting('welcome_message', welcomeMessage);
      await ctx.reply(`✅ 歡迎訊息已更新為:\n${welcomeMessage}`);
      
      await ctx.logger.info('更新歡迎訊息', ctx.user?.telegram_id, undefined, {
        new_message: welcomeMessage
      });

    } catch (error) {
      await ctx.reply(`❌ 更新失敗: ${error}`);
      await ctx.logger.error('更新歡迎訊息失敗', ctx.user?.telegram_id, undefined, { error });
    }
  });
}

function getLogLevelEmoji(level: string): string {
  const emojis: Record<string, string> = {
    'info': 'ℹ️',
    'warn': '⚠️',
    'error': '❌',
    'debug': '🐛'
  };
  return emojis[level] || 'ℹ️';
}
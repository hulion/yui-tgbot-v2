import { ExtendedContext, permissionMiddleware } from '@/bot/middleware';
import { Bot, InlineKeyboard } from 'grammy';

export function setupStartModule(bot: Bot<ExtendedContext>) {
  bot.command('start', permissionMiddleware('start'), async (ctx) => {
    const { user, botContext } = ctx;
    
    // 從資料庫獲取歡迎訊息（可從後台更新）
    let welcomeMessage = await ctx.db.getSetting('welcome_message');
    if (!welcomeMessage) {
      welcomeMessage = '歡迎使用 YUI Telegram Bot！🤖';
    }
    
    let message = `${welcomeMessage}\n\n`;
    message += `👋 **你好，${user?.display_name || '用戶'}！**\n\n`;
    
    // 用戶基本資訊
    message += '**👤 你的資訊**\n';
    message += `🆔 用戶 ID: \`${user?.telegram_id}\`\n`;
    message += `👑 權限等級: ${getUserRoleDisplay(user?.user_type || 'user')}\n`;
    message += `🏷️ 用戶角色: ${user?.user_role || 'UI'}\n`;
    
    // 環境資訊
    message += `\n**🌐 系統資訊**\n`;
    message += `🔧 環境: ${botContext.env.ENVIRONMENT}\n`;
    message += `⏰ 時區: 台北時間 (UTC+8)\n`;
    
    // 功能分類按鈕
    const keyboard = new InlineKeyboard();
    
    // 基本功能按鈕
    keyboard.text('📋 功能說明', 'help').row();
    keyboard.text('👤 個人資訊', 'user_info').row();
    
    // 根據用戶權限顯示不同按鈕
    if (botContext.isSuperAdmin) {
      keyboard.text('🔧 系統管理', 'admin_panel').row();
      keyboard.text('👥 群組管理', 'group_management').text('📊 系統統計', 'system_stats').row();
    } else if (botContext.isAdmin) {
      keyboard.text('👥 群組管理', 'group_management').row();
    }
    
    // 群組相關按鈕
    if (botContext.isGroup) {
      if (ctx.group?.is_active) {
        keyboard.text('📊 群組資訊', 'group_info').row();
        
        // 檢查遲到回報功能
        if (await ctx.db.hasGroupPermission(ctx.group.id, 'late_report')) {
          keyboard.text('⏰ 遲到回報說明', 'late_report_help').row();
        }
      } else {
        keyboard.text('🔓 申請群組權限', `request_access_${ctx.chat?.id}`).row();
      }
    }
    
    keyboard.text('❓ 使用說明', 'full_help').row();

    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: true
    });

    await ctx.logger.info('執行 start 指令', user?.telegram_id, ctx.group?.telegram_id);
  });

  // 處理內聯按鈕回調
  bot.callbackQuery('help', async (ctx) => {
    await ctx.answerCallbackQuery();
    // 重定向到 help 指令
    return ctx.editMessageText('執行 /help 指令來查看詳細說明');
  });

  bot.callbackQuery('user_info', async (ctx) => {
    await ctx.answerCallbackQuery();
    // 重定向到 info 指令
    return ctx.editMessageText('執行 /info 指令來查看個人資訊');
  });

  bot.callbackQuery('full_help', async (ctx) => {
    await ctx.answerCallbackQuery();
    return ctx.editMessageText('請輸入 /help 指令來查看完整的功能說明');
  });

  bot.callbackQuery('admin_panel', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.botContext?.isSuperAdmin) {
      return ctx.editMessageText('❌ 你沒有系統管理權限');
    }
    return ctx.editMessageText('執行 /superadmin 指令來進入系統管理面板');
  });

  bot.callbackQuery('group_management', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.botContext?.isAdmin) {
      return ctx.editMessageText('❌ 你沒有群組管理權限');
    }
    return ctx.editMessageText('執行 /groups 指令來管理群組');
  });

  bot.callbackQuery('system_stats', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.botContext?.isSuperAdmin) {
      return ctx.editMessageText('❌ 你沒有系統管理權限');
    }
    return ctx.editMessageText('執行 /stats 指令來查看系統統計');
  });

  bot.callbackQuery('group_info', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!ctx.botContext?.isGroup) {
      return ctx.editMessageText('❌ 此功能僅限群組使用');
    }
    
    const group = ctx.group;
    if (!group) {
      return ctx.editMessageText('❌ 無法獲取群組資訊');
    }

    let message = '**📊 群組資訊**\n\n';
    message += `🏷️ 群組名稱: ${group.title}\n`;
    message += `🆔 群組 ID: \`${group.telegram_id}\`\n`;
    message += `📝 群組類型: ${group.type}\n`;
    message += `✅ 狀態: ${group.is_active ? '已啟用' : '未啟用'}\n`;
    
    // 獲取群組啟用的功能
    const permissions = await ctx.db.getGroupPermissions(group.id);
    const enabledModules = permissions.filter(p => p.is_enabled);
    
    if (enabledModules.length > 0) {
      message += `\n**🔧 已啟用功能:**\n`;
      for (const perm of enabledModules) {
        const module = await ctx.db.db.prepare('SELECT display_name FROM modules WHERE id = ?').bind(perm.module_id).first();
        if (module) {
          message += `• ${(module as any).display_name}\n`;
        }
      }
    }

    return ctx.editMessageText(message, { parse_mode: 'Markdown' });
  });

  bot.callbackQuery('late_report_help', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    let message = '⏰ **遲到回報系統使用說明**\n\n';
    message += '**如何使用:**\n';
    message += '• 直接在群組中說明遲到原因\n';
    message += '• 系統會自動識別遲到相關訊息\n';
    message += '• 自動記錄遲到時間和原因\n\n';
    
    message += '**支援關鍵字:**\n';
    message += '• 遲到、晚到、晚點到\n';
    message += '• 會遲到、會晚到\n';
    message += '• 塞車、交通、路況\n';
    message += '• 臨時、突然、緊急\n\n';
    
    message += '**記錄內容:**\n';
    message += '• 員工姓名（用戶名稱）\n';
    message += '• 是否在 09:00 前通知\n';
    message += '• 通知時間\n';
    message += '• 遲到原因\n\n';
    
    message += '**注意事項:**\n';
    message += '• 系統以台北時間為準\n';
    message += '• 管理員會收到自動通知\n';
    message += '• 資料會保存在系統中';

    return ctx.editMessageText(message, { parse_mode: 'Markdown' });
  });

  // 處理申請群組權限
  bot.callbackQuery(/^request_access_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const groupId = ctx.match[1];
    
    // 通知所有超級管理員
    const superAdmins = await ctx.db.db.prepare('SELECT telegram_id FROM users WHERE user_type = "superadmin"').all();
    
    let message = '🔓 **群組權限申請**\n\n';
    message += `📊 群組 ID: \`${groupId}\`\n`;
    message += `👤 申請人: ${ctx.user?.display_name} (\`${ctx.user?.telegram_id}\`)\n`;
    message += `⏰ 申請時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n\n`;
    message += '請超級管理員決定是否開通此群組的使用權限';
    
    let notifiedCount = 0;
    for (const admin of superAdmins.results || []) {
      try {
        await ctx.api.sendMessage((admin as any).telegram_id, message, { parse_mode: 'Markdown' });
        notifiedCount++;
      } catch (error) {
        console.error(`Failed to notify admin ${(admin as any).telegram_id}:`, error);
      }
    }
    
    await ctx.logger.info('群組權限申請', ctx.user?.telegram_id, groupId, {
      group_id: groupId,
      notified_admins: notifiedCount
    });
    
    return ctx.editMessageText(`✅ 已向 ${notifiedCount} 位超級管理員發送權限申請\n\n請等待管理員審核後開通群組功能`);
  });
}

function getUserRoleDisplay(userType: string): string {
  const roles: Record<string, string> = {
    'superadmin': '🔧 超級管理員',
    'admin': '👑 管理員',
    'user': '👤 一般用戶'
  };
  return roles[userType] || '👤 一般用戶';
}
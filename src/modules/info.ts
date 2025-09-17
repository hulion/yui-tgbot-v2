import { ExtendedContext, permissionMiddleware } from '@/bot/middleware';
import { Bot, InlineKeyboard } from 'grammy';
import { formatTaiwanTime } from '@/utils';

export function setupInfoModule(bot: Bot<ExtendedContext>) {
  bot.command('info', permissionMiddleware('info'), async (ctx) => {
    const { user, botContext } = ctx;
    
    if (!user) {
      await ctx.reply('❌ 無法獲取用戶資訊');
      return;
    }

    let message = '👤 **你的個人資訊**\n\n';
    
    // 基本資訊
    message += '**📋 基本資料**\n';
    message += `🆔 Telegram ID: \`${user.telegram_id}\`\n`;
    message += `👤 用戶名稱: ${user.username ? `@${user.username}` : '未設定'}\n`;
    message += `🏷️ 顯示名稱: ${user.display_name || '未設定'}\n`;
    message += `📝 真實姓名: ${user.first_name || ''}${user.last_name ? ` ${user.last_name}` : ''}\n`;
    
    // 權限資訊
    message += '\n**🔐 權限資訊**\n';
    message += `👑 用戶等級: ${getUserTypeDisplay(user.user_type)}\n`;
    message += `🏷️ 用戶角色: ${getUserRoleDisplay(user.user_role)}\n`;
    message += `✅ 帳戶狀態: ${user.is_active ? '正常' : '已停用'}\n`;
    
    // 註冊資訊
    message += '\n**📅 註冊資訊**\n';
    message += `📝 註冊時間: ${formatTaiwanTime(new Date(user.created_at))}\n`;
    message += `🔄 最後更新: ${formatTaiwanTime(new Date(user.updated_at))}\n`;
    
    // 當前環境資訊
    message += '\n**🌐 當前環境**\n';
    message += `💬 聊天類型: ${getChatTypeDisplay(ctx.chat?.type || 'private')}\n`;
    message += `🔧 系統環境: ${botContext.env.ENVIRONMENT}\n`;
    message += `⏰ 當前時間: ${formatTaiwanTime(new Date())}\n`;
    
    // 群組資訊（如果在群組中）
    if (botContext.isGroup && ctx.group) {
      message += '\n**👥 群組資訊**\n';
      message += `🏷️ 群組名稱: ${ctx.group.title}\n`;
      message += `🆔 群組 ID: \`${ctx.group.telegram_id}\`\n`;
      message += `✅ 群組狀態: ${ctx.group.is_active ? '已啟用' : '未啟用'}\n`;
      
      // 獲取群組權限
      const permissions = await ctx.db.getGroupPermissions(ctx.group.id);
      const enabledCount = permissions.filter(p => p.is_enabled).length;
      message += `🔧 已啟用功能: ${enabledCount} 個\n`;
    }

    // 建立操作按鈕
    const keyboard = new InlineKeyboard();
    
    keyboard.text('🔄 重新整理', 'refresh_info').row();
    keyboard.text('✏️ 更新顯示名稱', 'update_display_name').row();
    
    if (botContext.isSuperAdmin) {
      keyboard.text('🔧 管理面板', 'admin_panel_info').row();
    }
    
    keyboard.text('🏠 返回主選單', 'back_to_start').row();

    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: true
    });

    await ctx.logger.info('查看個人資訊', user.telegram_id, ctx.group?.telegram_id);
  });

  // 處理回調按鈕
  bot.callbackQuery('refresh_info', async (ctx) => {
    await ctx.answerCallbackQuery('🔄 重新整理中...');
    
    // 重新執行 info 指令
    const fakeUpdate = {
      ...ctx.update,
      message: {
        ...ctx.update.callback_query?.message,
        text: '/info',
        entities: [{ type: 'bot_command', offset: 0, length: 5 }]
      }
    };
    
    return bot.handleUpdate(fakeUpdate as any);
  });

  bot.callbackQuery('update_display_name', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const message = '✏️ **更新顯示名稱**\n\n' +
      '請回覆此訊息並輸入你想要的新顯示名稱：\n' +
      '範例：`張小明` 或 `工程師小王`\n\n' +
      '注意：顯示名稱會在遲到回報等功能中使用';
    
    const keyboard = new InlineKeyboard()
      .text('❌ 取消', 'cancel_update_name');
    
    await ctx.editMessageText(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard 
    });
    
    // 設定等待用戶輸入的狀態
    await ctx.db.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) 
      VALUES (?, ?)
    `).bind(`waiting_name_update_${ctx.user?.telegram_id}`, 'true').run();
  });

  bot.callbackQuery('cancel_update_name', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    // 清除等待狀態
    await ctx.db.db.prepare('DELETE FROM settings WHERE key = ?')
      .bind(`waiting_name_update_${ctx.user?.telegram_id}`).run();
    
    return ctx.editMessageText('❌ 已取消更新顯示名稱');
  });

  bot.callbackQuery('admin_panel_info', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.botContext?.isSuperAdmin) {
      return ctx.editMessageText('❌ 權限不足');
    }
    
    return ctx.editMessageText('🔧 請輸入 /superadmin 指令進入管理面板');
  });

  bot.callbackQuery('back_to_start', async (ctx) => {
    await ctx.answerCallbackQuery();
    return ctx.editMessageText('🏠 請輸入 /start 返回主選單');
  });

  // 處理顯示名稱更新
  bot.on('message:text', async (ctx) => {
    if (!ctx.user) return;
    
    const waitingSetting = await ctx.db.getSetting(`waiting_name_update_${ctx.user.telegram_id}`);
    if (waitingSetting !== 'true') return;
    
    const newDisplayName = ctx.message.text.trim();
    
    if (newDisplayName.length < 1 || newDisplayName.length > 50) {
      await ctx.reply('❌ 顯示名稱長度必須在 1-50 字元之間，請重新輸入');
      return;
    }
    
    // 更新顯示名稱
    await ctx.db.updateUser(ctx.user.telegram_id, { display_name: newDisplayName });
    
    // 清除等待狀態
    await ctx.db.db.prepare('DELETE FROM settings WHERE key = ?')
      .bind(`waiting_name_update_${ctx.user.telegram_id}`).run();
    
    await ctx.reply(`✅ 顯示名稱已更新為：${newDisplayName}`);
    
    await ctx.logger.info('更新顯示名稱', ctx.user.telegram_id, ctx.group?.telegram_id, {
      old_name: ctx.user.display_name,
      new_name: newDisplayName
    });
  });
}

function getUserTypeDisplay(userType: string): string {
  const types: Record<string, string> = {
    'superadmin': '🔧 超級管理員',
    'admin': '👑 管理員',
    'user': '👤 一般用戶'
  };
  return types[userType] || '👤 一般用戶';
}

function getUserRoleDisplay(userRole: string): string {
  const roles: Record<string, string> = {
    'UI': '🎨 UI 設計師',
    'FE': '💻 前端工程師',
    'GENERAL': '👤 一般職員'
  };
  return roles[userRole] || '👤 一般職員';
}

function getChatTypeDisplay(chatType: string): string {
  const types: Record<string, string> = {
    'private': '💬 私人聊天',
    'group': '👥 群組聊天',
    'supergroup': '👥 超級群組',
    'channel': '📢 頻道'
  };
  return types[chatType] || '❓ 未知類型';
}
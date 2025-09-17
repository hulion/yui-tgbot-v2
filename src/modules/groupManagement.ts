import { ExtendedContext, permissionMiddleware } from '@/bot/middleware';
import { Bot, InlineKeyboard } from 'grammy';
import { formatTaiwanTime } from '@/utils';

export function setupGroupManagementModule(bot: Bot<ExtendedContext>) {
  // 群組管理主指令
  bot.command('groups', async (ctx) => {
    if (!ctx.botContext?.isAdmin) {
      await ctx.reply('❌ 你沒有群組管理權限');
      return;
    }

    try {
      const groups = await ctx.db.db.prepare(`
        SELECT * FROM groups 
        ORDER BY is_active DESC, created_at DESC 
        LIMIT 20
      `).all();

      let message = '🏢 **群組管理面板**\n\n';
      
      if (!groups.results || groups.results.length === 0) {
        message += '📝 目前沒有任何群組記錄';
      } else {
        message += `**群組列表** (共 ${groups.results.length} 個)\n\n`;
        
        for (const group of groups.results as any[]) {
          const statusEmoji = group.is_active ? '✅' : '❌';
          const typeEmoji = group.type === 'supergroup' ? '👥' : '👤';
          
          message += `${statusEmoji} ${typeEmoji} **${group.title}**\n`;
          message += `🆔 ID: \`${group.telegram_id}\`\n`;
          message += `📝 類型: ${group.type}\n`;
          message += `📅 加入時間: ${formatTaiwanTime(new Date(group.created_at))}\n\n`;
        }
      }

      message += '\n**🛠️ 管理指令**\n';
      message += '• /enable_group [群組ID] - 啟用群組\n';
      message += '• /disable_group [群組ID] - 停用群組\n';
      message += '• /group_info [群組ID] - 查看群組詳情\n';
      message += '• /group_modules [群組ID] - 設定群組功能';

      const keyboard = new InlineKeyboard()
        .text('🔄 重新整理', 'refresh_groups')
        .text('📊 群組統計', 'group_stats').row();

      if (groups.results && groups.results.length > 0) {
        keyboard.text('⚙️ 快速設定', 'quick_group_setup').row();
      }

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });

      await ctx.logger.info('查看群組管理面板', ctx.user?.telegram_id);

    } catch (error) {
      await ctx.reply(`❌ 獲取群組資訊失敗: ${error}`);
      await ctx.logger.error('獲取群組資訊失敗', ctx.user?.telegram_id, undefined, { error });
    }
  });

  // 查看特定群組資訊
  bot.command('group_info', async (ctx) => {
    if (!ctx.botContext?.isAdmin) {
      await ctx.reply('❌ 你沒有群組管理權限');
      return;
    }

    const args = ctx.message?.text?.split(' ');
    let groupId: string;

    if (args && args.length > 1) {
      groupId = args[1];
    } else if (ctx.botContext.isGroup && ctx.group) {
      groupId = ctx.group.telegram_id;
    } else {
      await ctx.reply('❌ 請提供群組 ID 或在群組中使用此指令\n使用方法: /group_info [群組ID]');
      return;
    }

    try {
      const group = await ctx.db.getGroup(groupId);
      if (!group) {
        await ctx.reply('❌ 找不到指定的群組');
        return;
      }

      // 獲取群組功能權限
      const permissions = await ctx.db.getGroupPermissions(group.id);
      const modules = await ctx.db.getModules();

      let message = '🏢 **群組詳細資訊**\n\n';
      message += `**基本資訊**\n`;
      message += `🏷️ 群組名稱: ${group.title}\n`;
      message += `🆔 群組 ID: \`${group.telegram_id}\`\n`;
      message += `📝 群組類型: ${group.type}\n`;
      message += `✅ 啟用狀態: ${group.is_active ? '已啟用' : '未啟用'}\n`;
      message += `📅 加入時間: ${formatTaiwanTime(new Date(group.created_at))}\n`;
      message += `🔄 最後更新: ${formatTaiwanTime(new Date(group.updated_at))}\n\n`;

      message += `**功能權限設定**\n`;
      
      if (modules.length === 0) {
        message += '📝 沒有可用的功能模組\n';
      } else {
        for (const module of modules) {
          const permission = permissions.find(p => p.module_id === module.id);
          const isEnabled = permission?.is_enabled || false;
          const statusEmoji = isEnabled ? '✅' : '❌';
          
          message += `${statusEmoji} ${module.display_name}\n`;
          if (module.description) {
            message += `   ${module.description}\n`;
          }
        }
      }

      // 獲取群組使用統計
      const todayLogs = await ctx.db.db.prepare(`
        SELECT COUNT(*) as count 
        FROM logs 
        WHERE group_id = ? AND date(created_at) = date('now')
      `).bind(group.telegram_id).first() as { count: number };

      const lateReports = await ctx.db.db.prepare(`
        SELECT COUNT(*) as count 
        FROM late_reports lr 
        JOIN groups g ON lr.group_id = g.id 
        WHERE g.telegram_id = ? AND date(lr.created_at) = date('now')
      `).bind(group.telegram_id).first() as { count: number };

      message += `\n**今日使用統計**\n`;
      message += `📝 系統日誌: ${todayLogs.count} 條\n`;
      message += `⏰ 遲到回報: ${lateReports.count} 筆\n`;

      const keyboard = new InlineKeyboard()
        .text(group.is_active ? '❌ 停用群組' : '✅ 啟用群組', `toggle_group_${group.telegram_id}`)
        .text('⚙️ 設定功能', `setup_modules_${group.id}`).row()
        .text('🔄 重新整理', `refresh_group_${group.telegram_id}`)
        .text('🏠 返回列表', 'back_to_groups').row();

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });

      await ctx.logger.info('查看群組詳細資訊', ctx.user?.telegram_id, group.telegram_id, {
        group_title: group.title
      });

    } catch (error) {
      await ctx.reply(`❌ 獲取群組詳細資訊失敗: ${error}`);
      await ctx.logger.error('獲取群組詳細資訊失敗', ctx.user?.telegram_id, undefined, { error, groupId });
    }
  });

  // 設定群組功能模組
  bot.command('group_modules', async (ctx) => {
    if (!ctx.botContext?.isSuperAdmin) {
      await ctx.reply('❌ 只有超級管理員可以設定群組功能');
      return;
    }

    const args = ctx.message?.text?.split(' ');
    if (!args || args.length < 2) {
      await ctx.reply('❌ 請提供群組 ID\n使用方法: /group_modules [群組ID]');
      return;
    }

    const groupId = args[1];

    try {
      const group = await ctx.db.getGroup(groupId);
      if (!group) {
        await ctx.reply('❌ 找不到指定的群組');
        return;
      }

      const modules = await ctx.db.getModules();
      const permissions = await ctx.db.getGroupPermissions(group.id);

      let message = `⚙️ **設定群組功能**\n\n`;
      message += `🏷️ 群組: ${group.title}\n`;
      message += `🆔 ID: \`${group.telegram_id}\`\n\n`;
      message += `**可用功能模組:**\n\n`;

      const keyboard = new InlineKeyboard();

      for (const module of modules) {
        const permission = permissions.find(p => p.module_id === module.id);
        const isEnabled = permission?.is_enabled || false;
        const statusEmoji = isEnabled ? '✅' : '❌';
        
        message += `${statusEmoji} **${module.display_name}**\n`;
        if (module.description) {
          message += `   ${module.description}\n`;
        }
        message += '\n';

        // 添加切換按鈕
        keyboard.text(
          `${isEnabled ? '❌' : '✅'} ${module.display_name}`,
          `toggle_module_${group.id}_${module.id}_${!isEnabled}`
        ).row();
      }

      keyboard.text('🔄 重新整理', `refresh_modules_${group.id}`)
        .text('✅ 完成設定', `finish_setup_${group.id}`).row();

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      await ctx.logger.info('設定群組功能模組', ctx.user?.telegram_id, group.telegram_id, {
        group_title: group.title
      });

    } catch (error) {
      await ctx.reply(`❌ 載入群組功能設定失敗: ${error}`);
      await ctx.logger.error('載入群組功能設定失敗', ctx.user?.telegram_id, undefined, { error, groupId });
    }
  });

  // 處理回調按鈕
  bot.callbackQuery('refresh_groups', async (ctx) => {
    await ctx.answerCallbackQuery('🔄 重新整理中...');
    
    if (!ctx.botContext?.isAdmin) {
      return ctx.editMessageText('❌ 權限不足');
    }

    // 重新執行 groups 指令
    const fakeUpdate = {
      ...ctx.update,
      message: {
        ...ctx.update.callback_query?.message,
        text: '/groups',
        entities: [{ type: 'bot_command', offset: 0, length: 7 }]
      }
    };
    
    return bot.handleUpdate(fakeUpdate as any);
  });

  bot.callbackQuery('group_stats', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.botContext?.isAdmin) {
      return ctx.editMessageText('❌ 權限不足');
    }

    try {
      const stats = await ctx.db.db.prepare(`
        SELECT 
          COUNT(*) as total_groups,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_groups,
          COUNT(CASE WHEN type = 'supergroup' THEN 1 END) as supergroups,
          COUNT(CASE WHEN type = 'group' THEN 1 END) as regular_groups
        FROM groups
      `).first() as any;

      const todayJoins = await ctx.db.db.prepare(`
        SELECT COUNT(*) as count 
        FROM groups 
        WHERE date(created_at) = date('now')
      `).first() as { count: number };

      let message = '📊 **群組統計資訊**\n\n';
      message += `**基本統計**\n`;
      message += `📊 總群組數: ${stats.total_groups}\n`;
      message += `✅ 已啟用群組: ${stats.active_groups}\n`;
      message += `❌ 未啟用群組: ${stats.total_groups - stats.active_groups}\n\n`;
      
      message += `**群組類型**\n`;
      message += `👥 超級群組: ${stats.supergroups}\n`;
      message += `👤 一般群組: ${stats.regular_groups}\n\n`;
      
      message += `**今日新增**\n`;
      message += `📅 新加入群組: ${todayJoins.count} 個\n\n`;
      
      message += `📈 統計時間: ${formatTaiwanTime(new Date())}`;

      return ctx.editMessageText(message, { parse_mode: 'Markdown' });

    } catch (error) {
      return ctx.editMessageText(`❌ 獲取統計資訊失敗: ${error}`);
    }
  });

  bot.callbackQuery(/^toggle_group_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.botContext?.isSuperAdmin) {
      return ctx.editMessageText('❌ 只有超級管理員可以切換群組狀態');
    }

    const groupId = ctx.match[1];

    try {
      const group = await ctx.db.getGroup(groupId);
      if (!group) {
        return ctx.editMessageText('❌ 找不到指定的群組');
      }

      const newStatus = await ctx.db.toggleGroupStatus(groupId);
      
      await ctx.answerCallbackQuery(`✅ 群組已${newStatus ? '啟用' : '停用'}`);
      
      // 重新載入群組資訊
      const fakeUpdate = {
        ...ctx.update,
        message: {
          ...ctx.update.callback_query?.message,
          text: `/group_info ${groupId}`,
          entities: [{ type: 'bot_command', offset: 0, length: 11 }]
        }
      };
      
      await ctx.logger.info(`${newStatus ? '啟用' : '停用'}群組`, ctx.user?.telegram_id, groupId, {
        group_title: group.title,
        new_status: newStatus
      });

      return bot.handleUpdate(fakeUpdate as any);

    } catch (error) {
      return ctx.editMessageText(`❌ 切換群組狀態失敗: ${error}`);
    }
  });

  bot.callbackQuery(/^toggle_module_(\d+)_(\d+)_(true|false)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.botContext?.isSuperAdmin) {
      return ctx.editMessageText('❌ 只有超級管理員可以設定功能權限');
    }

    const groupId = parseInt(ctx.match[1]);
    const moduleId = parseInt(ctx.match[2]);
    const enable = ctx.match[3] === 'true';

    try {
      await ctx.db.setGroupPermission(groupId, moduleId, enable);
      
      const module = await ctx.db.db.prepare('SELECT display_name FROM modules WHERE id = ?').bind(moduleId).first() as any;
      const group = await ctx.db.db.prepare('SELECT title, telegram_id FROM groups WHERE id = ?').bind(groupId).first() as any;
      
      await ctx.answerCallbackQuery(`✅ ${enable ? '啟用' : '停用'} ${module?.display_name}`);
      
      await ctx.logger.info(`${enable ? '啟用' : '停用'}群組功能`, ctx.user?.telegram_id, group?.telegram_id, {
        group_title: group?.title,
        module_name: module?.display_name,
        action: enable ? 'enable' : 'disable'
      });

      // 重新載入功能設定頁面
      const fakeUpdate = {
        ...ctx.update,
        message: {
          ...ctx.update.callback_query?.message,
          text: `/group_modules ${group?.telegram_id}`,
          entities: [{ type: 'bot_command', offset: 0, length: 14 }]
        }
      };

      return bot.handleUpdate(fakeUpdate as any);

    } catch (error) {
      return ctx.editMessageText(`❌ 設定功能權限失敗: ${error}`);
    }
  });

  bot.callbackQuery('back_to_groups', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const fakeUpdate = {
      ...ctx.update,
      message: {
        ...ctx.update.callback_query?.message,
        text: '/groups',
        entities: [{ type: 'bot_command', offset: 0, length: 7 }]
      }
    };
    
    return bot.handleUpdate(fakeUpdate as any);
  });
}
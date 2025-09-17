import { ExtendedContext, permissionMiddleware } from '@/bot/middleware';
import { Bot } from 'grammy';

export function setupHelpModule(bot: Bot<ExtendedContext>) {
  bot.command('help', permissionMiddleware('help'), async (ctx) => {
    const { user, botContext } = ctx;
    
    let helpMessage = '🤖 **YUI Telegram Bot 使用說明**\n\n';
    
    // 基本功能
    helpMessage += '**📋 基本功能**\n';
    helpMessage += '/start - 顯示歡迎訊息和功能選單\n';
    helpMessage += '/help - 顯示此說明訊息\n';
    helpMessage += '/info - 顯示你的用戶資訊\n\n';
    
    // 根據用戶權限顯示不同功能
    if (botContext.isSuperAdmin) {
      helpMessage += '**🔧 超級管理員功能**\n';
      helpMessage += '/superadmin - 系統管理功能\n';
      helpMessage += '/env - 檢查當前環境\n';
      helpMessage += '/stats - 系統統計資訊\n';
      helpMessage += '/logs - 查看系統日誌\n\n';
      
      helpMessage += '**👥 群組管理功能**\n';
      helpMessage += '/groups - 管理群組權限\n';
      helpMessage += '/enable_group [群組ID] - 啟用群組功能\n';
      helpMessage += '/disable_group [群組ID] - 停用群組功能\n';
      helpMessage += '/group_info [群組ID] - 查看群組資訊\n\n';
      
      helpMessage += '**👤 用戶管理功能**\n';
      helpMessage += '/users - 查看所有用戶\n';
      helpMessage += '/promote [用戶ID] [權限] - 提升用戶權限\n';
      helpMessage += '/demote [用戶ID] - 降低用戶權限\n\n';
    } else if (botContext.isAdmin) {
      helpMessage += '**👥 管理員功能**\n';
      helpMessage += '/group_info - 查看當前群組資訊\n';
      helpMessage += '/users - 查看群組用戶\n\n';
    }
    
    // 群組功能（需要群組啟用相應權限）
    if (botContext.isGroup && ctx.group?.is_active) {
      helpMessage += '**📊 群組功能**\n';
      
      // 檢查遲到回報功能權限
      if (await ctx.db.hasGroupPermission(ctx.group.id, 'late_report')) {
        helpMessage += '⏰ **遲到回報系統**\n';
        helpMessage += '直接在群組中說明遲到原因，系統會自動記錄並通知管理員\n';
        helpMessage += '支援關鍵字：遲到、晚到、晚點到、會遲到等\n\n';
      }
    } else if (botContext.isGroup && !ctx.group?.is_active) {
      helpMessage += '❌ **此群組功能未啟用**\n';
      helpMessage += `群組 ID: \`${ctx.chat?.id}\`\n`;
      helpMessage += '請聯絡超級管理員開通群組權限\n\n';
    }
    
    helpMessage += '**📞 技術支援**\n';
    helpMessage += '如需協助，請聯絡系統管理員\n\n';
    
    helpMessage += '**📝 版本資訊**\n';
    helpMessage += '版本：v2.0.0\n';
    helpMessage += '環境：' + botContext.env.ENVIRONMENT + '\n';
    helpMessage += '最後更新：2024-08-28';

    await ctx.reply(helpMessage, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    await ctx.logger.info('查看幫助說明', user?.telegram_id, ctx.group?.telegram_id);
  });

  // 別名指令
  bot.command(['h', 'help_me', '幫助'], permissionMiddleware('help'), async (ctx) => {
    // 重定向到主要的 help 指令
    return bot.handleUpdate({
      ...ctx.update,
      message: {
        ...ctx.update.message,
        text: '/help',
        entities: [{ type: 'bot_command', offset: 0, length: 5 }]
      }
    } as any);
  });
}
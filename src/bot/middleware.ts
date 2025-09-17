import { Context } from 'grammy';
import { Database } from '@/database';
import { Logger } from '@/utils';
import { Env, User, Group, BotContext } from '@/types';

// 擴展 Grammy Context
export interface ExtendedContext extends Context {
  env: Env;
  db: Database;
  logger: Logger;
  user?: User;
  group?: Group;
  botContext: BotContext;
}

// 環境設定中間件
export function environmentMiddleware() {
  return async (ctx: ExtendedContext, next: () => Promise<void>) => {
    // 這裡的 env 會在 Workers 中設定
    if (!ctx.env) {
      throw new Error('Environment not initialized');
    }

    // 初始化資料庫和日誌
    ctx.db = new Database(ctx.env.DB);
    ctx.logger = new Logger(ctx.db, 'bot');

    await next();
  };
}

// 用戶認證中間件
export function authMiddleware() {
  return async (ctx: ExtendedContext, next: () => Promise<void>) => {
    if (!ctx.from) {
      await ctx.reply('❌ 無法識別用戶身份');
      return;
    }

    const telegramId = ctx.from.id.toString();
    
    // 檢查用戶是否存在
    let user = await ctx.db.getUser(telegramId);
    
    // 如果用戶不存在，創建新用戶
    if (!user) {
      user = await ctx.db.createUser({
        telegram_id: telegramId,
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        display_name: ctx.from.first_name || ctx.from.username || `用戶${telegramId.slice(-4)}`,
        user_type: 'user',
        user_role: 'UI'
      });

      await ctx.logger.info(`新用戶註冊`, telegramId, undefined, {
        username: ctx.from.username,
        name: user.display_name
      });
    }

    ctx.user = user;
    await next();
  };
}

// 群組認證中間件
export function groupMiddleware() {
  return async (ctx: ExtendedContext, next: () => Promise<void>) => {
    if (!ctx.chat) {
      await next();
      return;
    }

    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    
    if (isGroup) {
      const telegramId = ctx.chat.id.toString();
      let group = await ctx.db.getGroup(telegramId);

      // 如果群組不存在，創建新群組（但預設為未啟用）
      if (!group) {
        group = await ctx.db.createGroup({
          telegram_id: telegramId,
          title: ctx.chat.title || '未知群組',
          type: ctx.chat.type as 'group' | 'supergroup',
          is_active: false
        });

        await ctx.logger.info(`新群組加入`, ctx.user?.telegram_id, telegramId, {
          title: group.title,
          type: group.type
        });
      }

      ctx.group = group;
    }

    await next();
  };
}

// Bot 上下文中間件
export function contextMiddleware() {
  return async (ctx: ExtendedContext, next: () => Promise<void>) => {
    const isPrivate = ctx.chat?.type === 'private';
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
    const isSuperAdmin = ctx.user?.user_type === 'superadmin';
    const isAdmin = ctx.user?.user_type === 'admin' || isSuperAdmin;

    ctx.botContext = {
      env: ctx.env,
      user: ctx.user,
      group: ctx.group,
      isPrivate,
      isGroup,
      isSuperAdmin,
      isAdmin
    };

    await next();
  };
}

// 權限檢查中間件
export function permissionMiddleware(requiredModule: string) {
  return async (ctx: ExtendedContext, next: () => Promise<void>) => {
    if (!ctx.user) {
      await ctx.reply('❌ 用戶認證失敗');
      return;
    }

    // Superadmin 擁有所有權限
    if (ctx.user.user_type === 'superadmin') {
      await next();
      return;
    }

    // 私人聊天中的基本功能權限檢查
    if (ctx.botContext.isPrivate) {
      const basicModules = ['help', 'start', 'info'];
      if (basicModules.includes(requiredModule)) {
        await next();
        return;
      }
    }

    // 群組聊天中的權限檢查
    if (ctx.botContext.isGroup && ctx.group) {
      // 檢查群組是否啟用
      if (!ctx.group.is_active) {
        await ctx.reply(`❌ 此群組尚未啟用 Bot 功能\n\n群組 ID: ${ctx.group.telegram_id}\n請聯絡超級管理員開通權限`);
        return;
      }

      // 檢查模組權限
      const hasPermission = await ctx.db.hasGroupPermission(ctx.group.id, requiredModule);
      if (!hasPermission) {
        await ctx.reply(`❌ 此群組沒有「${requiredModule}」功能權限`);
        return;
      }
    }

    await next();
  };
}

// 錯誤處理中間件
export function errorMiddleware() {
  return async (ctx: ExtendedContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      await ctx.logger.error('Bot 執行錯誤', ctx.user?.telegram_id, ctx.group?.telegram_id, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        update: ctx.update
      });

      await ctx.reply('❌ 系統發生錯誤，請稍後再試');
    }
  };
}

// 日誌記錄中間件
export function loggingMiddleware() {
  return async (ctx: ExtendedContext, next: () => Promise<void>) => {
    const startTime = Date.now();
    
    await next();
    
    const executionTime = Date.now() - startTime;
    
    if (ctx.message?.text) {
      await ctx.logger.info(`指令執行`, ctx.user?.telegram_id, ctx.group?.telegram_id, {
        command: ctx.message.text,
        execution_time: executionTime,
        chat_type: ctx.chat?.type
      });
    }
  };
}
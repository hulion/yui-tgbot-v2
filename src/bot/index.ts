import { Bot, webhookCallback } from 'grammy';
import { Router } from 'itty-router';
import { Env } from '@/types';
import { Database } from '@/database';
import { 
  ExtendedContext,
  environmentMiddleware,
  authMiddleware,
  groupMiddleware,
  contextMiddleware,
  errorMiddleware,
  loggingMiddleware
} from './middleware';

// 導入模組
import { setupHelpModule } from '@/modules/help';
import { setupStartModule } from '@/modules/start';
import { setupInfoModule } from '@/modules/info';
import { setupSuperadminModule } from '@/modules/superadmin';
import { setupGroupManagementModule } from '@/modules/groupManagement';
import { setupLateReportModule } from '@/modules/lateReport';

// 創建 Bot 實例的函數
function createBot(token: string): Bot<ExtendedContext> {
  const bot = new Bot<ExtendedContext>(token);

  // 設定中間件
  bot.use(environmentMiddleware());
  bot.use(errorMiddleware());
  bot.use(loggingMiddleware());
  bot.use(authMiddleware());
  bot.use(groupMiddleware());
  bot.use(contextMiddleware());

  // 設定各個功能模組
  setupHelpModule(bot);
  setupStartModule(bot);
  setupInfoModule(bot);
  setupSuperadminModule(bot);
  setupGroupManagementModule(bot);
  setupLateReportModule(bot);

  // 處理未知指令
  bot.on('message:text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) {
      await ctx.reply('❓ 未知的指令，請輸入 /help 查看可用指令');
    }
  });

  return bot;
}

// CORS 處理函數
function addCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return newResponse;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const router = Router();

    // 處理 OPTIONS 請求（預檢請求）
    if (request.method === 'OPTIONS') {
      return addCorsHeaders(new Response(null, { status: 200 }));
    }

    // API 路由設定
    router.post('/webhook', async (request: Request) => {
      // 只在處理 webhook 時創建 Bot 實例
      const bot = createBot(env.BOT_TOKEN);
      
      // 注入環境變數到 context
      bot.use((ctx, next) => {
        (ctx as ExtendedContext).env = env;
        return next();
      });

      const callback = webhookCallback(bot, 'cloudflare-mod');
      return callback(request);
    });

    // 設定 Webhook
    router.get('/setWebhook', async () => {
      const webhookUrl = `${url.origin}/webhook`;
      
      try {
        const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: env.WEBHOOK_SECRET
          })
        });

        const result = await response.json() as any;
        
        if (result.ok) {
          return new Response(`✅ Webhook 設定成功: ${webhookUrl}`, { status: 200 });
        } else {
          return new Response(`❌ Webhook 設定失敗: ${result.description}`, { status: 400 });
        }
      } catch (error) {
        return new Response(`❌ 設定 Webhook 時發生錯誤: ${error}`, { status: 500 });
      }
    });

    // 刪除 Webhook
    router.get('/deleteWebhook', async () => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/deleteWebhook`);
        const result = await response.json() as any;
        
        if (result.ok) {
          return new Response('✅ Webhook 已刪除', { status: 200 });
        } else {
          return new Response(`❌ 刪除 Webhook 失敗: ${result.description}`, { status: 400 });
        }
      } catch (error) {
        return new Response(`❌ 刪除 Webhook 時發生錯誤: ${error}`, { status: 500 });
      }
    });

    // 獲取 Bot 資訊
    router.get('/getMe', async () => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`);
        const result = await response.json();
        
        return new Response(JSON.stringify(result, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(`❌ 獲取 Bot 資訊失敗: ${error}`, { status: 500 });
      }
    });

    // 健康檢查
    router.get('/health', () => {
      return new Response(JSON.stringify({
        status: 'ok',
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // API 路由 - 獲取系統統計
    router.get('/api/stats', async () => {
      try {
        // 基本統計數據，暫時返回模擬數據
        const stats = {
          total_users: { count: 10 },
          active_groups: { count: 3 },
          total_logs: { count: 25 },
          late_reports_today: { count: 2 }
        };

        const response = new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      }
    });

    // API 路由 - 獲取日誌
    router.get('/api/logs', async (request) => {
      try {
        // 返回模擬日誌數據
        const logs = [
          {
            id: 1,
            level: 'info',
            message: '系統啟動',
            module: 'system',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            level: 'info',
            message: '使用者登入',
            module: 'auth',
            created_at: new Date(Date.now() - 60000).toISOString()
          }
        ];

        const response = new Response(JSON.stringify(logs), {
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(JSON.stringify({ error: 'Failed to fetch logs' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      }
    });

    // API 路由 - 遲到回報統計 (每日)
    router.get('/api/stats/late-reports/daily', async (request) => {
      try {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');

        const db = new Database(env.DB);
        const stats = await db.getLateReportStatsWithCache('daily', startDate || undefined, endDate || undefined);

        const response = new Response(JSON.stringify({
          success: true,
          data: stats
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch daily stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      }
    });

    // API 路由 - 遲到回報統計 (週報)
    router.get('/api/stats/late-reports/weekly', async (request) => {
      try {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');

        const db = new Database(env.DB);
        const stats = await db.getLateReportStatsWithCache('weekly', startDate || undefined, endDate || undefined);

        const response = new Response(JSON.stringify({
          success: true,
          data: stats
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch weekly stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      }
    });

    // API 路由 - 遲到回報統計 (月報)
    router.get('/api/stats/late-reports/monthly', async (request) => {
      try {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');

        const db = new Database(env.DB);
        const stats = await db.getLateReportStatsWithCache('monthly', startDate || undefined, endDate || undefined);

        const response = new Response(JSON.stringify({
          success: true,
          data: stats
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch monthly stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      }
    });

    // API 路由 - 用戶遲到統計
    router.get('/api/stats/late-reports/user/:userId', async (request) => {
      try {
        const url = new URL(request.url);
        const userId = parseInt(url.pathname.split('/').pop() || '0');
        const limit = parseInt(url.searchParams.get('limit') || '30');

        if (!userId || userId <= 0) {
          const response = new Response(JSON.stringify({
            success: false,
            error: 'Invalid user ID'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
          return addCorsHeaders(response);
        }

        const db = new Database(env.DB);
        const stats = await db.getUserLateStatsWithCache(userId, limit);

        const response = new Response(JSON.stringify({
          success: true,
          data: stats
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch user stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      }
    });

    // API 路由 - 清除統計快取 (管理員專用)
    router.post('/api/stats/clear-cache', async (request) => {
      try {
        // TODO: 在這裡加入管理員權限檢查
        
        const db = new Database(env.DB);
        await db.clearExpiredCache();
        await db.clearStatsCache();

        const response = new Response(JSON.stringify({
          success: true,
          message: 'Cache cleared successfully'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      } catch (error) {
        const response = new Response(JSON.stringify({
          success: false,
          error: 'Failed to clear cache',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
        return addCorsHeaders(response);
      }
    });

    // 首頁重定向到管理面板
    router.get('/', () => {
      return new Response('YUI Telegram Bot v2.0 - 管理面板即將推出', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    });

    // 處理所有請求，為所有其他路由添加 CORS
    const response = await router.handle(request);
    if (response) {
      return addCorsHeaders(response);
    } else {
      // 如果沒有匹配的路由，返回 404
      const notFoundResponse = new Response('Not Found', { status: 404 });
      return addCorsHeaders(notFoundResponse);
    }
  }
};
# YUI Telegram Bot v2.0 開發文件

## 📋 專案簡介

YUI Telegram Bot v2.0 是一個基於 Cloudflare Workers 的服務型 Telegram Bot，具備完整的用戶權限管理、群組管理和遲到回報系統，並配有 Vue 3 前端管理介面。

### 🎯 主要特色

- **🤖 完整的 Bot 功能**: 包含基礎指令、用戶管理、群組管理等
- **⏰ 智能遲到回報**: 自動識別遲到相關關鍵字，支援台北時間判斷
- **👥 權限管理系統**: 支援三級權限（superadmin、admin、user）
- **📊 前端管理面板**: Vue 3 + TypeScript + Tailwind CSS
- **☁️ 雲端架構**: 100% 基於 Cloudflare 服務，支援免費版本

## 🏗️ 系統架構

### 後端架構
- **運行環境**: Cloudflare Workers
- **資料庫**: Cloudflare D1 (SQLite)
- **快取**: Cloudflare KV
- **框架**: Grammy (Telegram Bot 框架)
- **路由**: Itty Router

### 前端架構
- **框架**: Vue 3 + TypeScript
- **建置工具**: Vite
- **UI 框架**: Tailwind CSS
- **狀態管理**: Pinia
- **路由**: Vue Router

### 資料庫結構

#### 主要資料表
- `users` - 用戶資訊
- `groups` - 群組資訊
- `modules` - 功能模組
- `group_permissions` - 群組權限
- `settings` - 系統設定
- `logs` - 系統日誌
- `late_reports` - 遲到回報

## 🚀 快速開始

### 1. 專案設定

```bash
# 複製專案
git clone https://github.com/hulion/yui-tgbot-v2.git
cd yui-tgbot-v2

# 安裝依賴
npm install

# 前端依賴
cd frontend
npm install
cd ..
```

### 2. 環境設定

#### 建立 Cloudflare 資源

1. **建立 Workers**
```bash
# 登入 Cloudflare
wrangler login

# 建立 Worker
wrangler init yui-tgbot-v2
```

2. **建立 D1 資料庫**
```bash
# 建立資料庫
wrangler d1 create yui-tgbot-db

# 執行資料庫遷移（本地）
wrangler d1 migrations apply yui-tgbot-db --local

# 執行資料庫遷移（線上）
wrangler d1 migrations apply yui-tgbot-db
```

3. **建立 KV 命名空間**
```bash
# 建立 KV 命名空間
wrangler kv:namespace create "CACHE"
```

#### 設定環境變數

編輯 `wrangler.toml` 檔案：

```toml
name = "yui-tgbot-v2"
main = "src/bot/index.ts"
compatibility_date = "2024-08-28"

[env.production.vars]
ENVIRONMENT = "production"
BOT_TOKEN = "你的_BOT_TOKEN"
WEBHOOK_SECRET = "你的_WEBHOOK_SECRET"

[env.development.vars]
ENVIRONMENT = "development"
BOT_TOKEN = "你的_BOT_TOKEN"
WEBHOOK_SECRET = "開發環境_SECRET"

[[kv_namespaces]]
binding = "CACHE"
id = "你的_KV_NAMESPACE_ID"

[[d1_databases]]
binding = "DB"
database_name = "yui-tgbot-db"
database_id = "你的_D1_DATABASE_ID"
```

### 3. 開發環境啟動

#### 後端開發
```bash
# 本地開發
npm run dev

# 建置專案
npm run build

# 部署到 Cloudflare
npm run deploy
```

#### 前端開發
```bash
# 前端開發伺服器
npm run frontend:dev

# 建置前端
npm run frontend:build
```

## 🤖 Bot 功能說明

### 基礎功能

#### `/start` - 歡迎功能
- 顯示歡迎訊息和功能選單
- 支援互動式按鈕
- 可從後台更新歡迎訊息

#### `/help` - 說明功能
- 根據用戶權限顯示不同功能
- 支援指令別名：`/h`, `/help_me`, `/幫助`

#### `/info` - 用戶資訊
- 顯示用戶基本資料
- 權限等級和角色資訊
- 支援更新顯示名稱

### 管理功能

#### `/superadmin` - 超級管理員面板
- 系統統計資訊
- 用戶和群組管理
- 系統設定

#### `/groups` - 群組管理
- 查看所有群組
- 啟用/停用群組功能
- 設定群組權限

#### `/env` - 環境檢查
- 顯示當前運行環境
- 系統狀態檢查

### 遲到回報系統

#### 自動識別功能
系統會自動識別包含以下關鍵字的訊息：
- 遲到、晚到、晚點到、會遲到、會晚到
- 晚一點、遲一點、延遲到達、延後到達
- 塞車、路況、交通、來不及、趕不上
- 有事、臨時、抱歉、不好意思

#### 記錄內容
- **員工姓名**: 自動取得用戶顯示名稱
- **回報時間**: 台北時間
- **09:00前通知**: 自動判斷是否在早上9點前通知
- **遲到原因**: 智能提取或用戶選擇

#### 管理員通知
- 自動發送給所有管理員
- 包含完整回報資訊
- 支援回報狀態追蹤

## 👥 權限系統

### 用戶等級

1. **superadmin (超級管理員)**
   - 所有功能權限
   - 系統管理
   - 用戶權限管理

2. **admin (管理員)**
   - 群組管理
   - 查看遲到回報
   - 用戶資訊查看

3. **user (一般用戶)**
   - 基礎功能
   - 個人資訊管理

### 用戶角色

- **UI**: UI 設計師
- **FE**: 前端工程師
- **GENERAL**: 一般職員

### 群組權限

每個群組可以獨立設定啟用的功能模組：
- Help 功能
- Start 功能
- Info 功能
- 群組管理
- 遲到回報

## 🌐 前端管理面板

### 頁面結構

1. **儀表板** (`/`)
   - 系統統計概覽
   - 即時數據顯示

2. **用戶管理** (`/users`)
   - 用戶列表
   - 權限管理
   - 用戶資訊編輯

3. **群組管理** (`/groups`)
   - 群組列表
   - 權限設定
   - 功能啟用/停用

4. **遲到回報** (`/late-reports`)
   - 回報記錄查看
   - 統計分析

5. **系統日誌** (`/logs`)
   - 系統活動日誌
   - 錯誤追蹤

6. **系統設定** (`/settings`)
   - 歡迎訊息設定
   - 系統參數配置

### 特色功能

- **響應式設計**: 支援手機、平板、桌面
- **即時更新**: 自動重新整理數據
- **互動式介面**: 豐富的互動元素
- **深色模式**: 支援深色主題（預留）

## 📊 API 端點

### 系統 API

```typescript
GET  /health              // 健康檢查
GET  /api/stats           // 系統統計
GET  /api/logs            // 系統日誌
POST /webhook             // Telegram Webhook
GET  /setWebhook          // 設定 Webhook
GET  /deleteWebhook       // 刪除 Webhook
GET  /getMe               // Bot 資訊
```

### Webhook 端點

所有 Telegram 更新都會發送到 `/webhook` 端點進行處理。

## 🔧 開發指南

### 新增功能模組

1. **建立模組檔案**
```typescript
// src/modules/yourModule.ts
import { ExtendedContext, permissionMiddleware } from '@/bot/middleware';
import { Bot } from 'grammy';

export function setupYourModule(bot: Bot<ExtendedContext>) {
  bot.command('your_command', permissionMiddleware('your_module'), async (ctx) => {
    // 功能實作
  });
}
```

2. **註冊模組**
```typescript
// src/bot/index.ts
import { setupYourModule } from '@/modules/yourModule';

// 在 bot 設定中添加
setupYourModule(bot);
```

3. **資料庫設定**
```sql
-- 新增模組到資料庫
INSERT INTO modules (name, display_name, description) 
VALUES ('your_module', '你的模組', '模組描述');
```

### 資料庫操作

使用 `Database` 類別進行資料庫操作：

```typescript
// 獲取用戶
const user = await ctx.db.getUser(telegramId);

// 建立用戶
const newUser = await ctx.db.createUser(userData);

// 檢查權限
const hasPermission = await ctx.db.hasGroupPermission(groupId, moduleName);
```

### 錯誤處理

系統提供完整的錯誤處理機制：

```typescript
try {
  // 你的代碼
} catch (error) {
  await ctx.logger.error('錯誤訊息', userId, groupId, { error });
  await ctx.reply('❌ 操作失敗，請稍後再試');
}
```

## 🚀 部署指南

### 1. 準備部署

```bash
# 建置專案
npm run build

# 檢查配置
wrangler whoami
```

### 2. 部署到 Cloudflare

```bash
# 部署 Worker
npm run deploy

# 設定 Webhook
curl "https://your-worker.your-subdomain.workers.dev/setWebhook"
```

### 3. 前端部署

前端可以部署到 Cloudflare Pages 或其他靜態託管服務：

```bash
# 建置前端
cd frontend
npm run build

# 部署到 Cloudflare Pages
wrangler pages deploy dist
```

## 🔍 故障排除

### 常見問題

1. **Bot 無回應**
   - 檢查 BOT_TOKEN 是否正確
   - 確認 Webhook 設定成功
   - 查看 Worker 日誌

2. **資料庫錯誤**
   - 確認 D1 資料庫 ID 正確
   - 檢查資料庫遷移是否完成
   - 查看 D1 Analytics

3. **權限問題**
   - 檢查用戶權限等級
   - 確認群組是否啟用
   - 驗證功能模組權限

### 日誌查看

```bash
# 查看 Worker 日誌
wrangler tail

# 查看 D1 操作
wrangler d1 execute yui-tgbot-db --command "SELECT * FROM logs ORDER BY created_at DESC LIMIT 10"
```

## 📈 效能優化

### 快取策略

- 使用 KV 儲存頻繁查詢的資料
- 設定適當的 TTL
- 實作快取失效機制

### 資料庫優化

- 適當的索引設計
- 批次操作減少查詢次數
- 定期清理舊資料

## 🛡️ 安全性

### 資料保護

- 所有敏感資料加密儲存
- 環境變數管理
- 輸入驗證和過濾

### 權限控制

- 多層權限驗證
- 操作日誌記錄
- 異常行為監控

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支
3. 提交更改
4. 建立 Pull Request

## 📞 支援與聯絡

- **GitHub**: https://github.com/hulion/yui-tgbot-v2
- **Issues**: 使用 GitHub Issues 回報問題
- **Documentation**: 查看 `docs/` 資料夾中的詳細文件

## 📝 版本歷程

### v2.0.0 (2024-08-28)
- 🎉 初始版本發布
- ✨ 完整的 Bot 功能實作
- 🖥️ Vue 3 前端管理面板
- ⏰ 智能遲到回報系統
- 👥 完整權限管理系統

## 📄 授權條款

MIT License - 詳見 LICENSE 檔案

---

**🚀 快速開始你的 YUI Telegram Bot 之旅！**
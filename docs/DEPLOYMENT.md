# 部署指南

## 概述

本指南將協助你將 YUI Telegram Bot v2.0 部署到 Cloudflare Workers 平台。

## 前置需求

### 1. 帳戶需求
- Cloudflare 帳戶（免費版即可開始）
- Telegram Bot Token（從 @BotFather 取得）
- GitHub 帳戶（用於程式碼管理）

### 2. 本地工具
- Node.js 18+ 
- npm 或 yarn
- Git
- Wrangler CLI

## 步驟一：環境準備

### 1. 安裝 Wrangler CLI

```bash
# 全域安裝 Wrangler
npm install -g wrangler

# 登入 Cloudflare
wrangler login
```

### 2. 複製專案

```bash
git clone https://github.com/hulion/yui-tgbot-v2.git
cd yui-tgbot-v2
npm install
```

## 步驟二：建立 Cloudflare 資源

### 1. 建立 D1 資料庫

```bash
# 建立資料庫
wrangler d1 create yui-tgbot-db

# 記住輸出的 database_id，稍後會用到
```

輸出範例：
```
✅ Successfully created DB 'yui-tgbot-db'

[[d1_databases]]
binding = "DB"
database_name = "yui-tgbot-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. 建立 KV 命名空間

```bash
# 建立 KV 命名空間
wrangler kv:namespace create "CACHE"

# 記住輸出的 id
```

輸出範例：
```
🌀 Creating namespace with title "CACHE"
✨ Success!
Add the following to your configuration file:

[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. 更新 wrangler.toml

編輯 `wrangler.toml` 檔案，填入剛才建立的資源 ID：

```toml
name = "yui-tgbot-v2"
main = "src/bot/index.ts"
compatibility_date = "2024-08-28"

[env.production.vars]
ENVIRONMENT = "production"
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"
WEBHOOK_SECRET = "YOUR_WEBHOOK_SECRET_HERE"

[env.development.vars]
ENVIRONMENT = "development"
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"
WEBHOOK_SECRET = "dev-webhook-secret"

# 替換為你的 KV 命名空間 ID
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID_HERE"

# 替換為你的 D1 資料庫 ID
[[d1_databases]]
binding = "DB"
database_name = "yui-tgbot-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"

# 可選：自定義域名路由
# [routes]
# pattern = "api.yourdomain.com/*"
# zone_name = "yourdomain.com"
```

## 步驟三：設定 Telegram Bot

### 1. 建立 Bot

1. 在 Telegram 中找到 @BotFather
2. 發送 `/newbot` 指令
3. 依照指示設定 Bot 名稱和用戶名
4. 取得 Bot Token

### 2. 設定 Bot 權限

發送以下指令給 @BotFather：

```
/setprivacy
選擇你的 Bot
Disable
```

這樣 Bot 就能讀取群組中的所有訊息。

### 3. 設定指令列表（可選）

```
/setcommands
選擇你的 Bot

start - 開始使用 Bot
help - 顯示使用說明
info - 顯示個人資訊
groups - 管理群組（管理員）
superadmin - 系統管理（超級管理員）
```

## 步驟四：資料庫設定

### 1. 本地測試資料庫

```bash
# 在本地環境執行遷移
wrangler d1 migrations apply yui-tgbot-db --local

# 檢查本地資料庫
wrangler d1 execute yui-tgbot-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### 2. 生產資料庫

```bash
# 在生產環境執行遷移
wrangler d1 migrations apply yui-tgbot-db

# 檢查生產資料庫
wrangler d1 execute yui-tgbot-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## 步驟五：本地開發測試

### 1. 開發模式

```bash
# 啟動本地開發伺服器
npm run dev

# 或者直接使用 wrangler
wrangler dev --local
```

### 2. 測試 API 端點

```bash
# 健康檢查
curl http://localhost:8787/health

# 系統統計
curl http://localhost:8787/api/stats
```

## 步驟六：部署到生產環境

### 1. 建置專案

```bash
# 建置專案
npm run build
```

### 2. 部署 Worker

```bash
# 部署到生產環境
npm run deploy

# 或者使用 wrangler
wrangler deploy
```

### 3. 設定 Webhook

部署完成後，取得 Worker URL 並設定 Webhook：

```bash
# 假設你的 Worker URL 是 https://yui-tgbot-v2.your-subdomain.workers.dev
curl "https://yui-tgbot-v2.your-subdomain.workers.dev/setWebhook"
```

## 步驟七：前端部署（可選）

### 1. 建置前端

```bash
cd frontend
npm install
npm run build
```

### 2. 部署到 Cloudflare Pages

```bash
# 使用 Wrangler 部署 Pages
wrangler pages deploy dist --project-name yui-tgbot-frontend

# 或者透過 Cloudflare Dashboard 連接 GitHub 自動部署
```

### 3. 設定環境變數

在 Cloudflare Pages 設定頁面中添加環境變數：

```
VITE_API_BASE_URL=https://yui-tgbot-v2.your-subdomain.workers.dev
```

## 步驟八：設定超級管理員

### 1. 找到你的 Telegram ID

向你的 Bot 發送任何訊息，然後查看日誌：

```bash
wrangler tail yui-tgbot-v2
```

或者查看資料庫：

```bash
wrangler d1 execute yui-tgbot-db --command "SELECT * FROM users ORDER BY created_at DESC LIMIT 5"
```

### 2. 將自己設為超級管理員

```bash
# 替換 YOUR_TELEGRAM_ID 為你的實際 ID
wrangler d1 execute yui-tgbot-db --command "UPDATE users SET user_type = 'superadmin' WHERE telegram_id = 'YOUR_TELEGRAM_ID'"
```

## 步驟九：測試部署

### 1. 基本功能測試

向你的 Bot 發送以下指令測試：

1. `/start` - 確認歡迎訊息正常
2. `/help` - 確認說明功能正常
3. `/info` - 確認個人資訊正常
4. `/superadmin` - 確認管理員功能正常（需要超級管理員權限）

### 2. 群組功能測試

1. 將 Bot 加入測試群組
2. 發送 `/start` 確認收到權限申請提示
3. 使用 `/groups` 啟用群組功能
4. 在群組中測試遲到回報功能

## 常見問題與解決方案

### 1. Worker 部署失敗

**問題**: 部署時出現 `Error: Unknown binding`

**解決方案**: 檢查 `wrangler.toml` 中的 binding 名稱是否正確，確認 KV 和 D1 的 ID 已正確填入。

### 2. Webhook 設定失敗

**問題**: `/setWebhook` 回傳錯誤

**解決方案**: 
- 確認 BOT_TOKEN 正確
- 確認 Worker 已成功部署且可訪問
- 檢查 Webhook URL 是否正確

### 3. 資料庫連接失敗

**問題**: Bot 功能無法正常使用，日誌顯示資料庫錯誤

**解決方案**:
- 確認資料庫遷移已執行完成
- 檢查 D1 database ID 是否正確
- 確認 binding 名稱為 "DB"

### 4. 權限問題

**問題**: 超級管理員功能無法使用

**解決方案**:
- 確認已將自己設為超級管理員
- 重新發送指令讓系統重新載入權限
- 檢查用戶表中的 user_type 欄位

## 監控與維護

### 1. 查看日誌

```bash
# 即時日誌
wrangler tail yui-tgbot-v2

# 查看 D1 操作
wrangler d1 execute yui-tgbot-db --command "SELECT * FROM logs ORDER BY created_at DESC LIMIT 10"
```

### 2. 資料庫維護

```bash
# 清理舊日誌（保留最近30天）
wrangler d1 execute yui-tgbot-db --command "DELETE FROM logs WHERE created_at < datetime('now', '-30 days')"

# 檢查資料庫大小
wrangler d1 info yui-tgbot-db
```

### 3. 效能監控

- 使用 Cloudflare Analytics 監控 Worker 效能
- 定期檢查 D1 查詢效能
- 監控 KV 使用情況

## 自動化部署（可選）

### GitHub Actions

建立 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build project
      run: npm run build
      
    - name: Deploy to Cloudflare Workers
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

設定 GitHub Secrets：
- `CLOUDFLARE_API_TOKEN`: 你的 Cloudflare API Token

---

🎉 **恭喜！你已成功部署 YUI Telegram Bot v2.0**

如有任何問題，請參考故障排除指南或提交 GitHub Issue。
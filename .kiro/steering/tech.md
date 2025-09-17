# 技術堆疊

## 後端架構

- **運行環境**: Cloudflare Workers
- **Bot 框架**: Grammy (Telegram Bot Framework)
- **資料庫**: Cloudflare D1 (基於 SQLite)
- **快取**: Cloudflare KV Storage
- **程式語言**: TypeScript (ES2022 目標)
- **路由器**: itty-router 用於 HTTP 路由
- **建置工具**: esbuild + 自訂建置腳本

## 前端架構

- **框架**: Vue 3 + TypeScript
- **建置工具**: Vite
- **UI 框架**: Tailwind CSS + Headless UI
- **狀態管理**: Pinia
- **路由**: Vue Router
- **圖示**: Heroicons + Iconify
- **HTTP 客戶端**: Axios

## 開發工具

- **套件管理器**: npm
- **TypeScript**: v5.3+ 嚴格模式
- **測試**: Vitest + Playwright
- **部署**: Wrangler CLI

## 常用指令

### 後端開發
```bash
# 啟動開發伺服器
npm run dev

# 建置正式版本
npm run build

# 部署到 Cloudflare
npm run deploy

# 資料庫遷移
npm run db:migrate        # 正式環境
npm run db:local         # 本地開發

# 執行測試
npm run test
```

### 前端開發
```bash
# 啟動前端開發伺服器
npm run frontend:dev

# 建置前端
npm run frontend:build

# 前端專用指令 (在 frontend/ 目錄下)
cd frontend
npm run dev              # 開發伺服器
npm run build           # 正式建置
npm run preview         # 預覽建置結果
npm run type-check      # TypeScript 型別檢查
```

## 路徑別名

後端使用 TypeScript 路徑對應：
- `@/*` → `src/*`
- `@/bot/*` → `src/bot/*`
- `@/modules/*` → `src/modules/*`
- `@/utils/*` → `src/utils/*`
- `@/types/*` → `src/types/*`
- `@/database/*` → `src/database/*`

## 環境設定

- 使用 `wrangler.toml` 進行 Cloudflare Workers 設定
- 透過 Wrangler 管理環境變數
- 分離開發和正式環境
- 每個環境配置 KV 和 D1 綁定
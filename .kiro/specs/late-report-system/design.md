# 設計文件

## 概述

基於需求分析，智能遲到回報系統的大部分核心功能已經實作完成。本設計文件專注於處理剩餘需求，主要包括：統計功能增強、前端部署配置、以及系統優化。

## 架構

### 現有架構評估

當前系統已具備：
- ✅ 完整的後端 Bot 功能 (Grammy + Cloudflare Workers)
- ✅ 資料庫設計 (D1 + 完整的遷移檔案)
- ✅ 中間件系統 (認證、權限、日誌)
- ✅ 核心遲到回報流程
- ✅ 管理員通知系統

### 需要補強的架構

1. **統計分析模組** - 週報、月報功能
2. **前端部署配置** - Cloudflare Workers 部署
3. **API 端點擴展** - 支援前端管理面板
4. **路由配置** - 前後端共存方案

## 元件和介面

### 1. 統計分析模組

#### 新增 API 端點
```typescript
// 統計相關 API
GET /api/stats/late-reports/daily    // 每日統計
GET /api/stats/late-reports/weekly   // 週報
GET /api/stats/late-reports/monthly  // 月報
GET /api/stats/late-reports/user/:id // 個人統計
```

#### 統計資料結構
```typescript
interface LateReportStats {
  period: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_reports: number;
  on_time_reports: number;
  late_reports: number;
  by_reason: Record<string, number>;
  by_user: Array<{
    user_id: number;
    user_name: string;
    total: number;
    on_time: number;
    late: number;
  }>;
}
```

### 2. 前端部署配置

#### Cloudflare Workers 配置
```toml
# wrangler.toml 新增前端 Worker 配置
[[services]]
name = "yui-tgbot-frontend"
script = "frontend/dist/worker.js"
compatibility_date = "2024-08-28"

[services.vars]
API_BASE_URL = "https://yui-tgbot-v2.your-domain.workers.dev"
```

#### 前端建置配置
```typescript
// vite.config.ts 修改
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/worker.ts',
      name: 'YuiTgbotFrontend',
      fileName: 'worker'
    },
    rollupOptions: {
      external: ['@cloudflare/workers-types']
    }
  }
})
```

### 3. 路由配置方案

#### 方案 A: 子網域分離
- 後端: `api.yui-tgbot.your-domain.com`
- 前端: `admin.yui-tgbot.your-domain.com`

#### 方案 B: 路徑分離 (推薦)
- 後端: `yui-tgbot.your-domain.com/api/*`
- 前端: `yui-tgbot.your-domain.com/*`
- Webhook: `yui-tgbot.your-domain.com/webhook`

## 資料模型

### 統計快取表 (新增)
```sql
CREATE TABLE IF NOT EXISTS stats_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 系統設定擴展
```sql
-- 新增統計相關設定
INSERT INTO settings (key, value, description) VALUES
('stats_cache_ttl', '3600', '統計快取時間 (秒)'),
('weekly_report_day', '1', '週報產生日 (1=週一)'),
('monthly_report_day', '1', '月報產生日'),
('frontend_base_url', '', '前端基礎 URL');
```

## 錯誤處理

### API 錯誤回應標準化
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

### 常見錯誤處理
1. **統計資料過大** - 分頁處理
2. **快取失效** - 自動重新計算
3. **前端 API 連接失敗** - 重試機制
4. **部署環境差異** - 環境檢測

## 測試策略

### 單元測試
- 統計計算邏輯測試
- API 端點回應測試
- 前端元件渲染測試

### 整合測試
- 前後端 API 通訊測試
- 資料庫查詢效能測試
- Cloudflare Workers 部署測試

### 端對端測試
- 完整遲到回報流程測試
- 管理面板操作測試
- 多環境部署驗證

## 效能考量

### 統計查詢優化
```sql
-- 新增統計專用索引
CREATE INDEX IF NOT EXISTS idx_late_reports_stats 
ON late_reports(created_at, is_before_nine, status);

CREATE INDEX IF NOT EXISTS idx_late_reports_user_stats 
ON late_reports(user_id, created_at, status);
```

### 快取策略
- 統計資料快取 1 小時
- 用戶權限快取 15 分鐘
- 系統設定快取 24 小時

### 前端優化
- 靜態資源 CDN 快取
- API 回應壓縮
- 懶載入非關鍵元件

## 安全考量

### API 安全
- JWT Token 驗證
- Rate Limiting
- CORS 設定

### 資料安全
- 敏感資料加密存儲
- 操作日誌記錄
- 權限檢查中間件

## 部署策略

### 階段性部署
1. **階段 1**: 統計功能後端實作
2. **階段 2**: 前端建置配置
3. **階段 3**: 路由整合測試
4. **階段 4**: 正式環境部署

### 環境管理
```bash
# 開發環境
wrangler dev --env development

# 測試環境  
wrangler deploy --env staging

# 正式環境
wrangler deploy --env production
```

### 資料庫遷移
```bash
# 新增統計相關表格
wrangler d1 migrations create add-stats-cache
wrangler d1 migrations apply yui-tgbot-db --env production
```

## 監控和維護

### 關鍵指標
- API 回應時間
- 錯誤率
- 使用者活躍度
- 統計查詢效能

### 日誌策略
- 結構化日誌格式
- 錯誤追蹤
- 效能監控
- 使用者行為分析

### 備份策略
- 每日資料庫備份
- 設定檔版本控制
- 部署回滾機制
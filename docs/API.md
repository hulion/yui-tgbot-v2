# API 文件

## 概述

YUI Telegram Bot v2.0 提供了完整的 RESTful API 介面，支援系統管理和資料查詢。

## 認證

目前 API 不需要特別的認證機制，但建議在生產環境中實作 API 金鑰認證。

## 基礎 URL

```
開發環境: http://localhost:8787
生產環境: https://your-worker.your-subdomain.workers.dev
```

## API 端點

### 1. 系統健康檢查

**GET** `/health`

檢查系統狀態和基本資訊。

**回應範例:**
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2024-08-28T12:00:00.000Z"
}
```

### 2. 系統統計

**GET** `/api/stats`

獲取系統統計資訊。

**回應範例:**
```json
{
  "total_users": { "count": 150 },
  "active_groups": { "count": 25 },
  "total_logs": { "count": 1024 },
  "late_reports_today": { "count": 5 }
}
```

### 3. 系統日誌

**GET** `/api/logs`

獲取系統日誌記錄。

**查詢參數:**
- `limit` (可選): 限制返回的日誌數量，預設為 50，最大為 100
- `offset` (可選): 分頁偏移量，預設為 0

**回應範例:**
```json
[
  {
    "id": 1,
    "level": "info",
    "message": "用戶執行 start 指令",
    "module": "bot",
    "user_id": "123456789",
    "group_id": null,
    "metadata": "{\"command\": \"/start\"}",
    "created_at": "2024-08-28T12:00:00.000Z"
  }
]
```

### 4. Telegram Webhook

**POST** `/webhook`

接收 Telegram 更新的端點。此端點由 Telegram 服務器調用，不應手動調用。

**請求標頭:**
- `X-Telegram-Bot-Api-Secret-Token`: Webhook 密鑰（如果設定）

### 5. Webhook 管理

#### 設定 Webhook

**GET** `/setWebhook`

為 Telegram Bot 設定 Webhook URL。

**回應範例:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

#### 刪除 Webhook

**GET** `/deleteWebhook`

刪除 Telegram Bot 的 Webhook 設定。

**回應範例:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was deleted"
}
```

### 6. Bot 資訊

**GET** `/getMe`

獲取 Bot 的基本資訊。

**回應範例:**
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "YUI Bot",
    "username": "yui_bot",
    "can_join_groups": true,
    "can_read_all_group_messages": false,
    "supports_inline_queries": false
  }
}
```

## 錯誤處理

### HTTP 狀態碼

- `200 OK`: 請求成功
- `400 Bad Request`: 請求參數錯誤
- `401 Unauthorized`: 未授權訪問
- `403 Forbidden`: 權限不足
- `404 Not Found`: 資源不存在
- `500 Internal Server Error`: 服務器內部錯誤

### 錯誤回應格式

```json
{
  "success": false,
  "error": "錯誤訊息",
  "message": "詳細說明"
}
```

## 資料模型

### User (用戶)

```typescript
interface User {
  id: number;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  user_type: 'superadmin' | 'admin' | 'user';
  user_role: 'UI' | 'FE' | 'GENERAL';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Group (群組)

```typescript
interface Group {
  id: number;
  telegram_id: string;
  title: string;
  type: 'group' | 'supergroup' | 'channel';
  is_active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}
```

### Log (日誌)

```typescript
interface Log {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  module?: string;
  user_id?: string;
  group_id?: string;
  metadata?: string;
  created_at: string;
}
```

### LateReport (遲到回報)

```typescript
interface LateReport {
  id: number;
  user_id: number;
  group_id: number;
  employee_name: string;
  is_before_nine: boolean;
  report_time: string;
  reason?: string;
  status: 'pending' | 'processed' | 'cancelled';
  admin_notified: boolean;
  created_at: string;
  updated_at: string;
}
```

## 使用範例

### JavaScript/TypeScript

```javascript
// 獲取系統統計
const getStats = async () => {
  const response = await fetch('/api/stats');
  const stats = await response.json();
  console.log(stats);
};

// 獲取日誌（分頁）
const getLogs = async (page = 0, limit = 50) => {
  const response = await fetch(`/api/logs?limit=${limit}&offset=${page * limit}`);
  const logs = await response.json();
  console.log(logs);
};
```

### cURL

```bash
# 獲取系統統計
curl -X GET "https://your-worker.your-subdomain.workers.dev/api/stats"

# 獲取日誌
curl -X GET "https://your-worker.your-subdomain.workers.dev/api/logs?limit=20&offset=0"

# 設定 Webhook
curl -X GET "https://your-worker.your-subdomain.workers.dev/setWebhook"
```

## 限制與配額

### Cloudflare Workers 限制

- **CPU 時間**: 每次請求最多 10ms（免費版）、100ms（付費版）
- **記憶體**: 128MB
- **請求大小**: 最大 100MB
- **回應大小**: 最大 100MB

### 速率限制

目前沒有實作速率限制，但建議：
- API 呼叫間隔至少 100ms
- 大量資料查詢使用分頁
- 避免同時進行多個耗時操作

## 安全性建議

1. **HTTPS**: 所有 API 呼叫都應使用 HTTPS
2. **驗證**: 驗證所有輸入參數
3. **授權**: 實作適當的授權機制
4. **日誌**: 記錄所有 API 使用情況
5. **監控**: 監控異常使用模式

## 更新日誌

### v2.0.0 (2024-08-28)
- 初始 API 版本
- 基礎系統管理端點
- Telegram Webhook 支援
- 統計和日誌 API
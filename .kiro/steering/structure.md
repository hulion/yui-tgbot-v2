# 專案結構

## 根目錄結構

```
yui-tgbot-v2/
├── src/                    # 後端原始碼
├── frontend/               # 前端 Vue 應用程式
├── migrations/             # 資料庫遷移檔案
├── docs/                   # 專案文件
├── config/                 # 設定檔案
├── .kiro/                  # Kiro AI 助手設定
├── wrangler.toml          # Cloudflare Workers 設定
├── package.json           # 後端依賴管理
└── tsconfig.json          # TypeScript 設定
```

## 後端架構 (src/)

```
src/
├── bot/
│   ├── index.ts           # 主要 Bot 入口點和路由
│   └── middleware.ts      # 中間件 (認證、權限、日誌等)
├── modules/               # 功能模組
│   ├── start.ts          # /start 指令
│   ├── help.ts           # /help 指令
│   ├── info.ts           # 用戶資訊管理
│   ├── superadmin.ts     # 超級管理員功能
│   ├── groupManagement.ts # 群組管理
│   └── lateReport.ts     # 遲到回報系統
├── database/
│   └── index.ts          # 資料庫操作層
├── types/
│   └── index.ts          # TypeScript 型別定義
└── utils/
    └── index.ts          # 工具函數
```

## 前端架構 (frontend/)

```
frontend/
├── src/
│   ├── components/        # Vue 元件
│   │   ├── dialogs/      # 對話框元件
│   │   ├── layout/       # 版面配置元件
│   │   └── ui/           # UI 基礎元件
│   ├── views/            # 頁面元件
│   │   ├── Dashboard.vue # 儀表板
│   │   ├── Users.vue     # 用戶管理
│   │   ├── Groups.vue    # 群組管理
│   │   ├── LateReports.vue # 遲到回報
│   │   ├── Logs.vue      # 系統日誌
│   │   └── Settings.vue  # 系統設定
│   ├── stores/           # Pinia 狀態管理
│   ├── router/           # Vue Router 路由設定
│   ├── utils/            # 前端工具函數
│   ├── composables/      # Vue 組合式函數
│   └── constants/        # 常數定義
├── public/               # 靜態資源
└── package.json         # 前端依賴管理
```

## 模組化設計原則

### Bot 模組結構
- 每個功能模組獨立檔案
- 使用 `setup*Module()` 函數註冊到主 Bot
- 統一的中間件處理認證和權限
- 模組間通過資料庫和 context 通訊

### 前端元件組織
- `components/ui/` - 可重用的基礎 UI 元件
- `components/dialogs/` - 彈出對話框元件
- `components/layout/` - 版面配置相關元件
- `views/` - 頁面級元件，對應路由

### 資料庫設計
- 使用 D1 (SQLite) 作為主要資料庫
- 遷移檔案位於 `migrations/` 目錄
- 支援用戶、群組、權限、日誌等核心實體

### 型別定義
- 集中在 `src/types/index.ts`
- 涵蓋所有資料庫實體和 API 介面
- 前後端共用型別定義

## 命名慣例

- **檔案名稱**: camelCase (TypeScript) 或 kebab-case (Vue)
- **資料庫表格**: snake_case
- **API 端點**: kebab-case
- **Vue 元件**: PascalCase
- **函數和變數**: camelCase
- **常數**: UPPER_SNAKE_CASE
# Claude Code 設定

## 語言偏好
- 使用繁體中文進行所有回覆和互動
- 採用台灣的用語習慣和設定
- 程式碼註解和文件也使用繁體中文

## 專案相關設定
- 專案名稱：c2-tgbot-v2 (YUI Telegram Bot 管理面板)
- 主要開發語言：Vue 3 + TypeScript
- 測試框架：待確認
- 設計風格：Shelve.cloud 黑色主題
- 圖示系統：Lucide 線框圖示 (已實作)

## 最近開發進度 (2025-08-29)

### 已完成功能
- ✅ 完整的管理面板實作，採用 Shelve.cloud 設計風格
- ✅ 響應式側邊欄導航系統，支援摺疊/展開
- ✅ 統一的圖示管理系統 (AppIcon 組件)
- ✅ Lucide 線框圖示集成與優化
- ✅ 6 個主要功能模組：儀表板、用戶管理、群組管理、遲到回報、系統日誌、系統設定
- ✅ Tailwind CSS 樣式系統配置
- ✅ TypeScript 支援和 ESLint 配置

### 技術架構更新
- **前端框架**: Vue 3.4+ 搭配 Composition API
- **樣式系統**: Tailwind CSS 3.4+ 搭配黑色主題
- **圖示系統**: @iconify/tailwind + Lucide 圖示集
- **狀態管理**: Pinia 2.2+
- **構建工具**: Vite 5.4+
- **開發工具**: ESLint + Prettier + vue-tsc

### 檔案結構
```
frontend/
├── src/
│   ├── components/ui/
│   │   └── AppIcon.vue          # 統一圖示組件
│   ├── constants/
│   │   └── icons.ts             # 圖示常數定義
│   ├── composables/
│   │   └── useIcons.ts          # 圖示工具函數
│   └── main-shelve-style.ts     # 主應用入口
├── tailwind.config.js           # Tailwind + iconify 配置
└── CLAUDE.md                    # 專案文件
```

### 圖示系統說明
- 使用 Lucide 線框圖示，提供現代化視覺效果
- AppIcon 組件支援尺寸 (xs/sm/md/lg/xl/2xl) 和顏色變體
- 集中管理所有圖示常數，便於維護
- 支援簡短名稱映射 (如 'dashboard' → 'lucide--layout-dashboard')

### 開發指令
- `npm run dev` - 開發模式 (目前正在運行)
- `npm run build` - 構建生產版本
- `npm run type-check` - TypeScript 類型檢查
- `npm run lint` - 代碼檢查與修復

### 下次開發重點
- [ ] 後端 API 整合
- [ ] 真實數據接入
- [ ] 單元測試實作
- [ ] 效能優化

## 注意事項
- 所有與用戶的互動都應使用繁體中文
- 保持專業且簡潔的溝通風格
- 維持 Shelve.cloud 黑色主題的一致性
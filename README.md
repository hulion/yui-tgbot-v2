# YUI Telegram Bot v2.0 🤖

一個基於 Cloudflare Workers 的企業級 Telegram Bot，具備完整的用戶管理、群組管理和智能遲到回報系統。

## 🆕 最新更新 (2025-09-17)

### ✨ 新增功能
- **統計分析模組**: 支援每日、週報、月報統計查詢
- **智能快取系統**: 自動快取統計資料，提升查詢效能
- **完整 API 端點**: RESTful API 支援前端管理面板
- **前端介面優化**: 修復導航問題，改善用戶體驗

### 📊 統計 API
```bash
GET /api/stats/late-reports/daily    # 每日統計
GET /api/stats/late-reports/weekly   # 週報統計  
GET /api/stats/late-reports/monthly  # 月報統計
GET /api/stats/late-reports/user/:id # 個人統計
POST /api/stats/clear-cache          # 清除快取
```

### 🗄️ 資料庫更新
- 新增 `stats_cache` 表格支援統計快取
- 優化索引提升查詢效能
- 支援自動過期清理機制

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D)](https://vuejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## ✨ 主要特色

- 🤖 **完整的 Bot 功能**: 基礎指令、用戶管理、群組管理
- ⏰ **智能遲到回報**: 自動識別遲到關鍵字，支援台北時間判斷
- 👥 **三級權限系統**: Superadmin、Admin、User 權限分級
- 📊 **Vue 3 管理面板**: 現代化的 Web 管理介面
- ☁️ **100% 雲端架構**: 基於 Cloudflare 服務，支援免費版本
- 🔐 **資料安全**: D1 資料庫 + KV 快取，資料加密存儲

## 🚀 快速開始

### 1. 一鍵部署（推薦）

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hulion/yui-tgbot-v2)

### 2. 本地開發

```bash
# 複製專案
git clone https://github.com/hulion/yui-tgbot-v2.git
cd yui-tgbot-v2

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 前端開發
cd frontend
npm install
npm run dev
```

## 📖 文件

- [📋 完整開發文件](docs/README.md)
- [🚀 部署指南](docs/DEPLOYMENT.md)
- [🔌 API 文件](docs/API.md)

## 🛠️ 技術架構

### 後端
- **運行環境**: Cloudflare Workers
- **框架**: Grammy (Telegram Bot Framework)
- **資料庫**: Cloudflare D1 (SQLite)
- **快取**: Cloudflare KV
- **語言**: TypeScript

### 前端
- **框架**: Vue 3 + TypeScript
- **建置工具**: Vite
- **UI 框架**: Tailwind CSS
- **狀態管理**: Pinia
- **路由**: Vue Router

## 🤖 Bot 功能

### 基礎功能
- `/start` - 歡迎訊息和功能選單
- `/help` - 完整功能說明
- `/info` - 用戶資訊查看和編輯

### 管理功能
- `/superadmin` - 系統管理面板
- `/groups` - 群組管理
- `/users` - 用戶管理
- `/stats` - 系統統計

### ⏰ 智能遲到回報
- 自動識別遲到相關關鍵字
- 台北時間自動判斷是否 09:00 前通知
- 互動式原因選擇或自訂輸入
- 管理員自動通知系統

## 🖥️ 管理面板

- **儀表板**: 系統統計總覽
- **用戶管理**: 權限管理、資料編輯
- **群組管理**: 功能啟用、權限設定
- **遲到回報**: 記錄查看、統計分析
- **系統日誌**: 活動追蹤、錯誤監控
- **系統設定**: 參數配置、訊息管理

## 👥 權限系統

### 用戶等級
- **🔧 Superadmin**: 完整系統管理權限
- **👑 Admin**: 群組管理、用戶查看
- **👤 User**: 基礎功能使用

### 用戶角色
- **🎨 UI**: UI 設計師
- **💻 FE**: 前端工程師
- **👤 GENERAL**: 一般職員

## 🔧 環境需求

- Node.js 18+
- Cloudflare 帳戶（免費版可用）
- Telegram Bot Token

## 📊 系統優勢

### 🆓 成本效益
- Cloudflare Workers 免費額度：100,000 請求/天
- D1 免費額度：5GB 儲存空間
- KV 免費額度：100,000 讀取/天

### ⚡ 效能卓越
- 全球 CDN 分發
- 冷啟動時間 < 10ms
- 回應時間 < 100ms

### 🔒 安全可靠
- HTTPS 強制加密
- 多層權限驗證
- 完整操作日誌

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📝 版本歷程

### v2.0.0 (2024-08-28)
- 🎉 全新架構，基於 Cloudflare Workers
- ✨ Vue 3 前端管理面板
- ⏰ 智能遲到回報系統
- 👥 完整權限管理
- 🔧 模組化設計

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 📞 支援

- **GitHub Issues**: [回報問題](https://github.com/hulion/yui-tgbot-v2/issues)
- **Discussions**: [討論交流](https://github.com/hulion/yui-tgbot-v2/discussions)
- **Email**: support@yourdomain.com

## ⭐ 給個星星

如果這個專案對你有幫助，請給我們一個 ⭐！

---

**🚀 現在就開始使用 YUI Telegram Bot v2.0，讓團隊協作更有效率！**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hulion/yui-tgbot-v2)
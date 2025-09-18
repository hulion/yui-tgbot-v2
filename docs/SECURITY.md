# 安全指南

## 敏感資訊管理

### 🚨 重要提醒
**絕對不要將敏感資訊提交到 Git 版本控制中！**

### 敏感資訊清單
以下資訊應被視為敏感資料，絕不可提交到版本控制：
- Telegram Bot Token
- Webhook Secret
- API 金鑰
- 資料庫連線字串
- JWT Secret
- 任何密碼或憑證

## 環境變數設定

### 開發環境

1. 複製範例檔案：
```bash
cp .dev.vars.example .dev.vars
```

2. 編輯 `.dev.vars` 檔案，填入實際的敏感資訊：
```bash
BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ
WEBHOOK_SECRET=your-dev-secret
```

### 生產環境（Cloudflare Workers）

使用 Wrangler CLI 設定 secrets：

```bash
# 設定 Bot Token
wrangler secret put BOT_TOKEN
# 當提示時輸入實際的 Bot Token

# 設定 Webhook Secret
wrangler secret put WEBHOOK_SECRET
# 當提示時輸入實際的 Webhook Secret
```

### 查看已設定的 Secrets

```bash
# 列出所有 secrets（不會顯示實際值）
wrangler secret list
```

### 刪除 Secrets

```bash
# 刪除指定的 secret
wrangler secret delete BOT_TOKEN
```

## Git 安全檢查

### 檢查是否意外提交敏感資訊

```bash
# 檢查目前暫存的檔案
git status

# 檢查將要提交的內容
git diff --cached

# 搜尋可能的敏感資訊
git log --all --grep="token\|secret\|password\|key" -i
```

### 如果意外提交了敏感資訊

⚠️ **立即採取行動**：

1. **立即撤銷敏感資訊**：
   - 撤銷 Telegram Bot Token（透過 @BotFather）
   - 變更所有相關密碼和金鑰

2. **清理 Git 歷史**：
```bash
# 移除最後一次提交（如果還沒推送）
git reset --hard HEAD~1

# 如果已推送，需要強制推送（危險操作）
# 注意：這會影響其他開發者
git push --force
```

3. **徹底清理檔案**：
```bash
# 從所有 Git 歷史中移除檔案
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/sensitive/file' \
  --prune-empty --tag-name-filter cat -- --all
```

## 最佳實務

### 1. 定期檢查
- 每次提交前檢查是否包含敏感資訊
- 定期檢閱 `.gitignore` 檔案
- 使用 `git add` 時逐個檢查檔案

### 2. 使用 Git Hooks
建立 pre-commit hook 檢查敏感資訊：

```bash
#!/bin/sh
# .git/hooks/pre-commit

# 檢查是否包含可能的 Token
if git diff --cached | grep -E "(token|secret|password|key).*=.*[a-zA-Z0-9]{20,}"; then
    echo "警告：發現可能的敏感資訊！"
    echo "請檢查提交內容是否包含 Token 或密碼"
    exit 1
fi
```

### 3. 開發環境隔離
- 開發環境使用假的或測試用的憑證
- 生產環境的憑證只有少數人知道
- 定期輪換密碼和金鑰

### 4. 監控和警報
- 設定 GitHub 的 secret scanning 警報
- 監控是否有未授權的 API 使用
- 定期檢查存取日誌

## 緊急應變計畫

### 如果懷疑憑證洩露：

1. **立即撤銷**所有相關憑證
2. **變更**所有密碼和金鑰
3. **檢查**存取日誌是否有異常活動
4. **通知**團隊成員更新本地設定
5. **檢討**安全流程並改善

## 相關工具

### Git Secrets 檢查工具
```bash
# 安裝 git-secrets
brew install git-secrets

# 設定檢查規則
git secrets --register-aws
git secrets --install

# 掃描現有專案
git secrets --scan
```

### 程式碼掃描工具
- [TruffleHog](https://github.com/dxa4481/truffleHog)
- [GitLeaks](https://github.com/zricethezav/gitleaks)
- [detect-secrets](https://github.com/Yelp/detect-secrets)

---

🔒 **記住：安全是每個人的責任。當有疑問時，寧可謹慎也不要冒險。**
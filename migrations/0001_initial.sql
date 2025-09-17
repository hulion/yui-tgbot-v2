-- 建立用戶資料表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    user_type TEXT DEFAULT 'user' CHECK (user_type IN ('superadmin', 'admin', 'user')),
    user_role TEXT DEFAULT 'UI' CHECK (user_role IN ('UI', 'FE', 'GENERAL')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立群組資料表
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('group', 'supergroup', 'channel')),
    is_active BOOLEAN DEFAULT FALSE,
    permissions TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立功能模組表
CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    permissions TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立群組權限表
CREATE TABLE IF NOT EXISTS group_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    UNIQUE(group_id, module_id)
);

-- 建立系統設定表
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立日誌表
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    module TEXT,
    user_id TEXT,
    group_id TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立遲到回報表
CREATE TABLE IF NOT EXISTS late_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    employee_name TEXT NOT NULL,
    is_before_nine BOOLEAN NOT NULL,
    report_time DATETIME NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    admin_notified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- 插入預設模組
INSERT INTO modules (name, display_name, description) VALUES
('help', '說明功能', '顯示所有可用指令'),
('start', '開始功能', '顯示歡迎訊息和功能選單'),
('info', '用戶資訊', '顯示用戶基本資訊'),
('superadmin', '超級管理員功能', '系統管理員專用功能'),
('group_management', '群組管理', '群組權限管理功能'),
('late_report', '遲到回報', '員工遲到回報系統');

-- 插入預設系統設定
INSERT INTO settings (key, value, description) VALUES
('welcome_message', '歡迎使用 YUI Telegram Bot！🤖', '歡迎訊息內容'),
('timezone', 'Asia/Taipei', '系統時區設定'),
('late_report_cutoff', '09:00', '遲到回報截止時間'),
('environment', 'development', '當前環境');

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_groups_telegram_id ON groups(telegram_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_late_reports_user_group ON late_reports(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_late_reports_created_at ON late_reports(created_at);
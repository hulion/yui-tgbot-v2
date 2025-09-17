-- 建立統計快取表
CREATE TABLE IF NOT EXISTS stats_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立統計專用索引
CREATE INDEX IF NOT EXISTS idx_late_reports_stats 
ON late_reports(created_at, is_before_nine, status);

CREATE INDEX IF NOT EXISTS idx_late_reports_user_stats 
ON late_reports(user_id, created_at, status);

CREATE INDEX IF NOT EXISTS idx_stats_cache_key_expires 
ON stats_cache(cache_key, expires_at);

-- 插入統計相關的預設設定
INSERT OR IGNORE INTO settings (key, value, description) VALUES
('stats_cache_ttl', '3600', '統計快取時間 (秒)'),
('weekly_report_day', '1', '週報產生日 (1=週一)'),
('monthly_report_day', '1', '月報產生日'),
('frontend_base_url', '', '前端基礎 URL');
import { User, Group, Module, GroupPermission, Setting, Log, LateReport, LateReportStats, UserLateStats, StatsCache } from '@/types';

export class Database {
  public db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // 用戶相關方法
  async getUser(telegramId: string): Promise<User | null> {
    const result = await this.db.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(telegramId).first<User>();
    return result || null;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const { telegram_id, username, first_name, last_name, display_name, user_type = 'user', user_role = 'UI' } = userData;
    
    const result = await this.db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, last_name, display_name, user_type, user_role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(telegram_id, username, first_name, last_name, display_name, user_type, user_role).run();

    const user = await this.getUser(telegram_id!);
    return user!;
  }

  async updateUser(telegramId: string, updates: Partial<User>): Promise<User | null> {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), telegramId];
    
    await this.db.prepare(`
      UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
    `).bind(...values).run();

    return this.getUser(telegramId);
  }

  // 群組相關方法
  async getGroup(telegramId: string): Promise<Group | null> {
    const result = await this.db.prepare('SELECT * FROM groups WHERE telegram_id = ?').bind(telegramId).first<Group>();
    return result || null;
  }

  async createGroup(groupData: Partial<Group>): Promise<Group> {
    const { telegram_id, title, type, is_active = false } = groupData;
    
    await this.db.prepare(`
      INSERT INTO groups (telegram_id, title, type, is_active)
      VALUES (?, ?, ?, ?)
    `).bind(telegram_id, title, type, is_active).run();

    const group = await this.getGroup(telegram_id!);
    return group!;
  }

  async updateGroup(telegramId: string, updates: Partial<Group>): Promise<Group | null> {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), telegramId];
    
    await this.db.prepare(`
      UPDATE groups SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
    `).bind(...values).run();

    return this.getGroup(telegramId);
  }

  async toggleGroupStatus(telegramId: string): Promise<boolean> {
    const group = await this.getGroup(telegramId);
    if (!group) return false;

    const newStatus = !group.is_active;
    await this.updateGroup(telegramId, { is_active: newStatus });
    return newStatus;
  }

  // 模組相關方法
  async getModules(): Promise<Module[]> {
    const results = await this.db.prepare('SELECT * FROM modules WHERE is_active = 1').all<Module>();
    return results.results || [];
  }

  async getModule(name: string): Promise<Module | null> {
    const result = await this.db.prepare('SELECT * FROM modules WHERE name = ?').bind(name).first<Module>();
    return result || null;
  }

  // 群組權限相關方法
  async getGroupPermissions(groupId: number): Promise<GroupPermission[]> {
    const results = await this.db.prepare('SELECT * FROM group_permissions WHERE group_id = ?').bind(groupId).all<GroupPermission>();
    return results.results || [];
  }

  async setGroupPermission(groupId: number, moduleId: number, enabled: boolean): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO group_permissions (group_id, module_id, is_enabled)
      VALUES (?, ?, ?)
    `).bind(groupId, moduleId, enabled).run();
  }

  async hasGroupPermission(groupId: number, moduleName: string): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT gp.is_enabled 
      FROM group_permissions gp 
      JOIN modules m ON gp.module_id = m.id 
      WHERE gp.group_id = ? AND m.name = ?
    `).bind(groupId, moduleName).first<{ is_enabled: boolean }>();

    return result?.is_enabled || false;
  }

  // 系統設定相關方法
  async getSetting(key: string): Promise<string | null> {
    const result = await this.db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
    return result?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(key, value).run();
  }

  // 日誌相關方法
  async addLog(level: string, message: string, module?: string, userId?: string, groupId?: string, metadata?: any): Promise<void> {
    await this.db.prepare(`
      INSERT INTO logs (level, message, module, user_id, group_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(level, message, module, userId, groupId, JSON.stringify(metadata)).run();
  }

  async getLogs(limit: number = 100, offset: number = 0): Promise<Log[]> {
    const results = await this.db.prepare(`
      SELECT * FROM logs 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all<Log>();
    return results.results || [];
  }

  // 遲到回報相關方法
  async createLateReport(reportData: Partial<LateReport>): Promise<LateReport> {
    const { user_id, group_id, employee_name, is_before_nine, report_time, reason } = reportData;
    
    const result = await this.db.prepare(`
      INSERT INTO late_reports (user_id, group_id, employee_name, is_before_nine, report_time, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(user_id, group_id, employee_name, is_before_nine, report_time, reason).run();

    // 清除相關的統計快取
    await this.clearStatsCache(user_id);

    const report = await this.db.prepare('SELECT * FROM late_reports WHERE id = ?').bind(result.meta.last_row_id).first<LateReport>();
    return report!;
  }

  async getLateReports(limit: number = 50): Promise<LateReport[]> {
    const results = await this.db.prepare(`
      SELECT lr.*, u.display_name as user_name, g.title as group_title
      FROM late_reports lr
      JOIN users u ON lr.user_id = u.id
      JOIN groups g ON lr.group_id = g.id
      ORDER BY lr.created_at DESC
      LIMIT ?
    `).bind(limit).all<LateReport>();
    return results.results || [];
  }

  async updateLateReport(id: number, updates: Partial<LateReport>): Promise<LateReport | null> {
    // 先獲取原始記錄以便清除快取
    const originalReport = await this.db.prepare('SELECT user_id FROM late_reports WHERE id = ?').bind(id).first();
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    await this.db.prepare(`
      UPDATE late_reports SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(...values).run();

    // 清除相關的統計快取
    if (originalReport) {
      await this.clearStatsCache((originalReport as any).user_id);
    }

    const report = await this.db.prepare('SELECT * FROM late_reports WHERE id = ?').bind(id).first<LateReport>();
    return report || null;
  }

  // 統計相關方法
  async getLateReportStatsWithCache(period: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string): Promise<any> {
    // 生成快取鍵
    const cacheKey = `late_stats_${period}_${startDate || 'auto'}_${endDate || 'auto'}`;
    
    // 嘗試從快取獲取
    const cachedData = await this.getStatsCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 快取未命中，計算統計資料
    const stats = await this.getLateReportStats(period, startDate, endDate);
    
    // 獲取快取 TTL 設定
    const ttlSetting = await this.getSetting('stats_cache_ttl');
    const ttl = ttlSetting ? parseInt(ttlSetting) : 3600;
    
    // 存入快取
    await this.setStatsCache(cacheKey, stats, ttl);
    
    return stats;
  }

  async getLateReportStats(period: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string): Promise<any> {
    // 計算日期範圍
    const { start, end } = this.calculateDateRange(period, startDate, endDate);
    
    // 基本統計查詢
    const basicStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN is_before_nine = 1 THEN 1 ELSE 0 END) as on_time_reports,
        SUM(CASE WHEN is_before_nine = 0 THEN 1 ELSE 0 END) as late_reports
      FROM late_reports 
      WHERE status = 'processed' 
        AND created_at >= ? 
        AND created_at <= ?
    `).bind(start, end).first();

    // 按原因統計
    const reasonStats = await this.db.prepare(`
      SELECT 
        COALESCE(reason, '無說明') as reason,
        COUNT(*) as count
      FROM late_reports 
      WHERE status = 'processed' 
        AND created_at >= ? 
        AND created_at <= ?
      GROUP BY reason
      ORDER BY count DESC
    `).bind(start, end).all();

    // 按用戶統計
    const userStats = await this.db.prepare(`
      SELECT 
        lr.user_id,
        u.display_name as user_name,
        COUNT(*) as total,
        SUM(CASE WHEN lr.is_before_nine = 1 THEN 1 ELSE 0 END) as on_time,
        SUM(CASE WHEN lr.is_before_nine = 0 THEN 1 ELSE 0 END) as late
      FROM late_reports lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.status = 'processed' 
        AND lr.created_at >= ? 
        AND lr.created_at <= ?
      GROUP BY lr.user_id, u.display_name
      ORDER BY total DESC
    `).bind(start, end).all();

    // 組織回傳資料
    const byReason: Record<string, number> = {};
    (reasonStats.results || []).forEach((row: any) => {
      byReason[row.reason] = row.count;
    });

    return {
      period,
      start_date: start,
      end_date: end,
      total_reports: (basicStats as any)?.total_reports || 0,
      on_time_reports: (basicStats as any)?.on_time_reports || 0,
      late_reports: (basicStats as any)?.late_reports || 0,
      by_reason: byReason,
      by_user: userStats.results || []
    };
  }

  async getUserLateStatsWithCache(userId: number, limit: number = 30): Promise<any> {
    // 生成快取鍵
    const cacheKey = `user_stats_${userId}_${limit}`;
    
    // 嘗試從快取獲取
    const cachedData = await this.getStatsCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 快取未命中，計算統計資料
    const stats = await this.getUserLateStats(userId, limit);
    
    // 用戶統計快取時間較短（15分鐘）
    await this.setStatsCache(cacheKey, stats, 900);
    
    return stats;
  }

  async getUserLateStats(userId: number, limit: number = 30): Promise<any> {
    // 用戶基本統計
    const basicStats = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN is_before_nine = 1 THEN 1 ELSE 0 END) as on_time_reports,
        SUM(CASE WHEN is_before_nine = 0 THEN 1 ELSE 0 END) as late_reports
      FROM late_reports 
      WHERE user_id = ? AND status = 'processed'
    `).bind(userId).first();

    // 用戶資訊
    const user = await this.db.prepare(`
      SELECT display_name FROM users WHERE id = ?
    `).bind(userId).first();

    // 最近的回報記錄
    const recentReports = await this.db.prepare(`
      SELECT lr.*, g.title as group_title
      FROM late_reports lr
      JOIN groups g ON lr.group_id = g.id
      WHERE lr.user_id = ? AND lr.status = 'processed'
      ORDER BY lr.created_at DESC
      LIMIT ?
    `).bind(userId, limit).all();

    // 按原因統計
    const reasonStats = await this.db.prepare(`
      SELECT 
        COALESCE(reason, '無說明') as reason,
        COUNT(*) as count
      FROM late_reports 
      WHERE user_id = ? AND status = 'processed'
      GROUP BY reason
      ORDER BY count DESC
    `).bind(userId).all();

    const totalReports = (basicStats as any)?.total_reports || 0;
    const onTimeReports = (basicStats as any)?.on_time_reports || 0;
    const onTimePercentage = totalReports > 0 ? Math.round((onTimeReports / totalReports) * 100) : 0;

    const byReason: Record<string, number> = {};
    (reasonStats.results || []).forEach((row: any) => {
      byReason[row.reason] = row.count;
    });

    return {
      user_id: userId,
      user_name: (user as any)?.display_name || '未知用戶',
      total_reports: totalReports,
      on_time_reports: onTimeReports,
      late_reports: (basicStats as any)?.late_reports || 0,
      on_time_percentage: onTimePercentage,
      recent_reports: recentReports.results || [],
      by_reason: byReason
    };
  }

  // 快取相關方法
  async getStatsCache(cacheKey: string): Promise<any | null> {
    const result = await this.db.prepare(`
      SELECT data FROM stats_cache 
      WHERE cache_key = ? AND expires_at > datetime('now')
    `).bind(cacheKey).first();

    if (result) {
      try {
        return JSON.parse((result as any).data);
      } catch (error) {
        console.error('Failed to parse cached stats:', error);
        return null;
      }
    }
    return null;
  }

  async setStatsCache(cacheKey: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    await this.db.prepare(`
      INSERT OR REPLACE INTO stats_cache (cache_key, data, expires_at)
      VALUES (?, ?, ?)
    `).bind(cacheKey, JSON.stringify(data), expiresAt).run();
  }

  async clearExpiredCache(): Promise<void> {
    await this.db.prepare(`
      DELETE FROM stats_cache WHERE expires_at <= datetime('now')
    `).run();
  }

  async clearStatsCache(userId?: number): Promise<void> {
    if (userId) {
      // 清除特定用戶的快取
      await this.db.prepare(`
        DELETE FROM stats_cache WHERE cache_key LIKE ?
      `).bind(`%user_stats_${userId}%`).run();
    }
    
    // 清除所有統計快取（當有新的遲到回報時，所有統計都可能受影響）
    await this.db.prepare(`
      DELETE FROM stats_cache WHERE cache_key LIKE 'late_stats_%'
    `).run();
  }

  // 輔助方法：計算日期範圍
  private calculateDateRange(period: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string): { start: string, end: string } {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (period) {
        case 'daily':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'weekly':
          const dayOfWeek = now.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
          end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
          break;
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
      }
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
}
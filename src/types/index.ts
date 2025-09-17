// 用戶相關類型定義
export interface User {
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

// 群組相關類型定義
export interface Group {
  id: number;
  telegram_id: string;
  title: string;
  type: 'group' | 'supergroup' | 'channel';
  is_active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// 模組相關類型定義
export interface Module {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// 群組權限相關類型定義
export interface GroupPermission {
  id: number;
  group_id: number;
  module_id: number;
  is_enabled: boolean;
  created_at: string;
}

// 系統設定相關類型定義
export interface Setting {
  id: number;
  key: string;
  value?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// 日誌相關類型定義
export interface Log {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  module?: string;
  user_id?: string;
  group_id?: string;
  metadata?: string;
  created_at: string;
}

// 遲到回報相關類型定義
export interface LateReport {
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

// Cloudflare Workers 環境類型
export interface Env {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  ENVIRONMENT: 'development' | 'production';
  DB: D1Database;
  CACHE: KVNamespace;
}

// Bot 上下文類型
export interface BotContext {
  env: Env;
  user?: User;
  group?: Group;
  isPrivate: boolean;
  isGroup: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

// 統計相關類型定義
export interface LateReportStats {
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

export interface UserLateStats {
  user_id: number;
  user_name: string;
  total_reports: number;
  on_time_reports: number;
  late_reports: number;
  on_time_percentage: number;
  recent_reports: LateReport[];
  by_reason: Record<string, number>;
}

export interface StatsCache {
  id: number;
  cache_key: string;
  data: string;
  expires_at: string;
  created_at: string;
}

// API 回應類型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
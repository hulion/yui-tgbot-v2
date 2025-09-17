// 時間相關工具函數
export function getTaiwanTime(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
}

export function isBeforeNineAM(date: Date): boolean {
  const taiwanTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  return taiwanTime.getHours() < 9;
}

export function formatTaiwanTime(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

// 日誌工具函數
export class Logger {
  private db: any;
  private module: string;

  constructor(db: any, module: string = 'system') {
    this.db = db;
    this.module = module;
  }

  async info(message: string, userId?: string, groupId?: string, metadata?: any): Promise<void> {
    await this.db.addLog('info', message, this.module, userId, groupId, metadata);
    console.log(`[INFO][${this.module}] ${message}`, metadata);
  }

  async warn(message: string, userId?: string, groupId?: string, metadata?: any): Promise<void> {
    await this.db.addLog('warn', message, this.module, userId, groupId, metadata);
    console.warn(`[WARN][${this.module}] ${message}`, metadata);
  }

  async error(message: string, userId?: string, groupId?: string, metadata?: any): Promise<void> {
    await this.db.addLog('error', message, this.module, userId, groupId, metadata);
    console.error(`[ERROR][${this.module}] ${message}`, metadata);
  }

  async debug(message: string, userId?: string, groupId?: string, metadata?: any): Promise<void> {
    await this.db.addLog('debug', message, this.module, userId, groupId, metadata);
    console.debug(`[DEBUG][${this.module}] ${message}`, metadata);
  }
}

// 權限檢查工具函數
export function checkPermission(userType: string, requiredPermission: string): boolean {
  const permissions: Record<string, string[]> = {
    'superadmin': ['all'],
    'admin': ['user_management', 'group_management', 'module_management'],
    'user': ['basic_functions']
  };

  return permissions[userType]?.includes('all') || 
         permissions[userType]?.includes(requiredPermission) || false;
}

// 環境檢測工具函數
export function getEnvironment(env: any): 'development' | 'production' {
  return env.ENVIRONMENT || 'development';
}

export function isDevelopment(env: any): boolean {
  return getEnvironment(env) === 'development';
}

export function isProduction(env: any): boolean {
  return getEnvironment(env) === 'production';
}

// 遲到相關關鍵字檢測
export function detectLateKeywords(message: string): boolean {
  const lateKeywords = [
    '遲到', '晚到', '晚點到', '遲點到', '會晚到', '會遲到',
    '晚一點', '遲一點', '延遲到達', '延後到達',
    '塞車', '路況', '交通', '來不及', '趕不上',
    '有事', '臨時', '抱歉', '不好意思'
  ];

  return lateKeywords.some(keyword => message.includes(keyword));
}

// 從訊息中提取遲到原因
export function extractLateReason(message: string): string | null {
  const reasonKeywords = [
    '因為', '由於', '原因是', '是因為',
    '塞車', '路況', '交通', '公車', '捷運', '開車',
    '身體', '不舒服', '生病', '發燒',
    '家裡', '家中', '小孩', '家人',
    '臨時', '突然', '緊急',
    '忘記', '睡過頭', '鬧鐘'
  ];

  for (const keyword of reasonKeywords) {
    if (message.includes(keyword)) {
      const index = message.indexOf(keyword);
      const reason = message.substring(index, index + 50).trim();
      return reason || null;
    }
  }

  return message.length > 10 ? message : null;
}

// API 回應工具函數
export function createApiResponse<T = any>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
) {
  return {
    success,
    data,
    message,
    error
  };
}

// 快取工具函數
export class Cache {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.kv.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T = any>(key: string, value: T, expirationTtl?: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), { expirationTtl });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.kv.get(key);
    return value !== null;
  }
}

// 字串工具函數
export function truncate(str: string, length: number = 100): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Telegram 訊息格式化工具
export function formatUserMention(userId: string, name: string): string {
  return `<a href="tg://user?id=${userId}">${escapeHtml(name)}</a>`;
}

export function formatCode(text: string): string {
  return `<code>${escapeHtml(text)}</code>`;
}

export function formatBold(text: string): string {
  return `<b>${escapeHtml(text)}</b>`;
}

export function formatItalic(text: string): string {
  return `<i>${escapeHtml(text)}</i>`;
}
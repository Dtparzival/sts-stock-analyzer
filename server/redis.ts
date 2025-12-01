import Redis from 'ioredis';

/**
 * Redis 連線配置模組
 * 
 * 提供 Redis 快取功能，用於優化推薦系統效能
 * - 快取推薦結果（TTL 5-10 分鐘）
 * - 減少資料庫查詢次數
 * - 提升首屏載入速度
 */

let redisClient: Redis | null = null;

/**
 * 取得 Redis 客戶端實例
 * 
 * 使用單例模式確保只建立一個連線
 * 支援本地開發環境（無 Redis）和生產環境（有 Redis）
 */
export function getRedisClient(): Redis | null {
  // 如果已經有實例，直接返回
  if (redisClient) {
    return redisClient;
  }

  // 檢查是否有 Redis 連線配置
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not configured, caching will be disabled');
    return null;
  }

  try {
    // 建立 Redis 連線
    // 禁用 enableReadyCheck 以避免 INFO 命令引起的認證問題
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[Redis] Max retries reached, giving up');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // 只在特定錯誤時重連
          return true;
        }
        return false;
      },
    });

    // 監聽連線事件
    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    return null;
  }
}

/**
 * 關閉 Redis 連線
 * 
 * 在應用程式關閉時呼叫，確保資源正確釋放
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('[Redis] Connection closed gracefully');
    } catch (error) {
      console.error('[Redis] Error closing connection:', error);
    }
  }
}

/**
 * 快取輔助函數：取得快取資料
 * 
 * @param key 快取鍵
 * @returns 快取資料（JSON 解析後）或 null
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  
  if (!client) {
    return null;
  }

  try {
    const data = await client.get(key);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`[Redis] Error getting cached data for key "${key}":`, error);
    return null;
  }
}

/**
 * 快取輔助函數：設定快取資料
 * 
 * @param key 快取鍵
 * @param data 要快取的資料
 * @param ttl 過期時間（秒），預設 300 秒（5 分鐘）
 * @returns 是否成功設定快取
 */
export async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number = 300
): Promise<boolean> {
  const client = getRedisClient();
  
  if (!client) {
    return false;
  }

  try {
    const serialized = JSON.stringify(data);
    await client.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`[Redis] Error setting cached data for key "${key}":`, error);
    return false;
  }
}

/**
 * 快取輔助函數：刪除快取資料
 * 
 * @param key 快取鍵
 * @returns 是否成功刪除快取
 */
export async function deleteCachedData(key: string): Promise<boolean> {
  const client = getRedisClient();
  
  if (!client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`[Redis] Error deleting cached data for key "${key}":`, error);
    return false;
  }
}

/**
 * 快取輔助函數：批次刪除快取資料（支援萬用字元）
 * 
 * @param pattern 快取鍵模式（例如：'user:123:*'）
 * @returns 刪除的鍵數量
 */
export async function deleteCachedDataByPattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  
  if (!client) {
    return 0;
  }

  try {
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    await client.del(...keys);
    return keys.length;
  } catch (error) {
    console.error(`[Redis] Error deleting cached data by pattern "${pattern}":`, error);
    return 0;
  }
}

/**
 * 快取輔助函數：檢查快取是否存在
 * 
 * @param key 快取鍵
 * @returns 快取是否存在
 */
export async function hasCachedData(key: string): Promise<boolean> {
  const client = getRedisClient();
  
  if (!client) {
    return false;
  }

  try {
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`[Redis] Error checking cached data for key "${key}":`, error);
    return false;
  }
}

/**
 * 快取鍵生成器：推薦結果快取鍵
 * 
 * @param userId 用戶 ID
 * @returns 快取鍵
 */
export function getRecommendationCacheKey(userId: number): string {
  return `recommendation:user:${userId}`;
}

/**
 * 快取鍵生成器：用戶行為快取鍵模式
 * 
 * @param userId 用戶 ID
 * @returns 快取鍵模式（用於批次刪除）
 */
export function getUserBehaviorCachePattern(userId: number): string {
  return `recommendation:user:${userId}*`;
}

/**
 * ==================== 台股資料快取相關函數 ====================
 */

/**
 * 快取鍵生成器：台股基本資料快取鍵
 * TTL: 24 小時
 * 
 * @param symbol 股票代號
 * @returns 快取鍵
 */
export function getTwStockInfoCacheKey(symbol: string): string {
  return `twstock:info:${symbol}`;
}

/**
 * 快取鍵生成器：台股即時報價快取鍵
 * TTL: 1 分鐘
 * 
 * @param symbol 股票代號
 * @returns 快取鍵
 */
export function getTwStockQuoteCacheKey(symbol: string): string {
  return `twstock:quote:${symbol}`;
}

/**
 * 快取鍵生成器：台股歷史價格快取鍵
 * TTL: 6 小時
 * 
 * @param symbol 股票代號
 * @param startDate 開始日期（YYYY-MM-DD）
 * @param endDate 結束日期（YYYY-MM-DD）
 * @returns 快取鍵
 */
export function getTwStockPricesCacheKey(symbol: string, startDate: string, endDate: string): string {
  return `twstock:prices:${symbol}:${startDate}:${endDate}`;
}

/**
 * 快取鍵生成器：台股技術指標快取鍵
 * TTL: 6 小時
 * 
 * @param symbol 股票代號
 * @param date 日期（YYYY-MM-DD）
 * @returns 快取鍵
 */
export function getTwStockIndicatorsCacheKey(symbol: string, date: string): string {
  return `twstock:indicators:${symbol}:${date}`;
}

/**
 * 快取鍵生成器：台股基本面資料快取鍵
 * TTL: 24 小時
 * 
 * @param symbol 股票代號
 * @param year 年度
 * @param quarter 季度
 * @returns 快取鍵
 */
export function getTwStockFundamentalsCacheKey(symbol: string, year: number, quarter: number): string {
  return `twstock:fundamentals:${symbol}:${year}:Q${quarter}`;
}

/**
 * 快取鍵生成器：台股列表快取鍵
 * TTL: 24 小時
 * 
 * @param market 市場類別（上市/上櫃/興櫃）
 * @returns 快取鍵
 */
export function getTwStockListCacheKey(market?: string): string {
  return market ? `twstock:list:${market}` : 'twstock:list:all';
}

/**
 * 快取 TTL 常數（秒）
 */
export const TW_STOCK_CACHE_TTL = {
  INFO: 24 * 60 * 60,        // 24 小時
  QUOTE: 60,                  // 1 分鐘
  PRICES: 6 * 60 * 60,        // 6 小時
  INDICATORS: 6 * 60 * 60,    // 6 小時
  FUNDAMENTALS: 24 * 60 * 60, // 24 小時
  LIST: 24 * 60 * 60,         // 24 小時
};

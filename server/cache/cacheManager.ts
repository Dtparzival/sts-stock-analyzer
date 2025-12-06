/**
 * 快取管理模組
 * 
 * 實作多層快取策略:
 * 1. Redis (記憶體快取) - 最快,但容量有限
 * 2. MySQL (資料庫快取) - 較慢,但容量大
 * 3. API (外部資料源) - 最慢,但資料最新
 * 
 * 快取策略:
 * - 即時報價: 快取 1 分鐘
 * - 歷史價格: 快取 24 小時
 * - 股票基本資料: 快取 7 天
 */

import { createClient, RedisClientType } from 'redis';
import {
  getStockDataCache,
  setStockDataCache,
  deleteExpiredCache,
} from '../db_us';

/**
 * Redis 客戶端實例
 */
let redisClient: RedisClientType | null = null;

/**
 * 初始化 Redis 連線
 */
export async function initRedisClient(): Promise<void> {
  if (redisClient) {
    return;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[Cache] REDIS_URL not configured, Redis cache disabled');
      return;
    }

    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', (err) => {
      console.error('[Cache] Redis client error:', err);
    });

    await redisClient.connect();
    console.log('[Cache] Redis client connected');
  } catch (error) {
    console.error('[Cache] Failed to connect to Redis:', error);
    redisClient = null;
  }
}

/**
 * 關閉 Redis 連線
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Cache] Redis client disconnected');
  }
}

/**
 * 快取鍵前綴
 */
const CACHE_PREFIX = {
  QUOTE: 'us:quote:',
  PRICE: 'us:price:',
  STOCK: 'us:stock:',
};

/**
 * 快取過期時間 (秒)
 */
export const CACHE_TTL = {
  QUOTE: 60, // 1 分鐘
  PRICE: 86400, // 24 小時
  STOCK: 604800, // 7 天
};

/**
 * 快取資料類型
 */
export type CacheDataType = 'quote' | 'price' | 'stock';

/**
 * 取得快取鍵
 */
function getCacheKey(type: CacheDataType, identifier: string): string {
  switch (type) {
    case 'quote':
      return `${CACHE_PREFIX.QUOTE}${identifier}`;
    case 'price':
      return `${CACHE_PREFIX.PRICE}${identifier}`;
    case 'stock':
      return `${CACHE_PREFIX.STOCK}${identifier}`;
  }
}

/**
 * 從 Redis 取得快取
 */
async function getFromRedis<T>(key: string): Promise<T | null> {
  if (!redisClient) {
    return null;
  }

  try {
    const data = await redisClient.get(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as T;
  } catch (error) {
    console.error('[Cache] Failed to get from Redis:', error);
    return null;
  }
}

/**
 * 寫入 Redis 快取
 */
async function setToRedis(key: string, data: unknown, ttl: number): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('[Cache] Failed to set to Redis:', error);
  }
}

/**
 * 從 MySQL 取得快取
 */
async function getFromMySQL<T>(
  dataType: CacheDataType,
  identifier: string
): Promise<T | null> {
  try {
    const cacheKey = `${dataType}:${identifier}`;
    const cache = await getStockDataCache(cacheKey);
    if (!cache) {
      return null;
    }

    // 檢查是否過期 (已由 getStockDataCache 處理)
    return JSON.parse(cache.data) as T;
  } catch (error) {
    console.error('[Cache] Failed to get from MySQL:', error);
    return null;
  }
}

/**
 * 寫入 MySQL 快取
 */
async function setToMySQL(
  dataType: CacheDataType,
  identifier: string,
  data: unknown,
  ttl: number
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);
    const cacheKey = `${dataType}:${identifier}`;

    await setStockDataCache({
      cacheKey,
      market: 'US',
      symbol: identifier,
      dataType,
      data: JSON.stringify(data),
      expiresAt,
    });
  } catch (error) {
    console.error('[Cache] Failed to set to MySQL:', error);
  }
}

/**
 * 取得快取資料
 * 
 * 查詢順序: Redis → MySQL → null
 * 
 * @param type 資料類型
 * @param identifier 識別碼 (例如股票代號)
 * @returns 快取資料或 null
 */
export async function getCache<T>(
  type: CacheDataType,
  identifier: string
): Promise<T | null> {
  const key = getCacheKey(type, identifier);

  // 1. 先查 Redis
  const redisData = await getFromRedis<T>(key);
  if (redisData) {
    console.log(`[Cache] Hit from Redis: ${key}`);
    return redisData;
  }

  // 2. 再查 MySQL
  const mysqlData = await getFromMySQL<T>(type, identifier);
  if (mysqlData) {
    console.log(`[Cache] Hit from MySQL: ${key}`);

    // 回寫到 Redis
    const ttl = type === 'quote' ? CACHE_TTL.QUOTE : type === 'price' ? CACHE_TTL.PRICE : CACHE_TTL.STOCK;
    await setToRedis(key, mysqlData, ttl);

    return mysqlData;
  }

  console.log(`[Cache] Miss: ${key}`);
  return null;
}

/**
 * 設定快取資料
 * 
 * 同時寫入 Redis 和 MySQL
 * 
 * @param type 資料類型
 * @param identifier 識別碼
 * @param data 快取資料
 */
export async function setCache(
  type: CacheDataType,
  identifier: string,
  data: unknown
): Promise<void> {
  const key = getCacheKey(type, identifier);
  const ttl = type === 'quote' ? CACHE_TTL.QUOTE : type === 'price' ? CACHE_TTL.PRICE : CACHE_TTL.STOCK;

  // 同時寫入 Redis 和 MySQL
  await Promise.all([
    setToRedis(key, data, ttl),
    setToMySQL(type, identifier, data, ttl),
  ]);

  console.log(`[Cache] Set: ${key} (TTL: ${ttl}s)`);
}

/**
 * 清除特定快取
 * 
 * @param type 資料類型
 * @param identifier 識別碼
 */
export async function clearCache(
  type: CacheDataType,
  identifier: string
): Promise<void> {
  const key = getCacheKey(type, identifier);

  // 從 Redis 刪除
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('[Cache] Failed to delete from Redis:', error);
    }
  }

  // 從 MySQL 刪除 (透過設定過期時間為過去)
  try {
    const cacheKey = `${type}:${identifier}`;
    await setStockDataCache({
      cacheKey,
      market: 'US',
      symbol: identifier,
      dataType: type,
      data: '{}',
      expiresAt: new Date(0),
    });
  } catch (error) {
    console.error('[Cache] Failed to delete from MySQL:', error);
  }

  console.log(`[Cache] Cleared: ${key}`);
}

/**
 * 清除所有過期快取 (僅 MySQL)
 * 
 * 定期執行此函數以清理過期的 MySQL 快取
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    await deleteExpiredCache();
    console.log('[Cache] Cleared expired cache entries from MySQL');
  } catch (error) {
    console.error('[Cache] Failed to clear expired cache:', error);
  }
}

/**
 * 批次取得快取
 * 
 * @param type 資料類型
 * @param identifiers 識別碼列表
 * @returns 快取資料對應表 (identifier -> data)
 */
export async function batchGetCache<T>(
  type: CacheDataType,
  identifiers: string[]
): Promise<Map<string, T>> {
  const result = new Map<string, T>();

  // 並行查詢所有快取
  await Promise.all(
    identifiers.map(async (identifier) => {
      const data = await getCache<T>(type, identifier);
      if (data) {
        result.set(identifier, data);
      }
    })
  );

  return result;
}

/**
 * 批次設定快取
 * 
 * @param type 資料類型
 * @param entries 快取項目 (identifier -> data)
 */
export async function batchSetCache(
  type: CacheDataType,
  entries: Map<string, unknown>
): Promise<void> {
  // 並行寫入所有快取
  await Promise.all(
    Array.from(entries.entries()).map(([identifier, data]) =>
      setCache(type, identifier, data)
    )
  );
}

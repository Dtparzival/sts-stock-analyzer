/**
 * 台股資料 Redis 快取輔助函數
 * 提供統一的快取鍵設計和 TTL 策略
 */

import { getRedisClient } from '../redis';

// 快取鍵前綴
const CACHE_PREFIX = 'tw:stock';

// TTL 策略（秒）
export const CacheTTL = {
  STOCK_INFO: 24 * 60 * 60,        // 基本資料：24 小時
  STOCK_QUOTE: 60,                 // 即時報價：1 分鐘
  STOCK_PRICES: 6 * 60 * 60,       // 歷史價格：6 小時
  STOCK_INDICATORS: 6 * 60 * 60,   // 技術指標：6 小時
  STOCK_FUNDAMENTALS: 24 * 60 * 60, // 基本面資料：24 小時
} as const;

/**
 * 快取鍵生成器
 */
export const CacheKey = {
  /**
   * 股票基本資料快取鍵
   */
  stockInfo: (symbol: string) => `${CACHE_PREFIX}:info:${symbol}`,

  /**
   * 即時報價快取鍵
   */
  stockQuote: (symbol: string) => `${CACHE_PREFIX}:quote:${symbol}`,

  /**
   * 歷史價格快取鍵
   */
  stockPrices: (symbol: string, startDate: string, endDate: string) =>
    `${CACHE_PREFIX}:prices:${symbol}:${startDate}:${endDate}`,

  /**
   * 技術指標快取鍵
   */
  stockIndicators: (symbol: string, date: string) =>
    `${CACHE_PREFIX}:indicators:${symbol}:${date}`,

  /**
   * 基本面資料快取鍵
   */
  stockFundamentals: (symbol: string, year: number, quarter: number) =>
    `${CACHE_PREFIX}:fundamentals:${symbol}:${year}:${quarter}`,

  /**
   * 股票列表快取鍵
   */
  stockList: (market: 'TWSE' | 'TPEx') => `${CACHE_PREFIX}:list:${market}`,
} as const;

/**
 * 從 Redis 取得快取資料
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return null;
    }

    const data = await redis.get(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Redis getCache 錯誤 (key: ${key}):`, error);
    return null;
  }
}

/**
 * 將資料寫入 Redis 快取
 */
export async function setCache<T>(key: string, value: T, ttl: number): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return false;
    }

    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Redis setCache 錯誤 (key: ${key}):`, error);
    return false;
  }
}

/**
 * 刪除 Redis 快取
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return false;
    }

    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Redis deleteCache 錯誤 (key: ${key}):`, error);
    return false;
  }
}

/**
 * 批量刪除 Redis 快取（使用模式匹配）
 */
export async function deleteCachePattern(pattern: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return false;
    }

    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (error) {
    console.error(`Redis deleteCachePattern 錯誤 (pattern: ${pattern}):`, error);
    return false;
  }
}

/**
 * 分散式鎖：取得鎖
 */
export async function acquireLock(lockKey: string, ttl: number = 10): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return false;
    }

    const result = await redis.set(lockKey, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error(`Redis acquireLock 錯誤 (lockKey: ${lockKey}):`, error);
    return false;
  }
}

/**
 * 分散式鎖：釋放鎖
 */
export async function releaseLock(lockKey: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return false;
    }

    await redis.del(lockKey);
    return true;
  } catch (error) {
    console.error(`Redis releaseLock 錯誤 (lockKey: ${lockKey}):`, error);
    return false;
  }
}

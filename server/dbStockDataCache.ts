import { eq, lt } from "drizzle-orm";
import { getDb } from "./db";
import { stockDataCache } from "../drizzle/schema";
import crypto from "crypto";

/**
 * 資料庫股票數據緩存服務
 * 提供持久化緩存功能，跨服務器重啟保持數據
 */

/**
 * 生成緩存鍵
 */
function generateCacheKey(apiEndpoint: string, params: Record<string, any>): string {
  const paramsStr = JSON.stringify(params, Object.keys(params).sort());
  const hash = crypto.createHash('md5').update(`${apiEndpoint}:${paramsStr}`).digest('hex');
  return `${apiEndpoint}:${hash}`;
}

/**
 * 從資料庫獲取緩存數據
 */
export async function getCache(apiEndpoint: string, params: Record<string, any>): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const cacheKey = generateCacheKey(apiEndpoint, params);
  
  try {
    const result = await db
      .select()
      .from(stockDataCache)
      .where(eq(stockDataCache.cacheKey, cacheKey))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const cache = result[0];
    
    // 檢查是否過期
    if (cache.expiresAt < new Date()) {
      console.log(`[DB Cache] Cache expired for ${apiEndpoint}`);
      return null;
    }

    console.log(`[DB Cache] Cache hit for ${apiEndpoint}`);
    return JSON.parse(cache.data);
  } catch (error) {
    console.error('[DB Cache] Error getting cache:', error);
    return null;
  }
}

/**
 * 將數據存儲到資料庫緩存
 */
export async function setCache(
  apiEndpoint: string,
  params: Record<string, any>,
  data: any,
  ttlMs: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const cacheKey = generateCacheKey(apiEndpoint, params);
  const expiresAt = new Date(Date.now() + ttlMs);

  try {
    // 使用 INSERT ... ON DUPLICATE KEY UPDATE 更新或插入
    await db
      .insert(stockDataCache)
      .values({
        cacheKey,
        apiEndpoint,
        data: JSON.stringify(data),
        expiresAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          data: JSON.stringify(data),
          expiresAt,
          createdAt: new Date(),
        },
      });

    console.log(`[DB Cache] Cache set for ${apiEndpoint}, expires at ${expiresAt.toISOString()}`);
  } catch (error) {
    console.error('[DB Cache] Error setting cache:', error);
  }
}

/**
 * 清理過期的緩存數據
 */
export async function cleanupExpiredCache(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const result = await db
      .delete(stockDataCache)
      .where(lt(stockDataCache.expiresAt, new Date()));

    console.log(`[DB Cache] Cleaned up expired cache entries`);
  } catch (error) {
    console.error('[DB Cache] Error cleaning up cache:', error);
  }
}

/**
 * 獲取過期緩存（用於降級處理）
 */
export async function getStaleCache(apiEndpoint: string, params: Record<string, any>): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const cacheKey = generateCacheKey(apiEndpoint, params);
  
  try {
    const result = await db
      .select()
      .from(stockDataCache)
      .where(eq(stockDataCache.cacheKey, cacheKey))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    console.log(`[DB Cache] Returning stale cache for ${apiEndpoint}`);
    return JSON.parse(result[0].data);
  } catch (error) {
    console.error('[DB Cache] Error getting stale cache:', error);
    return null;
  }
}

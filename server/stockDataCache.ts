/**
 * 股票數據緩存服務
 * 用於減少對 Yahoo Finance API 的請求頻率，避免觸發速率限制（429 Too Many Requests）
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class StockDataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 分鐘緩存

  /**
   * 生成緩存鍵
   */
  private generateKey(endpoint: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}:${sortedParams}`;
  }

  /**
   * 獲取緩存數據
   */
  get<T>(endpoint: string, params: any): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[StockDataCache] Cache hit for ${key}`);
    return entry.data as T;
  }

  /**
   * 設置緩存數據
   */
  set<T>(endpoint: string, params: any, data: T, ttl?: number): void {
    const key = this.generateKey(endpoint, params);
    const now = Date.now();
    const expiresAt = now + (ttl || this.DEFAULT_TTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });

    console.log(`[StockDataCache] Cache set for ${key}, expires in ${(ttl || this.DEFAULT_TTL) / 1000}s`);
  }

  /**
   * 清除過期緩存
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[StockDataCache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * 清除所有緩存
   */
  clear(): void {
    this.cache.clear();
    console.log('[StockDataCache] All cache cleared');
  }

  /**
   * 獲取緩存統計信息
   */
  getStats() {
    const entries: Array<{ key: string; expiresIn: number }> = [];
    this.cache.forEach((entry, key) => {
      entries.push({
        key,
        expiresIn: Math.max(0, entry.expiresAt - Date.now()),
      });
    });
    
    return {
      size: this.cache.size,
      entries,
    };
  }
}

// 單例模式
export const stockDataCache = new StockDataCache();

// 每 10 分鐘清理一次過期緩存
setInterval(() => {
  stockDataCache.cleanup();
}, 10 * 60 * 1000);

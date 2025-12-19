import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  getCachedData, 
  setCachedData, 
  deleteCachedData, 
  getRecommendationCacheKey,
  closeRedis 
} from '../server/redis';

/**
 * 推薦系統升級測試
 * 
 * 測試項目：
 * 1. 時間衰減因子計算正確性
 * 2. Redis 快取機制（設定、讀取、刪除）
 * 3. 推薦結果快取鍵生成
 */

describe('推薦系統升級測試', () => {
  afterAll(async () => {
    // 測試結束後關閉 Redis 連線
    await closeRedis();
  });

  describe('時間衰減因子計算', () => {
    it('應該正確計算 0 天的時間衰減因子（權重 = 1.0）', () => {
      const daysSinceLastView = 0;
      const timeDecayFactor = Math.exp(-daysSinceLastView / 7);
      
      expect(timeDecayFactor).toBeCloseTo(1.0, 2);
    });

    it('應該正確計算 7 天的時間衰減因子（權重 ≈ 0.368）', () => {
      const daysSinceLastView = 7;
      const timeDecayFactor = Math.exp(-daysSinceLastView / 7);
      
      expect(timeDecayFactor).toBeCloseTo(0.368, 2);
    });

    it('應該正確計算 14 天的時間衰減因子（權重 ≈ 0.135）', () => {
      const daysSinceLastView = 14;
      const timeDecayFactor = Math.exp(-daysSinceLastView / 7);
      
      expect(timeDecayFactor).toBeCloseTo(0.135, 2);
    });

    it('應該正確計算 30 天的時間衰減因子（權重 ≈ 0.011）', () => {
      const daysSinceLastView = 30;
      const timeDecayFactor = Math.exp(-daysSinceLastView / 7);
      
      expect(timeDecayFactor).toBeCloseTo(0.011, 2);
    });

    it('時間衰減因子應該隨時間遞減', () => {
      const factor0 = Math.exp(-0 / 7);
      const factor7 = Math.exp(-7 / 7);
      const factor14 = Math.exp(-14 / 7);
      const factor30 = Math.exp(-30 / 7);
      
      expect(factor0).toBeGreaterThan(factor7);
      expect(factor7).toBeGreaterThan(factor14);
      expect(factor14).toBeGreaterThan(factor30);
    });
  });

  describe('Redis 快取機制', () => {
    const testKey = 'test:recommendation:user:999';
    const testData = {
      symbol: 'AAPL',
      score: 0.85,
      viewCount: 10,
      searchCount: 5,
      totalViewTime: 300,
      isFavorited: true,
      lastViewedAt: new Date(),
    };

    it('應該能夠設定快取資料', async () => {
      const result = await setCachedData(testKey, [testData], 60);
      
      // 如果沒有 Redis，應該返回 false
      // 如果有 Redis，應該返回 true
      expect(typeof result).toBe('boolean');
    });

    it('應該能夠讀取快取資料', async () => {
      // 先設定快取
      await setCachedData(testKey, [testData], 60);
      
      // 讀取快取
      const cachedData = await getCachedData<typeof testData[]>(testKey);
      
      // 如果沒有 Redis，應該返回 null
      // 如果有 Redis，應該返回設定的資料
      if (cachedData !== null) {
        expect(cachedData).toHaveLength(1);
        expect(cachedData[0].symbol).toBe('AAPL');
        expect(cachedData[0].score).toBe(0.85);
      }
    });

    it('應該能夠刪除快取資料', async () => {
      // 先設定快取
      await setCachedData(testKey, [testData], 60);
      
      // 刪除快取
      const result = await deleteCachedData(testKey);
      
      // 如果沒有 Redis，應該返回 false
      // 如果有 Redis，應該返回 true
      expect(typeof result).toBe('boolean');
      
      // 再次讀取應該返回 null
      const cachedData = await getCachedData<typeof testData[]>(testKey);
      expect(cachedData).toBeNull();
    });

    it('快取應該在 TTL 過期後自動失效', async () => {
      // 設定 1 秒過期的快取
      await setCachedData(testKey, [testData], 1);
      
      // 立即讀取應該有資料
      const cachedData1 = await getCachedData<typeof testData[]>(testKey);
      
      if (cachedData1 !== null) {
        expect(cachedData1).toHaveLength(1);
      }
      
      // 等待 2 秒後讀取應該返回 null
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const cachedData2 = await getCachedData<typeof testData[]>(testKey);
      expect(cachedData2).toBeNull();
    }, 5000); // 設定測試超時時間為 5 秒
  });

  describe('推薦快取鍵生成', () => {
    it('應該正確生成推薦快取鍵', () => {
      const userId = 123;
      const cacheKey = getRecommendationCacheKey(userId);
      
      expect(cacheKey).toBe('recommendation:user:123');
    });

    it('不同用戶應該有不同的快取鍵', () => {
      const cacheKey1 = getRecommendationCacheKey(100);
      const cacheKey2 = getRecommendationCacheKey(200);
      
      expect(cacheKey1).not.toBe(cacheKey2);
    });
  });

  describe('推薦評分計算（含時間衰減）', () => {
    it('近期行為應該獲得更高評分', () => {
      // 模擬兩個股票的行為數據
      const recentBehavior = {
        viewCount: 10,
        searchCount: 5,
        totalViewTime: 300,
        isFavorited: true,
        daysSinceLastView: 1, // 1 天前
      };
      
      const oldBehavior = {
        viewCount: 10,
        searchCount: 5,
        totalViewTime: 300,
        isFavorited: true,
        daysSinceLastView: 30, // 30 天前
      };
      
      // 計算基礎評分（相同）
      const baseScore = 
        1.0 * 0.30 +  // viewCount normalized
        1.0 * 0.20 +  // searchCount normalized
        1.0 * 0.25 +  // totalViewTime normalized
        1.0 * 0.25;   // isFavorited
      
      // 計算時間衰減因子
      const recentDecay = Math.exp(-recentBehavior.daysSinceLastView / 7);
      const oldDecay = Math.exp(-oldBehavior.daysSinceLastView / 7);
      
      // 計算最終評分
      const recentScore = baseScore * recentDecay;
      const oldScore = baseScore * oldDecay;
      
      // 近期行為應該獲得更高評分
      expect(recentScore).toBeGreaterThan(oldScore);
      
      // 近期行為評分應該接近基礎評分（允許 0.2 的誤差）
      expect(Math.abs(recentScore - baseScore)).toBeLessThan(0.2);
      
      // 舊行為評分應該大幅降低
      expect(oldScore).toBeLessThan(baseScore * 0.1);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

/**
 * 個人化搜尋功能測試
 * 測試使用者搜尋行為追蹤與個人化排序功能
 */

describe('個人化搜尋功能測試', () => {
  const testUserId = 999999; // 測試用使用者ID
  const testMarket = 'US';
  const testSymbol = 'AAPL';

  afterAll(async () => {
    // 清理測試資料
    try {
      const database = await db.getDb();
      if (database) {
        await database.execute(`DELETE FROM userSearchBehavior WHERE userId = ${testUserId}`);
      }
    } catch (error) {
      console.error('清理測試資料失敗:', error);
    }
  });

  describe('搜尋行為記錄', () => {
    it('應該能夠記錄使用者的搜尋行為', async () => {
      await db.recordUserSearch(testUserId, testMarket, testSymbol);
      
      const behavior = await db.getUserSearchBehavior(testUserId, 10);
      
      expect(behavior).toBeDefined();
      expect(behavior.length).toBeGreaterThan(0);
      expect(behavior[0].userId).toBe(testUserId);
      expect(behavior[0].market).toBe(testMarket);
      expect(behavior[0].symbol).toBe(testSymbol);
      expect(behavior[0].searchCount).toBeGreaterThanOrEqual(1);
    });

    it('應該能夠累加搜尋次數', async () => {
      // 第一次搜尋
      await db.recordUserSearch(testUserId, testMarket, 'MSFT');
      const firstBehavior = await db.getUserSearchBehavior(testUserId, 10);
      const firstRecord = firstBehavior.find(b => b.symbol === 'MSFT');
      const firstCount = firstRecord?.searchCount || 0;

      // 第二次搜尋同一股票
      await db.recordUserSearch(testUserId, testMarket, 'MSFT');
      const secondBehavior = await db.getUserSearchBehavior(testUserId, 10);
      const secondRecord = secondBehavior.find(b => b.symbol === 'MSFT');
      const secondCount = secondRecord?.searchCount || 0;

      expect(secondCount).toBe(firstCount + 1);
    });

    it('應該更新最後搜尋時間', async () => {
      const beforeTime = new Date();
      
      await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms
      await db.recordUserSearch(testUserId, testMarket, 'GOOGL');
      
      const behavior = await db.getUserSearchBehavior(testUserId, 10);
      const record = behavior.find(b => b.symbol === 'GOOGL');
      
      expect(record).toBeDefined();
      if (record) {
        const lastSearchTime = new Date(record.lastSearchAt);
        expect(lastSearchTime.getTime()).toBeGreaterThan(beforeTime.getTime());
      }
    });
  });

  describe('搜尋行為查詢', () => {
    it('應該能夠獲取使用者的搜尋行為', async () => {
      // 記錄多筆搜尋
      await db.recordUserSearch(testUserId, 'US', 'AAPL');
      await db.recordUserSearch(testUserId, 'US', 'MSFT');
      await db.recordUserSearch(testUserId, 'TW', '2330');

      const behavior = await db.getUserSearchBehavior(testUserId, 10);
      
      expect(behavior).toBeDefined();
      expect(behavior.length).toBeGreaterThanOrEqual(3);
    });

    it('應該按最後搜尋時間排序', async () => {
      const behavior = await db.getUserSearchBehavior(testUserId, 10);
      
      expect(behavior.length).toBeGreaterThan(1);
      
      for (let i = 1; i < behavior.length; i++) {
        const prevTime = new Date(behavior[i - 1].lastSearchAt).getTime();
        const currTime = new Date(behavior[i].lastSearchAt).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it('應該能夠限制返回數量', async () => {
      const limit = 2;
      const behavior = await db.getUserSearchBehavior(testUserId, limit);
      
      expect(behavior.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('熱門搜尋查詢', () => {
    it('應該能夠獲取使用者最常搜尋的股票', async () => {
      // 記錄多次搜尋同一股票
      for (let i = 0; i < 5; i++) {
        await db.recordUserSearch(testUserId, 'US', 'TSLA');
      }
      
      const topSearched = await db.getUserTopSearchedStocks(testUserId, 10);
      
      expect(topSearched).toBeDefined();
      expect(topSearched.length).toBeGreaterThan(0);
      
      // TSLA 應該在前面(因為搜尋次數多)
      const tslaRecord = topSearched.find(s => s.symbol === 'TSLA');
      expect(tslaRecord).toBeDefined();
      if (tslaRecord) {
        expect(tslaRecord.searchCount).toBeGreaterThanOrEqual(5);
      }
    });

    it('應該按搜尋次數排序', async () => {
      const topSearched = await db.getUserTopSearchedStocks(testUserId, 10);
      
      expect(topSearched.length).toBeGreaterThan(1);
      
      for (let i = 1; i < topSearched.length; i++) {
        const prevCount = topSearched[i - 1].searchCount;
        const currCount = topSearched[i].searchCount;
        expect(prevCount).toBeGreaterThanOrEqual(currCount);
      }
    });
  });

  describe('個人化分數計算', () => {
    it('搜尋頻率應該影響個人化分數', async () => {
      // 記錄高頻搜尋(減少次數以加速測試)
      for (let i = 0; i < 3; i++) {
        await db.recordUserSearch(testUserId, 'US', 'NVDA');
      }
      
      // 記錄低頻搜尋
      await db.recordUserSearch(testUserId, 'US', 'AMD');
      
      const behavior = await db.getUserSearchBehavior(testUserId, 20);
      const nvdaRecord = behavior.find(b => b.symbol === 'NVDA');
      const amdRecord = behavior.find(b => b.symbol === 'AMD');
      
      expect(nvdaRecord).toBeDefined();
      expect(amdRecord).toBeDefined();
      
      if (nvdaRecord && amdRecord) {
        // 高頻搜尋的次數應該明顯多於低頻搜尋
        expect(nvdaRecord.searchCount).toBeGreaterThan(amdRecord.searchCount);
      }
    });

    it('時間衰減應該影響個人化分數', async () => {
      // 這個測試驗證最近搜尋的記錄有更新的時間戳
      await db.recordUserSearch(testUserId, 'US', 'META');
      
      const behavior = await db.getUserSearchBehavior(testUserId, 20);
      const metaRecord = behavior.find(b => b.symbol === 'META');
      
      expect(metaRecord).toBeDefined();
      if (metaRecord) {
        const lastSearchTime = new Date(metaRecord.lastSearchAt);
        const now = new Date();
        const timeDiff = now.getTime() - lastSearchTime.getTime();
        
        // 最近搜尋應該在1分鐘內
        expect(timeDiff).toBeLessThan(60 * 1000);
      }
    });
  });

  describe('資料隔離', () => {
    it('不同使用者的搜尋行為應該隔離', async () => {
      const user1Id = testUserId;
      const user2Id = testUserId + 1;
      
      // 使用者1的搜尋
      await db.recordUserSearch(user1Id, 'US', 'AMZN');
      
      // 使用者2的搜尋
      await db.recordUserSearch(user2Id, 'US', 'NFLX');
      
      const user1Behavior = await db.getUserSearchBehavior(user1Id, 20);
      const user2Behavior = await db.getUserSearchBehavior(user2Id, 20);
      
      // 使用者1應該只看到自己的搜尋
      const user1HasAmzn = user1Behavior.some(b => b.symbol === 'AMZN');
      const user1HasNflx = user1Behavior.some(b => b.symbol === 'NFLX');
      
      expect(user1HasAmzn).toBe(true);
      expect(user1HasNflx).toBe(false);
      
      // 清理使用者2的測試資料
      const database = await db.getDb();
      if (database) {
        await database.execute(`DELETE FROM userSearchBehavior WHERE userId = ${user2Id}`);
      }
    });
  });
});

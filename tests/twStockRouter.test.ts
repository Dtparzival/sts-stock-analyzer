/**
 * 台股 tRPC API 測試
 * 
 * 注意：此測試需要資料庫中有測試資料
 * 建議先執行初始化腳本載入資料
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../server/routers';
import { getDb } from '../server/db';
import { twStocks, twStockPrices } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// 建立測試用的 context
const createTestContext = () => ({
  user: {
    id: 1,
    openId: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: 'test',
  },
  req: {} as any,
  res: {} as any,
});

describe('台股 tRPC API', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testSymbol: string | null = null;

  beforeAll(async () => {
    // 建立 API caller
    caller = appRouter.createCaller(createTestContext());

    // 檢查資料庫中是否有測試資料
    const db = await getDb();
    if (db) {
      const stocks = await db.select().from(twStocks).limit(1);
      if (stocks.length > 0) {
        testSymbol = stocks[0].symbol;
      }
    }
  });

  describe('搜尋股票', () => {
    it('應該能夠搜尋股票', async () => {
      if (!testSymbol) {
        console.warn('跳過測試：資料庫中沒有測試資料');
        return;
      }

      const result = await caller.twStock.search({
        query: testSymbol.substring(0, 2),
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });

    it('應該能夠限制搜尋結果數量', async () => {
      if (!testSymbol) {
        console.warn('跳過測試：資料庫中沒有測試資料');
        return;
      }

      const result = await caller.twStock.search({
        query: '2',
        limit: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('獲取股票詳情', () => {
    it('應該能夠獲取股票詳情', async () => {
      if (!testSymbol) {
        console.warn('跳過測試：資料庫中沒有測試資料');
        return;
      }

      const result = await caller.twStock.getDetail({
        symbol: testSymbol,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe(testSymbol);
      expect(result.data.name).toBeDefined();
    });

    it('應該正確處理不存在的股票', async () => {
      await expect(
        caller.twStock.getDetail({
          symbol: '9999',
        })
      ).rejects.toThrow();
    });
  });

  describe('獲取歷史價格', () => {
    it('應該能夠獲取歷史價格', async () => {
      if (!testSymbol) {
        console.warn('跳過測試：資料庫中沒有測試資料');
        return;
      }

      // 檢查是否有價格資料
      const db = await getDb();
      if (!db) {
        console.warn('跳過測試：無法連接資料庫');
        return;
      }

      const prices = await db
        .select()
        .from(twStockPrices)
        .where(eq(twStockPrices.symbol, testSymbol))
        .limit(1);

      if (prices.length === 0) {
        console.warn('跳過測試：沒有價格資料');
        return;
      }

      const result = await caller.twStock.getHistorical({
        symbol: testSymbol,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該拒絕無效的日期範圍', async () => {
      if (!testSymbol) {
        console.warn('跳過測試：資料庫中沒有測試資料');
        return;
      }

      await expect(
        caller.twStock.getHistorical({
          symbol: testSymbol,
          startDate: '2024-12-31',
          endDate: '2024-01-01',
        })
      ).rejects.toThrow();
    });
  });

  describe('獲取最新價格', () => {
    it('應該能夠獲取最新價格', async () => {
      if (!testSymbol) {
        console.warn('跳過測試：資料庫中沒有測試資料');
        return;
      }

      // 檢查是否有價格資料
      const db = await getDb();
      if (!db) {
        console.warn('跳過測試：無法連接資料庫');
        return;
      }

      const prices = await db
        .select()
        .from(twStockPrices)
        .where(eq(twStockPrices.symbol, testSymbol))
        .limit(1);

      if (prices.length === 0) {
        console.warn('跳過測試：沒有價格資料');
        return;
      }

      const result = await caller.twStock.getLatestPrice({
        symbol: testSymbol,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe(testSymbol);
      expect(result.data.close).toBeDefined();
    });
  });

  describe('批次獲取最新價格', () => {
    it('應該能夠批次獲取最新價格', async () => {
      if (!testSymbol) {
        console.warn('跳過測試：資料庫中沒有測試資料');
        return;
      }

      const result = await caller.twStock.getBatchLatestPrices({
        symbols: [testSymbol],
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該拒絕超過 100 檔股票的請求', async () => {
      const symbols = Array.from({ length: 101 }, (_, i) => `${i + 1000}`);

      await expect(
        caller.twStock.getBatchLatestPrices({
          symbols,
        })
      ).rejects.toThrow();
    });
  });

  describe('獲取同步狀態', () => {
    it('應該能夠獲取同步狀態', async () => {
      const result = await caller.twStock.getSyncStatus();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('獲取統計資訊', () => {
    it('應該能夠獲取統計資訊', async () => {
      const result = await caller.twStock.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data.totalStocks).toBe('number');
      expect(typeof result.data.activeStocks).toBe('number');
      expect(typeof result.data.priceRecords).toBe('number');
    });
  });
});

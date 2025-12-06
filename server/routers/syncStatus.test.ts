import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import type { Context } from '../_core/context';

/**
 * syncStatus Router 單元測試
 * 測試資料同步狀態查詢 API 的功能
 */

// 建立測試用的 context
const createTestContext = (): Context => {
  return {
    user: null,
    req: {} as any,
    res: {} as any,
  };
};

describe('syncStatus Router', () => {
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  describe('getOverview', () => {
    it('應該成功取得台美股同步狀態概覽', async () => {
      const result = await caller.syncStatus.getOverview();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.tw).toBeDefined();
      expect(result.data.us).toBeDefined();
    });

    it('台股統計資料應包含必要欄位', async () => {
      const result = await caller.syncStatus.getOverview();
      const twData = result.data.tw;

      expect(twData).toHaveProperty('totalStocks');
      expect(twData).toHaveProperty('totalPriceRecords');
      expect(twData).toHaveProperty('stocksWithPrices');
      expect(twData).toHaveProperty('coveragePercent');
      expect(twData).toHaveProperty('unresolvedErrors');
      expect(twData).toHaveProperty('latestSyncTime');
      expect(twData).toHaveProperty('earliestPriceDate');
      expect(twData).toHaveProperty('latestPriceDate');
    });

    it('美股統計資料應包含必要欄位', async () => {
      const result = await caller.syncStatus.getOverview();
      const usData = result.data.us;

      expect(usData).toHaveProperty('totalStocks');
      expect(usData).toHaveProperty('totalPriceRecords');
      expect(usData).toHaveProperty('stocksWithPrices');
      expect(usData).toHaveProperty('coveragePercent');
      expect(usData).toHaveProperty('unresolvedErrors');
      expect(usData).toHaveProperty('latestSyncTime');
      expect(usData).toHaveProperty('earliestPriceDate');
      expect(usData).toHaveProperty('latestPriceDate');
    });

    it('覆蓋率應該是 0-100 之間的數字', async () => {
      const result = await caller.syncStatus.getOverview();

      expect(result.data.tw.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(result.data.tw.coveragePercent).toBeLessThanOrEqual(100);
      expect(result.data.us.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(result.data.us.coveragePercent).toBeLessThanOrEqual(100);
    });

    it('數量欄位應該是非負數', async () => {
      const result = await caller.syncStatus.getOverview();

      expect(result.data.tw.totalStocks).toBeGreaterThanOrEqual(0);
      expect(result.data.tw.totalPriceRecords).toBeGreaterThanOrEqual(0);
      expect(result.data.tw.stocksWithPrices).toBeGreaterThanOrEqual(0);
      expect(result.data.tw.unresolvedErrors).toBeGreaterThanOrEqual(0);

      expect(result.data.us.totalStocks).toBeGreaterThanOrEqual(0);
      expect(result.data.us.totalPriceRecords).toBeGreaterThanOrEqual(0);
      expect(result.data.us.stocksWithPrices).toBeGreaterThanOrEqual(0);
      expect(result.data.us.unresolvedErrors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSyncHistory', () => {
    it('應該成功取得台股同步歷史', async () => {
      const result = await caller.syncStatus.getSyncHistory({
        market: 'TW',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該成功取得美股同步歷史', async () => {
      const result = await caller.syncStatus.getSyncHistory({
        market: 'US',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('返回的記錄數量應該不超過 limit', async () => {
      const limit = 5;
      const result = await caller.syncStatus.getSyncHistory({
        market: 'TW',
        limit,
      });

      expect(result.data.length).toBeLessThanOrEqual(limit);
    });

    it('同步歷史記錄應包含必要欄位', async () => {
      const result = await caller.syncStatus.getSyncHistory({
        market: 'TW',
        limit: 1,
      });

      if (result.data.length > 0) {
        const record = result.data[0];
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('dataType');
        expect(record).toHaveProperty('source');
        expect(record).toHaveProperty('lastSyncAt');
        expect(record).toHaveProperty('status');
        expect(record).toHaveProperty('recordCount');
      }
    });
  });

  describe('getSyncErrors', () => {
    it('應該成功取得台股同步錯誤', async () => {
      const result = await caller.syncStatus.getSyncErrors({
        market: 'TW',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該成功取得美股同步錯誤', async () => {
      const result = await caller.syncStatus.getSyncErrors({
        market: 'US',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該能夠篩選未解決的錯誤', async () => {
      const result = await caller.syncStatus.getSyncErrors({
        market: 'TW',
        resolved: false,
        limit: 10,
      });

      expect(result.success).toBe(true);
      // 如果有錯誤記錄，確認都是未解決的
      if (result.data.length > 0) {
        result.data.forEach((error: any) => {
          expect(error.resolved).toBe(false);
        });
      }
    });

    it('錯誤記錄應包含必要欄位', async () => {
      const result = await caller.syncStatus.getSyncErrors({
        market: 'TW',
        limit: 1,
      });

      if (result.data.length > 0) {
        const error = result.data[0];
        expect(error).toHaveProperty('id');
        expect(error).toHaveProperty('dataType');
        expect(error).toHaveProperty('errorType');
        expect(error).toHaveProperty('errorMessage');
        expect(error).toHaveProperty('retryCount');
        expect(error).toHaveProperty('resolved');
        expect(error).toHaveProperty('syncedAt');
      }
    });
  });

  describe('getPriceCoverage', () => {
    it('應該成功取得台股價格覆蓋率詳情', async () => {
      const result = await caller.syncStatus.getPriceCoverage({
        market: 'TW',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該成功取得美股價格覆蓋率詳情', async () => {
      const result = await caller.syncStatus.getPriceCoverage({
        market: 'US',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('價格覆蓋率記錄應包含必要欄位', async () => {
      const result = await caller.syncStatus.getPriceCoverage({
        market: 'TW',
      });

      if (result.data.length > 0) {
        const coverage = result.data[0];
        expect(coverage).toHaveProperty('symbol');
        expect(coverage).toHaveProperty('priceCount');
        expect(coverage).toHaveProperty('earliestDate');
        expect(coverage).toHaveProperty('latestDate');
      }
    });

    it('價格記錄數量應該是正數', async () => {
      const result = await caller.syncStatus.getPriceCoverage({
        market: 'TW',
      });

      if (result.data.length > 0) {
        result.data.forEach((coverage: any) => {
          expect(coverage.priceCount).toBeGreaterThan(0);
        });
      }
    });

    it('返回的記錄數量應該不超過 50', async () => {
      const result = await caller.syncStatus.getPriceCoverage({
        market: 'TW',
      });

      expect(result.data.length).toBeLessThanOrEqual(50);
    });
  });
});

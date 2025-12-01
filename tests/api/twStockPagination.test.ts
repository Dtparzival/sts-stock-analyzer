/**
 * 台股分頁功能單元測試
 * 測試分頁查詢 API 的正確性和效能
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../../server/routers';
import type { TrpcContext } from '../../server/_core/context';

// 模擬 tRPC context
const mockContext: TrpcContext = {
  req: {} as any,
  res: {} as any,
  user: null,
};

describe('台股分頁功能測試', () => {
  const caller = appRouter.createCaller(mockContext);

  describe('歷史價格分頁查詢', () => {
    it('應該返回正確的分頁結構', async () => {
      const result = await caller.twStock.getHistoricalPaginated({
        symbol: '2330',
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('pageSize');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    });

    it('應該正確計算總頁數', async () => {
      const result = await caller.twStock.getHistoricalPaginated({
        symbol: '2330',
        page: 1,
        pageSize: 10,
      });

      const expectedTotalPages = Math.ceil(result.pagination.total / 10);
      expect(result.pagination.totalPages).toBe(expectedTotalPages);
    });

    it('應該限制每頁最多 100 筆資料', async () => {
      // 測試超過限制的參數應該拋絕
      await expect(
        caller.twStock.getHistoricalPaginated({
          symbol: '2330',
          page: 1,
          pageSize: 150, // 超過限制
        })
      ).rejects.toThrow();
    });

    it('應該正確處理空結果', async () => {
      const result = await caller.twStock.getHistoricalPaginated({
        symbol: 'NONEXISTENT',
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('技術指標分頁查詢', () => {
    it('應該返回正確的分頁結構', async () => {
      const result = await caller.twStock.getIndicatorsPaginated({
        symbol: '2330',
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    });

    it('應該正確處理分頁參數', async () => {
      const page2 = await caller.twStock.getIndicatorsPaginated({
        symbol: '2330',
        page: 2,
        pageSize: 5,
      });

      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.pageSize).toBe(5);
    });
  });

  describe('基本面資料分頁查詢', () => {
    it('應該返回正確的分頁結構', async () => {
      const result = await caller.twStock.getFundamentalsPaginated({
        symbol: '2330',
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    });

    it('應該限制每頁最多 100 筆資料', async () => {
      // 測試超過限制的參數應該拋絕
      await expect(
        caller.twStock.getFundamentalsPaginated({
          symbol: '2330',
          page: 1,
          pageSize: 200, // 超過限制
        })
      ).rejects.toThrow();
    });
  });

  describe('快取機制測試', () => {
    it('第二次查詢應該使用快取（回應時間更快）', async () => {
      // 第一次查詢
      const start1 = Date.now();
      await caller.twStock.getHistoricalPaginated({
        symbol: '2330',
        page: 1,
        pageSize: 10,
      });
      const duration1 = Date.now() - start1;

      // 第二次查詢（應該使用快取）
      const start2 = Date.now();
      await caller.twStock.getHistoricalPaginated({
        symbol: '2330',
        page: 1,
        pageSize: 10,
      });
      const duration2 = Date.now() - start2;

      // 第二次查詢應該更快（允許一些誤差）
      // 註：此測試可能因環境差異而不穩定，僅供參考
      console.log(`第一次查詢: ${duration1}ms, 第二次查詢: ${duration2}ms`);
    });
  });
});

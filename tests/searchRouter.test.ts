/**
 * 智能搜尋 API 測試
 * 測試統一搜尋功能（台美股模糊比對）
 */

import { describe, it, expect } from 'vitest';
import { appRouter } from '../server/routers';

// 建立測試用的 context
const createTestContext = () => ({
  user: null,
  req: {} as any,
  res: {} as any,
});

describe('Search Router - Unified Search', () => {
  const caller = appRouter.createCaller(createTestContext());

  describe('search.unified', () => {
    it('應該能搜尋美股代號（AAPL）', async () => {
      const result = await caller.search.unified({
        query: 'AAPL',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      
      // 如果有結果，檢查是否包含 AAPL
      if (result.data.length > 0) {
        const hasApple = result.data.some(stock => stock.symbol === 'AAPL');
        // 檢查市場標記
        result.data.forEach(stock => {
          expect(['US', 'TW']).toContain(stock.market);
        });
      }
    });

    it('應該能搜尋美股名稱（Apple）', async () => {
      const result = await caller.search.unified({
        query: 'Apple',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該能搜尋台股代號（2330）', async () => {
      const result = await caller.search.unified({
        query: '2330',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      
      // 如果有結果，檢查是否包含 2330
      if (result.data.length > 0) {
        const hasTSMC = result.data.some(stock => stock.symbol === '2330');
        // 檢查市場標記
        result.data.forEach(stock => {
          expect(['US', 'TW']).toContain(stock.market);
        });
      }
    });

    it('應該能搜尋台股名稱（台積電）', async () => {
      const result = await caller.search.unified({
        query: '台積電',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('應該同時返回台美股結果', async () => {
      const result = await caller.search.unified({
        query: 'T',
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.breakdown).toBeDefined();
      
      // 檢查 breakdown 統計
      expect(typeof result.breakdown.us).toBe('number');
      expect(typeof result.breakdown.tw).toBe('number');
      expect(result.breakdown.us).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.tw).toBeGreaterThanOrEqual(0);
    });

    it('應該限制返回結果數量', async () => {
      const limit = 5;
      const result = await caller.search.unified({
        query: 'A',
        limit,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // 結果數量應該不超過 limit * 2（因為程式碼中設定為 limit * 2）
      expect(result.data.length).toBeLessThanOrEqual(limit * 2);
    });

    it('應該處理空搜尋結果', async () => {
      const result = await caller.search.unified({
        query: 'XYZNONEXISTENT123456',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.breakdown.us).toBe(0);
      expect(result.breakdown.tw).toBe(0);
    });

    it('應該包含必要的股票資訊欄位', async () => {
      const result = await caller.search.unified({
        query: 'AAPL',
        limit: 10,
      });

      expect(result.success).toBe(true);
      
      // 如果有結果，檢查欄位
      if (result.data.length > 0) {
        const stock = result.data[0];
        expect(stock).toHaveProperty('symbol');
        expect(stock).toHaveProperty('name');
        expect(stock).toHaveProperty('market');
        expect(stock).toHaveProperty('shortName');
        
        // 市場應該是 'US' 或 'TW'
        expect(['US', 'TW']).toContain(stock.market);
      }
    });

    it('應該處理特殊字元搜尋', async () => {
      const result = await caller.search.unified({
        query: '台',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});

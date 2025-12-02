/**
 * 美股資料同步功能測試
 * 
 * 測試項目:
 * 1. 美股交易日判斷邏輯
 * 2. 前一交易日計算
 * 3. 單一股票基本資料同步
 * 4. 單一股票歷史價格同步
 * 5. 批次股票資料同步
 */

import { describe, it, expect } from 'vitest';
import {
  isUsTradingDay,
  getPreviousUsTradingDay,
  syncSingleStockInfo,
  syncSingleStockPrices,
  syncStockInfoBatch,
} from './syncUsStockData';

describe('美股資料同步功能測試', () => {
  describe('交易日判斷', () => {
    it('應該正確識別週末為非交易日', () => {
      // 2024-12-07 是週六 (UTC)
      const saturday = new Date('2024-12-07T12:00:00Z');
      expect(isUsTradingDay(saturday)).toBe(false);

      // 2024-12-08 是週日 (UTC)
      const sunday = new Date('2024-12-08T12:00:00Z');
      expect(isUsTradingDay(sunday)).toBe(false);
    });

    it('應該正確識別工作日為交易日', () => {
      // 2024-12-03 是週二（非假日）(UTC)
      const tuesday = new Date('2024-12-03T12:00:00Z');
      expect(isUsTradingDay(tuesday)).toBe(true);

      // 2024-12-04 是週三（非假日）(UTC)
      const wednesday = new Date('2024-12-04T12:00:00Z');
      expect(isUsTradingDay(wednesday)).toBe(true);
    });

    it('應該正確識別美國假日為非交易日', () => {
      // 2024-12-25 是聖誕節 (UTC)
      const christmas = new Date('2024-12-25T12:00:00Z');
      expect(isUsTradingDay(christmas)).toBe(false);

      // 2024-07-04 是美國獨立日 (UTC)
      const independenceDay = new Date('2024-07-04T12:00:00Z');
      expect(isUsTradingDay(independenceDay)).toBe(false);
    });
  });

  describe('前一交易日計算', () => {
    it('應該正確計算週一的前一交易日為週五', () => {
      // 2024-12-02 是週一 (UTC)
      const monday = new Date('2024-12-02T12:00:00Z');
      const previous = getPreviousUsTradingDay(monday);

      // 前一交易日應該是 2024-11-29 (週五)
      expect(previous.getDay()).toBe(5); // 週五
      expect(previous.toISOString().split('T')[0]).toBe('2024-11-29');
    });

    it('應該正確計算週三的前一交易日為週二', () => {
      // 2024-12-04 是週三 (UTC)
      const wednesday = new Date('2024-12-04T12:00:00Z');
      const previous = getPreviousUsTradingDay(wednesday);

      // 前一交易日應該是 2024-12-03 (週二)
      expect(previous.getDay()).toBe(2); // 週二
      expect(previous.toISOString().split('T')[0]).toBe('2024-12-03');
    });

    it('應該跳過假日計算前一交易日', () => {
      // 2024-12-26 是聖誕節後一天（週四）(UTC)
      const dayAfterChristmas = new Date('2024-12-26T12:00:00Z');
      const previous = getPreviousUsTradingDay(dayAfterChristmas);

      // 前一交易日應該跳過 12-25 (聖誕節) 和週末，回到 12-24 (週二)
      expect(previous.toISOString().split('T')[0]).toBe('2024-12-24');
    });
  });

  describe.skip('單一股票基本資料同步 (需要 API 配額)', () => {
    it('應該能成功同步 AAPL 基本資料', async () => {
      const result = await syncSingleStockInfo('AAPL');
      expect(result).toBe(true);
    }, 10000);

    it('應該能成功同步 MSFT 基本資料', async () => {
      const result = await syncSingleStockInfo('MSFT');
      expect(result).toBe(true);
    }, 10000);

    it('對於無效股票代碼應該返回 false', async () => {
      const result = await syncSingleStockInfo('INVALID_SYMBOL_12345');
      expect(result).toBe(false);
    }, 10000);
  });

  describe.skip('單一股票歷史價格同步 (需要 API 配額)', () => {
    it('應該能成功同步 AAPL 最近 7 天的價格資料', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const result = await syncSingleStockPrices('AAPL', startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBeGreaterThan(0);
    }, 15000);

    it('應該能成功同步 GOOGL 最近 7 天的價格資料', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const result = await syncSingleStockPrices('GOOGL', startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBeGreaterThan(0);
    }, 15000);
  });

  describe.skip('批次股票資料同步 (需要 API 配額)', () => {
    it('應該能成功批次同步多支股票的基本資料', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const result = await syncStockInfoBatch(symbols);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(symbols.length);
      expect(result.errorCount).toBe(0);
    }, 30000);

    it('批次同步時應該能處理部分失敗的情況', async () => {
      const symbols = ['AAPL', 'INVALID_SYMBOL', 'MSFT'];
      const result = await syncStockInfoBatch(symbols);

      // 應該有成功和失敗的記錄
      expect(result.recordCount).toBeGreaterThan(0);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.success).toBe(false);
    }, 30000);
  });
});

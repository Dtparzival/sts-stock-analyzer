/**
 * 資料轉換與驗證測試
 */

import { describe, it, expect } from 'vitest';
import {
  transformStockInfo,
  transformStockInfoBatch,
  transformStockPrice,
  transformStockPriceBatch,
  centsToYuan,
  basisPointsToPercent,
  formatDate,
} from '../server/integrations/dataTransformer';

describe('資料轉換', () => {
  describe('股票基本資料轉換', () => {
    it('應該正確轉換股票基本資料', () => {
      const apiData = {
        stock_id: '2330',
        stock_name: '台積電',
        industry_category: '半導體業',
        type: '上市',
        date: '2024-01-01',
      };

      const result = transformStockInfo(apiData);

      expect(result).toEqual({
        symbol: '2330',
        name: '台積電',
        shortName: '台積電',
        market: 'TWSE',
        industry: '半導體業',
        listedDate: new Date('2024-01-01'),
        isActive: true,
      });
    });

    it('應該正確處理上櫃股票', () => {
      const apiData = {
        stock_id: '5269',
        stock_name: '祥碩',
        industry_category: 'IC設計業',
        type: '上櫃',
        date: '2014-08-05',
      };

      const result = transformStockInfo(apiData);

      expect(result.market).toBe('TPEx');
    });

    it('應該批次轉換股票基本資料', () => {
      const apiDataList = [
        {
          stock_id: '2330',
          stock_name: '台積電',
          industry_category: '半導體業',
          type: '上市',
          date: '1994-09-05',
        },
        {
          stock_id: '2317',
          stock_name: '鴻海',
          industry_category: '電腦及週邊設備業',
          type: '上市',
          date: '1991-06-18',
        },
      ];

      const results = transformStockInfoBatch(apiDataList);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('2330');
      expect(results[1].symbol).toBe('2317');
    });

    it('應該過濾掉無效的股票資料', () => {
      const apiDataList = [
        {
          stock_id: '2330',
          stock_name: '台積電',
          industry_category: '半導體業',
          type: '上市',
          date: '1994-09-05',
        },
        {
          stock_id: '', // 無效：缺少代號
          stock_name: '測試股票',
          industry_category: '測試業',
          type: '上市',
          date: '2024-01-01',
        },
      ];

      const results = transformStockInfoBatch(apiDataList);

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('2330');
    });
  });

  describe('股票價格資料轉換', () => {
    it('應該正確轉換股票價格資料', () => {
      const apiData = {
        date: '2024-01-15',
        stock_id: '2330',
        Trading_Volume: 50000000,
        Trading_money: 25000000000,
        open: 600.0,
        max: 610.0,
        min: 595.0,
        close: 605.0,
        spread: 5.0,
        Trading_turnover: 50000,
      };

      const result = transformStockPrice(apiData);

      expect(result).toEqual({
        symbol: '2330',
        date: new Date('2024-01-15'),
        open: 60000, // 600.0 * 100
        high: 61000,
        low: 59500,
        close: 60500,
        volume: 50000000,
        amount: 25000000000,
        change: 500, // 5.0 * 100
        changePercent: 83, // (5.0 / 600.0) * 10000
      });
    });

    it('應該批次轉換股票價格資料', () => {
      const apiDataList = [
        {
          date: '2024-01-15',
          stock_id: '2330',
          Trading_Volume: 50000000,
          Trading_money: 25000000000,
          open: 600.0,
          max: 610.0,
          min: 595.0,
          close: 605.0,
          spread: 5.0,
          Trading_turnover: 50000,
        },
        {
          date: '2024-01-16',
          stock_id: '2330',
          Trading_Volume: 45000000,
          Trading_money: 27000000000,
          open: 605.0,
          max: 615.0,
          min: 600.0,
          close: 610.0,
          spread: 5.0,
          Trading_turnover: 45000,
        },
      ];

      const results = transformStockPriceBatch(apiDataList);

      expect(results).toHaveLength(2);
      expect(results[0].close).toBe(60500);
      expect(results[1].close).toBe(61000);
    });

    it('應該過濾掉無效的價格資料', () => {
      const apiDataList = [
        {
          date: '2024-01-15',
          stock_id: '2330',
          Trading_Volume: 50000000,
          Trading_money: 25000000000,
          open: 600.0,
          max: 610.0,
          min: 595.0,
          close: 605.0,
          spread: 5.0,
          Trading_turnover: 50000,
        },
        {
          date: '2024-01-16',
          stock_id: '', // 無效：缺少代號
          Trading_Volume: 0,
          Trading_money: 0,
          open: 0,
          max: 0,
          min: 0,
          close: 0,
          spread: 0,
          Trading_turnover: 0,
        },
      ];

      const results = transformStockPriceBatch(apiDataList);

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('2330');
    });
  });

  describe('數值轉換工具', () => {
    it('應該正確轉換分為元', () => {
      expect(centsToYuan(10050)).toBe(100.5);
      expect(centsToYuan(1)).toBe(0.01);
      expect(centsToYuan(100000)).toBe(1000);
    });

    it('應該正確轉換基點為百分比', () => {
      expect(basisPointsToPercent(150)).toBe(1.5);
      expect(basisPointsToPercent(1)).toBe(0.01);
      expect(basisPointsToPercent(1000)).toBe(10);
    });

    it('應該正確格式化日期', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });
  });
});

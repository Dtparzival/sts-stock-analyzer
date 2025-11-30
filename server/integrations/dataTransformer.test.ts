/**
 * 資料轉換層 Vitest 測試
 */

import { describe, it, expect } from 'vitest';
import {
  parsePrice,
  parsePercent,
  parseDate,
  extractShortName,
  transformTwseStock,
  transformTpexStock,
  transformHistoricalPrice,
  calculateMA,
  calculateRSI,
  validateStockData,
  validatePriceData,
} from './dataTransformer';

describe('資料轉換層測試', () => {
  describe('parsePrice', () => {
    it('應該正確轉換價格為以分為單位的整數', () => {
      expect(parsePrice(100.50)).toBe(10050);
      expect(parsePrice('100.50')).toBe(10050);
      expect(parsePrice('1,234.56')).toBe(123456);
    });

    it('應該處理空值', () => {
      expect(parsePrice('')).toBe(0);
      expect(parsePrice(null as any)).toBe(0);
      expect(parsePrice(undefined as any)).toBe(0);
    });
  });

  describe('parsePercent', () => {
    it('應該正確轉換百分比為以萬分之一為單位的整數', () => {
      expect(parsePercent(1.5)).toBe(15000);
      expect(parsePercent('1.5%')).toBe(15000);
      expect(parsePercent('10%')).toBe(100000);
    });

    it('應該處理空值', () => {
      expect(parsePercent('')).toBe(0);
      expect(parsePercent(null as any)).toBe(0);
      expect(parsePercent(undefined as any)).toBe(0);
    });
  });

  describe('parseDate', () => {
    it('應該正確解析民國年格式', () => {
      const date = parseDate('112/01/15');
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(0); // 0 = 1月
      expect(date.getDate()).toBe(15);
    });

    it('應該正確解析西元年格式', () => {
      const date = parseDate('2023-01-15');
      expect(date.getFullYear()).toBe(2023);
    });
  });

  describe('extractShortName', () => {
    it('應該正確提取公司簡稱', () => {
      expect(extractShortName('台灣積體電路製造股份有限公司')).toBe('台灣積體電路製造');
      expect(extractShortName('鴻海精密工業股份有限公司')).toBe('鴻海精密工業');
      expect(extractShortName('中華電信股份有限公司')).toBe('中華電信');
    });

    it('應該處理空值', () => {
      expect(extractShortName('')).toBe('');
      expect(extractShortName(null as any)).toBe('');
    });
  });

  describe('transformTwseStock', () => {
    it('應該正確轉換 TWSE 股票資料格式', () => {
      const rawData = {
        Code: '2330',
        Name: '台灣積體電路製造股份有限公司',
        Industry: '半導體業',
        Type: '股票',
      };

      const result = transformTwseStock(rawData);

      expect(result.symbol).toBe('2330');
      expect(result.name).toBe('台灣積體電路製造股份有限公司');
      expect(result.shortName).toBe('台灣積體電路製造');
      expect(result.market).toBe('上市');
      expect(result.industry).toBe('半導體業');
      expect(result.type).toBe('股票');
      expect(result.isActive).toBe(true);
    });
  });

  describe('transformTpexStock', () => {
    it('應該正確轉換 TPEx 股票資料格式', () => {
      const rawData = ['5347', '世界先進股份有限公司', '半導體業'];

      const result = transformTpexStock(rawData);

      expect(result.symbol).toBe('5347');
      expect(result.name).toBe('世界先進股份有限公司');
      expect(result.shortName).toBe('世界先進');
      expect(result.market).toBe('上櫃');
      expect(result.industry).toBe('半導體業');
      expect(result.type).toBe('股票');
      expect(result.isActive).toBe(true);
    });
  });

  describe('transformHistoricalPrice', () => {
    it('應該正確轉換 TWSE 歷史價格格式', () => {
      const rawData = {
        Date: '112/01/15',
        Open: '500.00',
        High: '510.00',
        Low: '495.00',
        Close: '505.00',
        Volume: '10000',
        Amount: '5000000',
        Change: '5.00',
        ChangePercent: '1.00%',
      };

      const result = transformHistoricalPrice(rawData, 'TWSE');

      expect(result.open).toBe(50000); // 500.00 * 100
      expect(result.high).toBe(51000);
      expect(result.low).toBe(49500);
      expect(result.close).toBe(50500);
      expect(result.volume).toBe(10000);
      expect(result.change).toBe(500);
      expect(result.changePercent).toBe(10000); // 1.00% * 10000
    });
  });

  describe('calculateMA', () => {
    it('應該正確計算移動平均線', () => {
      const prices = [100, 110, 105, 115, 120];
      const ma5 = calculateMA(prices, 5);

      expect(ma5).toBe(110); // (100 + 110 + 105 + 115 + 120) / 5 = 110
    });

    it('應該在資料不足時回傳 null', () => {
      const prices = [100, 110];
      const ma5 = calculateMA(prices, 5);

      expect(ma5).toBeNull();
    });
  });

  describe('calculateRSI', () => {
    it('應該正確計算 RSI', () => {
      const prices = [
        100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
        111, 110, 112, 114, 113,
      ];
      const rsi = calculateRSI(prices, 14);

      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThanOrEqual(1000000); // RSI 最大值為 100（以萬分之一為單位）
    });

    it('應該在資料不足時回傳 null', () => {
      const prices = [100, 102, 101];
      const rsi = calculateRSI(prices, 14);

      expect(rsi).toBeNull();
    });
  });

  describe('validateStockData', () => {
    it('應該驗證完整的股票資料', () => {
      const validData = {
        symbol: '2330',
        name: '台積電',
        market: '上市',
      };

      expect(validateStockData(validData)).toBe(true);
    });

    it('應該拒絕不完整的股票資料', () => {
      const invalidData = {
        symbol: '2330',
        // 缺少 name 和 market
      };

      expect(validateStockData(invalidData)).toBe(false);
    });
  });

  describe('validatePriceData', () => {
    it('應該驗證完整的價格資料', () => {
      const validData = {
        date: new Date(),
        open: 500,
        high: 510,
        low: 495,
        close: 505,
      };

      expect(validatePriceData(validData)).toBe(true);
    });

    it('應該拒絕不完整的價格資料', () => {
      const invalidData = {
        date: new Date(),
        open: 500,
        // 缺少 high, low, close
      };

      expect(validatePriceData(invalidData)).toBe(false);
    });
  });
});

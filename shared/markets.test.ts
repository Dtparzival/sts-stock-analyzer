import { describe, it, expect } from 'vitest';
import {
  getMarketFromSymbol,
  cleanTWSymbol,
  getFullTWSymbol,
  searchTWStockByName,
  getTWStockName,
  TW_STOCK_NAMES,
} from './markets';

describe('markets.ts - 市場工具函數測試', () => {
  describe('getMarketFromSymbol', () => {
    it('應該正確識別美股代號', () => {
      expect(getMarketFromSymbol('AAPL')).toBe('US');
      expect(getMarketFromSymbol('TSLA')).toBe('US');
      expect(getMarketFromSymbol('GOOGL')).toBe('US');
      expect(getMarketFromSymbol('MSFT')).toBe('US');
    });

    it('應該正確識別帶 .TW 後綴的台股代號', () => {
      expect(getMarketFromSymbol('2330.TW')).toBe('TW');
      expect(getMarketFromSymbol('2317.TW')).toBe('TW');
      expect(getMarketFromSymbol('2454.TW')).toBe('TW');
    });

    it('應該正確識別帶 .TWO 後綴的台股代號', () => {
      expect(getMarketFromSymbol('1234.TWO')).toBe('TW');
    });

    it('應該正確識別 4 位純數字的台股代號', () => {
      expect(getMarketFromSymbol('2330')).toBe('TW');
      expect(getMarketFromSymbol('2317')).toBe('TW');
      expect(getMarketFromSymbol('2454')).toBe('TW');
    });

    it('應該將非台股格式的代號識別為美股', () => {
      expect(getMarketFromSymbol('123')).toBe('US'); // 3 位數字
      expect(getMarketFromSymbol('12345')).toBe('US'); // 5 位數字
      expect(getMarketFromSymbol('ABC123')).toBe('US'); // 混合格式
    });
  });

  describe('cleanTWSymbol', () => {
    it('應該移除 .TW 後綴', () => {
      expect(cleanTWSymbol('2330.TW')).toBe('2330');
      expect(cleanTWSymbol('2317.TW')).toBe('2317');
      expect(cleanTWSymbol('2454.TW')).toBe('2454');
    });

    it('應該移除 .TWO 後綴', () => {
      expect(cleanTWSymbol('1234.TWO')).toBe('1234');
    });

    it('應該保持純數字代號不變', () => {
      expect(cleanTWSymbol('2330')).toBe('2330');
      expect(cleanTWSymbol('2317')).toBe('2317');
    });

    it('應該保持美股代號不變', () => {
      expect(cleanTWSymbol('AAPL')).toBe('AAPL');
      expect(cleanTWSymbol('TSLA')).toBe('TSLA');
    });
  });

  describe('getFullTWSymbol', () => {
    it('應該為純數字代號添加 .TW 後綴', () => {
      expect(getFullTWSymbol('2330')).toBe('2330.TW');
      expect(getFullTWSymbol('2317')).toBe('2317.TW');
      expect(getFullTWSymbol('2454')).toBe('2454.TW');
    });

    it('應該保持已有 .TW 後綴的代號不變', () => {
      expect(getFullTWSymbol('2330.TW')).toBe('2330.TW');
      expect(getFullTWSymbol('2317.TW')).toBe('2317.TW');
    });

    it('應該保持已有 .TWO 後綴的代號不變', () => {
      expect(getFullTWSymbol('1234.TWO')).toBe('1234.TWO');
    });

    it('應該保持美股代號不變', () => {
      expect(getFullTWSymbol('AAPL')).toBe('AAPL');
      expect(getFullTWSymbol('TSLA')).toBe('TSLA');
    });
  });

  describe('searchTWStockByName', () => {
    it('應該根據完整中文名稱搜尋股票', () => {
      const results = searchTWStockByName('台積電');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ symbol: '2330.TW', name: '台積電' });
    });

    it('應該根據部分中文名稱搜尋股票', () => {
      const results = searchTWStockByName('台積');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('2330.TW');
      expect(results[0].name).toBe('台積電');
    });

    it('應該支援不區分大小寫搜尋', () => {
      // 中文名稱沒有大小寫，測試英文部分（例如 KY）
      const results = searchTWStockByName('ky');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.includes('KY'))).toBe(true);
    });

    it('應該返回多個匹配結果', () => {
      const results = searchTWStockByName('金'); // 搜尋「金」會匹配多個金融股
      expect(results.length).toBeGreaterThan(1);
      expect(results.every(r => r.name.includes('金'))).toBe(true);
    });

    it('應該在沒有匹配時返回空陣列', () => {
      const results = searchTWStockByName('不存在的公司名稱');
      expect(results).toHaveLength(0);
    });

    it('應該處理空字串查詢', () => {
      const results = searchTWStockByName('');
      expect(results).toHaveLength(0);
    });

    it('應該處理前後空格', () => {
      const results = searchTWStockByName('  台積電  ');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('2330.TW');
    });

    it('返回的 symbol 應該是完整格式（包含 .TW 後綴）', () => {
      const results = searchTWStockByName('鴻海');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('2317.TW');
      expect(results[0].symbol.endsWith('.TW')).toBe(true);
    });
  });

  describe('getTWStockName', () => {
    it('應該根據完整格式 symbol 獲取中文名稱', () => {
      expect(getTWStockName('2330.TW')).toBe('台積電');
      expect(getTWStockName('2317.TW')).toBe('鴻海');
      expect(getTWStockName('2454.TW')).toBe('聯發科');
    });

    it('應該根據純數字 symbol 獲取中文名稱', () => {
      expect(getTWStockName('2330')).toBe('台積電');
      expect(getTWStockName('2317')).toBe('鴻海');
      expect(getTWStockName('2454')).toBe('聯發科');
    });

    it('應該在找不到股票時返回 undefined', () => {
      expect(getTWStockName('9999.TW')).toBeUndefined();
      expect(getTWStockName('9999')).toBeUndefined();
    });
  });

  describe('TW_STOCK_NAMES 映射表', () => {
    it('所有 key 應該是完整格式（包含 .TW 後綴）', () => {
      const keys = Object.keys(TW_STOCK_NAMES);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.every(key => key.endsWith('.TW'))).toBe(true);
    });

    it('應該包含主要的台股', () => {
      expect(TW_STOCK_NAMES['2330.TW']).toBe('台積電');
      expect(TW_STOCK_NAMES['2317.TW']).toBe('鴻海');
      expect(TW_STOCK_NAMES['2454.TW']).toBe('聯發科');
      expect(TW_STOCK_NAMES['2412.TW']).toBe('中華電');
      expect(TW_STOCK_NAMES['2882.TW']).toBe('國泰金');
    });

    it('應該包含至少 90 支股票', () => {
      const keys = Object.keys(TW_STOCK_NAMES);
      expect(keys.length).toBeGreaterThanOrEqual(90);
    });
  });
});

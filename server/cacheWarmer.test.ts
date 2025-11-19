import { describe, it, expect, beforeEach } from 'vitest';
import { getGlobalPopularStocks, getPopularUSStocks, getPopularTWStocks, getDefaultPopularStocks } from './popularStocks';

/**
 * 緩存預熱機制測試
 * 測試熱門股票分析和預設列表
 */
describe('Cache Warmer', () => {
  describe('Popular Stocks Analysis', () => {
    it('should return popular stocks from database', async () => {
      const stocks = await getGlobalPopularStocks(30, 20);
      
      // 可能沒有搜尋歷史，所以可能返回空陣列
      expect(Array.isArray(stocks)).toBe(true);
      
      // 如果有數據，檢查格式
      if (stocks.length > 0) {
        const stock = stocks[0];
        expect(stock).toHaveProperty('symbol');
        expect(stock).toHaveProperty('companyName');
        expect(stock).toHaveProperty('searchCount');
        expect(stock).toHaveProperty('market');
        expect(['US', 'TW']).toContain(stock.market);
      }
    });

    it('should filter US stocks correctly', async () => {
      const usStocks = await getPopularUSStocks(30, 20);
      
      expect(Array.isArray(usStocks)).toBe(true);
      
      // 所有股票應該是美股
      usStocks.forEach(stock => {
        expect(stock.market).toBe('US');
      });
    });

    it('should filter TW stocks correctly', async () => {
      const twStocks = await getPopularTWStocks(30, 20);
      
      expect(Array.isArray(twStocks)).toBe(true);
      
      // 所有股票應該是台股
      twStocks.forEach(stock => {
        expect(stock.market).toBe('TW');
      });
    });
  });

  describe('Default Popular Stocks', () => {
    it('should return default popular stocks list', () => {
      const stocks = getDefaultPopularStocks();
      
      expect(Array.isArray(stocks)).toBe(true);
      expect(stocks.length).toBeGreaterThan(0);
      
      // 檢查格式
      const stock = stocks[0];
      expect(stock).toHaveProperty('symbol');
      expect(stock).toHaveProperty('companyName');
      expect(stock).toHaveProperty('searchCount');
      expect(stock).toHaveProperty('market');
    });

    it('should include both US and TW stocks', () => {
      const stocks = getDefaultPopularStocks();
      
      const usStocks = stocks.filter(s => s.market === 'US');
      const twStocks = stocks.filter(s => s.market === 'TW');
      
      expect(usStocks.length).toBeGreaterThan(0);
      expect(twStocks.length).toBeGreaterThan(0);
    });

    it('should include popular tech stocks', () => {
      const stocks = getDefaultPopularStocks();
      const symbols = stocks.map(s => s.symbol);
      
      // 檢查是否包含常見的科技股
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('MSFT');
      expect(symbols).toContain('GOOGL');
      expect(symbols).toContain('TSLA');
    });

    it('should include popular TW stocks', () => {
      const stocks = getDefaultPopularStocks();
      const symbols = stocks.map(s => s.symbol);
      
      // 檢查是否包含常見的台股
      expect(symbols).toContain('2330'); // 台積電
      expect(symbols).toContain('2317'); // 鴻海
      expect(symbols).toContain('2454'); // 聯發科
    });
  });
});

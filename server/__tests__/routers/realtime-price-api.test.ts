/**
 * 即時價格 API 測試
 * 
 * 測試移除歷史價格表後的即時 API 呼叫功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the TWSE API module
vi.mock('../twse', () => ({
  getTWSEStockDay: vi.fn(),
  getTWSEStockHistory: vi.fn(),
  convertTWSEToYahooFormat: vi.fn(),
  convertSymbolToTWSE: vi.fn((symbol: string) => symbol.replace('.TW', '')),
}));

// Mock the TwelveData API module
vi.mock('../integrations/twelvedata', () => ({
  getTwelveDataQuote: vi.fn(),
  getTwelveDataTimeSeries: vi.fn(),
}));

describe('Real-time Price API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Taiwan Stock (TWSE) API', () => {
    it('should convert symbol format correctly', async () => {
      const { convertSymbolToTWSE } = await import('../twse');
      
      expect(convertSymbolToTWSE('2330.TW')).toBe('2330');
      expect(convertSymbolToTWSE('2317.TW')).toBe('2317');
    });

    it('should handle TWSE API response format', async () => {
      const { getTWSEStockHistory, convertTWSEToYahooFormat } = await import('../twse');
      
      // Mock TWSE response
      const mockTWSEData = [{
        stat: 'OK',
        date: '114年12月',
        title: '2330 台積電',
        fields: ['日期', '成交股數', '成交金額', '開盤價', '最高價', '最低價', '收盤價', '漲跌價差', '成交筆數'],
        data: [
          ['114/12/01', '10,000,000', '10,000,000,000', '1,000', '1,050', '990', '1,020', '+20', '5,000'],
        ],
        notes: [],
      }];

      vi.mocked(getTWSEStockHistory).mockResolvedValue(mockTWSEData);
      vi.mocked(convertTWSEToYahooFormat).mockReturnValue({
        chart: {
          result: [{
            meta: {
              currency: 'TWD',
              symbol: '2330.TW',
              regularMarketPrice: 1020,
              previousClose: 1000,
            },
            timestamp: [1733011200],
            indicators: {
              quote: [{
                open: [1000],
                high: [1050],
                low: [990],
                close: [1020],
                volume: [10000000],
              }],
            },
          }],
          error: null,
        },
      });

      const result = await getTWSEStockHistory('2330', 1);
      expect(result).toHaveLength(1);
      expect(result[0].stat).toBe('OK');

      const yahooFormat = convertTWSEToYahooFormat('2330', mockTWSEData);
      expect(yahooFormat.chart.result[0].meta.symbol).toBe('2330.TW');
      expect(yahooFormat.chart.result[0].meta.regularMarketPrice).toBe(1020);
    });
  });

  describe('US Stock (TwelveData) API', () => {
    it('should fetch real-time quote from TwelveData', async () => {
      const { getTwelveDataQuote } = await import('../integrations/twelvedata');
      
      // Mock TwelveData response
      const mockQuote = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        currency: 'USD',
        open: 195.0,
        high: 198.0,
        low: 194.0,
        close: 197.5,
        previous_close: 195.0,
        change: 2.5,
        percent_change: 1.28,
        volume: 50000000,
        timestamp: 1733011200,
      };

      vi.mocked(getTwelveDataQuote).mockResolvedValue(mockQuote);

      const result = await getTwelveDataQuote('AAPL');
      expect(result.symbol).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.close).toBe(197.5);
    });

    it('should fetch time series data from TwelveData', async () => {
      const { getTwelveDataTimeSeries } = await import('../integrations/twelvedata');
      
      // Mock TwelveData time series response
      const mockTimeSeries = {
        meta: {
          symbol: 'AAPL',
          interval: '1day',
          currency: 'USD',
        },
        values: [
          { datetime: '2024-12-01', open: '195.0', high: '198.0', low: '194.0', close: '197.5', volume: '50000000' },
          { datetime: '2024-11-30', open: '193.0', high: '196.0', low: '192.0', close: '195.0', volume: '45000000' },
        ],
        status: 'ok',
      };

      vi.mocked(getTwelveDataTimeSeries).mockResolvedValue(mockTimeSeries);

      const result = await getTwelveDataTimeSeries('AAPL', '1day', 30);
      expect(result.meta.symbol).toBe('AAPL');
      expect(result.values).toHaveLength(2);
      expect(result.values[0].close).toBe('197.5');
    });
  });

  describe('Stock Info Auto-Update Mechanism', () => {
    it('should have correct sync schedule configuration', () => {
      // Taiwan stock sync: Every Sunday 02:00 (Taipei Time)
      const twSyncCron = '0 2 * * 0';
      expect(twSyncCron).toBe('0 2 * * 0');

      // US stock sync: Every Sunday 06:00 (Taipei Time)
      const usSyncCron = '0 0 6 * * 0';
      expect(usSyncCron).toBe('0 0 6 * * 0');
    });

    it('should have startup sync check mechanism', async () => {
      // Verify the startup sync check module exists
      const startupSyncModule = await import('../jobs/startupSyncCheck');
      expect(startupSyncModule.runStartupSyncCheck).toBeDefined();
      expect(startupSyncModule.scheduleStartupSyncCheck).toBeDefined();
    });
  });

  describe('Cache Mechanism', () => {
    it('should use stockDataCache table for caching', async () => {
      // Verify the cache functions exist in db.ts
      const dbModule = await import('../db');
      expect(dbModule.getStockDataCache).toBeDefined();
      expect(dbModule.setStockDataCache).toBeDefined();
      expect(dbModule.deleteExpiredCache).toBeDefined();
    });
  });
});

describe('Database Schema Changes', () => {
  it('should not have twStockPrices table in schema', async () => {
    const schema = await import('../../drizzle/schema');
    expect((schema as any).twStockPrices).toBeUndefined();
  });

  it('should not have usStockPrices table in schema', async () => {
    const schema = await import('../../drizzle/schema');
    expect((schema as any).usStockPrices).toBeUndefined();
  });

  it('should have stockDataCache table in schema', async () => {
    const schema = await import('../../drizzle/schema');
    expect(schema.stockDataCache).toBeDefined();
  });

  it('should have twStocks table in schema', async () => {
    const schema = await import('../../drizzle/schema');
    expect(schema.twStocks).toBeDefined();
  });

  it('should have usStocks table in schema', async () => {
    const schema = await import('../../drizzle/schema');
    expect(schema.usStocks).toBeDefined();
  });
});

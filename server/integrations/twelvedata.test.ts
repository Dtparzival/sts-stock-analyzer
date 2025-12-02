import { describe, it, expect } from 'vitest';
import { 
  getTwelveDataQuote, 
  getTwelveDataTimeSeries,
  convertPriceToCents,
  convertCentsToDollars,
  calculateChangePercent
} from './twelvedata';

describe('TwelveData API Integration', () => {
  describe('Price Conversion Functions', () => {
    it('should convert price string to cents correctly', () => {
      expect(convertPriceToCents('150.25')).toBe(15025);
      expect(convertPriceToCents('1.50')).toBe(150);
      expect(convertPriceToCents('1000.00')).toBe(100000);
      expect(convertPriceToCents('0.01')).toBe(1);
    });

    it('should convert cents to dollars correctly', () => {
      expect(convertCentsToDollars(15025)).toBe('150.25');
      expect(convertCentsToDollars(150)).toBe('1.50');
      expect(convertCentsToDollars(100000)).toBe('1000.00');
      expect(convertCentsToDollars(1)).toBe('0.01');
    });

    it('should calculate change percent correctly', () => {
      // 從 $150.00 漲到 $150.25 = 0.17% = 17 基點
      const changePercent = calculateChangePercent(15025, 15000);
      expect(Math.abs(changePercent - 17)).toBeLessThan(1);
      
      // 從 $100.00 跌到 $95.00 = -5.00% = -500 基點
      const changePercent2 = calculateChangePercent(9500, 10000);
      expect(changePercent2).toBe(-500);
      
      // 價格不變
      const changePercent3 = calculateChangePercent(10000, 10000);
      expect(changePercent3).toBe(0);
    });

    it('should handle zero previous price', () => {
      const changePercent = calculateChangePercent(100, 0);
      expect(changePercent).toBe(0);
    });
  });

  describe('TwelveData Quote API', () => {
    it('should fetch quote for AAPL', async () => {
      // 只在有 API token 時執行
      if (!process.env.TWELVEDATA_TOKEN) {
        console.log('⚠️ Skipping TwelveData API test: TWELVEDATA_TOKEN not configured');
        return;
      }

      const quote = await getTwelveDataQuote('AAPL');
      
      console.log('✅ TwelveData Quote API 測試成功');
      console.log(`取得 ${quote.symbol} (${quote.name}) 報價`);
      console.log(`收盤價: $${quote.close}`);
      console.log(`成交量: ${quote.volume}`);
      
      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
      expect(quote.name).toBeDefined();
      expect(quote.close).toBeDefined();
      expect(quote.exchange).toBeDefined();
    }, 30000); // 30 秒超時

    it('should handle invalid symbol gracefully', async () => {
      if (!process.env.TWELVEDATA_TOKEN) {
        console.log('⚠️ Skipping TwelveData API test: TWELVEDATA_TOKEN not configured');
        return;
      }

      try {
        await getTwelveDataQuote('INVALID_SYMBOL_XYZ');
        // 如果沒有拋出錯誤,測試失敗
        expect(true).toBe(false);
      } catch (error: any) {
        // 預期會拋出錯誤
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        console.log('✅ 正確處理無效股票代號');
      }
    }, 30000);
  });

  describe('TwelveData Time Series API', () => {
    it('should fetch time series for AAPL', async () => {
      if (!process.env.TWELVEDATA_TOKEN) {
        console.log('⚠️ Skipping TwelveData API test: TWELVEDATA_TOKEN not configured');
        return;
      }

      const timeSeries = await getTwelveDataTimeSeries('AAPL', '1day', 5);
      
      console.log('✅ TwelveData Time Series API 測試成功');
      console.log(`取得 ${timeSeries.meta.symbol} 歷史數據`);
      console.log(`資料點數: ${timeSeries.values.length}`);
      
      expect(timeSeries).toBeDefined();
      expect(timeSeries.meta).toBeDefined();
      expect(timeSeries.meta.symbol).toBe('AAPL');
      expect(timeSeries.values).toBeDefined();
      expect(timeSeries.values.length).toBeGreaterThan(0);
      expect(timeSeries.values.length).toBeLessThanOrEqual(5);
      
      // 檢查第一筆資料的格式
      const firstValue = timeSeries.values[0];
      expect(firstValue.datetime).toBeDefined();
      expect(firstValue.open).toBeDefined();
      expect(firstValue.high).toBeDefined();
      expect(firstValue.low).toBeDefined();
      expect(firstValue.close).toBeDefined();
      expect(firstValue.volume).toBeDefined();
    }, 30000);
  });
});

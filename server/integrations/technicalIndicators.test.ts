/**
 * 技術指標計算模組單元測試
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateMovingAverages,
  calculateRSI,
  calculateMACD,
  calculateKD,
  calculateAllIndicators,
  type PriceData,
} from './technicalIndicators';

describe('技術指標計算模組', () => {
  // 準備測試資料
  const mockPriceData: PriceData[] = [
    { date: new Date('2024-01-01'), open: 10000, high: 10500, low: 9800, close: 10200, volume: 1000 },
    { date: new Date('2024-01-02'), open: 10200, high: 10600, low: 10000, close: 10400, volume: 1100 },
    { date: new Date('2024-01-03'), open: 10400, high: 10800, low: 10200, close: 10600, volume: 1200 },
    { date: new Date('2024-01-04'), open: 10600, high: 11000, low: 10400, close: 10800, volume: 1300 },
    { date: new Date('2024-01-05'), open: 10800, high: 11200, low: 10600, close: 11000, volume: 1400 },
    { date: new Date('2024-01-08'), open: 11000, high: 11400, low: 10800, close: 11200, volume: 1500 },
    { date: new Date('2024-01-09'), open: 11200, high: 11600, low: 11000, close: 11400, volume: 1600 },
    { date: new Date('2024-01-10'), open: 11400, high: 11800, low: 11200, close: 11600, volume: 1700 },
    { date: new Date('2024-01-11'), open: 11600, high: 12000, low: 11400, close: 11800, volume: 1800 },
    { date: new Date('2024-01-12'), open: 11800, high: 12200, low: 11600, close: 12000, volume: 1900 },
  ];

  describe('calculateSMA - 簡單移動平均線', () => {
    it('應該正確計算 5 日均線', () => {
      const prices = [10000, 10200, 10400, 10600, 10800];
      const sma5 = calculateSMA(prices, 5);
      expect(sma5).toBe(10400); // (10000 + 10200 + 10400 + 10600 + 10800) / 5 = 10400
    });

    it('當資料不足時應該返回 null', () => {
      const prices = [10000, 10200, 10400];
      const sma5 = calculateSMA(prices, 5);
      expect(sma5).toBeNull();
    });

    it('應該只計算最近 N 個價格', () => {
      const prices = [10000, 10200, 10400, 10600, 10800, 11000];
      const sma3 = calculateSMA(prices, 3);
      expect(sma3).toBe(10800); // (10600 + 10800 + 11000) / 3 = 10800
    });
  });

  describe('calculateMovingAverages - 多週期移動平均線', () => {
    it('應該計算 MA5、MA10、MA20、MA60', () => {
      const result = calculateMovingAverages(mockPriceData);
      
      expect(result).toHaveLength(mockPriceData.length);
      
      // 檢查第 5 個資料點應該有 MA5
      expect(result[4].ma5).not.toBeNull();
      
      // 檢查第 4 個資料點不應該有 MA5（資料不足）
      expect(result[3].ma5).toBeNull();
    });

    it('應該包含正確的日期', () => {
      const result = calculateMovingAverages(mockPriceData);
      expect(result[0].date).toEqual(mockPriceData[0].date);
    });
  });

  describe('calculateRSI - 相對強弱指標', () => {
    it('應該計算 RSI 值', () => {
      // 需要至少 16 個資料點（14 + 2）才能開始計算 RSI
      const extendedData = [
        ...mockPriceData,
        { date: new Date('2024-01-15'), open: 12000, high: 12400, low: 11800, close: 12200, volume: 2000 },
        { date: new Date('2024-01-16'), open: 12200, high: 12600, low: 12000, close: 12400, volume: 2100 },
        { date: new Date('2024-01-17'), open: 12400, high: 12800, low: 12200, close: 12600, volume: 2200 },
        { date: new Date('2024-01-18'), open: 12600, high: 13000, low: 12400, close: 12800, volume: 2300 },
        { date: new Date('2024-01-19'), open: 12800, high: 13200, low: 12600, close: 13000, volume: 2400 },
        { date: new Date('2024-01-22'), open: 13000, high: 13400, low: 12800, close: 13200, volume: 2500 },
      ];

      const result = calculateRSI(extendedData);
      
      expect(result.length).toBeGreaterThan(0);
      
      // RSI 值應該在 0 到 100 之間（以萬分之一為單位，所以是 0 到 1000000）
      result.forEach((item) => {
        expect(item.rsi14).toBeGreaterThanOrEqual(0);
        expect(item.rsi14).toBeLessThanOrEqual(1000000);
      });
    });

    it('當資料不足時應該返回空陣列', () => {
      const result = calculateRSI(mockPriceData.slice(0, 14)); // 少於 15 個資料點
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateMACD - 指數平滑異同移動平均線', () => {
    it('應該計算 MACD、信號線、柱狀圖', () => {
      // 需要至少 26 + 9 = 35 個資料點才能計算 MACD 信號線
      const extendedData = [...mockPriceData];
      for (let i = 0; i < 30; i++) {
        const lastPrice = extendedData[extendedData.length - 1];
        extendedData.push({
          date: new Date(lastPrice.date.getTime() + 86400000), // 加一天
          open: lastPrice.close,
          high: lastPrice.close + 200,
          low: lastPrice.close - 200,
          close: lastPrice.close + 100,
          volume: lastPrice.volume + 100,
        });
      }

      const result = calculateMACD(extendedData);
      
      expect(result.length).toBeGreaterThan(0);
      
      // 檢查每個結果都有 MACD、信號線、柱狀圖
      result.forEach((item) => {
        expect(item.macd).toBeDefined();
        expect(item.macdSignal).toBeDefined();
        expect(item.macdHistogram).toBeDefined();
      });
    });

    it('當資料不足時應該返回空陣列', () => {
      const result = calculateMACD(mockPriceData.slice(0, 20));
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateKD - 隨機指標', () => {
    it('應該計算 K 值和 D 值', () => {
      const result = calculateKD(mockPriceData);
      
      expect(result.length).toBeGreaterThan(0);
      
      // K 值和 D 值應該在 0 到 100 之間（以萬分之一為單位，所以是 0 到 1000000）
      result.forEach((item) => {
        expect(item.kValue).toBeGreaterThanOrEqual(0);
        expect(item.kValue).toBeLessThanOrEqual(1000000);
        expect(item.dValue).toBeGreaterThanOrEqual(0);
        expect(item.dValue).toBeLessThanOrEqual(1000000);
      });
    });

    it('當資料不足時應該返回空陣列', () => {
      const result = calculateKD(mockPriceData.slice(0, 5));
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateAllIndicators - 計算所有技術指標', () => {
    it('應該返回包含所有指標的結果', () => {
      // 準備足夠的資料
      const extendedData = [...mockPriceData];
      for (let i = 0; i < 60; i++) {
        const lastPrice = extendedData[extendedData.length - 1];
        extendedData.push({
          date: new Date(lastPrice.date.getTime() + 86400000),
          open: lastPrice.close,
          high: lastPrice.close + 200,
          low: lastPrice.close - 200,
          close: lastPrice.close + 100,
          volume: lastPrice.volume + 100,
        });
      }

      const result = calculateAllIndicators(extendedData);
      
      expect(result).toHaveLength(extendedData.length);
      
      // 檢查最後一個資料點應該有所有指標
      const lastItem = result[result.length - 1];
      expect(lastItem.ma5).toBeDefined();
      expect(lastItem.ma10).toBeDefined();
      expect(lastItem.ma20).toBeDefined();
      expect(lastItem.ma60).toBeDefined();
      expect(lastItem.rsi14).toBeDefined();
      expect(lastItem.macd).toBeDefined();
      expect(lastItem.kValue).toBeDefined();
      expect(lastItem.dValue).toBeDefined();
    });

    it('當資料為空時應該返回空陣列', () => {
      const result = calculateAllIndicators([]);
      expect(result).toHaveLength(0);
    });
  });
});

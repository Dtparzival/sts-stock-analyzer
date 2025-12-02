/**
 * FinMind API 整合測試
 */

import { describe, it, expect } from 'vitest';
import {
  fetchAllStockInfo,
  fetchStockPrice,
  fetchBatchStockPrices,
} from '../server/integrations/finmind';

describe('FinMind API 整合', () => {
  it('應該能夠獲取所有股票基本資料', async () => {
    const stocks = await fetchAllStockInfo();

    expect(stocks).toBeDefined();
    expect(Array.isArray(stocks)).toBe(true);
    expect(stocks.length).toBeGreaterThan(0);

    // 檢查資料結構
    const firstStock = stocks[0];
    expect(firstStock).toHaveProperty('stock_id');
    expect(firstStock).toHaveProperty('stock_name');
    expect(firstStock).toHaveProperty('industry_category');
    expect(firstStock).toHaveProperty('type');
  }, 30000);

  it('應該能夠獲取單一股票的歷史價格', async () => {
    const symbol = '2330'; // 台積電
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    const prices = await fetchStockPrice(symbol, startDate, endDate);

    expect(prices).toBeDefined();
    expect(Array.isArray(prices)).toBe(true);
    expect(prices.length).toBeGreaterThan(0);

    // 檢查資料結構
    const firstPrice = prices[0];
    expect(firstPrice).toHaveProperty('date');
    expect(firstPrice).toHaveProperty('stock_id');
    expect(firstPrice).toHaveProperty('Trading_Volume');
    expect(firstPrice).toHaveProperty('Trading_money');
    expect(firstPrice).toHaveProperty('open');
    expect(firstPrice).toHaveProperty('max');
    expect(firstPrice).toHaveProperty('min');
    expect(firstPrice).toHaveProperty('close');
    expect(firstPrice).toHaveProperty('spread');
    expect(firstPrice).toHaveProperty('Trading_turnover');
  }, 30000);

  it('應該能夠批次獲取多檔股票的歷史價格', async () => {
    const symbols = ['2330', '2317', '2454']; // 台積電、鴻海、聯發科
    const startDate = '2024-01-15';
    const endDate = '2024-01-15';

    const priceMap = await fetchBatchStockPrices(symbols, startDate, endDate, 2);

    expect(priceMap).toBeDefined();
    expect(priceMap.size).toBe(symbols.length);

    // 檢查每檔股票都有資料
    for (const symbol of symbols) {
      expect(priceMap.has(symbol)).toBe(true);
      const prices = priceMap.get(symbol);
      expect(Array.isArray(prices)).toBe(true);
    }
  }, 60000);

  it('應該正確處理不存在的股票代號', async () => {
    const invalidSymbol = '9999';
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    const prices = await fetchStockPrice(invalidSymbol, startDate, endDate);

    // 不存在的股票應該回傳空陣列
    expect(Array.isArray(prices)).toBe(true);
    expect(prices.length).toBe(0);
  }, 30000);

  it('應該正確處理無效的日期範圍', async () => {
    const symbol = '2330';
    const startDate = '2024-12-31';
    const endDate = '2024-01-01'; // 結束日期早於起始日期

    const prices = await fetchStockPrice(symbol, startDate, endDate);

    // 無效日期範圍應該回傳空陣列
    expect(Array.isArray(prices)).toBe(true);
    expect(prices.length).toBe(0);
  }, 30000);
});

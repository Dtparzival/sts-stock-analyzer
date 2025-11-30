import { describe, it, expect } from 'vitest';
import { cleanTWSymbol, TW_STOCK_NAMES, getMarketFromSymbol } from '../shared/markets';

/**
 * 測試「為您推薦」卡片的股票名稱顯示邏輯
 * 
 * 測試目標：
 * 1. 驗證從 API 回應中正確提取股票代碼
 * 2. 驗證從 stockPriceMap 獲取美股名稱
 * 3. 驗證從 stockPriceMap 獲取台股名稱
 * 4. 驗證無數據時的處理
 * 5. 驗證多個推薦股票的名稱顯示
 */

describe('推薦卡片股票名稱顯示邏輯', () => {
  it('應該從推薦結果中提取股票代碼', () => {
    // 模擬 AI 推薦系統回傳的數據格式
    const recommendationData = {
      recommendations: ['AAPL', 'GOOGL', 'MSFT'],
      reason: 'AI 推薦理由'
    };

    // 模擬前端處理邏輯
    const recentHistory = recommendationData.recommendations.map((symbol: string) => ({ symbol }));

    expect(recentHistory).toEqual([
      { symbol: 'AAPL' },
      { symbol: 'GOOGL' },
      { symbol: 'MSFT' }
    ]);
    expect(recentHistory.length).toBe(3);
  });

  it('應該從 stockPriceMap 獲取美股名稱', () => {
    // 模擬 stockPriceMap 數據結構
    const stockPriceMap = new Map();
    stockPriceMap.set('AAPL', {
      chart: {
        result: [{
          meta: {
            symbol: 'AAPL',
            shortName: 'Apple Inc.',
            longName: 'Apple Inc.',
            regularMarketPrice: 150.25
          }
        }]
      }
    });

    // 模擬前端顯示邏輯
    const symbol = 'AAPL';
    const stockData = stockPriceMap.get(symbol);
    const meta = stockData?.chart?.result?.[0]?.meta;
    const displayName = meta?.shortName || meta?.longName || null;

    expect(displayName).toBe('Apple Inc.');
  });

  it('應該從 stockPriceMap 獲取台股名稱', () => {
    // 模擬 stockPriceMap 數據結構（台股）
    const stockPriceMap = new Map();
    stockPriceMap.set('2330.TW', {
      chart: {
        result: [{
          meta: {
            symbol: '2330.TW',
            shortName: '台積電',
            longName: '台灣積體電路製造股份有限公司',
            regularMarketPrice: 580.00
          }
        }]
      }
    });

    // 模擬前端顯示邏輯
    const symbol = '2330.TW';
    const stockData = stockPriceMap.get(symbol);
    const meta = stockData?.chart?.result?.[0]?.meta;
    let displayName = meta?.shortName || meta?.longName || null;

    // 如果 API 沒有返回名稱，則從備用映射表獲取
    const market = getMarketFromSymbol(symbol);
    if (market === 'TW') {
      const cleanSymbol = cleanTWSymbol(symbol);
      if (!displayName || displayName === symbol || displayName.includes('.TW')) {
        displayName = TW_STOCK_NAMES[cleanSymbol] || null;
      }
    }

    expect(displayName).toBe('台積電');
  });

  it('應該在無數據時返回 null', () => {
    // 模擬 stockPriceMap 無數據的情況
    const stockPriceMap = new Map();

    // 模擬前端顯示邏輯
    const symbol = 'UNKNOWN';
    const stockData = stockPriceMap.get(symbol);
    const meta = stockData?.chart?.result?.[0]?.meta;
    const displayName = meta?.shortName || meta?.longName || null;

    expect(displayName).toBeNull();
  });

  it('應該正確處理多個推薦股票的名稱顯示', () => {
    // 模擬完整的推薦流程
    const recommendationData = {
      recommendations: ['AAPL', '2330.TW', 'GOOGL'],
      reason: 'AI 推薦理由'
    };

    const stockPriceMap = new Map();
    stockPriceMap.set('AAPL', {
      chart: {
        result: [{
          meta: {
            symbol: 'AAPL',
            shortName: 'Apple Inc.',
            regularMarketPrice: 150.25
          }
        }]
      }
    });
    stockPriceMap.set('2330.TW', {
      chart: {
        result: [{
          meta: {
            symbol: '2330.TW',
            shortName: '台積電',
            regularMarketPrice: 580.00
          }
        }]
      }
    });
    stockPriceMap.set('GOOGL', {
      chart: {
        result: [{
          meta: {
            symbol: 'GOOGL',
            shortName: 'Alphabet Inc.',
            regularMarketPrice: 140.50
          }
        }]
      }
    });

    // 模擬前端處理所有推薦股票
    const results = recommendationData.recommendations.map((symbol: string) => {
      const stockData = stockPriceMap.get(symbol);
      const meta = stockData?.chart?.result?.[0]?.meta;
      let displayName = meta?.shortName || meta?.longName || null;

      const market = getMarketFromSymbol(symbol);
      if (market === 'TW') {
        const cleanSymbol = cleanTWSymbol(symbol);
        if (!displayName || displayName === symbol || displayName.includes('.TW')) {
          displayName = TW_STOCK_NAMES[cleanSymbol] || null;
        }
      }

      return {
        symbol,
        displayName
      };
    });

    expect(results).toEqual([
      { symbol: 'AAPL', displayName: 'Apple Inc.' },
      { symbol: '2330.TW', displayName: '台積電' },
      { symbol: 'GOOGL', displayName: 'Alphabet Inc.' }
    ]);
  });
});

import { describe, it, expect } from 'vitest';

/**
 * 測試推薦卡片股票名稱顯示邏輯
 * 
 * 問題背景：
 * 新的 AI 推薦系統回傳的資料格式只包含股票代碼（recommendations: string[]），
 * 而前端需要從 stockPriceMap 中獲取股票的詳細資訊（如 shortName、longName）。
 * 
 * 修正方案：
 * 1. 從 recommendationData.recommendations 提取股票代碼列表
 * 2. 使用 tRPC 查詢每個股票的詳細資料
 * 3. 從 stockPriceMap 中獲取 meta.shortName 或 meta.longName
 * 4. 如果是台股且沒有名稱，則從 TW_STOCK_NAMES 備用映射表獲取
 */

describe('推薦卡片股票名稱顯示', () => {
  it('應該從 API 回應的 recommendations 陣列中提取股票代碼', () => {
    // 模擬 API 回應
    const recommendationData = {
      recommendations: ['AAPL', 'GOOGL', 'MSFT'],
      reason: '根據您的投資偏好，我們為您推薦這些優質股票。',
    };
    
    // 模擬前端轉換邏輯
    const recentHistory = recommendationData.recommendations.map((symbol: string) => ({ symbol }));
    
    // 驗證轉換結果
    expect(recentHistory).toEqual([
      { symbol: 'AAPL' },
      { symbol: 'GOOGL' },
      { symbol: 'MSFT' },
    ]);
  });
  
  it('應該從 stockPriceMap 中獲取股票名稱（美股）', () => {
    // 模擬 stockPriceMap
    const stockPriceMap = new Map<string, any>([
      ['AAPL', {
        chart: {
          result: [{
            meta: {
              shortName: 'Apple Inc.',
              longName: 'Apple Inc.',
              regularMarketPrice: 150.0,
              previousClose: 148.0,
            }
          }]
        }
      }],
    ]);
    
    // 模擬推薦項目
    const item = { symbol: 'AAPL' };
    
    // 模擬前端顯示邏輯
    const stockData = stockPriceMap.get(item.symbol);
    const meta = stockData?.chart?.result?.[0]?.meta;
    const displayName = meta?.shortName || meta?.longName || null;
    
    // 驗證結果
    expect(displayName).toBe('Apple Inc.');
  });
  
  it('應該從 stockPriceMap 中獲取股票名稱（台股）', () => {
    // 模擬 TW_STOCK_NAMES 備用映射表
    const TW_STOCK_NAMES: Record<string, string> = {
      '2330': '台積電',
      '2317': '鴻海',
    };
    
    // 模擬 stockPriceMap（台股 API 可能沒有 shortName）
    const stockPriceMap = new Map<string, any>([
      ['2330.TW', {
        chart: {
          result: [{
            meta: {
              regularMarketPrice: 600.0,
              previousClose: 595.0,
            }
          }]
        }
      }],
    ]);
    
    // 模擬推薦項目
    const item = { symbol: '2330.TW' };
    
    // 模擬前端顯示邏輯
    const stockData = stockPriceMap.get(item.symbol);
    const meta = stockData?.chart?.result?.[0]?.meta;
    let displayName = meta?.shortName || meta?.longName || null;
    
    // 清理台股代碼
    const cleanSymbol = item.symbol.replace('.TW', '').replace('.TWO', '');
    
    // 如果沒有從 API 獲取到名稱，則從備用映射表獲取
    if (!displayName || displayName === item.symbol || displayName.includes('.TW')) {
      displayName = TW_STOCK_NAMES[cleanSymbol] || null;
    }
    
    // 驗證結果
    expect(displayName).toBe('台積電');
  });
  
  it('當 stockPriceMap 中沒有數據時，應該返回 null', () => {
    // 模擬空的 stockPriceMap
    const stockPriceMap = new Map<string, any>();
    
    // 模擬推薦項目
    const item = { symbol: 'AAPL' };
    
    // 模擬前端顯示邏輯
    const stockData = stockPriceMap.get(item.symbol);
    const meta = stockData?.chart?.result?.[0]?.meta;
    const displayName = meta?.shortName || meta?.longName || null;
    
    // 驗證結果
    expect(displayName).toBe(null);
  });
  
  it('應該正確處理多個推薦股票的名稱顯示', () => {
    // 模擬 stockPriceMap
    const stockPriceMap = new Map<string, any>([
      ['AAPL', {
        chart: {
          result: [{
            meta: {
              shortName: 'Apple Inc.',
              regularMarketPrice: 150.0,
            }
          }]
        }
      }],
      ['GOOGL', {
        chart: {
          result: [{
            meta: {
              shortName: 'Alphabet Inc.',
              regularMarketPrice: 2800.0,
            }
          }]
        }
      }],
      ['MSFT', {
        chart: {
          result: [{
            meta: {
              shortName: 'Microsoft Corporation',
              regularMarketPrice: 300.0,
            }
          }]
        }
      }],
    ]);
    
    // 模擬推薦列表
    const recommendations = [
      { symbol: 'AAPL' },
      { symbol: 'GOOGL' },
      { symbol: 'MSFT' },
    ];
    
    // 模擬前端顯示邏輯
    const displayNames = recommendations.map(item => {
      const stockData = stockPriceMap.get(item.symbol);
      const meta = stockData?.chart?.result?.[0]?.meta;
      return meta?.shortName || meta?.longName || null;
    });
    
    // 驗證結果
    expect(displayNames).toEqual([
      'Apple Inc.',
      'Alphabet Inc.',
      'Microsoft Corporation',
    ]);
  });
});

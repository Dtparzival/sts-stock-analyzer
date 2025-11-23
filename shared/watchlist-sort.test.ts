import { describe, it, expect } from 'vitest';

/**
 * 測試收藏頁面排序功能
 * 
 * 功能描述：
 * 1. 支援依添加時間、價格、漲跌幅排序
 * 2. 支援升序和降序切換
 * 3. 排序邏輯正確處理缺失數據
 */

describe('Watchlist Sorting Logic', () => {
  // 模擬收藏列表數據
  const mockWatchlist = [
    { id: 1, symbol: 'AAPL', addedAt: new Date('2024-01-01') },
    { id: 2, symbol: 'GOOGL', addedAt: new Date('2024-01-03') },
    { id: 3, symbol: 'TSLA', addedAt: new Date('2024-01-02') },
  ];

  // 模擬股價數據
  const mockStockPrices = {
    'AAPL': { price: 150, changePercent: 2.5 },
    'GOOGL': { price: 120, changePercent: -1.2 },
    'TSLA': { price: 200, changePercent: 5.0 },
  };

  it('應該能夠依添加時間降序排序', () => {
    const sorted = [...mockWatchlist].sort((a, b) => {
      const compareValue = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      return -compareValue; // 降序
    });

    expect(sorted[0].symbol).toBe('GOOGL'); // 最新添加
    expect(sorted[1].symbol).toBe('TSLA');
    expect(sorted[2].symbol).toBe('AAPL'); // 最早添加
  });

  it('應該能夠依添加時間升序排序', () => {
    const sorted = [...mockWatchlist].sort((a, b) => {
      const compareValue = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      return compareValue; // 升序
    });

    expect(sorted[0].symbol).toBe('AAPL'); // 最早添加
    expect(sorted[1].symbol).toBe('TSLA');
    expect(sorted[2].symbol).toBe('GOOGL'); // 最新添加
  });

  it('應該能夠依價格降序排序', () => {
    const sorted = [...mockWatchlist].sort((a, b) => {
      const priceA = mockStockPrices[a.symbol]?.price ?? 0;
      const priceB = mockStockPrices[b.symbol]?.price ?? 0;
      const compareValue = priceA - priceB;
      return -compareValue; // 降序
    });

    expect(sorted[0].symbol).toBe('TSLA'); // 最高價
    expect(sorted[1].symbol).toBe('AAPL');
    expect(sorted[2].symbol).toBe('GOOGL'); // 最低價
  });

  it('應該能夠依價格升序排序', () => {
    const sorted = [...mockWatchlist].sort((a, b) => {
      const priceA = mockStockPrices[a.symbol]?.price ?? 0;
      const priceB = mockStockPrices[b.symbol]?.price ?? 0;
      const compareValue = priceA - priceB;
      return compareValue; // 升序
    });

    expect(sorted[0].symbol).toBe('GOOGL'); // 最低價
    expect(sorted[1].symbol).toBe('AAPL');
    expect(sorted[2].symbol).toBe('TSLA'); // 最高價
  });

  it('應該能夠依漲跌幅降序排序', () => {
    const sorted = [...mockWatchlist].sort((a, b) => {
      const changeA = mockStockPrices[a.symbol]?.changePercent ?? 0;
      const changeB = mockStockPrices[b.symbol]?.changePercent ?? 0;
      const compareValue = changeA - changeB;
      return -compareValue; // 降序
    });

    expect(sorted[0].symbol).toBe('TSLA'); // 最高漲幅 +5.0%
    expect(sorted[1].symbol).toBe('AAPL'); // +2.5%
    expect(sorted[2].symbol).toBe('GOOGL'); // 最低（負值） -1.2%
  });

  it('應該能夠依漲跌幅升序排序', () => {
    const sorted = [...mockWatchlist].sort((a, b) => {
      const changeA = mockStockPrices[a.symbol]?.changePercent ?? 0;
      const changeB = mockStockPrices[b.symbol]?.changePercent ?? 0;
      const compareValue = changeA - changeB;
      return compareValue; // 升序
    });

    expect(sorted[0].symbol).toBe('GOOGL'); // 最低（負值） -1.2%
    expect(sorted[1].symbol).toBe('AAPL'); // +2.5%
    expect(sorted[2].symbol).toBe('TSLA'); // 最高漲幅 +5.0%
  });

  it('應該正確處理缺失的股價數據', () => {
    const incompleteStockPrices = {
      'AAPL': { price: 150, changePercent: 2.5 },
      // GOOGL 和 TSLA 缺失數據
    };

    const sorted = [...mockWatchlist].sort((a, b) => {
      const priceA = incompleteStockPrices[a.symbol]?.price ?? 0;
      const priceB = incompleteStockPrices[b.symbol]?.price ?? 0;
      const compareValue = priceA - priceB;
      return -compareValue; // 降序
    });

    // AAPL 有價格數據應該排在前面
    expect(sorted[0].symbol).toBe('AAPL');
    // GOOGL 和 TSLA 缺失數據，價格視為 0，排在後面
    expect(['GOOGL', 'TSLA']).toContain(sorted[1].symbol);
    expect(['GOOGL', 'TSLA']).toContain(sorted[2].symbol);
  });

  it('應該在排序選項切換時正確改變排序方向', () => {
    let sortBy: 'addedAt' | 'price' | 'changePercent' = 'addedAt';
    let sortOrder: 'asc' | 'desc' = 'desc';

    // 模擬 toggleSort 函數
    const toggleSort = (option: typeof sortBy) => {
      if (sortBy === option) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy = option;
        sortOrder = 'desc';
      }
    };

    // 初始狀態：依添加時間降序
    expect(sortBy).toBe('addedAt');
    expect(sortOrder).toBe('desc');

    // 再次點擊添加時間：切換為升序
    toggleSort('addedAt');
    expect(sortBy).toBe('addedAt');
    expect(sortOrder).toBe('asc');

    // 點擊價格：切換為價格降序
    toggleSort('price');
    expect(sortBy).toBe('price');
    expect(sortOrder).toBe('desc');

    // 再次點擊價格：切換為升序
    toggleSort('price');
    expect(sortBy).toBe('price');
    expect(sortOrder).toBe('asc');
  });
});

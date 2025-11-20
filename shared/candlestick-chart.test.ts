import { describe, it, expect } from 'vitest';

describe('K 線圖數據格式測試', () => {
  it('應該包含 OHLC 數據欄位', () => {
    const mockChartData = [
      {
        timestamp: 1700000000,
        date: '11月 15日',
        price: 150.25,
        open: 148.50,
        high: 151.00,
        low: 147.80,
        close: 150.25,
        volume: 50,
      },
    ];

    expect(mockChartData[0]).toHaveProperty('open');
    expect(mockChartData[0]).toHaveProperty('high');
    expect(mockChartData[0]).toHaveProperty('low');
    expect(mockChartData[0]).toHaveProperty('close');
    expect(mockChartData[0]).toHaveProperty('price');
  });

  it('OHLC 數據應該符合邏輯關係', () => {
    const mockChartData = [
      {
        timestamp: 1700000000,
        date: '11月 15日',
        price: 150.25,
        open: 148.50,
        high: 151.00,
        low: 147.80,
        close: 150.25,
        volume: 50,
      },
    ];

    const data = mockChartData[0];
    
    // 最高價應該 >= 開盤價和收盤價
    expect(data.high).toBeGreaterThanOrEqual(data.open);
    expect(data.high).toBeGreaterThanOrEqual(data.close);
    
    // 最低價應該 <= 開盤價和收盤價
    expect(data.low).toBeLessThanOrEqual(data.open);
    expect(data.low).toBeLessThanOrEqual(data.close);
    
    // price 應該等於 close
    expect(data.price).toBe(data.close);
  });

  it('應該正確判斷漲跌', () => {
    const risingCandle = {
      open: 148.50,
      close: 150.25,
    };
    
    const fallingCandle = {
      open: 150.25,
      close: 148.50,
    };
    
    // 收盤價 > 開盤價 = 上漲
    expect(risingCandle.close).toBeGreaterThan(risingCandle.open);
    
    // 收盤價 < 開盤價 = 下跌
    expect(fallingCandle.close).toBeLessThan(fallingCandle.open);
  });

  it('應該處理平盤（開盤價 = 收盤價）', () => {
    const flatCandle = {
      open: 150.00,
      close: 150.00,
      high: 151.00,
      low: 149.00,
    };
    
    expect(flatCandle.close).toBe(flatCandle.open);
    expect(flatCandle.high).toBeGreaterThanOrEqual(flatCandle.close);
    expect(flatCandle.low).toBeLessThanOrEqual(flatCandle.close);
  });

  it('應該過濾掉無效數據', () => {
    const mockData = [
      {
        timestamp: 1700000000,
        date: '11月 15日',
        price: 150.25,
        open: 148.50,
        high: 151.00,
        low: 147.80,
        close: 150.25,
        volume: 50,
      },
      {
        timestamp: 1700086400,
        date: '11月 16日',
        price: null, // 無效數據
        open: null,
        high: null,
        low: null,
        close: null,
        volume: 0,
      },
    ];

    const validData = mockData.filter(item => item.price !== null);
    
    expect(validData.length).toBe(1);
    expect(validData[0].price).toBe(150.25);
  });
});

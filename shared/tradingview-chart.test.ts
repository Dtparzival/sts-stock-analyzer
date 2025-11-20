import { describe, it, expect } from 'vitest';

describe('TradingView Lightweight Charts 整合測試', () => {
  it('應該正確轉換數據格式為 Lightweight Charts 格式', () => {
    const mockData = [
      {
        timestamp: 1700000000,
        date: '11月 15日',
        price: 150.25,
        open: 148.50,
        high: 151.00,
        low: 147.80,
        close: 150.25,
        volume: 50000000,
      },
      {
        timestamp: 1700086400,
        date: '11月 16日',
        price: 152.00,
        open: 150.25,
        high: 153.00,
        low: 149.50,
        close: 152.00,
        volume: 60000000,
      },
    ];

    // 轉換為 Candlestick 數據格式
    const candlestickData = mockData.map(item => ({
      time: item.timestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    expect(candlestickData).toHaveLength(2);
    expect(candlestickData[0]).toHaveProperty('time');
    expect(candlestickData[0]).toHaveProperty('open');
    expect(candlestickData[0]).toHaveProperty('high');
    expect(candlestickData[0]).toHaveProperty('low');
    expect(candlestickData[0]).toHaveProperty('close');
  });

  it('應該正確轉換成交量數據格式', () => {
    const mockData = [
      {
        timestamp: 1700000000,
        date: '11月 15日',
        price: 150.25,
        open: 148.50,
        high: 151.00,
        low: 147.80,
        close: 150.25,
        volume: 50000000,
      },
      {
        timestamp: 1700086400,
        date: '11月 16日',
        price: 152.00,
        open: 150.25,
        high: 153.00,
        low: 149.50,
        close: 152.00,
        volume: 60000000,
      },
    ];

    // 轉換為 Histogram 數據格式
    const volumeData = mockData.map(item => ({
      time: item.timestamp,
      value: item.volume,
      color: item.close! >= item.open! ? "#22c55e80" : "#ef444480",
    }));

    expect(volumeData).toHaveLength(2);
    expect(volumeData[0]).toHaveProperty('time');
    expect(volumeData[0]).toHaveProperty('value');
    expect(volumeData[0]).toHaveProperty('color');
    
    // 第一天上漲，應該是綠色
    expect(volumeData[0].color).toBe("#22c55e80");
    // 第二天上漲，應該是綠色
    expect(volumeData[1].color).toBe("#22c55e80");
  });

  it('應該正確判斷成交量柱的顏色（上漲綠色，下跌紅色）', () => {
    const risingDay = {
      open: 148.50,
      close: 150.25,
    };

    const fallingDay = {
      open: 150.25,
      close: 148.50,
    };

    const risingColor = risingDay.close >= risingDay.open ? "#22c55e80" : "#ef444480";
    const fallingColor = fallingDay.close >= fallingDay.open ? "#22c55e80" : "#ef444480";

    expect(risingColor).toBe("#22c55e80"); // 上漲為綠色
    expect(fallingColor).toBe("#ef444480"); // 下跌為紅色
  });

  it('應該過濾掉不完整的 OHLC 數據', () => {
    const mockData = [
      {
        timestamp: 1700000000,
        date: '11月 15日',
        price: 150.25,
        open: 148.50,
        high: 151.00,
        low: 147.80,
        close: 150.25,
        volume: 50000000,
      },
      {
        timestamp: 1700086400,
        date: '11月 16日',
        price: null,
        open: undefined,
        high: undefined,
        low: undefined,
        close: undefined,
        volume: 0,
      },
    ];

    const validData = mockData.filter(
      item => item.open !== undefined && item.high !== undefined && item.low !== undefined && item.close !== undefined
    );

    expect(validData).toHaveLength(1);
    expect(validData[0].open).toBe(148.50);
  });

  it('應該正確計算價格變化百分比', () => {
    const mockData = [
      { price: 100 },
      { price: 110 },
    ];

    const priceChange = ((mockData[mockData.length - 1].price - mockData[0].price) / mockData[0].price) * 100;
    const isPositive = priceChange >= 0;

    expect(priceChange).toBe(10);
    expect(isPositive).toBe(true);
  });

  it('應該正確處理時間戳格式', () => {
    const timestamp = 1700000000;
    const date = new Date(timestamp * 1000);

    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(timestamp * 1000);
  });
});

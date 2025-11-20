import { describe, it, expect } from 'vitest';

describe('K 線圖渲染邏輯測試', () => {
  it('應該正確計算 K 線實體的位置和高度', () => {
    // 模擬 Y 軸縮放函數
    const mockYScale = (value: number) => {
      // 假設圖表高度 400px，價格範圍 100-200
      const min = 100;
      const max = 200;
      const height = 400;
      return height - ((value - min) / (max - min)) * height;
    };

    const open = 150;
    const close = 160;
    const high = 165;
    const low = 145;

    const yOpen = mockYScale(open);
    const yClose = mockYScale(close);
    const yHigh = mockYScale(high);
    const yLow = mockYScale(low);

    // K 線實體的 Y 坐標應該是 open 和 close 中較小的 Y 值
    const candleY = Math.min(yOpen, yClose);
    
    // K 線實體的高度應該是 open 和 close 之間的距離
    const candleHeight = Math.max(Math.abs(yClose - yOpen), 1);

    expect(candleY).toBeLessThan(yOpen); // close > open，所以 yClose < yOpen
    expect(candleHeight).toBeGreaterThan(0);
    expect(yHigh).toBeLessThan(candleY); // high 的 Y 坐標應該在實體上方
    expect(yLow).toBeGreaterThan(yOpen); // low 的 Y 坐標應該在實體下方
  });

  it('應該正確判斷上漲和下跌 K 線', () => {
    const risingCandle = {
      open: 150,
      close: 160,
    };

    const fallingCandle = {
      open: 160,
      close: 150,
    };

    const isRising1 = risingCandle.close >= risingCandle.open;
    const isRising2 = fallingCandle.close >= fallingCandle.open;

    expect(isRising1).toBe(true);
    expect(isRising2).toBe(false);
  });

  it('應該為上漲和下跌 K 線使用不同顏色', () => {
    const getColor = (isRising: boolean) => {
      return isRising ? "#22c55e" : "#ef4444"; // 綠漲紅跌
    };

    expect(getColor(true)).toBe("#22c55e"); // 上漲為綠色
    expect(getColor(false)).toBe("#ef4444"); // 下跌為紅色
  });

  it('應該正確計算 K 線寬度', () => {
    const chartWidth = 800;
    const marginLeft = 50;
    const marginRight = 50;
    const dataLength = 30;

    const barWidth = Math.max((chartWidth - marginLeft - marginRight) / dataLength * 0.6, 2);

    expect(barWidth).toBeGreaterThanOrEqual(2); // 最小寬度為 2px
    expect(barWidth).toBeLessThan((chartWidth - marginLeft - marginRight) / dataLength); // 寬度應小於總寬度除以數據點數
  });

  it('應該處理平盤 K 線（開盤價 = 收盤價）', () => {
    const mockYScale = (value: number) => 200 - value;

    const open = 150;
    const close = 150; // 平盤
    const high = 155;
    const low = 145;

    const yOpen = mockYScale(open);
    const yClose = mockYScale(close);

    const candleHeight = Math.max(Math.abs(yClose - yOpen), 1);

    // 平盤時高度應該為最小值 1px
    expect(candleHeight).toBe(1);
  });

  it('應該過濾掉不完整的 OHLC 數據', () => {
    const mockData = [
      { open: 150, high: 155, low: 145, close: 152 }, // 完整數據
      { open: null, high: 155, low: 145, close: 152 }, // 缺少 open
      { open: 150, high: null, low: 145, close: 152 }, // 缺少 high
      { open: 150, high: 155, low: null, close: 152 }, // 缺少 low
      { open: 150, high: 155, low: 145, close: null }, // 缺少 close
    ];

    const validData = mockData.filter(
      item => item.open && item.high && item.low && item.close
    );

    expect(validData.length).toBe(1);
    expect(validData[0].open).toBe(150);
  });
});

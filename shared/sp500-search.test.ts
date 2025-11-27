import { describe, it, expect } from 'vitest';
import sp500Stocks from './sp500-stocks.json';

describe('S&P 500 股票搜尋', () => {
  it('應該成功載入 S&P 500 股票清單', () => {
    expect(sp500Stocks).toBeDefined();
    expect(Array.isArray(sp500Stocks)).toBe(true);
    expect(sp500Stocks.length).toBeGreaterThan(0);
  });

  it('每支股票應該包含必要欄位', () => {
    const stock = sp500Stocks[0];
    expect(stock).toHaveProperty('symbol');
    expect(stock).toHaveProperty('name');
    expect(stock).toHaveProperty('sector');
    expect(typeof stock.symbol).toBe('string');
    expect(typeof stock.name).toBe('string');
  });

  it('應該能夠根據股票代號搜尋', () => {
    const query = 'AAPL';
    const results = sp500Stocks.filter(stock => 
      stock.symbol.toUpperCase().includes(query)
    );
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('AAPL');
    expect(results[0].name).toContain('Apple');
  });

  it('應該能夠根據公司名稱搜尋', () => {
    const query = 'APPLE';
    const results = sp500Stocks.filter(stock => 
      stock.name.toUpperCase().includes(query)
    );
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('AAPL');
  });

  it('應該能夠模糊搜尋', () => {
    const query = 'MICRO';
    const results = sp500Stocks.filter(stock => 
      stock.symbol.toUpperCase().includes(query) || 
      stock.name.toUpperCase().includes(query)
    );
    
    expect(results.length).toBeGreaterThan(0);
    // 應該包含 Microsoft, Micron Technology 等
    const symbols = results.map(r => r.symbol);
    expect(symbols).toContain('MSFT'); // Microsoft
  });

  it('應該限制搜尋結果數量', () => {
    const query = 'A';
    const results = sp500Stocks
      .filter(stock => 
        stock.symbol.toUpperCase().includes(query) || 
        stock.name.toUpperCase().includes(query)
      )
      .slice(0, 8);
    
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it('搜尋不存在的股票應該返回空陣列', () => {
    const query = 'NOTEXIST';
    const results = sp500Stocks.filter(stock => 
      stock.symbol.toUpperCase().includes(query) || 
      stock.name.toUpperCase().includes(query)
    );
    
    expect(results.length).toBe(0);
  });

  it('應該包含常見的大型股', () => {
    const commonStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];
    
    for (const symbol of commonStocks) {
      const found = sp500Stocks.some(stock => stock.symbol === symbol);
      expect(found).toBe(true);
    }
  });
});

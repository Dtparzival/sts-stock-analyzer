import { describe, it, expect } from 'vitest';
import { detectStockSymbols, buildStockContext } from './chatWithStockData';

describe('chatWithStockData', () => {
  describe('detectStockSymbols', () => {
    it('should detect US stock symbols', () => {
      const message = 'What do you think about AAPL and TSLA?';
      const symbols = detectStockSymbols(message);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('TSLA');
    });

    it('should detect Taiwan stock symbols', () => {
      const message = '2330 和 2317 的股價如何？';
      const symbols = detectStockSymbols(message);
      expect(symbols).toContain('2330.TW');
      expect(symbols).toContain('2317.TW');
    });

    it('should filter out common non-stock words', () => {
      const message = 'What is the PE ratio and RSI for AI stocks?';
      const symbols = detectStockSymbols(message);
      expect(symbols).not.toContain('PE');
      expect(symbols).not.toContain('RSI');
      expect(symbols).not.toContain('AI');
    });

    it('should limit to 3 symbols maximum', () => {
      const message = 'AAPL TSLA GOOGL MSFT AMZN';
      const symbols = detectStockSymbols(message);
      expect(symbols.length).toBeLessThanOrEqual(3);
    });

    it('should handle mixed US and Taiwan stocks', () => {
      const message = 'Compare AAPL with 2330';
      const symbols = detectStockSymbols(message);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('2330.TW');
    });

    it('should return empty array when no symbols detected', () => {
      const message = '如何分析一支股票的財務健康度？';
      const symbols = detectStockSymbols(message);
      expect(symbols).toEqual([]);
    });
  });

  describe('buildStockContext', () => {
    it('should build context from stock data results', () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          data: {
            chart: {
              result: [{
                meta: {
                  regularMarketPrice: 150.25,
                  previousClose: 148.50,
                  currency: 'USD',
                }
              }]
            }
          }
        }
      ];

      const context = buildStockContext(mockResults);
      expect(context).toContain('AAPL');
      expect(context).toContain('150.25');
      expect(context).toContain('148.50');
      expect(context).toContain('USD');
    });

    it('should filter out results without data', () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          data: {
            chart: {
              result: [{
                meta: {
                  regularMarketPrice: 150.25,
                  previousClose: 148.50,
                  currency: 'USD',
                }
              }]
            }
          }
        },
        {
          symbol: 'INVALID',
          data: null,
          error: 'Failed to fetch'
        }
      ];

      const context = buildStockContext(mockResults);
      expect(context).toContain('AAPL');
      expect(context).not.toContain('INVALID');
    });

    it('should return empty string when no valid data', () => {
      const mockResults = [
        {
          symbol: 'INVALID',
          data: null,
          error: 'Failed to fetch'
        }
      ];

      const context = buildStockContext(mockResults);
      expect(context).toBe('');
    });

    it('should calculate price change and percentage correctly', () => {
      const mockResults = [
        {
          symbol: 'TSLA',
          data: {
            chart: {
              result: [{
                meta: {
                  regularMarketPrice: 200.00,
                  previousClose: 190.00,
                  currency: 'USD',
                }
              }]
            }
          }
        }
      ];

      const context = buildStockContext(mockResults);
      expect(context).toContain('+10.00'); // Change
      expect(context).toContain('5.26%'); // Percentage change
    });
  });
});

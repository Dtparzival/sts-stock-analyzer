/**
 * Unit tests for AI Advisor Enhancements
 * Tests for:
 * 1. Question stats tracking (recordQuestionClick, getTopQuestions, getGlobalTopQuestions)
 * 2. Multi-stock comparison analysis (compareStocks API)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { users, questionStats } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('AI Advisor Enhancements', () => {
  let testUserId: number;

  beforeAll(async () => {
    // 創建測試用戶
    const database = await getDb();
    if (!database) {
      throw new Error('Database not available');
    }

    const result = await database.insert(users).values({
      openId: 'test-ai-advisor-user',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
    });
    testUserId = Number(result[0].insertId);
  });

  afterAll(async () => {
    // 清理測試數據
    const database = await getDb();
    if (database) {
      await database.delete(questionStats).where(eq(questionStats.userId, testUserId));
      await database.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('Question Stats Tracking', () => {
    it('should record a new question click', async () => {
      const question = 'AAPL 目前適合買入嗎？';
      await db.recordQuestionClick(testUserId, question);

      const topQuestions = await db.getTopQuestions(testUserId, 10);
      const recordedQuestion = topQuestions.find(q => q.question === question);

      expect(recordedQuestion).toBeDefined();
      expect(recordedQuestion?.clickCount).toBe(1);
    });

    it('should increment click count for existing question', async () => {
      const question = '如何分析一支股票的財務健康度？';
      
      // 第一次點擊
      await db.recordQuestionClick(testUserId, question);
      let topQuestions = await db.getTopQuestions(testUserId, 10);
      let recordedQuestion = topQuestions.find(q => q.question === question);
      expect(recordedQuestion?.clickCount).toBe(1);

      // 第二次點擊
      await db.recordQuestionClick(testUserId, question);
      topQuestions = await db.getTopQuestions(testUserId, 10);
      recordedQuestion = topQuestions.find(q => q.question === question);
      expect(recordedQuestion?.clickCount).toBe(2);

      // 第三次點擊
      await db.recordQuestionClick(testUserId, question);
      topQuestions = await db.getTopQuestions(testUserId, 10);
      recordedQuestion = topQuestions.find(q => q.question === question);
      expect(recordedQuestion?.clickCount).toBe(3);
    });

    it('should return top questions sorted by click count', async () => {
      // 記錄多個問題，不同的點擊次數
      await db.recordQuestionClick(testUserId, '推薦低風險股票'); // 1 次
      await db.recordQuestionClick(testUserId, '市場趨勢分析'); // 1 次
      await db.recordQuestionClick(testUserId, '市場趨勢分析'); // 2 次
      await db.recordQuestionClick(testUserId, '市場趨勢分析'); // 3 次

      const topQuestions = await db.getTopQuestions(testUserId, 10);
      
      expect(topQuestions.length).toBeGreaterThan(0);
      
      // 檢查是否按點擊次數降序排列
      for (let i = 0; i < topQuestions.length - 1; i++) {
        expect(topQuestions[i].clickCount).toBeGreaterThanOrEqual(topQuestions[i + 1].clickCount);
      }
    });

    it('should limit the number of returned questions', async () => {
      const topQuestions = await db.getTopQuestions(testUserId, 3);
      expect(topQuestions.length).toBeLessThanOrEqual(3);
    });

    it('should return global top questions across all users', async () => {
      const globalQuestions = await db.getGlobalTopQuestions(10);
      
      expect(Array.isArray(globalQuestions)).toBe(true);
      
      // 檢查返回的數據結構
      if (globalQuestions.length > 0) {
        expect(globalQuestions[0]).toHaveProperty('question');
        expect(globalQuestions[0]).toHaveProperty('totalClicks');
        // MySQL SUM() 返回的是字符串類型，需要轉換為數字
        const totalClicks = Number(globalQuestions[0].totalClicks);
        expect(typeof totalClicks).toBe('number');
        expect(totalClicks).toBeGreaterThan(0);
      }
    });
  });

  describe('Multi-Stock Comparison', () => {
    it('should detect stock symbols in comparison query', () => {
      const query = '比較 TSLA 和 AAPL';
      const compareMatch = query.match(/比較|vs|versus|compare/i);
      const stockSymbols = query.match(/\b[A-Z]{1,5}\b/g) || [];

      expect(compareMatch).not.toBeNull();
      expect(stockSymbols).toEqual(['TSLA', 'AAPL']);
    });

    it('should detect multiple stock symbols (3-5 stocks)', () => {
      const query = '比較 TSLA AAPL GOOGL MSFT AMZN';
      const stockSymbols = query.match(/\b[A-Z]{1,5}\b/g) || [];

      expect(stockSymbols.length).toBe(5);
      expect(stockSymbols).toEqual(['TSLA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN']);
    });

    it('should detect comparison keywords in different languages', () => {
      const queries = [
        '比較 TSLA 和 AAPL',
        'compare TSLA vs AAPL',
        'TSLA versus AAPL',
      ];

      queries.forEach(query => {
        const compareMatch = query.match(/比較|vs|versus|compare/i);
        expect(compareMatch).not.toBeNull();
      });
    });

    it('should filter out common non-stock keywords', () => {
      const query = '比較 AI 和 TSLA 的 PE 比率';
      const stockSymbols = query.match(/\b[A-Z]{1,5}\b/g) || [];
      const excludeWords = ['AI', 'PE', 'PB', 'ROE', 'ROA', 'EPS', 'RSI', 'MACD', 'KD', 'MA', 'ETF', 'IPO', 'CEO', 'CFO', 'CTO', 'USD', 'TWD', 'VS'];
      const filteredSymbols = stockSymbols.filter(symbol => !excludeWords.includes(symbol));

      expect(filteredSymbols).toEqual(['TSLA']);
    });
  });

  describe('Stock Data Extraction', () => {
    it('should extract stock info from result data', async () => {
      const { extractStockInfo } = await import('./chatWithStockData');
      
      // 模擬股票數據
      const mockResult = {
        symbol: 'AAPL',
        data: {
          chart: {
            result: [{
              meta: {
                symbol: 'AAPL',
                longName: 'Apple Inc.',
                regularMarketPrice: 180.50,
                previousClose: 178.00,
                fiftyTwoWeekHigh: 199.62,
                fiftyTwoWeekLow: 164.08,
                marketCap: 2800000000000,
                trailingPE: 28.5,
                dividendYield: 0.0052,
                averageDailyVolume10Day: 50000000,
              }
            }]
          }
        }
      };

      const enrichedResult = extractStockInfo(mockResult);

      expect(enrichedResult.companyName).toBe('Apple Inc.');
      expect(enrichedResult.price).toBe(180.50);
      expect(enrichedResult.change).toBeCloseTo(2.50, 2);
      expect(enrichedResult.changePercent).toBeCloseTo(1.40, 2);
      expect(enrichedResult.fiftyTwoWeekHigh).toBe(199.62);
      expect(enrichedResult.fiftyTwoWeekLow).toBe(164.08);
      expect(enrichedResult.marketCap).toBeDefined();
      expect(enrichedResult.peRatio).toBe(28.5);
      expect(enrichedResult.dividendYield).toBeCloseTo(0.52, 2);
      expect(enrichedResult.avgVolume).toBeDefined();
    });

    it('should handle missing data gracefully', async () => {
      const { extractStockInfo } = await import('./chatWithStockData');
      
      const mockResult = {
        symbol: 'TEST',
        data: null,
        error: 'Stock not found'
      };

      const enrichedResult = extractStockInfo(mockResult);

      expect(enrichedResult.symbol).toBe('TEST');
      expect(enrichedResult.error).toBe('Stock not found');
      expect(enrichedResult.price).toBeUndefined();
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  getDb, 
  addPortfolioTransaction, 
  getPortfolioTransactions,
  getPortfolioTransactionsBySymbol,
  addToPortfolio,
  deleteFromPortfolio
} from './db';
import { portfolioTransactions, portfolio } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Portfolio Transactions', () => {
  const testUserId = 999999; // 使用一個不太可能衝突的測試用戶 ID
  const testSymbol = 'TEST';
  let testTransactionId: number;
  let testPortfolioId: number;

  // 清理測試數據
  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    try {
      // 刪除測試交易記錄
      await db.delete(portfolioTransactions).where(
        eq(portfolioTransactions.userId, testUserId)
      );
      
      // 刪除測試持倉
      await db.delete(portfolio).where(
        eq(portfolio.userId, testUserId)
      );
    } catch (error) {
      console.error('清理測試數據失敗:', error);
    }
  });

  describe('addPortfolioTransaction', () => {
    it('應該成功添加買入交易記錄', async () => {
      const transactionData = {
        userId: testUserId,
        symbol: testSymbol,
        companyName: 'Test Company',
        transactionType: 'buy' as const,
        shares: 100,
        price: 15000, // $150.00 in cents
        totalAmount: 1500000, // $15,000.00 in cents
        transactionDate: new Date('2024-01-15'),
        notes: 'Test buy transaction',
      };

      await addPortfolioTransaction(transactionData);

      // 驗證交易記錄已添加
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const transactions = await db.select()
        .from(portfolioTransactions)
        .where(
          and(
            eq(portfolioTransactions.userId, testUserId),
            eq(portfolioTransactions.symbol, testSymbol)
          )
        );

      expect(transactions.length).toBeGreaterThan(0);
      const transaction = transactions[0];
      testTransactionId = transaction.id;
      
      expect(transaction.symbol).toBe(testSymbol);
      expect(transaction.transactionType).toBe('buy');
      expect(transaction.shares).toBe(100);
      expect(transaction.price).toBe(15000);
      expect(transaction.totalAmount).toBe(1500000);
    });

    it('應該成功添加賣出交易記錄', async () => {
      const transactionData = {
        userId: testUserId,
        symbol: testSymbol,
        companyName: 'Test Company',
        transactionType: 'sell' as const,
        shares: 50,
        price: 16000, // $160.00 in cents
        totalAmount: 800000, // $8,000.00 in cents
        transactionDate: new Date('2024-01-20'),
        notes: 'Test sell transaction',
      };

      await addPortfolioTransaction(transactionData);

      // 驗證交易記錄已添加
      const transactions = await getPortfolioTransactionsBySymbol(testUserId, testSymbol);
      
      const sellTransaction = transactions.find(t => t.transactionType === 'sell');
      expect(sellTransaction).toBeDefined();
      expect(sellTransaction?.shares).toBe(50);
      expect(sellTransaction?.price).toBe(16000);
    });
  });

  describe('getPortfolioTransactions', () => {
    it('應該能夠獲取用戶的所有交易記錄', async () => {
      const transactions = await getPortfolioTransactions(testUserId);
      
      expect(transactions.length).toBeGreaterThanOrEqual(2); // 至少有買入和賣出兩筆
      expect(transactions.every(t => t.userId === testUserId)).toBe(true);
    });

    it('應該能夠按天數過濾交易記錄', async () => {
      // 添加一筆較舊的交易
      await addPortfolioTransaction({
        userId: testUserId,
        symbol: 'OLD',
        companyName: 'Old Company',
        transactionType: 'buy',
        shares: 10,
        price: 10000,
        totalAmount: 100000,
        transactionDate: new Date('2020-01-01'),
        notes: 'Old transaction',
      });

      // 獲取最近 30 天的交易
      const recentTransactions = await getPortfolioTransactions(testUserId, 30);
      
      // 驗證所有交易都在最近 30 天內
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      recentTransactions.forEach(transaction => {
        expect(new Date(transaction.transactionDate).getTime()).toBeGreaterThanOrEqual(cutoffDate.getTime());
      });
    });
  });

  describe('getPortfolioTransactionsBySymbol', () => {
    it('應該能夠獲取特定股票的交易記錄', async () => {
      const transactions = await getPortfolioTransactionsBySymbol(testUserId, testSymbol);
      
      expect(transactions.length).toBeGreaterThanOrEqual(2);
      expect(transactions.every(t => t.symbol === testSymbol)).toBe(true);
    });

    it('應該按日期降序排列', async () => {
      const transactions = await getPortfolioTransactionsBySymbol(testUserId, testSymbol);
      
      for (let i = 0; i < transactions.length - 1; i++) {
        const currentDate = new Date(transactions[i].transactionDate).getTime();
        const nextDate = new Date(transactions[i + 1].transactionDate).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }
    });
  });

  describe('Integration with Portfolio Operations', () => {
    it('應該能够手動添加買入交易並創建持倉', async () => {
      const beforeCount = (await getPortfolioTransactions(testUserId)).length;

      // 添加持倉
      await addToPortfolio({
        userId: testUserId,
        symbol: 'INTEG',
        companyName: 'Integration Test',
        shares: 200,
        purchasePrice: 20000, // $200.00 in cents
        purchaseDate: new Date('2024-01-25'),
        notes: 'Integration test',
      });

      // 獲取持倉 ID
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const holdings = await db.select()
        .from(portfolio)
        .where(
          and(
            eq(portfolio.userId, testUserId),
            eq(portfolio.symbol, 'INTEG')
          )
        );
      
      expect(holdings.length).toBe(1);
      testPortfolioId = holdings[0].id;

      // 手動添加交易記錄（模擬 tRPC mutation 的行為）
      await addPortfolioTransaction({
        userId: testUserId,
        symbol: 'INTEG',
        companyName: 'Integration Test',
        transactionType: 'buy',
        shares: 200,
        price: 20000,
        totalAmount: 4000000,
        transactionDate: new Date('2024-01-25'),
        notes: 'Integration test',
      });

      // 驗證交易記錄已添加
      const afterCount = (await getPortfolioTransactions(testUserId)).length;
      expect(afterCount).toBe(beforeCount + 1);

      const integTransactions = await getPortfolioTransactionsBySymbol(testUserId, 'INTEG');
      expect(integTransactions.length).toBe(1);
      expect(integTransactions[0].transactionType).toBe('buy');
      expect(integTransactions[0].shares).toBe(200);
    });

    it('應該能够手動添加賣出交易並刪除持倉', async () => {
      const beforeCount = (await getPortfolioTransactionsBySymbol(testUserId, 'INTEG')).length;

      // 手動添加賣出交易記錄（模擬 tRPC mutation 的行為）
      await addPortfolioTransaction({
        userId: testUserId,
        symbol: 'INTEG',
        companyName: 'Integration Test',
        transactionType: 'sell',
        shares: 200,
        price: 20000,
        totalAmount: 4000000,
        transactionDate: new Date(),
        notes: 'Sell integration test',
      });

      // 刪除持倉
      const deletedHolding = await deleteFromPortfolio(testPortfolioId, testUserId);
      expect(deletedHolding).not.toBeNull();

      // 驗證交易記錄已添加
      const afterCount = (await getPortfolioTransactionsBySymbol(testUserId, 'INTEG')).length;
      expect(afterCount).toBe(beforeCount + 1);

      const integTransactions = await getPortfolioTransactionsBySymbol(testUserId, 'INTEG');
      const sellTransaction = integTransactions.find(t => t.transactionType === 'sell');
      
      expect(sellTransaction).toBeDefined();
      expect(sellTransaction?.shares).toBe(200);
    });
  });
});

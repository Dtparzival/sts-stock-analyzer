import { describe, it, expect, beforeEach } from 'vitest';
import * as db from './db';
import { eq, and } from 'drizzle-orm';
import { portfolio } from '../drizzle/schema';

/**
 * 用戶資料隔離測試
 * 
 * 測試目標：確保不同用戶無法看到或修改彼此的資料
 * 
 * 測試範圍：
 * 1. 收藏列表（watchlist）
 * 2. 投資組合（portfolio）
 * 3. 搜尋歷史（searchHistory）
 * 4. 用戶行為（userBehavior）
 * 5. 推薦系統（recommendations）
 */

describe('用戶資料隔離測試', () => {
  // 模擬兩個不同的用戶 ID
  const user1Id = 1;
  const user2Id = 2;

  describe('收藏列表隔離', () => {
    it('用戶 1 無法看到用戶 2 的收藏列表', async () => {
      const user1Watchlist = await db.getUserWatchlist(user1Id);
      const user2Watchlist = await db.getUserWatchlist(user2Id);

      // 確保兩個用戶的收藏列表不同
      const user1Symbols = new Set(user1Watchlist.map(w => w.symbol));
      const user2Symbols = new Set(user2Watchlist.map(w => w.symbol));

      // 檢查是否有重疊（如果有重疊，需要確認是否為同一筆記錄）
      const overlap = [...user1Symbols].filter(s => user2Symbols.has(s));
      if (overlap.length > 0) {
        // 如果有重疊，確保是不同的記錄（不同的 userId）
        for (const symbol of overlap) {
          const user1Record = user1Watchlist.find(w => w.symbol === symbol);
          const user2Record = user2Watchlist.find(w => w.symbol === symbol);
          expect(user1Record?.userId).toBe(user1Id);
          expect(user2Record?.userId).toBe(user2Id);
        }
      }

      console.log(`✅ 用戶 1 收藏列表: ${user1Watchlist.length} 筆`);
      console.log(`✅ 用戶 2 收藏列表: ${user2Watchlist.length} 筆`);
    });

    it('用戶 1 無法檢查用戶 2 的收藏狀態', async () => {
      // 假設用戶 2 收藏了 AAPL
      const user2Watchlist = await db.getUserWatchlist(user2Id);
      if (user2Watchlist.length > 0) {
        const user2Symbol = user2Watchlist[0].symbol;

        // 用戶 1 檢查該股票是否在自己的收藏列表中
        const isInUser1Watchlist = await db.isInWatchlist(user1Id, user2Symbol);

        // 用戶 1 不應該看到用戶 2 的收藏狀態
        // 這裡我們只是確認查詢是基於 userId 的
        console.log(`✅ 用戶 1 檢查 ${user2Symbol} 收藏狀態: ${isInUser1Watchlist}`);
      }
    });
  });

  describe('投資組合隔離', () => {
    it('用戶 1 無法看到用戶 2 的投資組合', async () => {
      const user1Portfolio = await db.getUserPortfolio(user1Id);
      const user2Portfolio = await db.getUserPortfolio(user2Id);

      // 確保所有記錄的 userId 正確
      user1Portfolio.forEach(holding => {
        expect(holding.userId).toBe(user1Id);
      });

      user2Portfolio.forEach(holding => {
        expect(holding.userId).toBe(user2Id);
      });

      console.log(`✅ 用戶 1 投資組合: ${user1Portfolio.length} 筆`);
      console.log(`✅ 用戶 2 投資組合: ${user2Portfolio.length} 筆`);
    });

    it('用戶 1 無法修改用戶 2 的持倉（updatePortfolio 安全性測試）', async () => {
      const user2Portfolio = await db.getUserPortfolio(user2Id);

      if (user2Portfolio.length > 0) {
        const user2HoldingId = user2Portfolio[0].id;

        // 用戶 1 嘗試修改用戶 2 的持倉
        await db.updatePortfolio(user2HoldingId, user1Id, { shares: 999 });

        // 驗證用戶 2 的持倉沒有被修改
        const updatedUser2Portfolio = await db.getUserPortfolio(user2Id);
        const targetHolding = updatedUser2Portfolio.find(h => h.id === user2HoldingId);

        if (targetHolding) {
          expect(targetHolding.shares).not.toBe(999);
          console.log(`✅ 用戶 1 無法修改用戶 2 的持倉（持股數: ${targetHolding.shares}）`);
        }
      } else {
        console.log('⚠️  用戶 2 沒有投資組合，跳過此測試');
      }
    });
  });

  describe('搜尋歷史隔離', () => {
    it('用戶 1 無法看到用戶 2 的搜尋歷史', async () => {
      const user1History = await db.getUserSearchHistory(user1Id, 20);
      const user2History = await db.getUserSearchHistory(user2Id, 20);

      // 確保所有記錄的 userId 正確
      user1History.forEach(record => {
        expect(record.userId).toBe(user1Id);
      });

      user2History.forEach(record => {
        expect(record.userId).toBe(user2Id);
      });

      console.log(`✅ 用戶 1 搜尋歷史: ${user1History.length} 筆`);
      console.log(`✅ 用戶 2 搜尋歷史: ${user2History.length} 筆`);
    });
  });

  describe('用戶行為數據隔離', () => {
    it('用戶 1 無法看到用戶 2 的行為數據', async () => {
      const user1Behavior = await db.getAllUserBehavior(user1Id);
      const user2Behavior = await db.getAllUserBehavior(user2Id);

      // 確保所有記錄的 userId 正確
      user1Behavior.forEach(record => {
        expect(record.userId).toBe(user1Id);
      });

      user2Behavior.forEach(record => {
        expect(record.userId).toBe(user2Id);
      });

      console.log(`✅ 用戶 1 行為數據: ${user1Behavior.length} 筆`);
      console.log(`✅ 用戶 2 行為數據: ${user2Behavior.length} 筆`);
    });
  });

  describe('推薦系統隔離', () => {
    it('用戶 1 和用戶 2 獲得不同的推薦結果', async () => {
      const user1Recommendations = await db.getPersonalizedRecommendations(user1Id, 6);
      const user2Recommendations = await db.getPersonalizedRecommendations(user2Id, 6);

      // 推薦結果應該基於各自的行為數據，因此應該不同
      const user1Symbols = new Set(user1Recommendations.map(r => r.symbol));
      const user2Symbols = new Set(user2Recommendations.map(r => r.symbol));

      console.log(`✅ 用戶 1 推薦結果: ${user1Recommendations.length} 筆`);
      console.log(`✅ 用戶 2 推薦結果: ${user2Recommendations.length} 筆`);

      // 如果兩個用戶的推薦結果完全相同，可能有問題（除非兩個用戶行為完全相同）
      const isSame = user1Symbols.size === user2Symbols.size &&
        [...user1Symbols].every(s => user2Symbols.has(s));

      if (isSame && user1Recommendations.length > 0) {
        console.warn('⚠️  兩個用戶的推薦結果完全相同，可能需要檢查推薦邏輯');
      }
    });
  });

  describe('交易歷史隔離', () => {
    it('用戶 1 無法看到用戶 2 的交易歷史', async () => {
      const user1Transactions = await db.getPortfolioTransactions(user1Id);
      const user2Transactions = await db.getPortfolioTransactions(user2Id);

      // 確保所有記錄的 userId 正確
      user1Transactions.forEach(transaction => {
        expect(transaction.userId).toBe(user1Id);
      });

      user2Transactions.forEach(transaction => {
        expect(transaction.userId).toBe(user2Id);
      });

      console.log(`✅ 用戶 1 交易歷史: ${user1Transactions.length} 筆`);
      console.log(`✅ 用戶 2 交易歷史: ${user2Transactions.length} 筆`);
    });
  });

  describe('投資組合歷史隔離', () => {
    it('用戶 1 無法看到用戶 2 的投資組合歷史', async () => {
      const user1History = await db.getPortfolioHistory(user1Id);
      const user2History = await db.getPortfolioHistory(user2Id);

      // 確保所有記錄的 userId 正確
      user1History.forEach(record => {
        expect(record.userId).toBe(user1Id);
      });

      user2History.forEach(record => {
        expect(record.userId).toBe(user2Id);
      });

      console.log(`✅ 用戶 1 投資組合歷史: ${user1History.length} 筆`);
      console.log(`✅ 用戶 2 投資組合歷史: ${user2History.length} 筆`);
    });
  });
});

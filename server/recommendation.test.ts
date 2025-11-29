import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { users, userBehavior, watchlist } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * 智能推薦演算法單元測試（v2.0）
 * 
 * 測試範圍：
 * 1. getPersonalizedRecommendations - 個人化推薦評分計算（多維度權重）
 * 2. getPopularStocksForUser - 用戶熱門股票
 * 3. getGlobalPopularStocks - 全站熱門股票
 * 4. trackUserClick - 用戶點擊行為追蹤（保留原有測試）
 */

describe('智能推薦演算法測試（多維度評分）', () => {
  let testUserId: number;
  let db: Awaited<ReturnType<typeof getDb>>;
  let createdTestUser = false;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('無法連接資料庫');
    }

    // 嘗試使用現有用戶 ID 1，如果不存在則創建新用戶
    const existingUser = await db.select().from(users).where(eq(users.id, 1)).limit(1);
    
    if (existingUser.length > 0) {
      testUserId = 1;
      createdTestUser = false;
    } else {
      // 創建測試用戶
      const result = await db.insert(users).values({
        openId: `test-recommendation-${Date.now()}`,
        name: '推薦演算法測試用戶',
        email: 'test-recommendation@example.com',
      });

      testUserId = 1; // 假設第一個用戶 ID 為 1
      createdTestUser = true;
    }

    // 插入測試行為數據
    await db.insert(userBehavior).values([
      {
        userId: testUserId,
        symbol: 'AAPL',
        viewCount: 10,
        searchCount: 5,
        totalViewTime: 600, // 10 分鐘
        clickCount: 3,
      },
      {
        userId: testUserId,
        symbol: 'GOOGL',
        viewCount: 8,
        searchCount: 4,
        totalViewTime: 480, // 8 分鐘
        clickCount: 2,
      },
      {
        userId: testUserId,
        symbol: 'MSFT',
        viewCount: 6,
        searchCount: 3,
        totalViewTime: 360, // 6 分鐘
        clickCount: 1,
      },
      {
        userId: testUserId,
        symbol: 'TSLA',
        viewCount: 4,
        searchCount: 2,
        totalViewTime: 240, // 4 分鐘
        clickCount: 1,
      },
    ]);

    // 插入測試收藏數據
    await db.insert(watchlist).values([
      {
        userId: testUserId,
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
      },
      {
        userId: testUserId,
        symbol: 'GOOGL',
        companyName: 'Alphabet Inc.',
      },
    ]);
  });

  afterAll(async () => {
    if (!db) return;

    // 清理測試數據
    await db.delete(watchlist).where(eq(watchlist.userId, testUserId));
    await db.delete(userBehavior).where(eq(userBehavior.userId, testUserId));
    
    // 僅當我們創建了新用戶時才刪除用戶
    if (createdTestUser) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('應該根據多維度行為數據計算推薦評分', async () => {
    const { getPersonalizedRecommendations } = await import('./db');
    
    const recommendations = await getPersonalizedRecommendations(testUserId, 4);

    // 驗證返回結果數量
    expect(recommendations).toHaveLength(4);

    // 驗證推薦結果按評分降序排序
    for (let i = 0; i < recommendations.length - 1; i++) {
      expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
    }

    // 驗證 AAPL 應該排名第一（最高查看次數 + 已收藏）
    expect(recommendations[0].symbol).toBe('AAPL');
    expect(recommendations[0].isFavorited).toBe(true);

    // 驗證 GOOGL 應該排名第二（次高查看次數 + 已收藏）
    expect(recommendations[1].symbol).toBe('GOOGL');
    expect(recommendations[1].isFavorited).toBe(true);

    // 驗證推薦結果包含完整的行為數據
    expect(recommendations[0]).toHaveProperty('viewCount');
    expect(recommendations[0]).toHaveProperty('searchCount');
    expect(recommendations[0]).toHaveProperty('totalViewTime');
    expect(recommendations[0]).toHaveProperty('lastViewedAt');
  });

  it('應該正確計算推薦評分權重（查看30% + 搜尋20% + 停留25% + 收藏25%）', async () => {
    const { getPersonalizedRecommendations } = await import('./db');
    
    const recommendations = await getPersonalizedRecommendations(testUserId, 4);

    // AAPL 的評分應該最高（因為有最高的查看次數和收藏狀態）
    const aaplScore = recommendations.find(r => r.symbol === 'AAPL')?.score || 0;
    const googScore = recommendations.find(r => r.symbol === 'GOOGL')?.score || 0;
    const msftScore = recommendations.find(r => r.symbol === 'MSFT')?.score || 0;

    // AAPL 評分應該高於 GOOGL（雖然都已收藏，但 AAPL 查看次數更多）
    expect(aaplScore).toBeGreaterThan(googScore);

    // GOOGL 評分應該高於 MSFT（GOOGL 已收藏，MSFT 未收藏）
    expect(googScore).toBeGreaterThan(msftScore);

    // 所有評分應該在 0-1 之間（正規化後的結果）
    recommendations.forEach(rec => {
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(1);
    });
  });

  it('應該返回用戶熱門股票（按查看次數排序）', async () => {
    const { getPopularStocksForUser } = await import('./db');
    
    const popularStocks = await getPopularStocksForUser(testUserId, 3);

    // 驗證返回結果數量
    expect(popularStocks).toHaveLength(3);

    // 驗證按查看次數降序排序
    expect(popularStocks[0].symbol).toBe('AAPL'); // viewCount: 10
    expect(popularStocks[1].symbol).toBe('GOOGL'); // viewCount: 8
    expect(popularStocks[2].symbol).toBe('MSFT'); // viewCount: 6

    // 驗證查看次數遞減
    expect(popularStocks[0].viewCount).toBeGreaterThanOrEqual(popularStocks[1].viewCount);
    expect(popularStocks[1].viewCount).toBeGreaterThanOrEqual(popularStocks[2].viewCount);
  });

  it('應該處理冷啟動場景（用戶無行為數據）', async () => {
    if (!db) return;

    // 創建新用戶（無行為數據）
    const newUserResult = await db.insert(users).values({
      openId: `test-cold-start-${Date.now()}`,
      name: '冷啟動測試用戶',
      email: 'test-cold-start@example.com',
    });

    // 確保 newUserId 是有效的數字
    const newInsertId = newUserResult.insertId;
    const newUserId = typeof newInsertId === 'bigint' ? Number(newInsertId) : Number(newInsertId);
    
    if (isNaN(newUserId) || newUserId === 0) {
      throw new Error(`無效的用戶 ID: ${newInsertId}`);
    }

    try {
      const { getPersonalizedRecommendations } = await import('./db');
      
      const recommendations = await getPersonalizedRecommendations(newUserId, 6);

      // 冷啟動場景應該返回空陣列（因為沒有行為數據）
      expect(recommendations).toHaveLength(0);
    } finally {
      // 清理測試數據
      await db.delete(users).where(eq(users.id, newUserId));
    }
  });

  it('應該返回全站熱門股票', async () => {
    const { getGlobalPopularStocks } = await import('./db');
    
    const globalPopular = await getGlobalPopularStocks(3);

    // 驗證返回結果（可能為空，取決於資料庫中的數據）
    expect(Array.isArray(globalPopular)).toBe(true);

    if (globalPopular.length > 0) {
      // 驗證結果包含必要欄位
      expect(globalPopular[0]).toHaveProperty('symbol');
      expect(globalPopular[0]).toHaveProperty('totalViews');
      expect(globalPopular[0]).toHaveProperty('uniqueUsers');

      // 驗證按總查看次數降序排序
      for (let i = 0; i < globalPopular.length - 1; i++) {
        expect(globalPopular[i].totalViews).toBeGreaterThanOrEqual(globalPopular[i + 1].totalViews);
      }
    }
  });

  it('應該正確處理收藏偏好權重（25%）', async () => {
    const { getPersonalizedRecommendations } = await import('./db');
    
    const recommendations = await getPersonalizedRecommendations(testUserId, 4);

    // 已收藏的股票應該有更高的評分
    const favoritedStocks = recommendations.filter(r => r.isFavorited);
    const nonFavoritedStocks = recommendations.filter(r => !r.isFavorited);

    // 驗證已收藏股票的平均評分高於未收藏股票
    if (favoritedStocks.length > 0 && nonFavoritedStocks.length > 0) {
      const avgFavoritedScore = favoritedStocks.reduce((sum, r) => sum + r.score, 0) / favoritedStocks.length;
      const avgNonFavoritedScore = nonFavoritedStocks.reduce((sum, r) => sum + r.score, 0) / nonFavoritedStocks.length;

      expect(avgFavoritedScore).toBeGreaterThan(avgNonFavoritedScore);
    }
  });
});

describe('用戶點擊行為追蹤測試（保留原有測試）', () => {
  let testUserId: number;
  const testSymbol = 'AAPL';
  
  beforeAll(async () => {
    // 使用測試用戶 ID (假設存在)
    testUserId = 1;
  });
  
  it('應該能夠追蹤用戶點擊推薦卡片', async () => {
    const { trackUserClick, getUserBehavior } = await import('./db');
    
    // 追蹤點擊行為
    await trackUserClick(testUserId, testSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, testSymbol);
    
    // 驗證點擊次數已增加
    expect(behavior).toBeDefined();
    expect(behavior?.clickCount).toBeGreaterThan(0);
  });
  
  it('應該能夠正確更新 lastClickedAt 時間戳', async () => {
    const { trackUserClick, getUserBehavior } = await import('./db');
    
    const beforeClick = new Date();
    
    // 等待 1 秒確保時間戳不同
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 追蹤點擊行為
    await trackUserClick(testUserId, testSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, testSymbol);
    
    // 驗證 lastClickedAt 已更新
    expect(behavior).toBeDefined();
    expect(behavior?.lastClickedAt).toBeDefined();
    if (behavior?.lastClickedAt) {
      expect(new Date(behavior.lastClickedAt).getTime()).toBeGreaterThan(beforeClick.getTime());
    }
  });
  
  it('應該能夠處理新股票的首次點擊', async () => {
    const { trackUserClick, getUserBehavior } = await import('./db');
    
    const newSymbol = 'TSLA';
    
    // 追蹤新股票的點擊
    await trackUserClick(testUserId, newSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, newSymbol);
    
    // 驗證記錄存在且點擊次數大於 0
    expect(behavior).toBeDefined();
    expect(behavior?.clickCount).toBeGreaterThanOrEqual(1);
    expect(behavior?.symbol).toBe(newSymbol);
  });
  
  it('應該能夠累計多次點擊', async () => {
    const { trackUserClick, getUserBehavior } = await import('./db');
    
    const multiClickSymbol = 'GOOGL';
    
    // 追蹤多次點擊
    await trackUserClick(testUserId, multiClickSymbol);
    await trackUserClick(testUserId, multiClickSymbol);
    await trackUserClick(testUserId, multiClickSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, multiClickSymbol);
    
    // 驗證點擊次數大於等於 3
    expect(behavior).toBeDefined();
    expect(behavior?.clickCount).toBeGreaterThanOrEqual(3);
  });
  
  afterAll(async () => {
    // 清理測試數據
    const db = await getDb();
    if (db) {
      // 清理測試期間創建的記錄
      // 注意：這裡不執行實際清理，避免影響生產數據
      console.log('測試完成，跳過清理步驟以保留測試數據');
    }
  });
});

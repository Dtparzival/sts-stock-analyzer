import { eq, and, desc, like, or, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  User,
  InsertUser, 
  users, 
  twStocks,
  TwStock,
  InsertTwStock,
  twDataSyncStatus,
  TwDataSyncStatus,
  InsertTwDataSyncStatus,
  twDataSyncErrors,
  TwDataSyncError,
  InsertTwDataSyncError,
  usStocks,
  UsStock,
  InsertUsStock,
  usDataSyncStatus,
  UsDataSyncStatus,
  InsertUsDataSyncStatus,
  usDataSyncErrors,
  UsDataSyncError,
  InsertUsDataSyncError,
  stockDataCache,
  StockDataCache,
  InsertStockDataCache,
  userSearchBehavior,
  UserSearchBehavior,
  InsertUserSearchBehavior
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// User Management
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// Taiwan Stock Basic Info
// ============================================================================

/**
 * 根據股票代號查詢台股基本資料
 */
export async function getTwStockBySymbol(symbol: string): Promise<TwStock | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(twStocks)
    .where(eq(twStocks.symbol, symbol))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * 搜尋台股 (依代號、名稱、簡稱)
 */
export async function searchTwStocks(keyword: string, limit: number = 20): Promise<TwStock[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twStocks)
    .where(
      or(
        like(twStocks.symbol, `%${keyword}%`),
        like(twStocks.name, `%${keyword}%`),
        like(twStocks.shortName, `%${keyword}%`)
      )
    )
    .limit(limit);
}

/**
 * 獲取所有活躍台股
 */
export async function getActiveTwStocks(): Promise<TwStock[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twStocks)
    .where(eq(twStocks.isActive, true));
}

/**
 * 根據產業查詢台股
 */
export async function getTwStocksByIndustry(industry: string): Promise<TwStock[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twStocks)
    .where(eq(twStocks.industry, industry));
}

/**
 * 根據市場類型查詢台股
 */
export async function getTwStocksByMarket(market: 'TWSE' | 'TPEx'): Promise<TwStock[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twStocks)
    .where(eq(twStocks.market, market));
}

/**
 * 插入或更新台股基本資料
 */
export async function upsertTwStock(stock: InsertTwStock): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(twStocks)
    .values(stock)
    .onDuplicateKeyUpdate({
      set: {
        name: stock.name,
        shortName: stock.shortName,
        market: stock.market,
        industry: stock.industry,
        type: stock.type,
        isActive: stock.isActive,
        listedDate: stock.listedDate,
        updatedAt: new Date(),
      }
    });
}

/**
 * 批次插入台股基本資料
 */
export async function batchUpsertTwStocks(stocks: InsertTwStock[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const batchSize = 100;
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(stock => upsertTwStock(stock))
    );
  }
}

// ============================================================================
// Data Sync Status
// ============================================================================

/**
 * 記錄資料同步狀態
 */
export async function insertTwDataSyncStatus(status: InsertTwDataSyncStatus): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(twDataSyncStatus).values(status);
}

/**
 * 獲取最新同步狀態
 */
export async function getLatestTwDataSyncStatus(dataType: string): Promise<TwDataSyncStatus | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(twDataSyncStatus)
    .where(eq(twDataSyncStatus.dataType, dataType))
    .orderBy(desc(twDataSyncStatus.lastSyncAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * 獲取所有同步狀態
 */
export async function getAllTwDataSyncStatus(): Promise<TwDataSyncStatus[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twDataSyncStatus)
    .orderBy(desc(twDataSyncStatus.lastSyncAt));
}

// ============================================================================
// Data Sync Errors
// ============================================================================

/**
 * 記錄資料同步錯誤
 */
export async function insertTwDataSyncError(error: InsertTwDataSyncError): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(twDataSyncErrors).values(error);
}

/**
 * 批次記錄資料同步錯誤
 */
export async function batchInsertTwDataSyncErrors(errors: InsertTwDataSyncError[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  if (errors.length === 0) return;

  await db.insert(twDataSyncErrors).values(errors);
}

/**
 * 獲取未解決的同步錯誤
 */
export async function getUnresolvedTwDataSyncErrors(): Promise<TwDataSyncError[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twDataSyncErrors)
    .where(eq(twDataSyncErrors.resolved, false))
    .orderBy(desc(twDataSyncErrors.syncedAt));
}

/**
 * 標記錯誤為已解決
 */
export async function markTwDataSyncErrorResolved(errorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(twDataSyncErrors)
    .set({ resolved: true })
    .where(eq(twDataSyncErrors.id, errorId));
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * 統計台股數量
 */
export async function countTwStocks(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: count() })
    .from(twStocks);

  return result[0]?.count || 0;
}

/**
 * 統計活躍台股數量
 */
export async function countActiveTwStocks(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: count() })
    .from(twStocks)
    .where(eq(twStocks.isActive, true));

  return result[0]?.count || 0;
}

// ============================================================================
// User Search Behavior
// ============================================================================

/**
 * 記錄使用者搜尋行為
 */
export async function recordUserSearch(userId: number, market: string, symbol: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 嘗試更新現有記錄
  const existing = await db.select()
    .from(userSearchBehavior)
    .where(
      and(
        eq(userSearchBehavior.userId, userId),
        eq(userSearchBehavior.market, market),
        eq(userSearchBehavior.symbol, symbol)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 更新搜尋次數和時間
    await db.update(userSearchBehavior)
      .set({
        searchCount: sql`${userSearchBehavior.searchCount} + 1`,
        lastSearchAt: new Date(),
      })
      .where(eq(userSearchBehavior.id, existing[0].id));
  } else {
    // 插入新記錄
    await db.insert(userSearchBehavior).values({
      userId,
      market,
      symbol,
      searchCount: 1,
      lastSearchAt: new Date(),
    });
  }
}

/**
 * 獲取使用者搜尋行為
 */
export async function getUserSearchBehavior(userId: number, limit: number = 50): Promise<UserSearchBehavior[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(userSearchBehavior)
    .where(eq(userSearchBehavior.userId, userId))
    .orderBy(desc(userSearchBehavior.lastSearchAt))
    .limit(limit);
}

/**
 * 獲取使用者最常搜尋的股票
 */
export async function getUserTopSearches(userId: number, limit: number = 10): Promise<UserSearchBehavior[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(userSearchBehavior)
    .where(eq(userSearchBehavior.userId, userId))
    .orderBy(desc(userSearchBehavior.searchCount))
    .limit(limit);
}

// ============================================================================
// Stock Data Cache
// ============================================================================

/**
 * 獲取快取資料
 */
export async function getStockDataCache(cacheKey: string): Promise<StockDataCache | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(stockDataCache)
    .where(eq(stockDataCache.cacheKey, cacheKey))
    .limit(1);

  if (result.length === 0) return null;

  // 檢查是否過期
  if (new Date() > result[0].expiresAt) {
    return null;
  }

  return result[0];
}

/**
 * 設定快取資料
 */
export async function setStockDataCache(cache: InsertStockDataCache): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(stockDataCache)
    .values(cache)
    .onDuplicateKeyUpdate({
      set: {
        data: cache.data,
        expiresAt: cache.expiresAt,
        updatedAt: new Date(),
      }
    });
}

/**
 * 刪除過期快取
 */
export async function deleteExpiredCache(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(stockDataCache)
    .where(sql`${stockDataCache.expiresAt} < NOW()`);
}

/**
 * 刪除特定股票的快取
 */
export async function deleteStockCache(market: string, symbol: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(stockDataCache)
    .where(
      and(
        eq(stockDataCache.market, market),
        eq(stockDataCache.symbol, symbol)
      )
    );
}

// ============================================================================
// Re-export types for convenience
// ============================================================================

export type {
  User,
  InsertUser,
  TwStock,
  InsertTwStock,
  TwDataSyncStatus,
  InsertTwDataSyncStatus,
  TwDataSyncError,
  InsertTwDataSyncError,
  UsStock,
  InsertUsStock,
  UsDataSyncStatus,
  InsertUsDataSyncStatus,
  UsDataSyncError,
  InsertUsDataSyncError,
  StockDataCache,
  InsertStockDataCache,
  UserSearchBehavior,
  InsertUserSearchBehavior,
};


// ============================================================================
// Search History and User Behavior (Stub functions - to be implemented)
// ============================================================================

/**
 * Add search history record
 * @stub This function is a placeholder for future implementation
 */
export async function addSearchHistory(userId: number, symbol: string, market: 'TW' | 'US'): Promise<void> {
  // TODO: Implement search history tracking
  console.log(`[DB] addSearchHistory called: userId=${userId}, symbol=${symbol}, market=${market}`);
}

/**
 * Track user view behavior
 * @stub This function is a placeholder for future implementation
 */
export async function trackUserView(userId: number, symbol: string, market: 'TW' | 'US'): Promise<void> {
  // TODO: Implement user view tracking
  console.log(`[DB] trackUserView called: userId=${userId}, symbol=${symbol}, market=${market}`);
}

/**
 * Get analysis history
 * @stub This function is a placeholder for future implementation
 */
export async function getAnalysisHistory(userId: number, limit: number = 10): Promise<any[]> {
  // TODO: Implement analysis history retrieval
  console.log(`[DB] getAnalysisHistory called: userId=${userId}, limit=${limit}`);
  return [];
}

/**
 * Get analysis cache
 * @stub This function is a placeholder for future implementation
 */
export async function getAnalysisCache(cacheKey: string): Promise<any | null> {
  // TODO: Implement analysis cache retrieval
  console.log(`[DB] getAnalysisCache called: cacheKey=${cacheKey}`);
  return null;
}

/**
 * Set analysis cache
 * @stub This function is a placeholder for future implementation
 */
export async function setAnalysisCache(cacheKey: string, data: any, expiresAt: Date): Promise<void> {
  // TODO: Implement analysis cache storage
  console.log(`[DB] setAnalysisCache called: cacheKey=${cacheKey}`);
}

/**
 * Save analysis history
 * @stub This function is a placeholder for future implementation
 */
export async function saveAnalysisHistory(userId: number, symbol: string, market: 'TW' | 'US', analysisType: string, result: any): Promise<void> {
  // TODO: Implement analysis history saving
  console.log(`[DB] saveAnalysisHistory called: userId=${userId}, symbol=${symbol}`);
}

/**
 * Record question click
 * @stub This function is a placeholder for future implementation
 */
export async function recordQuestionClick(questionId: string): Promise<void> {
  // TODO: Implement question click tracking
  console.log(`[DB] recordQuestionClick called: questionId=${questionId}`);
}

/**
 * Get top questions
 * @stub This function is a placeholder for future implementation
 */
export async function getTopQuestions(limit: number = 10): Promise<any[]> {
  // TODO: Implement top questions retrieval
  console.log(`[DB] getTopQuestions called: limit=${limit}`);
  return [];
}


// ============================================================================
// User Behavior and Watchlist (Stub functions - to be implemented)
// ============================================================================

/**
 * Get all user behavior data
 * @stub This function is a placeholder for future implementation
 */
export async function getAllUserBehavior(userId: number): Promise<any[]> {
  console.log(`[DB] getAllUserBehavior called: userId=${userId}`);
  return [];
}

/**
 * Get user portfolio
 * @stub This function is a placeholder for future implementation
 */
export async function getUserPortfolio(userId: number): Promise<any[]> {
  console.log(`[DB] getUserPortfolio called: userId=${userId}`);
  return [];
}

/**
 * Get user watchlist
 * @stub This function is a placeholder for future implementation
 */
export async function getUserWatchlist(userId: number): Promise<any[]> {
  console.log(`[DB] getUserWatchlist called: userId=${userId}`);
  return [];
}

/**
 * Get global popular stocks
 * @stub This function is a placeholder for future implementation
 */
export async function getGlobalPopularStocks(limit: number = 10): Promise<any[]> {
  console.log(`[DB] getGlobalPopularStocks called: limit=${limit}`);
  return [];
}

/**
 * Get global top questions
 * @stub This function is a placeholder for future implementation
 */
export async function getGlobalTopQuestions(limit: number = 10): Promise<any[]> {
  console.log(`[DB] getGlobalTopQuestions called: limit=${limit}`);
  return [];
}

/**
 * Add to watchlist
 * @stub This function is a placeholder for future implementation
 */
export async function addToWatchlist(userId: number, symbol: string, market: 'TW' | 'US'): Promise<void> {
  console.log(`[DB] addToWatchlist called: userId=${userId}, symbol=${symbol}, market=${market}`);
}

/**
 * Remove from watchlist
 * @stub This function is a placeholder for future implementation
 */
export async function removeFromWatchlist(userId: number, symbol: string): Promise<void> {
  console.log(`[DB] removeFromWatchlist called: userId=${userId}, symbol=${symbol}`);
}

/**
 * Check if stock is in watchlist
 * @stub This function is a placeholder for future implementation
 */
export async function isInWatchlist(userId: number, symbol: string): Promise<boolean> {
  console.log(`[DB] isInWatchlist called: userId=${userId}, symbol=${symbol}`);
  return false;
}

/**
 * Get user search history
 * @stub This function is a placeholder for future implementation
 */
export async function getUserSearchHistory(userId: number, limit: number = 20): Promise<any[]> {
  console.log(`[DB] getUserSearchHistory called: userId=${userId}, limit=${limit}`);
  return [];
}

/**
 * Delete search history
 * @stub This function is a placeholder for future implementation
 */
export async function deleteSearchHistory(userId: number, historyId: number): Promise<void> {
  console.log(`[DB] deleteSearchHistory called: userId=${userId}, historyId=${historyId}`);
}

/**
 * Clear all search history
 * @stub This function is a placeholder for future implementation
 */
export async function clearAllSearchHistory(userId: number): Promise<void> {
  console.log(`[DB] clearAllSearchHistory called: userId=${userId}`);
}

/**
 * Track user click
 * @stub This function is a placeholder for future implementation
 */
export async function trackUserClick(userId: number, symbol: string, market: 'TW' | 'US'): Promise<void> {
  console.log(`[DB] trackUserClick called: userId=${userId}, symbol=${symbol}, market=${market}`);
}

/**
 * Get top stocks
 * @stub This function is a placeholder for future implementation
 */
export async function getTopStocks(limit: number = 10): Promise<any[]> {
  console.log(`[DB] getTopStocks called: limit=${limit}`);
  return [];
}

// ============================================================================
// Portfolio Management (Stub functions - to be implemented)
// ============================================================================

/**
 * Add to portfolio
 * @stub This function is a placeholder for future implementation
 */
export async function addToPortfolio(userId: number, data: any): Promise<void> {
  console.log(`[DB] addToPortfolio called: userId=${userId}`);
}

/**
 * Add portfolio transaction
 * @stub This function is a placeholder for future implementation
 */
export async function addPortfolioTransaction(userId: number, data: any): Promise<void> {
  console.log(`[DB] addPortfolioTransaction called: userId=${userId}`);
}

/**
 * Update portfolio
 * @stub This function is a placeholder for future implementation
 */
export async function updatePortfolio(userId: number, holdingId: number, data: any): Promise<void> {
  console.log(`[DB] updatePortfolio called: userId=${userId}, holdingId=${holdingId}`);
}

/**
 * Delete from portfolio
 * @stub This function is a placeholder for future implementation
 */
export async function deleteFromPortfolio(userId: number, holdingId: number): Promise<void> {
  console.log(`[DB] deleteFromPortfolio called: userId=${userId}, holdingId=${holdingId}`);
}

/**
 * Get portfolio history
 * @stub This function is a placeholder for future implementation
 */
export async function getPortfolioHistory(userId: number, days?: number): Promise<any[]> {
  console.log(`[DB] getPortfolioHistory called: userId=${userId}, days=${days}`);
  return [];
}

/**
 * Get portfolio transactions
 * @stub This function is a placeholder for future implementation
 */
export async function getPortfolioTransactions(userId: number, limit: number = 50): Promise<any[]> {
  console.log(`[DB] getPortfolioTransactions called: userId=${userId}, limit=${limit}`);
  return [];
}

/**
 * Add portfolio history
 * @stub This function is a placeholder for future implementation
 */
export async function addPortfolioHistory(userId: number, data: any): Promise<void> {
  console.log(`[DB] addPortfolioHistory called: userId=${userId}`);
}

/**
 * Get transaction stats
 * @stub This function is a placeholder for future implementation
 */
export async function getTransactionStats(userId: number): Promise<any> {
  console.log(`[DB] getTransactionStats called: userId=${userId}`);
  return {
    totalBuys: 0,
    totalSells: 0,
    totalTransactions: 0,
    totalInvested: 0,
    totalReturned: 0,
  };
}

import { eq, and, gte, lte, desc, asc, like, or, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  twStocks,
  TwStock,
  InsertTwStock,
  twStockPrices,
  TwStockPrice,
  InsertTwStockPrice,
  twDataSyncStatus,
  TwDataSyncStatus,
  InsertTwDataSyncStatus,
  twDataSyncErrors,
  TwDataSyncError,
  InsertTwDataSyncError,
  usStocks,
  UsStock,
  InsertUsStock,
  usStockPrices,
  UsStockPrice,
  InsertUsStockPrice,
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
// Taiwan Stock Prices
// ============================================================================

/**
 * 獲取指定日期範圍的台股價格
 */
export async function getTwStockPrices(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<TwStockPrice[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twStockPrices)
    .where(
      and(
        eq(twStockPrices.symbol, symbol),
        gte(twStockPrices.date, startDate),
        lte(twStockPrices.date, endDate)
      )
    )
    .orderBy(desc(twStockPrices.date));
}

/**
 * 獲取最新價格
 */
export async function getLatestTwStockPrice(symbol: string): Promise<TwStockPrice | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(twStockPrices)
    .where(eq(twStockPrices.symbol, symbol))
    .orderBy(desc(twStockPrices.date))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * 獲取指定日期的價格
 */
export async function getTwStockPriceByDate(symbol: string, date: Date): Promise<TwStockPrice | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(twStockPrices)
    .where(
      and(
        eq(twStockPrices.symbol, symbol),
        eq(twStockPrices.date, date)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * 獲取最近 N 天的價格
 */
export async function getRecentTwStockPrices(symbol: string, days: number): Promise<TwStockPrice[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(twStockPrices)
    .where(eq(twStockPrices.symbol, symbol))
    .orderBy(desc(twStockPrices.date))
    .limit(days);
}

/**
 * 批次獲取最新價格
 */
export async function getBatchLatestTwStockPrices(symbols: string[]): Promise<TwStockPrice[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      return await getLatestTwStockPrice(symbol);
    })
  );

  return results.filter((price): price is TwStockPrice => price !== null);
}

/**
 * 插入或更新台股價格
 */
export async function upsertTwStockPrice(price: InsertTwStockPrice): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(twStockPrices)
    .values(price)
    .onDuplicateKeyUpdate({
      set: {
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume,
        amount: price.amount,
        change: price.change,
        changePercent: price.changePercent,
      }
    });
}

/**
 * 批次插入台股價格
 */
export async function batchUpsertTwStockPrices(prices: InsertTwStockPrice[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const batchSize = 100;
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(price => upsertTwStockPrice(price))
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

/**
 * 統計價格記錄數量
 */
export async function countTwStockPriceRecords(symbol?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let query = db.select({ count: count() })
    .from(twStockPrices);

  if (symbol) {
    query = query.where(eq(twStockPrices.symbol, symbol)) as any;
  }

  const result = await query;
  return result[0]?.count || 0;
}

// ============================================================================
// User Search Behavior
// ============================================================================

/**
 * 記錄或更新使用者搜尋行為
 */
export async function recordUserSearch(userId: number, market: string, symbol: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // 檢查是否已存在記錄
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
      // 更新現有記錄
      await db.update(userSearchBehavior)
        .set({
          searchCount: existing[0].searchCount + 1,
          lastSearchAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userSearchBehavior.id, existing[0].id));
    } else {
      // 建立新記錄
      await db.insert(userSearchBehavior).values({
        userId,
        market,
        symbol,
        searchCount: 1,
        lastSearchAt: new Date()
      });
    }
  } catch (error) {
    console.error("[Database] Failed to record user search:", error);
  }
}

/**
 * 獲取使用者的搜尋行為記錄
 */
export async function getUserSearchBehavior(userId: number, limit: number = 50): Promise<UserSearchBehavior[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(userSearchBehavior)
    .where(eq(userSearchBehavior.userId, userId))
    .orderBy(desc(userSearchBehavior.lastSearchAt))
    .limit(limit);

  return result;
}

/**
 * 獲取使用者所有行為數據(用於AI推薦)
 * 這是一個臨時函數,返回空陣列以避免錯誤
 */
export async function getAllUserBehavior(userId: number): Promise<any[]> {
  // TODO: 整合多個數據源(搜尋歷史、收藏、投資組合等)
  const searchBehavior = await getUserSearchBehavior(userId, 100);
  return searchBehavior;
}

/**
 * 獲取使用者最常搜尋的股票
 */
export async function getUserTopSearchedStocks(userId: number, limit: number = 10): Promise<UserSearchBehavior[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(userSearchBehavior)
    .where(eq(userSearchBehavior.userId, userId))
    .orderBy(desc(userSearchBehavior.searchCount), desc(userSearchBehavior.lastSearchAt))
    .limit(limit);

  return result;
}

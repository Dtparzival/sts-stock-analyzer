import { eq, desc, and, gt, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  watchlist, 
  Watchlist, 
  InsertWatchlist,
  searchHistory,
  SearchHistory,
  InsertSearchHistory,
  analysisCache,
  AnalysisCache,
  InsertAnalysisCache,
  analysisHistory,
  AnalysisHistory,
  InsertAnalysisHistory,
  portfolio,
  Portfolio,
  InsertPortfolio,
  portfolioHistory,
  PortfolioHistory,
  InsertPortfolioHistory
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

// Watchlist functions
export async function getUserWatchlist(userId: number): Promise<Watchlist[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.addedAt));
}

export async function addToWatchlist(data: InsertWatchlist): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 檢查是否已存在（冒等性）
  const exists = await isInWatchlist(data.userId, data.symbol);
  if (exists) {
    console.log(`[Watchlist] Stock ${data.symbol} already in watchlist for user ${data.userId}`);
    return; // 已存在，直接返回成功
  }
  
  await db.insert(watchlist).values(data);
}

export async function removeFromWatchlist(userId: number, symbol: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(watchlist).where(
    and(
      eq(watchlist.userId, userId),
      eq(watchlist.symbol, symbol)
    )
  );
}

export async function isInWatchlist(userId: number, symbol: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(watchlist).where(
    and(
      eq(watchlist.userId, userId),
      eq(watchlist.symbol, symbol)
    )
  ).limit(1);
  
  return result.length > 0;
}

// Search history functions
export async function addSearchHistory(data: InsertSearchHistory): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 檢查是否在最近 5 分鐘內已經記錄過相同的股票
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentRecords = await db.select().from(searchHistory)
    .where(
      and(
        eq(searchHistory.userId, data.userId),
        eq(searchHistory.symbol, data.symbol),
        gt(searchHistory.searchedAt, fiveMinutesAgo)
      )
    )
    .limit(1);
  
  // 如果最近 5 分鐘內已經有相同記錄，則不重複插入
  if (recentRecords.length > 0) {
    console.log(`[Search History] Skipping duplicate record for ${data.symbol} (recent record found)`);
    return;
  }
  
  await db.insert(searchHistory).values(data);
}

export async function getUserSearchHistory(userId: number, limit: number = 20): Promise<SearchHistory[]> {
  const db = await getDb();
  if (!db) return [];
  
  // 獲取所有搜尋歷史（按時間降序）
  const allHistory = await db.select().from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.searchedAt));
  
  // 去重：每個股票只保留最新一筆
  const seenSymbols = new Set<string>();
  const uniqueHistory: SearchHistory[] = [];
  
  for (const record of allHistory) {
    if (!seenSymbols.has(record.symbol)) {
      seenSymbols.add(record.symbol);
      uniqueHistory.push(record);
      
      // 達到限制數量後停止
      if (uniqueHistory.length >= limit) {
        break;
      }
    }
  }
  
  return uniqueHistory;
}

export async function deleteSearchHistory(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(searchHistory).where(
    and(
      eq(searchHistory.id, id),
      eq(searchHistory.userId, userId)
    )
  );
}

export async function clearAllSearchHistory(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
}

export async function getTopStocks(userId: number, limit: number = 10): Promise<Array<{ symbol: string; companyName: string | null; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  
  // 使用 GROUP BY 統計每個股票的搜尋次數
  const result = await db
    .select({
      symbol: searchHistory.symbol,
      companyName: searchHistory.companyName,
      count: count(searchHistory.id),
    })
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .groupBy(searchHistory.symbol, searchHistory.companyName)
    .orderBy(desc(count(searchHistory.id)))
    .limit(limit);
  
  // 轉換 count 為 number 類型
  return result.map(row => ({
    symbol: row.symbol,
    companyName: row.companyName,
    count: Number(row.count),
  }));
}

// Analysis cache functions
export async function getAnalysisCache(symbol: string, analysisType: string): Promise<AnalysisCache | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const now = new Date();
  const result = await db.select().from(analysisCache).where(
    and(
      eq(analysisCache.symbol, symbol),
      eq(analysisCache.analysisType, analysisType),
      gt(analysisCache.expiresAt, now)
    )
  ).limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function setAnalysisCache(data: InsertAnalysisCache): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(analysisCache).values(data);
}

// Analysis history functions
export async function saveAnalysisHistory(data: InsertAnalysisHistory): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(analysisHistory).values(data);
}

export async function getAnalysisHistory(symbol: string, analysisType: string, limit: number = 10): Promise<AnalysisHistory[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(analysisHistory)
    .where(
      and(
        eq(analysisHistory.symbol, symbol),
        eq(analysisHistory.analysisType, analysisType)
      )
    )
    .orderBy(desc(analysisHistory.createdAt))
    .limit(limit);
}

export async function getAllAnalysisHistory(): Promise<AnalysisHistory[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(analysisHistory)
    .where(eq(analysisHistory.analysisType, 'investment_analysis'))
    .orderBy(desc(analysisHistory.createdAt));
}

// Portfolio functions
export async function getUserPortfolio(userId: number): Promise<Portfolio[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(portfolio)
    .where(eq(portfolio.userId, userId))
    .orderBy(desc(portfolio.createdAt));
}

export async function addToPortfolio(data: InsertPortfolio): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(portfolio).values(data);
}

export async function updatePortfolio(id: number, data: Partial<InsertPortfolio>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(portfolio).set(data).where(eq(portfolio.id, id));
}

export async function deleteFromPortfolio(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(portfolio).where(
    and(
      eq(portfolio.id, id),
      eq(portfolio.userId, userId)
    )
  );
}

// Portfolio history functions
export async function getPortfolioHistory(userId: number, days?: number): Promise<PortfolioHistory[]> {
  const db = await getDb();
  if (!db) return [];
  
  const query = db.select().from(portfolioHistory)
    .where(eq(portfolioHistory.userId, userId))
    .orderBy(desc(portfolioHistory.recordDate));
  
  const results = days ? await query.limit(days) : await query;
  
  // 反轉順序，使最早的記錄在前
  return results.reverse();
}

export async function addPortfolioHistory(data: InsertPortfolioHistory): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 檢查當天是否已有記錄
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existing = await db.select().from(portfolioHistory).where(
    and(
      eq(portfolioHistory.userId, data.userId),
      eq(portfolioHistory.recordDate, data.recordDate)
    )
  ).limit(1);
  
  if (existing.length > 0) {
    // 更新現有記錄
    await db.update(portfolioHistory)
      .set({
        totalValue: data.totalValue,
        totalCost: data.totalCost,
        totalGainLoss: data.totalGainLoss,
        gainLossPercent: data.gainLossPercent,
      })
      .where(eq(portfolioHistory.id, existing[0].id));
  } else {
    // 插入新記錄
    await db.insert(portfolioHistory).values(data);
  }
}

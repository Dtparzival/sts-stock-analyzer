import { eq, desc, and, gt } from "drizzle-orm";
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
  
  await db.insert(searchHistory).values(data);
}

export async function getUserSearchHistory(userId: number, limit: number = 20): Promise<SearchHistory[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.searchedAt))
    .limit(limit);
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

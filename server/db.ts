import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

// TODO: add feature queries here as your schema grows.

// ===== 搜尋歷史相關 =====
import { searchHistory, InsertSearchHistory, watchlist, InsertWatchlist, userInteractions, InsertUserInteraction } from "../drizzle/schema";
import { desc, and, sql } from "drizzle-orm";

export async function addSearchHistory(data: InsertSearchHistory) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.insert(searchHistory).values(data);
    return true;
  } catch (error) {
    console.error("[Database] Failed to add search history:", error);
    return null;
  }
}

export async function getSearchHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const results = await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.searchedAt))
      .limit(limit);
    
    return results;
  } catch (error) {
    console.error("[Database] Failed to get search history:", error);
    return [];
  }
}

// ===== 收藏清單相關 =====

export async function addToWatchlist(data: InsertWatchlist) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.insert(watchlist).values(data);
    return true;
  } catch (error) {
    console.error("[Database] Failed to add to watchlist:", error);
    return null;
  }
}

export async function removeFromWatchlist(userId: number, symbol: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db
      .delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)));
    return true;
  } catch (error) {
    console.error("[Database] Failed to remove from watchlist:", error);
    return null;
  }
}

export async function getWatchlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const results = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.addedAt));
    
    return results;
  } catch (error) {
    console.error("[Database] Failed to get watchlist:", error);
    return [];
  }
}

// ===== 用戶互動追蹤 =====

export async function trackInteraction(data: InsertUserInteraction) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.insert(userInteractions).values(data);
    return true;
  } catch (error) {
    console.error("[Database] Failed to track interaction:", error);
    return null;
  }
}

// ===== 簡化版推薦演算法 =====

export async function getRecommendations(userId: number, market: 'US' | 'TW', limit: number = 6) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // 簡化版：基於搜尋歷史頻率推薦
    const results = await db
      .select({
        symbol: searchHistory.symbol,
        shortName: searchHistory.shortName,
        companyName: searchHistory.companyName,
        searchCount: sql<number>`COUNT(*)`.as('searchCount'),
        lastSearched: sql<Date>`MAX(${searchHistory.searchedAt})`.as('lastSearched'),
      })
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .groupBy(searchHistory.symbol, searchHistory.shortName, searchHistory.companyName)
      .orderBy(desc(sql`searchCount`), desc(sql`lastSearched`))
      .limit(limit);
    
    return results;
  } catch (error) {
    console.error("[Database] Failed to get recommendations:", error);
    return [];
  }
}

import { eq, desc, and, gt, gte, sql, count } from "drizzle-orm";
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
  InsertPortfolioHistory,
  portfolioTransactions,
  PortfolioTransaction,
  InsertPortfolioTransaction,
  questionStats,
  QuestionStats,
  InsertQuestionStats,
  userBehavior,
  UserBehavior,
  InsertUserBehavior
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

export async function deleteFromPortfolio(id: number, userId: number): Promise<Portfolio | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 先獲取持倉資訊，用於記錄賣出交易
  const holding = await db.select().from(portfolio).where(
    and(
      eq(portfolio.id, id),
      eq(portfolio.userId, userId)
    )
  ).limit(1);
  
  if (holding.length === 0) return null;
  
  await db.delete(portfolio).where(
    and(
      eq(portfolio.id, id),
      eq(portfolio.userId, userId)
    )
  );
  
  return holding[0];
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

// Portfolio transactions functions
export async function addPortfolioTransaction(data: InsertPortfolioTransaction): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(portfolioTransactions).values(data);
}

export async function getPortfolioTransactions(userId: number, days?: number): Promise<PortfolioTransaction[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return await db.select().from(portfolioTransactions)
      .where(
        and(
          eq(portfolioTransactions.userId, userId),
          gte(portfolioTransactions.transactionDate, cutoffDate)
        )
      )
      .orderBy(desc(portfolioTransactions.transactionDate));
  }
  
  return await db.select().from(portfolioTransactions)
    .where(eq(portfolioTransactions.userId, userId))
    .orderBy(desc(portfolioTransactions.transactionDate));
}

export async function getPortfolioTransactionsBySymbol(userId: number, symbol: string): Promise<PortfolioTransaction[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(portfolioTransactions)
    .where(
      and(
        eq(portfolioTransactions.userId, userId),
        eq(portfolioTransactions.symbol, symbol)
      )
    )
    .orderBy(desc(portfolioTransactions.transactionDate));
}

/**
 * 計算交易統計數據
 * 包括總交易次數、平均持有時間、勝率、總獲利/虧損等
 */
export async function getTransactionStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // 獲取所有交易記錄
  const transactions = await getPortfolioTransactions(userId);
  
  if (transactions.length === 0) {
    return {
      totalTransactions: 0,
      buyCount: 0,
      sellCount: 0,
      avgHoldingDays: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfitLoss: 0,
      bestTrade: null,
      worstTrade: null,
    };
  }
  
  // 統計買入和賣出次數
  const buyCount = transactions.filter(t => t.transactionType === 'buy').length;
  const sellCount = transactions.filter(t => t.transactionType === 'sell').length;
  
  // 計算平均持有時間（需要配對買入和賣出記錄）
  const holdingPeriods: number[] = [];
  const profitableTrades: { symbol: string; profit: number; buyDate: Date; sellDate: Date }[] = [];
  const losingTrades: { symbol: string; loss: number; buyDate: Date; sellDate: Date }[] = [];
  
  // 按股票分組
  const transactionsBySymbol = new Map<string, PortfolioTransaction[]>();
  transactions.forEach(t => {
    if (!transactionsBySymbol.has(t.symbol)) {
      transactionsBySymbol.set(t.symbol, []);
    }
    transactionsBySymbol.get(t.symbol)!.push(t);
  });
  
  let totalProfit = 0;
  let totalLoss = 0;
  
  // 對每支股票的交易記錄進行配對分析
  transactionsBySymbol.forEach((symbolTransactions, symbol) => {
    // 按時間排序（最早的在前）
    const sorted = [...symbolTransactions].sort((a, b) => 
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );
    
    // 使用 FIFO（先進先出）方法配對買入和賣出
    const buyQueue: { shares: number; price: number; date: Date }[] = [];
    
    sorted.forEach(t => {
      if (t.transactionType === 'buy') {
        buyQueue.push({
          shares: t.shares,
          price: t.price,
          date: new Date(t.transactionDate),
        });
      } else if (t.transactionType === 'sell') {
        let remainingShares = t.shares;
        const sellPrice = t.price;
        const sellDate = new Date(t.transactionDate);
        
        while (remainingShares > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const matchedShares = Math.min(remainingShares, buy.shares);
          
          // 計算持有天數
          const holdingDays = Math.floor((sellDate.getTime() - buy.date.getTime()) / (1000 * 60 * 60 * 24));
          holdingPeriods.push(holdingDays);
          
          // 計算損益（價格以分為單位）
          const profitLoss = (sellPrice - buy.price) * matchedShares;
          
          if (profitLoss > 0) {
            totalProfit += profitLoss;
            profitableTrades.push({
              symbol,
              profit: profitLoss,
              buyDate: buy.date,
              sellDate,
            });
          } else if (profitLoss < 0) {
            totalLoss += profitLoss;
            losingTrades.push({
              symbol,
              loss: profitLoss,
              buyDate: buy.date,
              sellDate,
            });
          }
          
          // 更新剩餘股數
          remainingShares -= matchedShares;
          buy.shares -= matchedShares;
          
          if (buy.shares === 0) {
            buyQueue.shift();
          }
        }
      }
    });
  });
  
  // 計算平均持有天數
  const avgHoldingDays = holdingPeriods.length > 0
    ? Math.round(holdingPeriods.reduce((sum, days) => sum + days, 0) / holdingPeriods.length)
    : 0;
  
  // 計算勝率
  const totalCompletedTrades = profitableTrades.length + losingTrades.length;
  const winRate = totalCompletedTrades > 0
    ? (profitableTrades.length / totalCompletedTrades) * 100
    : 0;
  
  // 找出最佳和最差交易
  const bestTrade = profitableTrades.length > 0
    ? profitableTrades.reduce((best, current) => current.profit > best.profit ? current : best)
    : null;
  
  const worstTrade = losingTrades.length > 0
    ? losingTrades.reduce((worst, current) => current.loss < worst.loss ? current : worst)
    : null;
  
  return {
    totalTransactions: transactions.length,
    buyCount,
    sellCount,
    avgHoldingDays,
    winRate,
    totalProfit: totalProfit / 100, // 轉換為美元
    totalLoss: totalLoss / 100, // 轉換為美元
    netProfitLoss: (totalProfit + totalLoss) / 100, // 轉換為美元
    bestTrade: bestTrade ? {
      symbol: bestTrade.symbol,
      profit: bestTrade.profit / 100,
      buyDate: bestTrade.buyDate.toISOString(),
      sellDate: bestTrade.sellDate.toISOString(),
    } : null,
    worstTrade: worstTrade ? {
      symbol: worstTrade.symbol,
      loss: worstTrade.loss / 100,
      buyDate: worstTrade.buyDate.toISOString(),
      sellDate: worstTrade.sellDate.toISOString(),
    } : null,
  };
}

// ==================== Question Stats Functions ====================

/**
 * 記錄或更新快速問題點擊次數
 */
export async function recordQuestionClick(userId: number, question: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record question click: database not available");
    return;
  }

  try {
    // 先查詢是否已存在該問題的記錄
    const existing = await db
      .select()
      .from(questionStats)
      .where(and(
        eq(questionStats.userId, userId),
        eq(questionStats.question, question)
      ))
      .limit(1);

    if (existing.length > 0) {
      // 更新點擊次數和最後點擊時間
      await db
        .update(questionStats)
        .set({
          clickCount: existing[0].clickCount + 1,
          lastClickedAt: new Date(),
        })
        .where(eq(questionStats.id, existing[0].id));
    } else {
      // 創建新記錄
      await db.insert(questionStats).values({
        userId,
        question,
        clickCount: 1,
        lastClickedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to record question click:", error);
    throw error;
  }
}

/**
 * 獲取用戶最常使用的快速問題（用於動態調整按鈕）
 */
export async function getTopQuestions(userId: number, limit: number = 6): Promise<QuestionStats[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get top questions: database not available");
    return [];
  }

  try {
    const results = await db
      .select()
      .from(questionStats)
      .where(eq(questionStats.userId, userId))
      .orderBy(desc(questionStats.clickCount), desc(questionStats.lastClickedAt))
      .limit(limit);

    return results;
  } catch (error) {
    console.error("[Database] Failed to get top questions:", error);
    return [];
  }
}

/**
 * 獲取所有用戶的熱門問題（全局統計）
 */
export async function getGlobalTopQuestions(limit: number = 10): Promise<Array<{ question: string; totalClicks: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get global top questions: database not available");
    return [];
  }

  try {
    const results = await db
      .select({
        question: questionStats.question,
        totalClicks: sql<number>`SUM(${questionStats.clickCount})`.as('totalClicks'),
      })
      .from(questionStats)
      .groupBy(questionStats.question)
      .orderBy(desc(sql`SUM(${questionStats.clickCount})`))
      .limit(limit);

    return results;
  } catch (error) {
    console.error("[Database] Failed to get global top questions:", error);
    return [];
  }
}

// ==================== 用戶行為追蹤 ====================

/**
 * 記錄或更新用戶查看股票的行為
 */
export async function trackUserView(userId: number, symbol: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot track view: database not available");
    return;
  }

  try {
    // 檢查是否已存在記錄
    const existing = await db
      .select()
      .from(userBehavior)
      .where(and(
        eq(userBehavior.userId, userId),
        eq(userBehavior.symbol, symbol)
      ))
      .limit(1);

    if (existing.length > 0) {
      // 更新現有記錄
      await db
        .update(userBehavior)
        .set({
          viewCount: sql`${userBehavior.viewCount} + 1`,
          lastViewedAt: new Date(),
        })
        .where(and(
          eq(userBehavior.userId, userId),
          eq(userBehavior.symbol, symbol)
        ));
    } else {
      // 創建新記錄
      await db.insert(userBehavior).values({
        userId,
        symbol,
        viewCount: 1,
        searchCount: 0,
        totalViewTime: 0,
        lastViewedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to track view:", error);
  }
}

/**
 * 記錄或更新用戶搜尋股票的行為
 */
export async function trackUserSearch(userId: number, symbol: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot track search: database not available");
    return;
  }

  try {
    // 檢查是否已存在記錄
    const existing = await db
      .select()
      .from(userBehavior)
      .where(and(
        eq(userBehavior.userId, userId),
        eq(userBehavior.symbol, symbol)
      ))
      .limit(1);

    if (existing.length > 0) {
      // 更新現有記錄
      await db
        .update(userBehavior)
        .set({
          searchCount: sql`${userBehavior.searchCount} + 1`,
          lastViewedAt: new Date(),
        })
        .where(and(
          eq(userBehavior.userId, userId),
          eq(userBehavior.symbol, symbol)
        ));
    } else {
      // 創建新記錄
      await db.insert(userBehavior).values({
        userId,
        symbol,
        viewCount: 0,
        searchCount: 1,
        totalViewTime: 0,
        lastViewedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to track search:", error);
  }
}

/**
 * 記錄用戶在股票詳情頁的停留時間
 */
export async function trackUserViewTime(userId: number, symbol: string, viewTimeSeconds: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot track view time: database not available");
    return;
  }

  try {
    // 檢查是否已存在記錄
    const existing = await db
      .select()
      .from(userBehavior)
      .where(and(
        eq(userBehavior.userId, userId),
        eq(userBehavior.symbol, symbol)
      ))
      .limit(1);

    if (existing.length > 0) {
      // 更新現有記錄
      await db
        .update(userBehavior)
        .set({
          totalViewTime: sql`${userBehavior.totalViewTime} + ${viewTimeSeconds}`,
          lastViewedAt: new Date(),
        })
        .where(and(
          eq(userBehavior.userId, userId),
          eq(userBehavior.symbol, symbol)
        ));
    } else {
      // 創建新記錄
      await db.insert(userBehavior).values({
        userId,
        symbol,
        viewCount: 0,
        searchCount: 0,
        totalViewTime: viewTimeSeconds,
        lastViewedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to track view time:", error);
  }
}

/**
 * 獲取用戶的行為數據
 */
export async function getUserBehavior(userId: number, symbol: string): Promise<UserBehavior | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user behavior: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(userBehavior)
      .where(and(
        eq(userBehavior.userId, userId),
        eq(userBehavior.symbol, symbol)
      ))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user behavior:", error);
    return undefined;
  }
}

/**
 * 獲取用戶所有行為數據
 */
export async function getAllUserBehavior(userId: number): Promise<UserBehavior[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get all user behavior: database not available");
    return [];
  }

  try {
    const results = await db
      .select()
      .from(userBehavior)
      .where(eq(userBehavior.userId, userId))
      .orderBy(desc(userBehavior.lastViewedAt));

    return results;
  } catch (error) {
    console.error("[Database] Failed to get all user behavior:", error);
    return [];
  }
}

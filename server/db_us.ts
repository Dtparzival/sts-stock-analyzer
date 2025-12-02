import { eq, and, gte, lte, desc, like, or, sql, count } from "drizzle-orm";
import { getDb } from "./db";
import { 
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
  InsertStockDataCache
} from "../drizzle/schema";

// ============================================================================
// US Stock Basic Data Operations
// ============================================================================

/**
 * 根據股票代號查詢美股基本資料
 */
export async function getUsStockBySymbol(symbol: string): Promise<UsStock | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(usStocks)
    .where(eq(usStocks.symbol, symbol))
    .limit(1);

  return result[0];
}

/**
 * 搜尋美股 (支援代號、名稱、簡稱)
 */
export async function searchUsStocks(keyword: string, limit: number = 20): Promise<UsStock[]> {
  const db = await getDb();
  if (!db) return [];

  const searchPattern = `%${keyword}%`;
  
  const result = await db.select()
    .from(usStocks)
    .where(
      and(
        or(
          like(usStocks.symbol, searchPattern),
          like(usStocks.name, searchPattern),
          like(usStocks.shortName, searchPattern)
        ),
        eq(usStocks.isActive, true)
      )
    )
    .limit(limit);

  return result;
}

/**
 * 獲取所有活躍美股
 */
export async function getActiveUsStocks(limit?: number): Promise<UsStock[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select()
    .from(usStocks)
    .where(eq(usStocks.isActive, true));

  if (limit) {
    query = query.limit(limit) as any;
  }

  return await query;
}

/**
 * 根據交易所查詢美股
 */
export async function getUsStocksByExchange(exchange: string, limit?: number): Promise<UsStock[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select()
    .from(usStocks)
    .where(
      and(
        eq(usStocks.exchange, exchange),
        eq(usStocks.isActive, true)
      )
    );

  if (limit) {
    query = query.limit(limit) as any;
  }

  return await query;
}

/**
 * 根據產業類別查詢美股
 */
export async function getUsStocksBySector(sector: string, limit?: number): Promise<UsStock[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select()
    .from(usStocks)
    .where(
      and(
        eq(usStocks.sector, sector),
        eq(usStocks.isActive, true)
      )
    );

  if (limit) {
    query = query.limit(limit) as any;
  }

  return await query;
}

/**
 * 插入或更新美股基本資料
 */
export async function upsertUsStock(stock: InsertUsStock): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(usStocks)
    .values(stock)
    .onDuplicateKeyUpdate({
      set: {
        name: stock.name,
        shortName: stock.shortName,
        exchange: stock.exchange,
        currency: stock.currency,
        country: stock.country,
        sector: stock.sector,
        industry: stock.industry,
        isActive: stock.isActive,
        updatedAt: new Date(),
      }
    });
}

/**
 * 批次插入或更新美股基本資料
 */
export async function batchUpsertUsStocks(stocks: InsertUsStock[]): Promise<void> {
  const db = await getDb();
  if (!db || stocks.length === 0) return;

  // 分批處理,每次 100 筆
  const batchSize = 100;
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);
    
    for (const stock of batch) {
      await upsertUsStock(stock);
    }
  }
}

// ============================================================================
// US Stock Price Operations
// ============================================================================

/**
 * 獲取美股指定日期範圍的價格資料
 */
export async function getUsStockPrices(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<UsStockPrice[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(usStockPrices)
    .where(
      and(
        eq(usStockPrices.symbol, symbol),
        gte(usStockPrices.date, startDate),
        lte(usStockPrices.date, endDate)
      )
    )
    .orderBy(desc(usStockPrices.date));

  return result;
}

/**
 * 獲取美股最新價格
 */
export async function getLatestUsStockPrice(symbol: string): Promise<UsStockPrice | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(usStockPrices)
    .where(eq(usStockPrices.symbol, symbol))
    .orderBy(desc(usStockPrices.date))
    .limit(1);

  return result[0];
}

/**
 * 獲取美股指定日期的價格
 */
export async function getUsStockPriceByDate(symbol: string, date: Date): Promise<UsStockPrice | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(usStockPrices)
    .where(
      and(
        eq(usStockPrices.symbol, symbol),
        eq(usStockPrices.date, date)
      )
    )
    .limit(1);

  return result[0];
}

/**
 * 獲取美股最近 N 天的價格
 */
export async function getRecentUsStockPrices(symbol: string, days: number = 30): Promise<UsStockPrice[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(usStockPrices)
    .where(eq(usStockPrices.symbol, symbol))
    .orderBy(desc(usStockPrices.date))
    .limit(days);

  return result;
}

/**
 * 批次獲取美股最新價格
 */
export async function getBatchLatestUsStockPrices(symbols: string[]): Promise<UsStockPrice[]> {
  const db = await getDb();
  if (!db || symbols.length === 0) return [];

  // 使用子查詢獲取每個股票的最新價格
  const result = await db.select()
    .from(usStockPrices)
    .where(
      sql`(${usStockPrices.symbol}, ${usStockPrices.date}) IN (
        SELECT symbol, MAX(date) 
        FROM ${usStockPrices} 
        WHERE symbol IN (${sql.join(symbols.map(s => sql`${s}`), sql`, `)})
        GROUP BY symbol
      )`
    );

  return result;
}

/**
 * 插入或更新美股價格資料
 */
export async function upsertUsStockPrice(price: InsertUsStockPrice): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(usStockPrices)
    .values(price)
    .onDuplicateKeyUpdate({
      set: {
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume,
        change: price.change,
        changePercent: price.changePercent,
      }
    });
}

/**
 * 批次插入或更新美股價格資料
 */
export async function batchUpsertUsStockPrices(prices: InsertUsStockPrice[]): Promise<void> {
  const db = await getDb();
  if (!db || prices.length === 0) return;

  // 分批處理,每次 100 筆
  const batchSize = 100;
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    
    for (const price of batch) {
      await upsertUsStockPrice(price);
    }
  }
}

// ============================================================================
// US Data Sync Status Management
// ============================================================================

/**
 * 記錄美股資料同步狀態
 */
export async function insertUsDataSyncStatus(status: InsertUsDataSyncStatus): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(usDataSyncStatus).values(status);
}

/**
 * 獲取美股最新同步狀態
 */
export async function getLatestUsDataSyncStatus(dataType: string): Promise<UsDataSyncStatus | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(usDataSyncStatus)
    .where(eq(usDataSyncStatus.dataType, dataType))
    .orderBy(desc(usDataSyncStatus.lastSyncAt))
    .limit(1);

  return result[0];
}

/**
 * 獲取所有美股同步狀態
 */
export async function getAllUsDataSyncStatus(limit: number = 50): Promise<UsDataSyncStatus[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(usDataSyncStatus)
    .orderBy(desc(usDataSyncStatus.lastSyncAt))
    .limit(limit);

  return result;
}

// ============================================================================
// US Data Sync Error Management
// ============================================================================

/**
 * 記錄美股資料同步錯誤
 */
export async function insertUsDataSyncError(error: InsertUsDataSyncError): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(usDataSyncErrors).values(error);
}

/**
 * 批次記錄美股資料同步錯誤
 */
export async function batchInsertUsDataSyncErrors(errors: InsertUsDataSyncError[]): Promise<void> {
  const db = await getDb();
  if (!db || errors.length === 0) return;

  await db.insert(usDataSyncErrors).values(errors);
}

/**
 * 獲取未解決的美股同步錯誤
 */
export async function getUnresolvedUsDataSyncErrors(limit: number = 50): Promise<UsDataSyncError[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(usDataSyncErrors)
    .where(eq(usDataSyncErrors.resolved, false))
    .orderBy(desc(usDataSyncErrors.syncedAt))
    .limit(limit);

  return result;
}

/**
 * 標記美股同步錯誤為已解決
 */
export async function markUsDataSyncErrorResolved(errorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(usDataSyncErrors)
    .set({ resolved: true })
    .where(eq(usDataSyncErrors.id, errorId));
}

// ============================================================================
// Stock Data Cache Operations
// ============================================================================

/**
 * 獲取快取資料
 */
export async function getStockDataCache(cacheKey: string): Promise<StockDataCache | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select()
    .from(stockDataCache)
    .where(
      and(
        eq(stockDataCache.cacheKey, cacheKey),
        gte(stockDataCache.expiresAt, new Date())
      )
    )
    .limit(1);

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
// US Stock Statistics
// ============================================================================

/**
 * 統計美股數量
 */
export async function countUsStocks(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: count() })
    .from(usStocks);

  return result[0]?.count || 0;
}

/**
 * 統計活躍美股數量
 */
export async function countActiveUsStocks(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: count() })
    .from(usStocks)
    .where(eq(usStocks.isActive, true));

  return result[0]?.count || 0;
}

/**
 * 統計美股價格記錄數量
 */
export async function countUsStockPriceRecords(symbol?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let query = db.select({ count: count() })
    .from(usStockPrices);

  if (symbol) {
    query = query.where(eq(usStockPrices.symbol, symbol)) as any;
  }

  const result = await query;
  return result[0]?.count || 0;
}

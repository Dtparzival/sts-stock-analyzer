import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  twStocks, 
  twStockPrices, 
  twDataSyncStatus, 
  twDataSyncErrors,
  usStocks,
  usStockPrices,
  usDataSyncStatus,
  usDataSyncErrors
} from "../../drizzle/schema";
import { sql, desc, eq, and } from "drizzle-orm";

/**
 * 資料同步狀態查詢 Router
 * 提供台美股資料同步進度與統計資訊
 */
export const syncStatusRouter = router({
  /**
   * 取得整體同步狀態概覽
   */
  getOverview: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("資料庫連線失敗");
    }

    try {
      // 台股統計
      const twStatsResult = await db
        .select({
          totalStocks: sql<number>`COUNT(DISTINCT ${twStocks.symbol})`,
          totalPriceRecords: sql<number>`(SELECT COUNT(*) FROM ${twStockPrices})`,
          stocksWithPrices: sql<number>`(SELECT COUNT(DISTINCT symbol) FROM ${twStockPrices})`,
          unresolvedErrors: sql<number>`(SELECT COUNT(*) FROM ${twDataSyncErrors} WHERE resolved = false)`,
          latestSyncTime: sql<string>`(SELECT MAX(updatedAt) FROM ${twStocks})`,
          earliestPriceDate: sql<string>`(SELECT MIN(date) FROM ${twStockPrices})`,
          latestPriceDate: sql<string>`(SELECT MAX(date) FROM ${twStockPrices})`,
        })
        .from(twStocks);

      // 美股統計
      const usStatsResult = await db
        .select({
          totalStocks: sql<number>`COUNT(DISTINCT ${usStocks.symbol})`,
          totalPriceRecords: sql<number>`(SELECT COUNT(*) FROM ${usStockPrices})`,
          stocksWithPrices: sql<number>`(SELECT COUNT(DISTINCT symbol) FROM ${usStockPrices})`,
          unresolvedErrors: sql<number>`(SELECT COUNT(*) FROM ${usDataSyncErrors} WHERE resolved = false)`,
          latestSyncTime: sql<string>`(SELECT MAX(updatedAt) FROM ${usStocks})`,
          earliestPriceDate: sql<string>`(SELECT MIN(date) FROM ${usStockPrices})`,
          latestPriceDate: sql<string>`(SELECT MAX(date) FROM ${usStockPrices})`,
        })
        .from(usStocks);

      const twStats = twStatsResult[0];
      const usStats = usStatsResult[0];

      return {
        success: true,
        data: {
          tw: {
            totalStocks: twStats.totalStocks || 0,
            totalPriceRecords: twStats.totalPriceRecords || 0,
            stocksWithPrices: twStats.stocksWithPrices || 0,
            coveragePercent: twStats.totalStocks > 0 
              ? Math.round((twStats.stocksWithPrices / twStats.totalStocks) * 100) 
              : 0,
            unresolvedErrors: twStats.unresolvedErrors || 0,
            latestSyncTime: twStats.latestSyncTime,
            earliestPriceDate: twStats.earliestPriceDate,
            latestPriceDate: twStats.latestPriceDate,
          },
          us: {
            totalStocks: usStats.totalStocks || 0,
            totalPriceRecords: usStats.totalPriceRecords || 0,
            stocksWithPrices: usStats.stocksWithPrices || 0,
            coveragePercent: usStats.totalStocks > 0 
              ? Math.round((usStats.stocksWithPrices / usStats.totalStocks) * 100) 
              : 0,
            unresolvedErrors: usStats.unresolvedErrors || 0,
            latestSyncTime: usStats.latestSyncTime,
            earliestPriceDate: usStats.earliestPriceDate,
            latestPriceDate: usStats.latestPriceDate,
          },
        },
      };
    } catch (error) {
      console.error("[syncStatus.getOverview] Error:", error);
      throw new Error("取得同步狀態失敗");
    }
  }),

  /**
   * 取得同步歷史記錄
   */
  getSyncHistory: publicProcedure
    .input(
      z.object({
        market: z.enum(["TW", "US"]),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("資料庫連線失敗");
      }

      try {
        const { market, limit } = input;

        if (market === "TW") {
          const history = await db
            .select()
            .from(twDataSyncStatus)
            .orderBy(desc(twDataSyncStatus.lastSyncAt))
            .limit(limit);

          return {
            success: true,
            data: history,
          };
        } else {
          const history = await db
            .select()
            .from(usDataSyncStatus)
            .orderBy(desc(usDataSyncStatus.lastSyncAt))
            .limit(limit);

          return {
            success: true,
            data: history,
          };
        }
      } catch (error) {
        console.error("[syncStatus.getSyncHistory] Error:", error);
        throw new Error("取得同步歷史失敗");
      }
    }),

  /**
   * 取得同步錯誤記錄
   */
  getSyncErrors: publicProcedure
    .input(
      z.object({
        market: z.enum(["TW", "US"]),
        resolved: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("資料庫連線失敗");
      }

      try {
        const { market, resolved, limit } = input;

        if (market === "TW") {
          const errors = await db
            .select()
            .from(twDataSyncErrors)
            .where(
              resolved !== undefined
                ? eq(twDataSyncErrors.resolved, resolved)
                : undefined
            )
            .orderBy(desc(twDataSyncErrors.syncedAt))
            .limit(limit);

          return {
            success: true,
            data: errors,
          };
        } else {
          const errors = await db
            .select()
            .from(usDataSyncErrors)
            .where(
              resolved !== undefined
                ? eq(usDataSyncErrors.resolved, resolved)
                : undefined
            )
            .orderBy(desc(usDataSyncErrors.syncedAt))
            .limit(limit);

          return {
            success: true,
            data: errors,
          };
        }
      } catch (error) {
        console.error("[syncStatus.getSyncErrors] Error:", error);
        throw new Error("取得同步錯誤記錄失敗");
      }
    }),

  /**
   * 取得股票價格資料覆蓋率詳情
   */
  getPriceCoverage: publicProcedure
    .input(
      z.object({
        market: z.enum(["TW", "US"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("資料庫連線失敗");
      }

      try {
        const { market } = input;

        if (market === "TW") {
          // 取得每支股票的價格記錄數量
          const coverage = await db
            .select({
              symbol: twStockPrices.symbol,
              priceCount: sql<number>`COUNT(*)`,
              earliestDate: sql<string>`MIN(${twStockPrices.date})`,
              latestDate: sql<string>`MAX(${twStockPrices.date})`,
            })
            .from(twStockPrices)
            .groupBy(twStockPrices.symbol)
            .orderBy(desc(sql`COUNT(*)`))
            .limit(50);

          return {
            success: true,
            data: coverage,
          };
        } else {
          // 取得每支股票的價格記錄數量
          const coverage = await db
            .select({
              symbol: usStockPrices.symbol,
              priceCount: sql<number>`COUNT(*)`,
              earliestDate: sql<string>`MIN(${usStockPrices.date})`,
              latestDate: sql<string>`MAX(${usStockPrices.date})`,
            })
            .from(usStockPrices)
            .groupBy(usStockPrices.symbol)
            .orderBy(desc(sql`COUNT(*)`))
            .limit(50);

          return {
            success: true,
            data: coverage,
          };
        }
      } catch (error) {
        console.error("[syncStatus.getPriceCoverage] Error:", error);
        throw new Error("取得價格覆蓋率失敗");
      }
    }),
});

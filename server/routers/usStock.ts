import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as dbUs from "../db_us";
import { 
  getTwelveDataQuote, 
  getTwelveDataTimeSeries,
  convertPriceToCents,
  calculateChangePercent
} from "../integrations/twelvedata";

/**
 * 美股 tRPC Router
 * 提供美股基本資料、價格查詢、快取管理等功能
 */
export const usStockRouter = router({
  /**
   * 搜尋美股
   */
  search: publicProcedure
    .input(z.object({
      keyword: z.string().min(1, "關鍵字不能為空"),
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input }) => {
      const { keyword, limit } = input;
      
      try {
        const stocks = await dbUs.searchUsStocks(keyword, limit);
        return {
          success: true,
          data: stocks,
          count: stocks.length,
        };
      } catch (error: any) {
        console.error("[usStock.search] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `搜尋美股失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 獲取美股詳情 (含即時報價)
   */
  getDetail: publicProcedure
    .input(z.object({
      symbol: z.string().min(1, "股票代號不能為空"),
      useCache: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      const { symbol, useCache } = input;
      
      try {
        // 檢查快取
        let cachedData = null;
        if (useCache) {
          const cacheKey = `stock_detail:${symbol}:US`;
          cachedData = await dbUs.getStockDataCache(cacheKey);
          
          if (cachedData) {
            return {
              success: true,
              data: JSON.parse(cachedData.data),
              fromCache: true,
              cachedAt: cachedData.createdAt,
              expiresAt: cachedData.expiresAt,
            };
          }
        }

        // 從 TwelveData API 獲取即時報價
        const quote = await getTwelveDataQuote(symbol);
        
        // 轉換價格為整數 (以美分為單位)
        const close = convertPriceToCents(quote.close);
        const open = convertPriceToCents(quote.open);
        const high = convertPriceToCents(quote.high);
        const low = convertPriceToCents(quote.low);
        const previousClose = convertPriceToCents(quote.previous_close);
        const change = close - previousClose;
        const changePercent = calculateChangePercent(close, previousClose);

        const result = {
          symbol: quote.symbol,
          name: quote.name,
          exchange: quote.exchange,
          currency: quote.currency,
          datetime: quote.datetime,
          timestamp: quote.timestamp,
          open,
          high,
          low,
          close,
          volume: parseInt(quote.volume),
          previousClose,
          change,
          changePercent,
          fiftyTwoWeek: quote.fifty_two_week ? {
            low: convertPriceToCents(quote.fifty_two_week.low),
            high: convertPriceToCents(quote.fifty_two_week.high),
          } : null,
        };

        // 寫入快取 (1 小時)
        if (useCache) {
          const cacheKey = `stock_detail:${symbol}:US`;
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小時後過期
          
          await dbUs.setStockDataCache({
            cacheKey,
            market: 'US',
            symbol,
            dataType: 'detail',
            data: JSON.stringify(result),
            expiresAt,
          });
        }

        return {
          success: true,
          data: result,
          fromCache: false,
        };
      } catch (error: any) {
        console.error("[usStock.getDetail] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `獲取美股詳情失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 獲取美股歷史價格
   */
  getHistorical: publicProcedure
    .input(z.object({
      symbol: z.string().min(1, "股票代號不能為空"),
      interval: z.enum(['1min', '5min', '15min', '30min', '1h', '1day', '1week', '1month']).optional().default('1day'),
      outputsize: z.number().min(1).max(5000).optional().default(30),
      useCache: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      const { symbol, interval, outputsize, useCache } = input;
      
      try {
        // 檢查快取
        let cachedData = null;
        if (useCache) {
          const cacheKey = `stock_historical:${symbol}:US:${interval}:${outputsize}`;
          cachedData = await dbUs.getStockDataCache(cacheKey);
          
          if (cachedData) {
            return {
              success: true,
              data: JSON.parse(cachedData.data),
              fromCache: true,
              cachedAt: cachedData.createdAt,
              expiresAt: cachedData.expiresAt,
            };
          }
        }

        // 從 TwelveData API 獲取歷史數據
        const timeSeries = await getTwelveDataTimeSeries(symbol, interval, outputsize);
        
        // 轉換價格為整數 (以美分為單位)
        const values = timeSeries.values.map(v => ({
          datetime: v.datetime,
          open: convertPriceToCents(v.open),
          high: convertPriceToCents(v.high),
          low: convertPriceToCents(v.low),
          close: convertPriceToCents(v.close),
          volume: parseInt(v.volume),
        }));

        const result = {
          meta: timeSeries.meta,
          values,
          status: timeSeries.status,
        };

        // 寫入快取 (1 小時)
        if (useCache) {
          const cacheKey = `stock_historical:${symbol}:US:${interval}:${outputsize}`;
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小時後過期
          
          await dbUs.setStockDataCache({
            cacheKey,
            market: 'US',
            symbol,
            dataType: 'historical',
            data: JSON.stringify(result),
            expiresAt,
          });
        }

        return {
          success: true,
          data: result,
          fromCache: false,
        };
      } catch (error: any) {
        console.error("[usStock.getHistorical] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `獲取美股歷史價格失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 獲取美股最新價格 (從資料庫)
   */
  getLatestPrice: publicProcedure
    .input(z.object({
      symbol: z.string().min(1, "股票代號不能為空"),
    }))
    .query(async ({ input }) => {
      const { symbol } = input;
      
      try {
        const price = await dbUs.getLatestUsStockPrice(symbol);
        
        if (!price) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `找不到股票 ${symbol} 的價格資料`,
          });
        }

        return {
          success: true,
          data: price,
        };
      } catch (error: any) {
        console.error("[usStock.getLatestPrice] Error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `獲取最新價格失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 獲取快取狀態
   */
  getCacheStatus: publicProcedure
    .input(z.object({
      symbol: z.string().min(1, "股票代號不能為空"),
    }))
    .query(async ({ input }) => {
      const { symbol } = input;
      
      try {
        // 檢查各類快取的狀態
        const detailCacheKey = `stock_detail:${symbol}:US`;
        const detailCache = await dbUs.getStockDataCache(detailCacheKey);
        
        return {
          success: true,
          data: {
            symbol,
            market: 'US',
            caches: {
              detail: detailCache ? {
                exists: true,
                cachedAt: detailCache.createdAt,
                expiresAt: detailCache.expiresAt,
                isExpired: new Date() > detailCache.expiresAt,
              } : {
                exists: false,
              },
            },
          },
        };
      } catch (error: any) {
        console.error("[usStock.getCacheStatus] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `獲取快取狀態失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 清除快取
   */
  clearCache: protectedProcedure
    .input(z.object({
      symbol: z.string().min(1, "股票代號不能為空"),
    }))
    .mutation(async ({ input }) => {
      const { symbol } = input;
      
      try {
        await dbUs.deleteStockCache('US', symbol);
        
        return {
          success: true,
          message: `已清除股票 ${symbol} 的快取`,
        };
      } catch (error: any) {
        console.error("[usStock.clearCache] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `清除快取失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 獲取美股同步狀態
   */
  getSyncStatus: publicProcedure
    .input(z.object({
      dataType: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(10),
    }))
    .query(async ({ input }) => {
      const { dataType, limit } = input;
      
      try {
        if (dataType) {
          const status = await dbUs.getLatestUsDataSyncStatus(dataType);
          return {
            success: true,
            data: status ? [status] : [],
          };
        } else {
          const statuses = await dbUs.getAllUsDataSyncStatus(limit);
          return {
            success: true,
            data: statuses,
          };
        }
      } catch (error: any) {
        console.error("[usStock.getSyncStatus] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `獲取同步狀態失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 獲取美股同步錯誤
   */
  getSyncErrors: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(50),
    }))
    .query(async ({ input }) => {
      const { limit } = input;
      
      try {
        const errors = await dbUs.getUnresolvedUsDataSyncErrors(limit);
        return {
          success: true,
          data: errors,
          count: errors.length,
        };
      } catch (error: any) {
        console.error("[usStock.getSyncErrors] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `獲取同步錯誤失敗: ${error.message}`,
        });
      }
    }),

  /**
   * 統計資訊
   */
  getStatistics: publicProcedure
    .query(async () => {
      try {
        const totalStocks = await dbUs.countUsStocks();
        const activeStocks = await dbUs.countActiveUsStocks();
        const totalPriceRecords = await dbUs.countUsStockPriceRecords();

        return {
          success: true,
          data: {
            totalStocks,
            activeStocks,
            totalPriceRecords,
          },
        };
      } catch (error: any) {
        console.error("[usStock.getStatistics] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `獲取統計資訊失敗: ${error.message}`,
        });
      }
    }),
});

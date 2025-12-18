/**
 * 台股 tRPC API 路由模組
 * 
 * 提供台股基本資料查詢與即時價格 API 功能
 * 價格資料改為即時呼叫 TWSE/TPEx API，不再儲存於資料庫
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import {
  syncStockInfo,
} from '../jobs/syncTwStockData';
import { formatDate } from '../integrations/dataTransformer';
import { getTWSEStockHistory, convertTWSEToYahooFormat, convertSymbolToTWSE } from '../twse';

/**
 * 解析 TWSE 日期格式（民國年/月/日）為 YYYY-MM-DD
 */
function parseTWSEDateToString(dateStr: string): string {
  const parts = dateStr.split('/');
  const year = parseInt(parts[0]) + 1911;
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 台股 API 路由
 */
export const twStockRouter = router({
  /**
   * 搜尋股票
   * 支援代號、名稱、簡稱模糊搜尋
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, '搜尋關鍵字不可為空'),
        limit: z.number().int().positive().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      const { query, limit } = input;

      try {
        const stocks = await db.searchTwStocks(query, limit);

        return {
          success: true,
          data: stocks.map(stock => ({
            ...stock,
            listedDate: stock.listedDate ? formatDate(stock.listedDate) : null,
          })),
          count: stocks.length,
        };
      } catch (error) {
        console.error('[twStock.search] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '搜尋股票失敗',
        });
      }
    }),

  /**
   * 獲取股票詳情
   */
  getDetail: publicProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤'),
      })
    )
    .query(async ({ input }) => {
      const { symbol } = input;

      try {
        const stock = await db.getTwStockBySymbol(symbol);

        if (!stock) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該股票',
          });
        }

        return {
          success: true,
          data: {
            ...stock,
            listedDate: stock.listedDate ? formatDate(stock.listedDate) : null,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('[twStock.getDetail] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '獲取股票詳情失敗',
        });
      }
    }),

  /**
   * 獲取歷史價格 (即時呼叫 TWSE API)
   */
  getHistorical: publicProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤'),
        months: z.number().int().min(1).max(12).optional().default(1),
      })
    )
    .query(async ({ input }) => {
      const { symbol, months } = input;

      try {
        // 檢查快取
        const cacheKey = `tw_historical:${symbol}:${months}m`;
        const cachedData = await db.getStockDataCache(cacheKey);
        
        if (cachedData) {
          return {
            success: true,
            data: JSON.parse(cachedData.data),
            fromCache: true,
            cachedAt: cachedData.createdAt,
          };
        }

        // 呼叫 TWSE API 獲取歷史價格
        const stockNo = convertSymbolToTWSE(symbol);
        const twseData = await getTWSEStockHistory(stockNo, months);
        
        if (!twseData || twseData.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該股票的價格資料',
          });
        }

        // 轉換為標準格式
        const result = convertTWSEToYahooFormat(stockNo, twseData);

        // 寫入快取 (5 分鐘)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.setStockDataCache({
          cacheKey,
          market: 'TW',
          symbol,
          dataType: 'historical',
          data: JSON.stringify(result),
          expiresAt,
        });

        return {
          success: true,
          data: result,
          fromCache: false,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('[twStock.getHistorical] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '獲取歷史價格失敗',
        });
      }
    }),

  /**
   * 獲取最新價格 (即時呼叫 TWSE API)
   */
  getLatestPrice: publicProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤'),
      })
    )
    .query(async ({ input }) => {
      const { symbol } = input;

      try {
        // 檢查快取
        const cacheKey = `tw_latest:${symbol}`;
        const cachedData = await db.getStockDataCache(cacheKey);
        
        if (cachedData) {
          return {
            success: true,
            data: JSON.parse(cachedData.data),
            fromCache: true,
            cachedAt: cachedData.createdAt,
          };
        }

        // 呼叫 TWSE API 獲取最新價格
        const stockNo = convertSymbolToTWSE(symbol);
        const twseData = await getTWSEStockHistory(stockNo, 1);
        
        if (!twseData || twseData.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該股票的價格資料',
          });
        }

        // 取最新一筆 - TWSE 返回的是 TWSEStockDayResponse 格式
        const latestMonth = twseData[0];
        if (!latestMonth.data || latestMonth.data.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該股票的價格資料',
          });
        }
        
        const latestRow = latestMonth.data[latestMonth.data.length - 1];
        // TWSE 數據欄位：日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數
        
        const close = parseFloat(latestRow[6].replace(/,/g, ''));
        const change = parseFloat(latestRow[7].replace(/,/g, '')) || 0;
        let changePercent = 0;
        
        // 計算漲跌幅
        if (latestMonth.data.length > 1) {
          const prevRow = latestMonth.data[latestMonth.data.length - 2];
          const prevClose = parseFloat(prevRow[6].replace(/,/g, ''));
          if (prevClose > 0) {
            changePercent = ((close - prevClose) / prevClose) * 100;
          }
        }
        
        const result = {
          symbol,
          date: parseTWSEDateToString(latestRow[0]),
          open: parseFloat(latestRow[3].replace(/,/g, '')),
          high: parseFloat(latestRow[4].replace(/,/g, '')),
          low: parseFloat(latestRow[5].replace(/,/g, '')),
          close,
          volume: parseInt(latestRow[1].replace(/,/g, '')),
          change,
          changePercent,
        };

        // 寫入快取 (5 分鐘)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.setStockDataCache({
          cacheKey,
          market: 'TW',
          symbol,
          dataType: 'latest',
          data: JSON.stringify(result),
          expiresAt,
        });

        return {
          success: true,
          data: result,
          fromCache: false,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('[twStock.getLatestPrice] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '獲取最新價格失敗',
        });
      }
    }),

  /**
   * 批次獲取最新價格 (即時呼叫 TWSE API)
   */
  getBatchLatestPrices: publicProcedure
    .input(
      z.object({
        symbols: z.array(z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤')).min(1).max(20),
      })
    )
    .query(async ({ input }) => {
      const { symbols } = input;

      try {
        const results = await Promise.allSettled(
          symbols.map(async (symbol) => {
            // 檢查快取
            const cacheKey = `tw_latest:${symbol}`;
            const cachedData = await db.getStockDataCache(cacheKey);
            
            if (cachedData) {
              return JSON.parse(cachedData.data);
            }

            // 呼叫 TWSE API
            const stockNo = convertSymbolToTWSE(symbol);
            const twseData = await getTWSEStockHistory(stockNo, 1);
            
            if (!twseData || twseData.length === 0 || !twseData[0].data || twseData[0].data.length === 0) {
              return null;
            }

            const latestMonth = twseData[0];
            const latestRow = latestMonth.data[latestMonth.data.length - 1];
            
            const close = parseFloat(latestRow[6].replace(/,/g, ''));
            const change = parseFloat(latestRow[7].replace(/,/g, '')) || 0;
            let changePercent = 0;
            
            if (latestMonth.data.length > 1) {
              const prevRow = latestMonth.data[latestMonth.data.length - 2];
              const prevClose = parseFloat(prevRow[6].replace(/,/g, ''));
              if (prevClose > 0) {
                changePercent = ((close - prevClose) / prevClose) * 100;
              }
            }
            
            const result = {
              symbol,
              date: parseTWSEDateToString(latestRow[0]),
              open: parseFloat(latestRow[3].replace(/,/g, '')),
              high: parseFloat(latestRow[4].replace(/,/g, '')),
              low: parseFloat(latestRow[5].replace(/,/g, '')),
              close,
              volume: parseInt(latestRow[1].replace(/,/g, '')),
              change,
              changePercent,
            };

            // 寫入快取
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            await db.setStockDataCache({
              cacheKey,
              market: 'TW',
              symbol,
              dataType: 'latest',
              data: JSON.stringify(result),
              expiresAt,
            });

            return result;
          })
        );

        const prices = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value);

        return {
          success: true,
          data: prices,
          count: prices.length,
        };
      } catch (error) {
        console.error('[twStock.getBatchLatestPrices] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '批次獲取最新價格失敗',
        });
      }
    }),

  /**
   * 獲取同步狀態
   */
  getSyncStatus: publicProcedure.query(async () => {
    try {
      const statuses = await db.getAllTwDataSyncStatus();

      return {
        success: true,
        data: statuses.map(status => ({
          ...status,
          lastSyncAt: status.lastSyncAt ? formatDate(status.lastSyncAt) : null,
        })),
        count: statuses.length,
      };
    } catch (error) {
      console.error('[twStock.getSyncStatus] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '獲取同步狀態失敗',
      });
    }
  }),

  /**
   * 手動觸發同步（需要管理員權限）
   * 注意: 僅支援股票基本資料同步，價格資料改為即時 API 呼叫
   */
  triggerSync: protectedProcedure
    .input(
      z.object({
        type: z.enum(['stocks']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 檢查是否為管理員
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '需要管理員權限',
        });
      }

      const { type } = input;

      try {
        let result;

        switch (type) {
          case 'stocks':
            result = await syncStockInfo();
            break;

          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '不支援的同步類型',
            });
        }

        return {
          success: result.success,
          recordCount: result.recordCount,
          errorCount: result.errorCount,
          errors: result.errors.slice(0, 10),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('[twStock.triggerSync] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '觸發同步失敗',
        });
      }
    }),

  /**
   * 獲取最近 N 天的價格 (即時呼叫 TWSE API)
   */
  getRecentPrices: publicProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤'),
        days: z.number().int().positive().max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const { symbol, days } = input;

      try {
        // 計算需要的月份數
        const months = Math.ceil(days / 30);
        
        // 檢查快取
        const cacheKey = `tw_recent:${symbol}:${days}d`;
        const cachedData = await db.getStockDataCache(cacheKey);
        
        if (cachedData) {
          return {
            success: true,
            data: JSON.parse(cachedData.data),
            fromCache: true,
            cachedAt: cachedData.createdAt,
          };
        }

        // 呼叫 TWSE API
        const stockNo = convertSymbolToTWSE(symbol);
        const twseData = await getTWSEStockHistory(stockNo, months);
        
        if (!twseData || twseData.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該股票的價格資料',
          });
        }

        // 合併所有月份的數據
        const allData: string[][] = [];
        for (const monthData of twseData) {
          if (monthData.data) {
            for (const row of monthData.data) {
              allData.push(row);
            }
          }
        }
        
        // 取最近 N 天
        const recentRows = allData.slice(-days);
        const recentData = recentRows.map((row, index) => {
          const close = parseFloat(row[6].replace(/,/g, ''));
          const change = parseFloat(row[7].replace(/,/g, '')) || 0;
          let changePercent = 0;
          
          if (index > 0) {
            const prevClose = parseFloat(recentRows[index - 1][6].replace(/,/g, ''));
            if (prevClose > 0) {
              changePercent = ((close - prevClose) / prevClose) * 100;
            }
          }
          
          return {
            symbol,
            date: parseTWSEDateToString(row[0]),
            open: parseFloat(row[3].replace(/,/g, '')),
            high: parseFloat(row[4].replace(/,/g, '')),
            low: parseFloat(row[5].replace(/,/g, '')),
            close,
            volume: parseInt(row[1].replace(/,/g, '')),
            change,
            changePercent,
          };
        });

        // 寫入快取 (5 分鐘)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.setStockDataCache({
          cacheKey,
          market: 'TW',
          symbol,
          dataType: 'recent',
          data: JSON.stringify(recentData),
          expiresAt,
        });

        return {
          success: true,
          data: recentData,
          count: recentData.length,
          fromCache: false,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('[twStock.getRecentPrices] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '獲取最近價格失敗',
        });
      }
    }),

  /**
   * 獲取所有活躍股票清單
   */
  getActiveStocks: publicProcedure
    .input(
      z.object({
        market: z.enum(['TWSE', 'TPEx']).optional(),
        industry: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { market, industry } = input;

      try {
        let stocks;

        if (market) {
          stocks = await db.getTwStocksByMarket(market);
        } else if (industry) {
          stocks = await db.getTwStocksByIndustry(industry);
        } else {
          stocks = await db.getActiveTwStocks();
        }

        return {
          success: true,
          data: stocks.map(stock => ({
            ...stock,
            listedDate: stock.listedDate ? formatDate(stock.listedDate) : null,
          })),
          count: stocks.length,
        };
      } catch (error) {
        console.error('[twStock.getActiveStocks] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '獲取股票清單失敗',
        });
      }
    }),

  /**
   * 獲取統計資訊
   */
  getStatistics: publicProcedure.query(async () => {
    try {
      const totalStocks = await db.countTwStocks();
      const activeStocks = await db.countActiveTwStocks();

      return {
        success: true,
        data: {
          totalStocks,
          activeStocks,
          // 價格記錄數已移除，改為即時 API 呼叫
          priceRecords: 0,
        },
      };
    } catch (error) {
      console.error('[twStock.getStatistics] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '獲取統計資訊失敗',
      });
    }
  }),
});

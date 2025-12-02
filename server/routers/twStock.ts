/**
 * 台股 tRPC API 路由模組
 * 
 * 提供台股基本資料、歷史價格查詢與資料同步功能
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import {
  syncStockInfo,
  syncStockPrices,
  syncStockPricesRange,
  getPreviousTradingDay,
} from '../jobs/syncTwStockData';
import { centsToYuan, basisPointsToPercent, formatDate } from '../integrations/dataTransformer';

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
   * 獲取歷史價格
   */
  getHistorical: publicProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤'),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)'),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)'),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const { symbol, startDate, endDate, limit } = input;

      try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '起始日期不可晚於結束日期',
          });
        }

        const prices = await db.getTwStockPrices(symbol, start, end, limit);

        return {
          success: true,
          data: prices.map(price => ({
            symbol: price.symbol,
            date: formatDate(price.date),
            open: centsToYuan(price.open),
            high: centsToYuan(price.high),
            low: centsToYuan(price.low),
            close: centsToYuan(price.close),
            volume: price.volume,
            amount: price.amount,
            change: centsToYuan(price.change),
            changePercent: basisPointsToPercent(price.changePercent),
          })),
          count: prices.length,
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
   * 獲取最新價格
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
        const price = await db.getLatestTwStockPrice(symbol);

        if (!price) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該股票的價格資料',
          });
        }

        return {
          success: true,
          data: {
            symbol: price.symbol,
            date: formatDate(price.date),
            open: centsToYuan(price.open),
            high: centsToYuan(price.high),
            low: centsToYuan(price.low),
            close: centsToYuan(price.close),
            volume: price.volume,
            amount: price.amount,
            change: centsToYuan(price.change),
            changePercent: basisPointsToPercent(price.changePercent),
          },
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
   * 批次獲取最新價格
   */
  getBatchLatestPrices: publicProcedure
    .input(
      z.object({
        symbols: z.array(z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤')).min(1).max(100),
      })
    )
    .query(async ({ input }) => {
      const { symbols } = input;

      try {
        const prices = await db.getBatchLatestTwStockPrices(symbols);

        return {
          success: true,
          data: prices.map(price => ({
            symbol: price.symbol,
            date: formatDate(price.date),
            open: centsToYuan(price.open),
            high: centsToYuan(price.high),
            low: centsToYuan(price.low),
            close: centsToYuan(price.close),
            volume: price.volume,
            amount: price.amount,
            change: centsToYuan(price.change),
            changePercent: basisPointsToPercent(price.changePercent),
          })),
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
   */
  triggerSync: protectedProcedure
    .input(
      z.object({
        type: z.enum(['stocks', 'prices', 'pricesRange']),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)').optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)').optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式錯誤 (YYYY-MM-DD)').optional(),
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

      const { type, date, startDate, endDate } = input;

      try {
        let result;

        switch (type) {
          case 'stocks':
            result = await syncStockInfo();
            break;

          case 'prices':
            const targetDate = date ? new Date(date) : getPreviousTradingDay(new Date());
            result = await syncStockPrices(targetDate);
            break;

          case 'pricesRange':
            if (!startDate || !endDate) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: '日期範圍同步需要提供起始日期與結束日期',
              });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: '起始日期不可晚於結束日期',
              });
            }

            result = await syncStockPricesRange(start, end);
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
          errors: result.errors.slice(0, 10), // 只回傳前 10 個錯誤
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
   * 獲取最近 N 天的價格
   */
  getRecentPrices: publicProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^\d{4,6}$/, '股票代號格式錯誤'),
        days: z.number().int().positive().max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      const { symbol, days } = input;

      try {
        const prices = await db.getRecentTwStockPrices(symbol, days);

        return {
          success: true,
          data: prices.map(price => ({
            symbol: price.symbol,
            date: formatDate(price.date),
            open: centsToYuan(price.open),
            high: centsToYuan(price.high),
            low: centsToYuan(price.low),
            close: centsToYuan(price.close),
            volume: price.volume,
            amount: price.amount,
            change: centsToYuan(price.change),
            changePercent: basisPointsToPercent(price.changePercent),
          })),
          count: prices.length,
        };
      } catch (error) {
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
      const priceRecords = await db.countTwStockPriceRecords();

      return {
        success: true,
        data: {
          totalStocks,
          activeStocks,
          priceRecords,
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

/**
 * 美股定期資料同步主程式 (S&P 500 + 主要 ETF)
 * 
 * 提供 S&P 500 成分股與主要 ETF 的自動化同步功能
 * 支援排程執行與手動觸發
 * 
 * 同步策略:
 * - S&P 500 成分股 + 32 支主要 ETF → 定期批次同步
 * - 其餘股票 → 維持即時查詢 + 快取策略
 */

import cron from 'node-cron';
import {
  getTwelveDataQuote,
  getTwelveDataTimeSeries,
} from '../integrations/twelvedata';
import {
  formatDate,
} from '../integrations/dataTransformer';
import {
  batchUpsertUsStocks,
  batchUpsertUsStockPrices,
  getActiveUsStocks,
  insertUsDataSyncStatus,
  insertUsDataSyncError,
  batchInsertUsDataSyncErrors,
} from '../db_us';
import { notifyOwner } from '../_core/notification';
import {
  SCHEDULED_SYNC_STOCKS,
  getScheduledSyncStockCount,
  getMajorETFCount,
  getSP500StockCount,
} from '../config/usStockLists';
import type { InsertUsStock, InsertUsStockPrice } from '../../drizzle/schema';

/**
 * 同步結果統計
 */
interface SyncResult {
  success: boolean;
  recordCount: number;
  errorCount: number;
  errors: Array<{ symbol?: string; message: string }>;
}

/**
 * 判斷是否為美股交易日
 * 
 * @param date 日期 (UTC)
 * @returns 是否為交易日
 */
export function isUsMarketTradingDay(date: Date): boolean {
  // 轉換為美東時間 (UTC-5 或 UTC-4)
  const usDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // 排除週末
  const dayOfWeek = usDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 排除美國國定假日 (簡化版)
  const holidays = getUsHolidayList(usDate.getFullYear());
  const dateStr = formatDate(usDate);
  if (holidays.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 取得美國國定假日清單
 * 
 * @param year 年份
 * @returns 假日清單 (YYYY-MM-DD 格式)
 */
function getUsHolidayList(year: number): string[] {
  // 美國股市休市日清單 (需定期更新)
  const holidays: Record<number, string[]> = {
    2024: [
      '2024-01-01', // New Year's Day
      '2024-01-15', // Martin Luther King Jr. Day
      '2024-02-19', // Presidents' Day
      '2024-03-29', // Good Friday
      '2024-05-27', // Memorial Day
      '2024-06-19', // Juneteenth
      '2024-07-04', // Independence Day
      '2024-09-02', // Labor Day
      '2024-11-28', // Thanksgiving Day
      '2024-12-25', // Christmas Day
    ],
    2025: [
      '2025-01-01', // New Year's Day
      '2025-01-20', // Martin Luther King Jr. Day
      '2025-02-17', // Presidents' Day
      '2025-04-18', // Good Friday
      '2025-05-26', // Memorial Day
      '2025-06-19', // Juneteenth
      '2025-07-04', // Independence Day
      '2025-09-01', // Labor Day
      '2025-11-27', // Thanksgiving Day
      '2025-12-25', // Christmas Day
    ],
  };

  return holidays[year] || [];
}

/**
 * 取得前一交易日 (美東時間)
 * 
 * @param date 基準日期 (UTC)
 * @returns 前一交易日 (UTC)
 */
export function getPreviousUsMarketTradingDay(date: Date): Date {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);

  // 轉換為美東時間判斷
  const usDate = new Date(previous.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // 如果是週六，往前推到週五
  if (usDate.getDay() === 6) {
    previous.setDate(previous.getDate() - 1);
  }
  // 如果是週日，往前推到週五
  if (usDate.getDay() === 0) {
    previous.setDate(previous.getDate() - 2);
  }

  // 檢查是否為國定假日，如果是則繼續往前推
  while (!isUsMarketTradingDay(previous)) {
    previous.setDate(previous.getDate() - 1);
  }

  return previous;
}

/**
 * 同步股票基本資料 (S&P 500 + 主要 ETF)
 * 
 * @returns 同步結果
 */
export async function syncScheduledStockInfo(): Promise<SyncResult> {
  console.log('[SyncJob] Starting scheduled US stock info sync...');
  console.log(`[SyncJob] Total stocks to sync: ${getScheduledSyncStockCount()}`);
  console.log(`[SyncJob] - S&P 500: ${getSP500StockCount()} stocks`);
  console.log(`[SyncJob] - Major ETFs: ${getMajorETFCount()} ETFs`);

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  const stocks: InsertUsStock[] = [];
  const errors: Array<{ symbol: string; message: string }> = [];

  try {
    // 批次獲取股票資料
    for (const symbol of SCHEDULED_SYNC_STOCKS) {
      try {
        // 呼叫 TwelveData API 獲取即時報價 (包含基本資料)
        const quote = await getTwelveDataQuote(symbol);

        // 轉換為資料庫格式
        const stock: InsertUsStock = {
          symbol: quote.symbol,
          name: quote.name || quote.symbol,
          shortName: quote.name || quote.symbol,
          exchange: quote.exchange || 'UNKNOWN',
          currency: quote.currency || 'USD',
          country: 'United States',
          sector: null,
          industry: null,
          isActive: true,
        };

        stocks.push(stock);

        // API 限流控制:每次請求間隔 8 秒 (免費版限制: 8 requests/minute)
        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (error) {
        errors.push({
          symbol,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`[SyncJob] Failed to fetch ${symbol}:`, error);
      }
    }

    // 批次寫入資料庫
    if (stocks.length > 0) {
      await batchUpsertUsStocks(stocks);
    }

    result.success = errors.length === 0;
    result.recordCount = stocks.length;
    result.errorCount = errors.length;
    result.errors = errors;

    console.log(
      `[SyncJob] Stock info sync completed: ${stocks.length} stocks, ${errors.length} errors`
    );

    // 記錄同步狀態
    await insertUsDataSyncStatus({
      dataType: 'stocks',
      source: 'twelvedata',
      lastSyncAt: new Date(),
      status: errors.length === 0 ? 'success' : errors.length < SCHEDULED_SYNC_STOCKS.length ? 'partial' : 'failed',
      recordCount: stocks.length,
      errorMessage: errors.length > 0 ? `${errors.length} stocks failed` : null,
    });

    // 記錄錯誤詳情
    if (errors.length > 0) {
      await batchInsertUsDataSyncErrors(
        errors.map(e => ({
          dataType: 'stocks',
          symbol: e.symbol,
          errorType: 'API',
          errorMessage: e.message,
          errorStack: null,
          retryCount: 0,
          resolved: false,
          syncedAt: new Date(),
        }))
      );
    }
  } catch (error) {
    result.success = false;
    result.errorCount = 1;
    result.errors.push({
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[SyncJob] Stock info sync failed:', error);

    // 記錄錯誤
    await insertUsDataSyncStatus({
      dataType: 'stocks',
      source: 'twelvedata',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    await insertUsDataSyncError({
      dataType: 'stocks',
      symbol: null,
      errorType: 'API',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack || null : null,
      retryCount: 0,
      resolved: false,
      syncedAt: new Date(),
    });
  }

  return result;
}

/**
 * 同步歷史價格資料 (最近 30 天)
 * 
 * @returns 同步結果
 */
export async function syncScheduledStockPrices(): Promise<SyncResult> {
  console.log('[SyncJob] Starting scheduled US stock price sync (last 30 days)...');

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  const allPrices: InsertUsStockPrice[] = [];
  const errors: Array<{ symbol: string; message: string }> = [];

  try {
    // 批次獲取價格資料
    for (const symbol of SCHEDULED_SYNC_STOCKS) {
      try {
        // 呼叫 TwelveData API 獲取最近 30 天的歷史數據
        const timeSeries = await getTwelveDataTimeSeries(symbol, '1day', 30);

        if (!timeSeries.values || timeSeries.values.length === 0) {
          console.warn(`[SyncJob] No price data for ${symbol}`);
          continue;
        }

        // 轉換為資料庫格式
        const prices: InsertUsStockPrice[] = timeSeries.values.map(item => {
          const open = Math.round(parseFloat(item.open) * 100);
          const high = Math.round(parseFloat(item.high) * 100);
          const low = Math.round(parseFloat(item.low) * 100);
          const close = Math.round(parseFloat(item.close) * 100);
          const volume = parseInt(item.volume, 10);

          // 計算漲跌
          const previousClose = timeSeries.values[timeSeries.values.indexOf(item) + 1]
            ? Math.round(parseFloat(timeSeries.values[timeSeries.values.indexOf(item) + 1].close) * 100)
            : close;
          const change = close - previousClose;
          const changePercent = previousClose > 0 
            ? Math.round((change / previousClose) * 10000) 
            : 0;

          return {
            symbol,
            date: new Date(item.datetime),
            open,
            high,
            low,
            close,
            volume,
            change,
            changePercent,
          };
        });

        allPrices.push(...prices);

        // API 限流控制:每次請求間隔 8 秒
        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (error) {
        errors.push({
          symbol,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`[SyncJob] Failed to fetch prices for ${symbol}:`, error);
      }
    }

    // 批次寫入資料庫
    if (allPrices.length > 0) {
      await batchUpsertUsStockPrices(allPrices);
    }

    result.success = errors.length === 0;
    result.recordCount = allPrices.length;
    result.errorCount = errors.length;
    result.errors = errors;

    console.log(
      `[SyncJob] Stock price sync completed: ${allPrices.length} records, ${errors.length} errors`
    );

    // 記錄同步狀態
    await insertUsDataSyncStatus({
      dataType: 'prices',
      source: 'twelvedata',
      lastSyncAt: new Date(),
      status: errors.length === 0 ? 'success' : errors.length < SCHEDULED_SYNC_STOCKS.length ? 'partial' : 'failed',
      recordCount: allPrices.length,
      errorMessage: errors.length > 0 ? `${errors.length} stocks failed` : null,
    });

    // 記錄錯誤詳情
    if (errors.length > 0) {
      await batchInsertUsDataSyncErrors(
        errors.map(e => ({
          dataType: 'prices',
          symbol: e.symbol,
          errorType: 'API',
          errorMessage: e.message,
          errorStack: null,
          retryCount: 0,
          resolved: false,
          syncedAt: new Date(),
        }))
      );
    }
  } catch (error) {
    result.success = false;
    result.errorCount = 1;
    result.errors.push({
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[SyncJob] Stock price sync failed:', error);

    // 記錄錯誤
    await insertUsDataSyncStatus({
      dataType: 'prices',
      source: 'twelvedata',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    await insertUsDataSyncError({
      dataType: 'prices',
      symbol: null,
      errorType: 'API',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack || null : null,
      retryCount: 0,
      resolved: false,
      syncedAt: new Date(),
    });
  }

  return result;
}

/**
 * 設定股票基本資料同步排程
 * 每週日凌晨 06:00 (台北時間) 執行
 */
export function scheduleStockInfoSync() {
  cron.schedule(
    '0 6 * * 0',
    async () => {
      console.log('[Scheduler] Starting scheduled US stock info sync...');

      try {
        const result = await syncScheduledStockInfo();

        if (!result.success) {
          await notifyOwner({
            title: '美股基本資料同步失敗',
            content: `同步範圍: S&P 500 (${getSP500StockCount()}) + 主要 ETF (${getMajorETFCount()})\n成功: ${result.recordCount} 筆\n失敗: ${result.errorCount} 筆\n錯誤訊息: ${result.errors.slice(0, 5).map(e => `${e.symbol || 'System'}: ${e.message}`).join('\n')}`,
          });
        }
      } catch (error) {
        console.error('[Scheduler] Stock info sync failed:', error);
        await notifyOwner({
          title: '美股基本資料同步失敗',
          content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    },
    {
      timezone: 'Asia/Taipei',
    }
  );

  console.log('[Scheduler] US stock info sync scheduled: Every Sunday 06:00 (Taipei Time)');
}

/**
 * 設定歷史價格同步排程
 * 每交易日凌晨 06:00 (台北時間) 執行
 */
export function scheduleStockPriceSync() {
  cron.schedule(
    '0 6 * * 1-5',
    async () => {
      console.log('[Scheduler] Starting scheduled US stock price sync...');

      // 檢查前一交易日是否為交易日
      const today = new Date();
      const previousTradingDay = getPreviousUsMarketTradingDay(today);

      if (!isUsMarketTradingDay(previousTradingDay)) {
        console.log('[Scheduler] Previous day was not a US trading day, skipping price sync');
        return;
      }

      try {
        const result = await syncScheduledStockPrices();

        if (!result.success) {
          await notifyOwner({
            title: '美股價格資料同步失敗',
            content: `同步範圍: S&P 500 (${getSP500StockCount()}) + 主要 ETF (${getMajorETFCount()})\n同步天數: 最近 30 天\n成功: ${result.recordCount} 筆\n失敗: ${result.errorCount} 筆`,
          });
        } else if (result.errorCount > 0) {
          // 部分成功，也發送通知
          await notifyOwner({
            title: '美股價格資料同步部分失敗',
            content: `同步範圍: S&P 500 (${getSP500StockCount()}) + 主要 ETF (${getMajorETFCount()})\n成功: ${result.recordCount} 筆\n失敗: ${result.errorCount} 筆`,
          });
        }
      } catch (error) {
        console.error('[Scheduler] Stock price sync failed:', error);
        await notifyOwner({
          title: '美股價格資料同步失敗',
          content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    },
    {
      timezone: 'Asia/Taipei',
    }
  );

  console.log('[Scheduler] US stock price sync scheduled: Every trading day 06:00 (Taipei Time)');
}

/**
 * 啟動所有美股排程
 */
export function startUsScheduledSyncs() {
  scheduleStockInfoSync();
  scheduleStockPriceSync();
  console.log('[Scheduler] All US scheduled syncs started (S&P 500 + Major ETFs)');
}

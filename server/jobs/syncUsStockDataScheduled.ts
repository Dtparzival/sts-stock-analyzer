/**
 * 美股定期同步排程
 * 
 * 針對重要股票 (S&P 500 + 主要 ETF) 實施定期批次同步
 * 
 * 同步範圍:
 * - S&P 500 成分股 (~220 支)
 * - 主要 ETF (32 支)
 * 
 * 排程設定:
 * - 基本資料:每週日凌晨 06:00 (台北時間)
 * - 歷史價格:每交易日凌晨 06:00 (台北時間)
 * - 資料範圍:最近 30 天
 */

import cron from 'node-cron';
import {
  getTwelveDataQuote,
  getTwelveDataTimeSeries,
} from '../integrations/twelvedata';
import {
  SCHEDULED_SYNC_STOCKS,
  getScheduledSyncStockCount,
} from '../config/usStockLists';
import {
  upsertUsStock,
  batchUpsertUsStockPrices,
  insertUsDataSyncStatus,
  insertUsDataSyncError,
} from '../db_us';
import { notifyOwner } from '../_core/notification';

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
 * 美國國定假日清單
 * 
 * 資料來源:https://www.nyse.com/markets/hours-calendars
 */
function getUsHolidayList(year: number): string[] {
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
      '2024-11-28', // Thanksgiving
      '2024-12-25', // Christmas
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
      '2025-11-27', // Thanksgiving
      '2025-12-25', // Christmas
    ],
  };

  return holidays[year] || [];
}

/**
 * 判斷是否為美股交易日
 * 
 * @param date 日期
 * @returns 是否為交易日
 */
export function isUsMarketTradingDay(date: Date): boolean {
  // 排除週末
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 排除美國國定假日
  const holidays = getUsHolidayList(date.getFullYear());
  const dateStr = date.toISOString().split('T')[0];
  if (holidays.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 取得前一美股交易日
 * 
 * @param date 基準日期
 * @returns 前一交易日
 */
export function getPreviousUsMarketTradingDay(date: Date): Date {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);

  // 如果是週六，往前推到週五
  if (previous.getDay() === 6) {
    previous.setDate(previous.getDate() - 1);
  }
  // 如果是週日，往前推到週五
  if (previous.getDay() === 0) {
    previous.setDate(previous.getDate() - 2);
  }

  // 檢查是否為國定假日，如果是則繼續往前推
  while (!isUsMarketTradingDay(previous)) {
    previous.setDate(previous.getDate() - 1);
  }

  return previous;
}

/**
 * 同步股票基本資料
 * 
 * @returns 同步結果
 */
export async function syncScheduledStockInfo(): Promise<SyncResult> {
  console.log('[US Scheduled Sync] Starting stock info sync...');
  console.log(`[US Scheduled Sync] Total stocks to sync: ${SCHEDULED_SYNC_STOCKS.length}`);

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  const successCount = 0;
  const errors: Array<{ symbol: string; message: string }> = [];

  try {
    // 遍歷所有需要定期同步的股票
    for (let i = 0; i < SCHEDULED_SYNC_STOCKS.length; i++) {
      const symbol = SCHEDULED_SYNC_STOCKS[i];

      try {
        console.log(`[US Scheduled Sync] Syncing ${symbol} (${i + 1}/${SCHEDULED_SYNC_STOCKS.length})...`);

        // 獲取股票報價資料
        const quote = await getTwelveDataQuote(symbol);

        // 寫入資料庫
        await upsertUsStock({
          symbol: quote.symbol,
          name: quote.name,
          exchange: quote.exchange,
          currency: quote.currency,
          type: quote.type,
          country: 'US',
          isActive: true,
        });

        result.recordCount++;

        // API 限流控制:每次請求間隔 8 秒
        if (i < SCHEDULED_SYNC_STOCKS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
      } catch (error) {
        result.errorCount++;
        errors.push({
          symbol,
          message: error instanceof Error ? error.message : 'Unknown error',
        });

        console.error(`[US Scheduled Sync] Failed to sync ${symbol}:`, error);

        // 記錄錯誤
        await insertUsDataSyncError({
          dataType: 'stocks',
          symbol,
          errorType: 'API_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack || null : null,
          retryCount: 0,
          resolved: false,
          syncedAt: new Date(),
        });
      }
    }

    result.success = errors.length === 0;
    result.errors = errors;

    console.log(
      `[US Scheduled Sync] Stock info sync completed: ${result.recordCount} stocks, ${errors.length} errors`
    );

    // 記錄同步狀態
    await insertUsDataSyncStatus({
      dataType: 'stocks',
      source: 'twelvedata_scheduled',
      lastSyncAt: new Date(),
      status: errors.length === 0 ? 'success' : errors.length < SCHEDULED_SYNC_STOCKS.length ? 'partial' : 'failed',
      recordCount: result.recordCount,
      errorMessage: errors.length > 0 ? `${errors.length} stocks failed` : null,
    });

    // 如果有錯誤,發送通知
    if (errors.length > 0) {
      await notifyOwner({
        title: '美股定期同步 - 股票資料同步部分失敗',
        content: `成功: ${result.recordCount} 筆\n失敗: ${errors.length} 筆\n\n失敗股票:\n${errors.map(e => `- ${e.symbol}: ${e.message}`).join('\n')}`,
      });
    }
  } catch (error) {
    result.success = false;
    result.errors.push({
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[US Scheduled Sync] Stock info sync failed:', error);

    // 記錄錯誤
    await insertUsDataSyncStatus({
      dataType: 'stocks',
      source: 'twelvedata_scheduled',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: result.recordCount,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    // 發送通知
    await notifyOwner({
      title: '美股定期同步 - 股票資料同步失敗',
      content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * 同步歷史價格資料
 * 
 * @param days 同步最近幾天的資料 (預設 30 天)
 * @returns 同步結果
 */
export async function syncScheduledStockPrices(days: number = 30): Promise<SyncResult> {
  console.log(`[US Scheduled Sync] Starting stock price sync (last ${days} days)...`);
  console.log(`[US Scheduled Sync] Total stocks to sync: ${SCHEDULED_SYNC_STOCKS.length}`);

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  const errors: Array<{ symbol: string; message: string }> = [];

  try {
    // 遍歷所有需要定期同步的股票
    for (let i = 0; i < SCHEDULED_SYNC_STOCKS.length; i++) {
      const symbol = SCHEDULED_SYNC_STOCKS[i];

      try {
        console.log(`[US Scheduled Sync] Syncing prices for ${symbol} (${i + 1}/${SCHEDULED_SYNC_STOCKS.length})...`);

        // 獲取歷史價格資料
        const timeSeries = await getTwelveDataTimeSeries(symbol, '1day', days);

        if (timeSeries.values.length === 0) {
          console.warn(`[US Scheduled Sync] No price data for ${symbol}`);
          continue;
        }

        // 轉換為資料庫格式
        const prices = timeSeries.values.map(v => ({
          symbol,
          date: new Date(v.datetime),
          openPrice: v.open,
          highPrice: v.high,
          lowPrice: v.low,
          closePrice: v.close,
          volume: v.volume,
        }));

        // 批次寫入資料庫
        await batchUpsertUsStockPrices(prices);

        result.recordCount += prices.length;

        console.log(`[US Scheduled Sync] Synced ${prices.length} price records for ${symbol}`);

        // API 限流控制:每次請求間隔 8 秒
        if (i < SCHEDULED_SYNC_STOCKS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
      } catch (error) {
        result.errorCount++;
        errors.push({
          symbol,
          message: error instanceof Error ? error.message : 'Unknown error',
        });

        console.error(`[US Scheduled Sync] Failed to sync prices for ${symbol}:`, error);

        // 記錄錯誤
        await insertUsDataSyncError({
          dataType: 'prices',
          symbol,
          errorType: 'API_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack || null : null,
          retryCount: 0,
          resolved: false,
          syncedAt: new Date(),
        });
      }
    }

    result.success = errors.length === 0;
    result.errors = errors;

    console.log(
      `[US Scheduled Sync] Stock price sync completed: ${result.recordCount} records, ${errors.length} errors`
    );

    // 記錄同步狀態
    await insertUsDataSyncStatus({
      dataType: 'prices',
      source: 'twelvedata_scheduled',
      lastSyncAt: new Date(),
      status: errors.length === 0 ? 'success' : errors.length < SCHEDULED_SYNC_STOCKS.length ? 'partial' : 'failed',
      recordCount: result.recordCount,
      errorMessage: errors.length > 0 ? `${errors.length} stocks failed` : null,
    });

    // 如果有錯誤,發送通知
    if (errors.length > 0) {
      await notifyOwner({
        title: '美股定期同步 - 價格資料同步部分失敗',
        content: `成功: ${result.recordCount} 筆\n失敗: ${errors.length} 筆\n\n失敗股票:\n${errors.map(e => `- ${e.symbol}: ${e.message}`).join('\n')}`,
      });
    }
  } catch (error) {
    result.success = false;
    result.errors.push({
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[US Scheduled Sync] Stock price sync failed:', error);

    // 記錄錯誤
    await insertUsDataSyncStatus({
      dataType: 'prices',
      source: 'twelvedata_scheduled',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: result.recordCount,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    // 發送通知
    await notifyOwner({
      title: '美股定期同步 - 價格資料同步失敗',
      content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * 設定股票基本資料同步排程
 * 每週日凌晨 06:00 執行
 */
export function scheduleStockInfoSync() {
  // Cron 表達式: 0 0 6 * * 0 (每週日 06:00)
  cron.schedule('0 0 6 * * 0', async () => {
    console.log('[US Scheduled Sync] Stock info sync triggered by schedule');
    await syncScheduledStockInfo();
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log('[Scheduler] US stock info sync scheduled: Every Sunday 06:00 (Taipei Time)');
}

/**
 * 設定歷史價格同步排程
 * 每交易日凌晨 06:00 執行
 */
export function scheduleStockPriceSync() {
  // Cron 表達式: 0 0 6 * * 1-5 (週一到週五 06:00)
  cron.schedule('0 0 6 * * 1-5', async () => {
    const today = new Date();

    // 檢查是否為交易日
    if (!isUsMarketTradingDay(today)) {
      console.log('[US Scheduled Sync] Today is not a US market trading day, skipping price sync');
      return;
    }

    console.log('[US Scheduled Sync] Stock price sync triggered by schedule');
    await syncScheduledStockPrices(30); // 同步最近 30 天
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log('[Scheduler] US stock price sync scheduled: Every trading day 06:00 (Taipei Time)');
}

/**
 * 啟動所有美股定期同步排程
 */
export function startUsScheduledSyncs() {
  scheduleStockInfoSync();
  scheduleStockPriceSync();
  console.log(`[Scheduler] All US scheduled syncs started (S&P 500 + Major ETFs, ${getScheduledSyncStockCount()} stocks)`);
}

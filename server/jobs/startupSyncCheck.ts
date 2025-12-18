/**
 * 啟動時同步檢查模組
 * 
 * 解決 Manus sandbox 環境休眠導致排程無法執行的問題
 * 在伺服器啟動時檢查是否有錯過的同步任務，並自動補執行
 * 
 * 策略：
 * - 啟動時只同步優先股票清單（約 50 支），確保能在合理時間內完成
 * - 定期排程同步完整清單（約 500 支）
 */

import { getDb } from '../db';
import { twDataSyncStatus } from '../../drizzle/schema';
import { usDataSyncStatus } from '../../drizzle/schema';
import { desc, eq, and } from 'drizzle-orm';
import { syncStockInfo as syncTwStockInfo, syncStockPrices as syncTwStockPrices, getPreviousTradingDay, isTradingDay } from './syncTwStockData';
import { notifyOwner } from '../_core/notification';
import { PRIORITY_US_STOCKS } from '../config/usPriorityStocks';
import { getTwelveDataQuote, getTwelveDataTimeSeries, convertPriceToCents, calculateChangePercent } from '../integrations/twelvedata';
import { upsertUsStock, batchUpsertUsStockPrices, insertUsDataSyncStatus, insertUsDataSyncError } from '../db_us';

/**
 * 同步閾值設定 (毫秒)
 */
const SYNC_THRESHOLDS = {
  // 台股基本資料：超過 8 天未同步則補執行 (每週日同步)
  TW_STOCK_INFO: 8 * 24 * 60 * 60 * 1000,
  // 台股價格：超過 2 天未同步則補執行 (每交易日同步)
  TW_STOCK_PRICES: 2 * 24 * 60 * 60 * 1000,
  // 美股基本資料：超過 8 天未同步則補執行 (每週日同步)
  US_STOCK_INFO: 8 * 24 * 60 * 60 * 1000,
  // 美股價格：超過 2 天未同步則補執行 (每交易日同步)
  US_STOCK_PRICES: 2 * 24 * 60 * 60 * 1000,
};

/**
 * 取得台股最後同步時間
 */
async function getTwLastSyncTime(dataType: 'stocks' | 'prices'): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select({ lastSyncAt: twDataSyncStatus.lastSyncAt })
      .from(twDataSyncStatus)
      .where(
        and(
          eq(twDataSyncStatus.dataType, dataType),
          eq(twDataSyncStatus.status, 'success')
        )
      )
      .orderBy(desc(twDataSyncStatus.lastSyncAt))
      .limit(1);

    return result.length > 0 ? result[0].lastSyncAt : null;
  } catch (error) {
    console.error(`[StartupSync] Failed to get TW ${dataType} last sync time:`, error);
    return null;
  }
}

/**
 * 取得美股最後同步時間
 */
async function getUsLastSyncTime(dataType: 'stocks' | 'prices'): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select({ lastSyncAt: usDataSyncStatus.lastSyncAt })
      .from(usDataSyncStatus)
      .where(
        and(
          eq(usDataSyncStatus.dataType, dataType),
          eq(usDataSyncStatus.status, 'success')
        )
      )
      .orderBy(desc(usDataSyncStatus.lastSyncAt))
      .limit(1);

    return result.length > 0 ? result[0].lastSyncAt : null;
  } catch (error) {
    console.error(`[StartupSync] Failed to get US ${dataType} last sync time:`, error);
    return null;
  }
}

/**
 * 快速同步優先美股基本資料
 * 只同步最重要的股票，確保能在合理時間內完成
 */
async function syncPriorityUsStockInfo(): Promise<void> {
  console.log(`[StartupSync] Starting priority US stock info sync (${PRIORITY_US_STOCKS.length} stocks)...`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ symbol: string; message: string }> = [];

  for (let i = 0; i < PRIORITY_US_STOCKS.length; i++) {
    const symbol = PRIORITY_US_STOCKS[i];

    try {
      console.log(`[StartupSync] Syncing ${symbol} (${i + 1}/${PRIORITY_US_STOCKS.length})...`);

      const quote = await getTwelveDataQuote(symbol);

      await upsertUsStock({
        symbol: quote.symbol,
        name: quote.name,
        exchange: quote.exchange,
        currency: quote.currency,
        type: 'Common Stock',
        country: 'US',
        isActive: true,
      });

      successCount++;

      // 簡短延遲以避免 API 過載
      if (i < PRIORITY_US_STOCKS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      errorCount++;
      errors.push({
        symbol,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error(`[StartupSync] Failed to sync ${symbol}:`, error);

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

  // 記錄同步狀態
  await insertUsDataSyncStatus({
    dataType: 'stocks',
    source: 'twelvedata',
    lastSyncAt: new Date(),
    status: errorCount === 0 ? 'success' : errorCount < PRIORITY_US_STOCKS.length ? 'partial' : 'failed',
    recordCount: successCount,
    errorMessage: errorCount > 0 ? `${errorCount} stocks failed` : null,
  });

  console.log(`[StartupSync] Priority US stock info sync completed: ${successCount} success, ${errorCount} errors`);

  if (errorCount > 0) {
    await notifyOwner({
      title: '啟動時美股基本資料同步部分失敗',
      content: `成功: ${successCount} 筆\n失敗: ${errorCount} 筆\n\n失敗股票:\n${errors.slice(0, 10).map(e => `- ${e.symbol}: ${e.message}`).join('\n')}`,
    });
  }
}

/**
 * 快速同步優先美股價格資料
 * 只同步最重要的股票，確保能在合理時間內完成
 */
async function syncPriorityUsStockPrices(days: number = 30): Promise<void> {
  console.log(`[StartupSync] Starting priority US stock prices sync (${PRIORITY_US_STOCKS.length} stocks, last ${days} days)...`);
  
  let totalRecords = 0;
  let errorCount = 0;
  const errors: Array<{ symbol: string; message: string }> = [];

  for (let i = 0; i < PRIORITY_US_STOCKS.length; i++) {
    const symbol = PRIORITY_US_STOCKS[i];

    try {
      console.log(`[StartupSync] Syncing prices for ${symbol} (${i + 1}/${PRIORITY_US_STOCKS.length})...`);

      const timeSeries = await getTwelveDataTimeSeries(symbol, '1day', days);

      if (timeSeries.values && timeSeries.values.length > 0) {
        const prices = timeSeries.values.map(v => {
          const openCents = convertPriceToCents(v.open);
          const highCents = convertPriceToCents(v.high);
          const lowCents = convertPriceToCents(v.low);
          const closeCents = convertPriceToCents(v.close);
          
          return {
            symbol,
            date: v.datetime, // 使用字串格式 YYYY-MM-DD
            open: openCents,
            high: highCents,
            low: lowCents,
            close: closeCents,
            volume: parseInt(v.volume, 10) || 0,
            change: 0, // API 未提供，設為 0
            changePercent: 0, // API 未提供，設為 0
          };
        });

        await batchUpsertUsStockPrices(prices);
        totalRecords += prices.length;

        console.log(`[StartupSync] Synced ${prices.length} price records for ${symbol}`);
      } else {
        console.warn(`[StartupSync] No price data for ${symbol}`);
      }

      // 簡短延遲以避免 API 過載
      if (i < PRIORITY_US_STOCKS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      errorCount++;
      errors.push({
        symbol,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error(`[StartupSync] Failed to sync prices for ${symbol}:`, error);

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

  // 記錄同步狀態
  await insertUsDataSyncStatus({
    dataType: 'prices',
    source: 'twelvedata',
    lastSyncAt: new Date(),
    status: errorCount === 0 ? 'success' : errorCount < PRIORITY_US_STOCKS.length ? 'partial' : 'failed',
    recordCount: totalRecords,
    errorMessage: errorCount > 0 ? `${errorCount} stocks failed` : null,
  });

  console.log(`[StartupSync] Priority US stock prices sync completed: ${totalRecords} records, ${errorCount} errors`);

  if (errorCount > 0) {
    await notifyOwner({
      title: '啟動時美股價格資料同步部分失敗',
      content: `總記錄數: ${totalRecords}\n失敗股票數: ${errorCount}\n\n失敗股票:\n${errors.slice(0, 10).map(e => `- ${e.symbol}: ${e.message}`).join('\n')}`,
    });
  }
}

/**
 * 檢查並執行台股同步
 */
async function checkAndSyncTwStocks(): Promise<void> {
  const now = new Date();
  
  // 檢查台股基本資料
  const twStockInfoLastSync = await getTwLastSyncTime('stocks');
  if (twStockInfoLastSync) {
    const timeSinceLastSync = now.getTime() - twStockInfoLastSync.getTime();
    if (timeSinceLastSync > SYNC_THRESHOLDS.TW_STOCK_INFO) {
      console.log(`[StartupSync] TW stock info last synced ${Math.round(timeSinceLastSync / (24 * 60 * 60 * 1000))} days ago, triggering sync...`);
      try {
        await syncTwStockInfo();
        console.log('[StartupSync] TW stock info sync completed');
      } catch (error) {
        console.error('[StartupSync] TW stock info sync failed:', error);
        await notifyOwner({
          title: '啟動時台股基本資料同步失敗',
          content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    } else {
      console.log(`[StartupSync] TW stock info is up to date (last sync: ${twStockInfoLastSync.toISOString()})`);
    }
  } else {
    console.log('[StartupSync] No TW stock info sync record found, skipping...');
  }

  // 檢查台股價格資料
  const twPricesLastSync = await getTwLastSyncTime('prices');
  if (twPricesLastSync) {
    const timeSinceLastSync = now.getTime() - twPricesLastSync.getTime();
    if (timeSinceLastSync > SYNC_THRESHOLDS.TW_STOCK_PRICES) {
      // 取得前一交易日
      const previousTradingDay = getPreviousTradingDay(now);
      if (isTradingDay(previousTradingDay)) {
        console.log(`[StartupSync] TW stock prices last synced ${Math.round(timeSinceLastSync / (24 * 60 * 60 * 1000))} days ago, triggering sync...`);
        try {
          await syncTwStockPrices(previousTradingDay);
          console.log('[StartupSync] TW stock prices sync completed');
        } catch (error) {
          console.error('[StartupSync] TW stock prices sync failed:', error);
          await notifyOwner({
            title: '啟動時台股價格資料同步失敗',
            content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }
    } else {
      console.log(`[StartupSync] TW stock prices are up to date (last sync: ${twPricesLastSync.toISOString()})`);
    }
  } else {
    console.log('[StartupSync] No TW stock prices sync record found, skipping...');
  }
}

/**
 * 檢查並執行美股同步（使用優先股票清單）
 */
async function checkAndSyncUsStocks(): Promise<void> {
  const now = new Date();
  
  // 檢查美股基本資料
  const usStockInfoLastSync = await getUsLastSyncTime('stocks');
  if (usStockInfoLastSync) {
    const timeSinceLastSync = now.getTime() - usStockInfoLastSync.getTime();
    if (timeSinceLastSync > SYNC_THRESHOLDS.US_STOCK_INFO) {
      console.log(`[StartupSync] US stock info last synced ${Math.round(timeSinceLastSync / (24 * 60 * 60 * 1000))} days ago, triggering priority sync...`);
      try {
        await syncPriorityUsStockInfo();
        console.log('[StartupSync] US stock info sync completed');
      } catch (error) {
        console.error('[StartupSync] US stock info sync failed:', error);
        await notifyOwner({
          title: '啟動時美股基本資料同步失敗',
          content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    } else {
      console.log(`[StartupSync] US stock info is up to date (last sync: ${usStockInfoLastSync.toISOString()})`);
    }
  } else {
    console.log('[StartupSync] No US stock info sync record found, skipping...');
  }

  // 檢查美股價格資料
  const usPricesLastSync = await getUsLastSyncTime('prices');
  if (usPricesLastSync) {
    const timeSinceLastSync = now.getTime() - usPricesLastSync.getTime();
    if (timeSinceLastSync > SYNC_THRESHOLDS.US_STOCK_PRICES) {
      console.log(`[StartupSync] US stock prices last synced ${Math.round(timeSinceLastSync / (24 * 60 * 60 * 1000))} days ago, triggering priority sync...`);
      try {
        await syncPriorityUsStockPrices(30);
        console.log('[StartupSync] US stock prices sync completed');
      } catch (error) {
        console.error('[StartupSync] US stock prices sync failed:', error);
        await notifyOwner({
          title: '啟動時美股價格資料同步失敗',
          content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    } else {
      console.log(`[StartupSync] US stock prices are up to date (last sync: ${usPricesLastSync.toISOString()})`);
    }
  } else {
    console.log('[StartupSync] No US stock prices sync record found, skipping...');
  }
}

/**
 * 執行啟動時同步檢查
 * 
 * 在伺服器啟動後延遲執行，避免影響啟動速度
 */
export async function runStartupSyncCheck(): Promise<void> {
  console.log('[StartupSync] Starting sync check...');
  console.log('[StartupSync] This check ensures data is up-to-date after sandbox hibernation');
  console.log(`[StartupSync] Priority US stocks count: ${PRIORITY_US_STOCKS.length}`);

  try {
    // 先檢查台股
    await checkAndSyncTwStocks();
    
    // 再檢查美股（使用優先股票清單）
    await checkAndSyncUsStocks();
    
    console.log('[StartupSync] Sync check completed');
  } catch (error) {
    console.error('[StartupSync] Sync check failed:', error);
  }
}

/**
 * 延遲執行啟動時同步檢查
 * 
 * @param delayMs 延遲時間 (毫秒)，預設 30 秒
 */
export function scheduleStartupSyncCheck(delayMs: number = 30000): void {
  console.log(`[StartupSync] Scheduling sync check in ${delayMs / 1000} seconds...`);
  
  setTimeout(async () => {
    await runStartupSyncCheck();
  }, delayMs);
}

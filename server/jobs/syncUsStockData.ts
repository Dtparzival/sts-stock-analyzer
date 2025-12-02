/**
 * 美股資料同步主程式
 * 
 * 提供美股股票基本資料與歷史價格的自動化同步功能
 * 支援排程執行與手動觸發
 * 
 * 與台股同步的主要差異：
 * - 使用 TwelveData API 而非 FinMind
 * - 美股交易日判斷邏輯不同（美國假日）
 * - 採用快取機制減少 API 呼叫
 */

import cron from 'node-cron';
import {
  getTwelveDataQuote,
  getTwelveDataTimeSeries,
  TwelveDataError,
} from '../integrations/twelvedata';
import {
  upsertUsStock,
  getUsStockBySymbol,
  batchUpsertUsStockPrices,
  getActiveUsStocks,
  insertUsDataSyncStatus,
  insertUsDataSyncError,
  batchInsertUsDataSyncErrors,
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
 * 美國股市假日清單（2024-2025）
 * 資料來源: NYSE 官方假日表
 */
const US_MARKET_HOLIDAYS: Record<number, string[]> = {
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

/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 判斷是否為美股交易日
 * 
 * @param date 日期
 * @returns 是否為交易日
 */
export function isUsTradingDay(date: Date): boolean {
  // 排除週末
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 排除美國假日
  const holidays = US_MARKET_HOLIDAYS[date.getFullYear()] || [];
  const dateStr = formatDate(date);
  if (holidays.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 取得前一交易日
 * 
 * @param date 基準日期
 * @returns 前一交易日
 */
export function getPreviousUsTradingDay(date: Date): Date {
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

  // 檢查是否為美國假日，如果是則繼續往前推
  while (!isUsTradingDay(previous)) {
    previous.setDate(previous.getDate() - 1);
  }

  return previous;
}

/**
 * 同步單一股票的基本資料
 * 
 * @param symbol 股票代碼
 * @returns 是否成功
 */
export async function syncSingleStockInfo(symbol: string): Promise<boolean> {
  try {
    // 從 TwelveData API 獲取即時報價（包含基本資料）
    const quote = await getTwelveDataQuote(symbol);

    // 檢查股票是否已存在
    const existingStock = await getUsStockBySymbol(symbol);

    const stockData = {
      symbol: quote.symbol,
      name: quote.name,
      exchange: quote.exchange,
      currency: quote.currency,
      type: quote.type || 'Common Stock',
      isActive: true,
    };

    // 使用 upsert 同時處理新增與更新
    await upsertUsStock(stockData);

    return true;
  } catch (error) {
    console.error(`[SyncJob] Failed to sync stock info for ${symbol}:`, error);
    return false;
  }
}

/**
 * 同步多支股票的基本資料
 * 
 * @param symbols 股票代碼陣列
 * @returns 同步結果
 */
export async function syncStockInfoBatch(symbols: string[]): Promise<SyncResult> {
  console.log(`[SyncJob] Starting batch stock info sync for ${symbols.length} symbols...`);

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  for (const symbol of symbols) {
    try {
      const success = await syncSingleStockInfo(symbol);
      if (success) {
        result.recordCount++;
      } else {
        result.errorCount++;
        result.errors.push({ symbol, message: 'Sync failed' });
      }

      // 避免 API 限流，每次請求間隔 1 秒
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      result.errorCount++;
      result.errors.push({
        symbol,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  result.success = result.errorCount === 0;

  console.log(
    `[SyncJob] Batch stock info sync completed: ${result.recordCount} success, ${result.errorCount} errors`
  );

  // 記錄同步狀態
  await insertUsDataSyncStatus({
    dataType: 'stocks',
    source: 'twelvedata',
    lastSyncAt: new Date(),
    status: result.success ? 'success' : result.errorCount < symbols.length ? 'partial' : 'failed',
    recordCount: result.recordCount,
    errorMessage: result.errors.length > 0 ? `${result.errorCount} stocks failed` : null,
  });

  // 記錄錯誤詳情
  if (result.errors.length > 0) {
    await batchInsertUsDataSyncErrors(
      result.errors.map(e => ({
        dataType: 'stocks',
        symbol: e.symbol || null,
        errorType: 'API',
        errorMessage: e.message,
        errorStack: null,
        retryCount: 0,
        resolved: false,
        syncedAt: new Date(),
      }))
    );
  }

  return result;
}

/**
 * 同步單一股票的歷史價格資料
 * 
 * @param symbol 股票代碼
 * @param startDate 起始日期
 * @param endDate 結束日期
 * @returns 是否成功
 */
export async function syncSingleStockPrices(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; recordCount: number }> {
  try {
    // 從 TwelveData API 獲取歷史價格
    const timeSeries = await getTwelveDataTimeSeries(
      symbol,
      '1day',
      formatDate(startDate),
      formatDate(endDate)
    );

    if (!timeSeries.values || timeSeries.values.length === 0) {
      console.warn(`[SyncJob] No price data for ${symbol}`);
      return { success: true, recordCount: 0 };
    }

    // 轉換資料格式
    const prices = timeSeries.values.map(v => ({
      symbol,
      date: new Date(v.datetime),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume, 10),
    }));

    // 批次寫入資料庫
    await batchUpsertUsStockPrices(prices);

    return { success: true, recordCount: prices.length };
  } catch (error) {
    console.error(`[SyncJob] Failed to sync prices for ${symbol}:`, error);
    return { success: false, recordCount: 0 };
  }
}

/**
 * 同步多支股票的歷史價格資料
 * 
 * @param symbols 股票代碼陣列
 * @param startDate 起始日期
 * @param endDate 結束日期
 * @returns 同步結果
 */
export async function syncStockPricesBatch(
  symbols: string[],
  startDate: Date,
  endDate: Date
): Promise<SyncResult> {
  console.log(
    `[SyncJob] Starting batch price sync for ${symbols.length} symbols from ${formatDate(startDate)} to ${formatDate(endDate)}...`
  );

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  for (const symbol of symbols) {
    try {
      const { success, recordCount } = await syncSingleStockPrices(symbol, startDate, endDate);

      if (success) {
        result.recordCount += recordCount;
      } else {
        result.errorCount++;
        result.errors.push({ symbol, message: 'Sync failed' });
      }

      // 避免 API 限流，每次請求間隔 1 秒
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      result.errorCount++;
      result.errors.push({
        symbol,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  result.success = result.errorCount === 0;

  console.log(
    `[SyncJob] Batch price sync completed: ${result.recordCount} records, ${result.errorCount} errors`
  );

  // 記錄同步狀態
  await insertUsDataSyncStatus({
    dataType: 'prices',
    source: 'twelvedata',
    lastSyncAt: new Date(),
    status: result.success ? 'success' : result.errorCount < symbols.length ? 'partial' : 'failed',
    recordCount: result.recordCount,
    errorMessage: result.errors.length > 0 ? `${result.errorCount} stocks failed` : null,
  });

  // 記錄錯誤詳情
  if (result.errors.length > 0) {
    await batchInsertUsDataSyncErrors(
      result.errors.map(e => ({
        dataType: 'prices',
        symbol: e.symbol || null,
        errorType: 'API',
        errorMessage: e.message,
        errorStack: null,
        retryCount: 0,
        resolved: false,
        syncedAt: new Date(),
      }))
    );
  }

  return result;
}

/**
 * 每日同步任務：同步前一交易日的價格資料
 */
export async function dailySyncTask(): Promise<void> {
  console.log('[SyncJob] Starting daily US stock sync task...');

  try {
    // 計算前一交易日
    const today = new Date();
    const previousTradingDay = getPreviousUsTradingDay(today);

    // 檢查是否為交易日
    if (!isUsTradingDay(previousTradingDay)) {
      console.log('[SyncJob] Previous day was not a trading day, skipping sync');
      return;
    }

    // 獲取所有活躍股票
    const stocks = await getActiveUsStocks();

    if (stocks.length === 0) {
      console.warn('[SyncJob] No stocks found in database');
      return;
    }

    const symbols = stocks.map(s => s.symbol);

    // 同步價格資料
    const result = await syncStockPricesBatch(symbols, previousTradingDay, previousTradingDay);

    // 發送通知
    if (!result.success) {
      await notifyOwner({
        title: '美股價格資料同步失敗',
        content: `日期: ${formatDate(previousTradingDay)}\n錯誤數量: ${result.errorCount}\n錯誤訊息: ${result.errors.slice(0, 5).map(e => `${e.symbol || 'System'}: ${e.message}`).join('\n')}`,
      });
    } else if (result.errorCount > 0) {
      await notifyOwner({
        title: '美股價格資料同步部分失敗',
        content: `日期: ${formatDate(previousTradingDay)}\n成功: ${result.recordCount} 筆\n失敗: ${result.errorCount} 筆`,
      });
    }
  } catch (error) {
    console.error('[SyncJob] Daily sync task failed:', error);
    await notifyOwner({
      title: '美股每日同步任務失敗',
      content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * 設定美股每日同步排程
 * 每交易日美東時間 18:00 (台北時間隔日 06:00) 執行
 * 確保美股收盤後資料已更新
 */
export function scheduleUsDailySync() {
  cron.schedule(
    '0 6 * * 2-6', // 週二到週六早上 6:00 (對應美東週一到週五收盤後)
    async () => {
      console.log('[Scheduler] Starting scheduled US stock daily sync...');
      await dailySyncTask();
    },
    {
      timezone: 'Asia/Taipei',
    }
  );

  console.log('[Scheduler] US stock daily sync scheduled: Every trading day 06:00 (Taiwan time)');
}

/**
 * 啟動所有美股同步排程
 */
export function startUsStockSchedules() {
  scheduleUsDailySync();
  console.log('[Scheduler] US stock schedules started');
}

/**
 * 台股資料同步主程式
 * 
 * 提供股票基本資料與歷史價格的自動化同步功能
 * 支援排程執行與手動觸發
 */

import cron from 'node-cron';
import {
  fetchAllStockInfo,
  fetchStockPrice,
  fetchBatchStockPrices,
  FinMindError,
} from '../integrations/finmind';
import {
  transformStockInfoBatch,
  transformStockPriceBatch,
  formatDate,
} from '../integrations/dataTransformer';
import {
  batchUpsertTwStocks,
  batchUpsertTwStockPrices,
  getActiveTwStocks,
  insertTwDataSyncStatus,
  insertTwDataSyncError,
  batchInsertTwDataSyncErrors,
} from '../db';
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
 * 判斷是否為交易日
 * 
 * @param date 日期
 * @returns 是否為交易日
 */
export function isTradingDay(date: Date): boolean {
  // 排除週末
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 排除國定假日（簡化版，實際應整合政府開放資料 API）
  const holidays = getHolidayList(date.getFullYear());
  const dateStr = formatDate(date);
  if (holidays.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 取得國定假日清單
 * 
 * @param year 年份
 * @returns 假日清單 (YYYY-MM-DD 格式)
 */
function getHolidayList(year: number): string[] {
  // 台灣國定假日清單（需定期更新）
  // 建議未來整合政府開放資料 API
  const holidays: Record<number, string[]> = {
    2024: [
      '2024-01-01', // 元旦
      '2024-02-08', // 農曆春節前一日
      '2024-02-09', // 農曆除夕
      '2024-02-10', // 農曆春節
      '2024-02-11', // 農曆春節
      '2024-02-12', // 農曆春節
      '2024-02-13', // 農曆春節
      '2024-02-14', // 農曆春節
      '2024-02-28', // 和平紀念日
      '2024-04-04', // 兒童節
      '2024-04-05', // 清明節
      '2024-06-10', // 端午節
      '2024-09-17', // 中秋節
      '2024-10-10', // 國慶日
    ],
    2025: [
      '2025-01-01', // 元旦
      '2025-01-27', // 農曆春節前一日
      '2025-01-28', // 農曆除夕
      '2025-01-29', // 農曆春節
      '2025-01-30', // 農曆春節
      '2025-01-31', // 農曆春節
      '2025-02-28', // 和平紀念日
      '2025-04-03', // 兒童節補假
      '2025-04-04', // 兒童節
      '2025-04-05', // 清明節
      '2025-05-31', // 端午節
      '2025-10-06', // 中秋節
      '2025-10-10', // 國慶日
    ],
  };

  return holidays[year] || [];
}

/**
 * 取得前一交易日
 * 
 * @param date 基準日期
 * @returns 前一交易日
 */
export function getPreviousTradingDay(date: Date): Date {
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
  while (!isTradingDay(previous)) {
    previous.setDate(previous.getDate() - 1);
  }

  return previous;
}

/**
 * 同步股票基本資料
 * 
 * @returns 同步結果
 */
export async function syncStockInfo(): Promise<SyncResult> {
  console.log('[SyncJob] Starting stock info sync...');

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  try {
    // 1. 從 FinMind API 獲取所有股票資料
    const apiData = await fetchAllStockInfo();

    if (apiData.length === 0) {
      throw new Error('No stock data received from FinMind API');
    }

    // 2. 轉換資料格式
    const stocks = transformStockInfoBatch(apiData);

    if (stocks.length === 0) {
      throw new Error('All stock data failed validation');
    }

    // 3. 批次寫入資料庫
    await batchUpsertTwStocks(stocks);

    result.success = true;
    result.recordCount = stocks.length;

    console.log(`[SyncJob] Stock info sync completed: ${stocks.length} stocks`);

    // 4. 記錄同步狀態
    await insertTwDataSyncStatus({
      dataType: 'stocks',
      source: 'finmind',
      lastSyncAt: new Date(),
      status: 'success',
      recordCount: stocks.length,
      errorMessage: null,
    });
  } catch (error) {
    result.success = false;
    result.errorCount = 1;
    result.errors.push({
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[SyncJob] Stock info sync failed:', error);

    // 記錄錯誤
    await insertTwDataSyncStatus({
      dataType: 'stocks',
      source: 'finmind',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    await insertTwDataSyncError({
      dataType: 'stocks',
      symbol: null,
      errorType: error instanceof FinMindError ? error.type : 'Unknown',
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
 * 同步歷史價格資料（單一日期）
 * 
 * @param date 目標日期
 * @returns 同步結果
 */
export async function syncStockPrices(date: Date): Promise<SyncResult> {
  console.log(`[SyncJob] Starting stock price sync for ${formatDate(date)}...`);

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  try {
    // 1. 獲取所有活躍股票
    const stocks = await getActiveTwStocks();

    if (stocks.length === 0) {
      throw new Error('No active stocks found in database');
    }

    console.log(`[SyncJob] Syncing prices for ${stocks.length} stocks...`);

    const symbols = stocks.map(s => s.symbol);
    const dateStr = formatDate(date);

    // 2. 批次獲取價格資料
    const priceMap = await fetchBatchStockPrices(
      symbols,
      dateStr,
      dateStr,
      5 // 並行請求數
    );

    // 3. 轉換並寫入資料庫
    const allPrices: any[] = [];
    const errors: Array<{ symbol: string; message: string }> = [];

    for (const [symbol, apiPrices] of priceMap.entries()) {
      try {
        if (apiPrices.length === 0) {
          // 可能該日期無交易資料（休市）
          continue;
        }

        const prices = transformStockPriceBatch(apiPrices);
        allPrices.push(...prices);
      } catch (error) {
        errors.push({
          symbol,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 4. 批次寫入資料庫
    if (allPrices.length > 0) {
      await batchUpsertTwStockPrices(allPrices);
    }

    result.success = errors.length === 0;
    result.recordCount = allPrices.length;
    result.errorCount = errors.length;
    result.errors = errors;

    console.log(
      `[SyncJob] Stock price sync completed: ${allPrices.length} records, ${errors.length} errors`
    );

    // 5. 記錄同步狀態
    await insertTwDataSyncStatus({
      dataType: 'prices',
      source: 'finmind',
      lastSyncAt: new Date(),
      status: errors.length === 0 ? 'success' : errors.length < symbols.length ? 'partial' : 'failed',
      recordCount: allPrices.length,
      errorMessage: errors.length > 0 ? `${errors.length} stocks failed` : null,
    });

    // 6. 記錄錯誤詳情
    if (errors.length > 0) {
      await batchInsertTwDataSyncErrors(
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
    await insertTwDataSyncStatus({
      dataType: 'prices',
      source: 'finmind',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    await insertTwDataSyncError({
      dataType: 'prices',
      symbol: null,
      errorType: error instanceof FinMindError ? error.type : 'Unknown',
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
 * 同步歷史價格資料（日期範圍）
 * 
 * @param startDate 起始日期
 * @param endDate 結束日期
 * @returns 同步結果
 */
export async function syncStockPricesRange(
  startDate: Date,
  endDate: Date
): Promise<SyncResult> {
  console.log(
    `[SyncJob] Starting stock price range sync from ${formatDate(startDate)} to ${formatDate(endDate)}...`
  );

  const result: SyncResult = {
    success: true,
    recordCount: 0,
    errorCount: 0,
    errors: [],
  };

  // 逐日同步
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // 僅同步交易日
    if (isTradingDay(currentDate)) {
      const dayResult = await syncStockPrices(new Date(currentDate));

      result.recordCount += dayResult.recordCount;
      result.errorCount += dayResult.errorCount;
      result.errors.push(...dayResult.errors);

      if (!dayResult.success) {
        result.success = false;
      }

      // 每日之間稍微延遲，避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(
    `[SyncJob] Stock price range sync completed: ${result.recordCount} records, ${result.errorCount} errors`
  );

  return result;
}

/**
 * 設定股票基本資料同步排程
 * 每週日凌晨 02:00 執行
 */
export function scheduleStockInfoSync() {
  cron.schedule(
    '0 2 * * 0',
    async () => {
      console.log('[Scheduler] Starting scheduled stock info sync...');

      try {
        const result = await syncStockInfo();

        if (!result.success) {
          await notifyOwner({
            title: '台股基本資料同步失敗',
            content: `錯誤訊息: ${result.errors.map(e => e.message).join(', ')}`,
          });
        }
      } catch (error) {
        console.error('[Scheduler] Stock info sync failed:', error);
        await notifyOwner({
          title: '台股基本資料同步失敗',
          content: `錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    },
    {
      timezone: 'Asia/Taipei',
    }
  );

  console.log('[Scheduler] Stock info sync scheduled: Every Sunday 02:00');
}

/**
 * 設定歷史價格同步排程
 * 每交易日凌晨 02:00 執行（T+1 模式）
 */
export function scheduleStockPriceSync() {
  cron.schedule(
    '0 2 * * 1-5',
    async () => {
      console.log('[Scheduler] Starting scheduled stock price sync (T+1 mode)...');

      // 計算前一交易日日期
      const today = new Date();
      const previousTradingDay = getPreviousTradingDay(today);

      // 檢查前一交易日是否為交易日
      if (!isTradingDay(previousTradingDay)) {
        console.log('[Scheduler] Previous day was not a trading day, skipping price sync');
        return;
      }

      try {
        const result = await syncStockPrices(previousTradingDay);

        if (!result.success) {
          await notifyOwner({
            title: '台股價格資料同步失敗',
            content: `日期: ${formatDate(previousTradingDay)}\n錯誤數量: ${result.errorCount}\n錯誤訊息: ${result.errors.slice(0, 5).map(e => `${e.symbol || 'System'}: ${e.message}`).join('\n')}`,
          });
        } else if (result.errorCount > 0) {
          // 部分成功，也發送通知
          await notifyOwner({
            title: '台股價格資料同步部分失敗',
            content: `日期: ${formatDate(previousTradingDay)}\n成功: ${result.recordCount} 筆\n失敗: ${result.errorCount} 筆`,
          });
        }
      } catch (error) {
        console.error('[Scheduler] Stock price sync failed:', error);
        await notifyOwner({
          title: '台股價格資料同步失敗',
          content: `日期: ${formatDate(previousTradingDay)}\n錯誤訊息: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    },
    {
      timezone: 'Asia/Taipei',
    }
  );

  console.log('[Scheduler] Stock price sync scheduled: Every trading day 02:00 (T+1 mode)');
}

/**
 * 啟動所有排程
 */
export function startAllSchedules() {
  scheduleStockInfoSync();
  scheduleStockPriceSync();
  console.log('[Scheduler] All schedules started (v3.0 - Off-peak hours)');
}

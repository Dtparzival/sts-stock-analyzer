/**
 * 台股資料同步主程式 v5.0
 * 
 * 使用 TWSE/TPEx 官方 OpenAPI 同步股票基本資料
 * 支援排程執行與手動觸發
 * 
 * API 來源:
 * - TWSE: https://openapi.twse.com.tw/v1
 * - TPEx: https://www.tpex.org.tw/openapi/v1
 * 
 * 注意: 歷史價格資料已改為即時 API 呼叫，不再儲存於資料庫
 */

import cron from 'node-cron';
import {
  fetchAllTwStockInfo,
  UnifiedStockInfo,
} from '../integrations/twseOfficial';
import {
  batchUpsertTwStocks,
  insertTwDataSyncStatus,
  insertTwDataSyncError,
} from '../db';
import { notifyOwner } from '../_core/notification';

/**
 * 同步結果統計
 */
interface SyncResult {
  success: boolean;
  recordCount: number;
  errorCount: number;
  twseStocks: number;
  twseEtfs: number;
  tpexStocks: number;
  tpexEtfs: number;
  errors: Array<{ symbol?: string; message: string }>;
}

/**
 * 格式化日期為 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
 * 轉換 UnifiedStockInfo 為資料庫格式
 */
function transformToDbFormat(stock: UnifiedStockInfo) {
  return {
    symbol: stock.symbol,
    name: stock.name,
    shortName: stock.shortName,
    industry: stock.industry,
    market: stock.market,
    type: stock.type,
    listedDate: stock.listedDate ? new Date(stock.listedDate) : null,
    capital: stock.capital,
    isActive: stock.isActive,
  };
}

/**
 * 同步股票基本資料
 * 
 * 使用 TWSE/TPEx 官方 OpenAPI 獲取:
 * - 上市公司基本資料
 * - 上櫃公司基本資料
 * - ETF 資料 (從每日交易資料補充)
 * 
 * @returns 同步結果
 */
export async function syncStockInfo(): Promise<SyncResult> {
  console.log('[SyncJob] Starting stock info sync using TWSE/TPEx Official API...');

  const result: SyncResult = {
    success: false,
    recordCount: 0,
    errorCount: 0,
    twseStocks: 0,
    twseEtfs: 0,
    tpexStocks: 0,
    tpexEtfs: 0,
    errors: [],
  };

  try {
    // 1. 從 TWSE/TPEx 官方 API 獲取所有股票資料
    const { stocks, stats } = await fetchAllTwStockInfo();

    if (stocks.length === 0) {
      throw new Error('No stock data received from TWSE/TPEx Official API');
    }

    // 2. 轉換資料格式
    const dbStocks = stocks.map(transformToDbFormat);

    // 3. 批次寫入資料庫
    await batchUpsertTwStocks(dbStocks);

    result.success = true;
    result.recordCount = stocks.length;
    result.twseStocks = stats.twseStocks;
    result.twseEtfs = stats.twseEtfs;
    result.tpexStocks = stats.tpexStocks;
    result.tpexEtfs = stats.tpexEtfs;

    console.log(`[SyncJob] Stock info sync completed:`);
    console.log(`  - Total: ${stocks.length} stocks`);
    console.log(`  - TWSE: ${stats.twseStocks} stocks, ${stats.twseEtfs} ETFs`);
    console.log(`  - TPEx: ${stats.tpexStocks} stocks, ${stats.tpexEtfs} ETFs`);

    // 4. 記錄同步狀態
    await insertTwDataSyncStatus({
      dataType: 'stocks',
      source: 'twse_tpex_official',
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
      source: 'twse_tpex_official',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    await insertTwDataSyncError({
      dataType: 'stocks',
      symbol: null,
      errorType: 'API_ERROR',
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
 * 每週日凌晨 02:00 執行
 */
export function scheduleStockInfoSync() {
  cron.schedule(
    '0 2 * * 0',
    async () => {
      console.log('[Scheduler] Starting scheduled stock info sync...');

      try {
        const result = await syncStockInfo();

        if (result.success) {
          await notifyOwner({
            title: '台股基本資料同步完成',
            content: `同步成功!\n\n總計: ${result.recordCount} 檔\n- TWSE 上市: ${result.twseStocks} 股票, ${result.twseEtfs} ETF\n- TPEx 上櫃: ${result.tpexStocks} 股票, ${result.tpexEtfs} ETF`,
          });
        } else {
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
 * 啟動所有排程
 * 注意: 價格同步排程已移除，改為即時 API 呼叫
 */
export function startAllSchedules() {
  scheduleStockInfoSync();
  console.log('[Scheduler] All schedules started (v5.0 - TWSE/TPEx Official API, prices via real-time API)');
}

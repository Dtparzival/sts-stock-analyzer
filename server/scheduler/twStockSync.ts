/**
 * 台股資料定期同步排程任務
 * 使用 node-cron 建立定期更新排程
 */

import cron from 'node-cron';
import { getDb } from '../db';
import { twStocks, twStockPrices, twStockIndicators, twStockFundamentals, twDataSyncStatus } from '../../drizzle/schema';
import { fetchTwseStockList, fetchTwseHistoricalPrices } from '../integrations/twse';
import { fetchTpexStockList, fetchTpexHistoricalPrices } from '../integrations/tpex';
import { fetchFinancialStatement, fetchDividend } from '../integrations/finmind';
import { transformTwseStock, transformTpexStock, transformHistoricalPrice } from '../integrations/dataTransformer';
import { calculateAllIndicators, PriceData } from '../integrations/technicalIndicators';
import { eq, and } from 'drizzle-orm';

/**
 * 記錄同步狀態
 */
async function recordSyncStatus(
  dataType: string,
  source: 'TWSE' | 'TPEx' | 'FinMind',
  status: 'success' | 'failed' | 'in_progress',
  recordCount: number,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) {
    console.error('[Sync Status] 無法連接資料庫');
    return;
  }

  try {
    await db.insert(twDataSyncStatus).values({
      dataType,
      source,
      lastSyncAt: new Date(),
      status,
      recordCount,
      errorMessage: errorMessage || null,
    });
  } catch (error) {
    console.error('[Sync Status] 記錄同步狀態失敗:', error);
  }
}

/**
 * 同步台股基本資料（TWSE + TPEx）
 */
async function syncStockList() {
  console.log('[Stock Sync] 開始同步台股基本資料...');
  const db = await getDb();
  if (!db) {
    console.error('[Stock Sync] 無法連接資料庫');
    return;
  }

  try {
    // 同步 TWSE 上市股票
    await recordSyncStatus('stocks', 'TWSE', 'in_progress', 0);
    const twseStocks = await fetchTwseStockList();
    let twseCount = 0;

    for (const rawStock of twseStocks) {
      const stock = transformTwseStock(rawStock);
      await db.insert(twStocks).values(stock).onDuplicateKeyUpdate({
        set: {
          name: stock.name,
          shortName: stock.shortName,
          industry: stock.industry,
          updatedAt: new Date(),
        },
      });
      twseCount++;
    }

    await recordSyncStatus('stocks', 'TWSE', 'success', twseCount);
    console.log(`[Stock Sync] TWSE 同步完成，共 ${twseCount} 筆`);

    // 同步 TPEx 上櫃股票
    await recordSyncStatus('stocks', 'TPEx', 'in_progress', 0);
    const tpexStocks = await fetchTpexStockList();
    let tpexCount = 0;

    for (const rawStock of tpexStocks) {
      const stock = transformTpexStock(rawStock);
      await db.insert(twStocks).values(stock).onDuplicateKeyUpdate({
        set: {
          name: stock.name,
          shortName: stock.shortName,
          industry: stock.industry,
          updatedAt: new Date(),
        },
      });
      tpexCount++;
    }

    await recordSyncStatus('stocks', 'TPEx', 'success', tpexCount);
    console.log(`[Stock Sync] TPEx 同步完成，共 ${tpexCount} 筆`);
  } catch (error) {
    console.error('[Stock Sync] 同步失敗:', error);
    await recordSyncStatus('stocks', 'TWSE', 'failed', 0, (error as Error).message);
  }
}

/**
 * 同步台股歷史價格（增量更新）
 */
async function syncHistoricalPrices() {
  console.log('[Price Sync] 開始同步台股歷史價格...');
  const db = await getDb();
  if (!db) {
    console.error('[Price Sync] 無法連接資料庫');
    return;
  }

  try {
    // 取得所有活躍的台股
    const stocks = await db.select().from(twStocks).where(eq(twStocks.isActive, true));

    // 計算當前月份（格式：YYYYMM）
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalCount = 0;

    for (const stock of stocks) {
      try {
        // 根據市場類別選擇 API
        const rawPrices =
          stock.market === '上市'
            ? await fetchTwseHistoricalPrices(stock.symbol, dateStr)
            : await fetchTpexHistoricalPrices(stock.symbol, dateStr, dateStr);

        // 轉換並儲存價格資料
        for (const rawPrice of rawPrices) {
          const price = transformHistoricalPrice(rawPrice, stock.market === '上市' ? 'TWSE' : 'TPEx');
          await db.insert(twStockPrices).values({
            symbol: stock.symbol,
            ...price,
          }).onDuplicateKeyUpdate({
            set: {
              open: price.open,
              high: price.high,
              low: price.low,
              close: price.close,
              volume: price.volume,
              amount: price.amount,
              change: price.change,
              changePercent: price.changePercent,
            },
          });
          totalCount++;
        }
      } catch (error) {
        console.error(`[Price Sync] 同步股票 ${stock.symbol} 失敗:`, error);
      }
    }

    await recordSyncStatus('prices', 'TWSE', 'success', totalCount);
    console.log(`[Price Sync] 同步完成，共 ${totalCount} 筆`);
  } catch (error) {
    console.error('[Price Sync] 同步失敗:', error);
    await recordSyncStatus('prices', 'TWSE', 'failed', 0, (error as Error).message);
  }
}

/**
 * 同步台股技術指標
 */
async function syncTechnicalIndicators() {
  console.log('[Indicator Sync] 開始同步台股技術指標...');
  const db = await getDb();
  if (!db) {
    console.error('[Indicator Sync] 無法連接資料庫');
    return;
  }

  try {
    // 取得所有活躍的台股
    const stocks = await db.select().from(twStocks).where(eq(twStocks.isActive, true));

    let totalCount = 0;

    for (const stock of stocks) {
      try {
        // 取得最近 100 天的價格資料（足夠計算 MA60）
        const prices = await db
          .select()
          .from(twStockPrices)
          .where(eq(twStockPrices.symbol, stock.symbol))
          .orderBy(twStockPrices.date)
          .limit(100);

        if (prices.length < 60) {
          console.warn(`[Indicator Sync] 股票 ${stock.symbol} 價格資料不足，跳過`);
          continue;
        }

        // 轉換為技術指標計算所需的格式
        const priceData: PriceData[] = prices.map((p) => ({
          date: new Date(p.date),
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
        }));

        // 計算所有技術指標
        const indicators = calculateAllIndicators(priceData);

        // 儲存技術指標
        for (const indicator of indicators) {
          await db.insert(twStockIndicators).values({
            symbol: stock.symbol,
            date: indicator.date,
            ma5: indicator.ma5 || null,
            ma10: indicator.ma10 || null,
            ma20: indicator.ma20 || null,
            ma60: indicator.ma60 || null,
            rsi14: indicator.rsi14 || null,
            macd: indicator.macd || null,
            macdSignal: indicator.macdSignal || null,
            macdHistogram: indicator.macdHistogram || null,
            kValue: indicator.kValue || null,
            dValue: indicator.dValue || null,
          }).onDuplicateKeyUpdate({
            set: {
              ma5: indicator.ma5 || null,
              ma10: indicator.ma10 || null,
              ma20: indicator.ma20 || null,
              ma60: indicator.ma60 || null,
              rsi14: indicator.rsi14 || null,
              macd: indicator.macd || null,
              macdSignal: indicator.macdSignal || null,
              macdHistogram: indicator.macdHistogram || null,
              kValue: indicator.kValue || null,
              dValue: indicator.dValue || null,
              updatedAt: new Date(),
            },
          });
          totalCount++;
        }
      } catch (error) {
        console.error(`[Indicator Sync] 同步股票 ${stock.symbol} 技術指標失敗:`, error);
      }
    }

    await recordSyncStatus('indicators', 'TWSE', 'success', totalCount);
    console.log(`[Indicator Sync] 同步完成，共 ${totalCount} 筆`);
  } catch (error) {
    console.error('[Indicator Sync] 同步失敗:', error);
    await recordSyncStatus('indicators', 'TWSE', 'failed', 0, (error as Error).message);
  }
}

/**
 * 同步台股基本面資料（FinMind API）
 */
async function syncFundamentals() {
  console.log('[Fundamental Sync] 開始同步台股基本面資料...');
  const db = await getDb();
  if (!db) {
    console.error('[Fundamental Sync] 無法連接資料庫');
    return;
  }

  try {
    // 取得所有活躍的台股
    const stocks = await db.select().from(twStocks).where(eq(twStocks.isActive, true));

    // 計算查詢起始日期（最近一年）
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    let totalCount = 0;

    for (const stock of stocks) {
      try {
        // 取得財務報表資料
        const financialData = await fetchFinancialStatement(stock.symbol, startDateStr);

        // 取得股利資料
        const dividendData = await fetchDividend(stock.symbol, startDateStr);

        // 儲存基本面資料（這裡需要根據 FinMind API 的實際回傳格式進行轉換）
        // TODO: 實作資料轉換和儲存邏輯

        totalCount++;
      } catch (error) {
        console.error(`[Fundamental Sync] 同步股票 ${stock.symbol} 基本面資料失敗:`, error);
      }
    }

    await recordSyncStatus('fundamentals', 'FinMind', 'success', totalCount);
    console.log(`[Fundamental Sync] 同步完成，共 ${totalCount} 筆`);
  } catch (error) {
    console.error('[Fundamental Sync] 同步失敗:', error);
    await recordSyncStatus('fundamentals', 'FinMind', 'failed', 0, (error as Error).message);
  }
}

/**
 * 初始化定期排程任務
 */
export function initTwStockScheduler() {
  console.log('[Scheduler] 初始化台股資料同步排程...');

  // 每日收盤後更新歷史價格（14:30，台灣時間）
  // Cron 格式：秒 分 時 日 月 週
  cron.schedule('0 30 14 * * 1-5', async () => {
    console.log('[Scheduler] 執行每日歷史價格同步...');
    await syncHistoricalPrices();
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每日收盤後更新技術指標（15:00，台灣時間）
  cron.schedule('0 0 15 * * 1-5', async () => {
    console.log('[Scheduler] 執行每日技術指標同步...');
    await syncTechnicalIndicators();
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每週日凌晨更新基本面資料（00:00，台灣時間）
  cron.schedule('0 0 0 * * 0', async () => {
    console.log('[Scheduler] 執行每週基本面資料同步...');
    await syncFundamentals();
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每週一凌晨更新股票列表（00:00，台灣時間）
  cron.schedule('0 0 0 * * 1', async () => {
    console.log('[Scheduler] 執行每週股票列表同步...');
    await syncStockList();
  }, {
    timezone: 'Asia/Taipei',
  });

  console.log('[Scheduler] 台股資料同步排程已啟動');
}

/**
 * 手動觸發同步（用於測試或初始化）
 */
export async function manualSync(type: 'stocks' | 'prices' | 'indicators' | 'fundamentals') {
  switch (type) {
    case 'stocks':
      await syncStockList();
      break;
    case 'prices':
      await syncHistoricalPrices();
      break;
    case 'indicators':
      await syncTechnicalIndicators();
      break;
    case 'fundamentals':
      await syncFundamentals();
      break;
  }
}

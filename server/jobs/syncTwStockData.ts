import cron from 'node-cron';
import { notifyOwner } from '../_core/notification';
import { getDb } from '../db';
import { twStocks, twStockPrices, twDataSyncStatus, twDataSyncErrors } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchTwseStockList, fetchTwseHistoricalPrices } from '../integrations/twse';
import { fetchTpexStockList, fetchTpexHistoricalPrices } from '../integrations/tpex';
import { transformTwseStock, transformTpexStock, transformHistoricalPrice } from '../integrations/dataTransformer';

/**
 * 指數退避重試機制
 * @param fn 要執行的函數
 * @param maxRetries 最大重試次數
 * @param symbol 股票代號（用於錯誤記錄）
 */
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  symbol?: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      
      console.warn(`[Sync] Retry attempt ${attempt + 1}/${maxRetries} for ${symbol || 'unknown'}, waiting ${waitTime}ms...`);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // 記錄錯誤到資料庫
  if (symbol && lastError) {
    await recordSyncError(symbol, 'retry_failed', lastError, maxRetries);
  }
  
  throw lastError;
}

/**
 * 記錄同步錯誤到資料庫
 */
async function recordSyncError(
  symbol: string,
  errorType: string,
  error: Error,
  retryCount: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db.insert(twDataSyncErrors).values({
      symbol,
      errorType,
      errorMessage: error.message,
      errorStack: error.stack || '',
      retryCount,
      syncedAt: new Date(),
    });
  } catch (err) {
    console.error('[Sync] Failed to record sync error:', err);
  }
}

/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 同步歷史價格資料（增量更新）
 */
async function syncHistoricalPrices(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error('[Sync] Database not available');
    return;
  }
  
  console.log('[Sync] Starting historical prices sync...');
  
  try {
    // 1. 取得最後同步時間
    const syncStatus = await db.select()
      .from(twDataSyncStatus)
      .where(eq(twDataSyncStatus.dataType, 'prices'))
      .limit(1);
    
    const lastSyncDate = syncStatus.length > 0 
      ? syncStatus[0].lastSyncAt 
      : new Date('2020-01-01');
    
    console.log(`[Sync] Last sync date: ${formatDate(lastSyncDate)}`);
    
    // 2. 取得所有活躍股票
    const stocks = await db.select()
      .from(twStocks)
      .where(eq(twStocks.isActive, true));
    
    console.log(`[Sync] Found ${stocks.length} active stocks`);
    
    let successCount = 0;
    let failedStocks: string[] = [];
    
    // 3. 逐一更新每支股票的歷史價格
    for (const stock of stocks) {
      try {
        console.log(`[Sync] Syncing prices for ${stock.symbol} (${stock.name})...`);
        
        const rawData = await retryWithExponentialBackoff(async () => {
          if (stock.market === '上市') {
            return await fetchTwseHistoricalPrices(stock.symbol, formatDate(lastSyncDate));
          } else {
            return await fetchTpexHistoricalPrices(
              stock.symbol,
              formatDate(lastSyncDate),
              formatDate(new Date())
            );
          }
        }, 3, stock.symbol);
        
        if (!rawData || rawData.length === 0) {
          console.log(`[Sync] No new data for ${stock.symbol}`);
          continue;
        }
        
        const transformedData = rawData.map((item: any) => ({
          symbol: stock.symbol,
          ...transformHistoricalPrice(item, stock.market === '上市' ? 'TWSE' : 'TPEx')
        }));
        
        // 4. 批次寫入資料庫（使用 onDuplicateKeyUpdate 避免重複）
        for (const priceData of transformedData) {
          await db.insert(twStockPrices).values(priceData).onDuplicateKeyUpdate({
            set: {
              open: priceData.open,
              high: priceData.high,
              low: priceData.low,
              close: priceData.close,
              volume: priceData.volume,
              amount: priceData.amount,
              change: priceData.change,
              changePercent: priceData.changePercent,
            }
          });
        }
        
        successCount++;
        console.log(`[Sync] Successfully synced ${transformedData.length} records for ${stock.symbol}`);
        
      } catch (error) {
        console.error(`[Sync] Failed to sync prices for ${stock.symbol}:`, error);
        failedStocks.push(stock.symbol);
      }
    }
    
    // 5. 更新同步狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'prices',
      source: 'TWSE+TPEx',
      lastSyncAt: new Date(),
      status: failedStocks.length === 0 ? 'success' : 'partial',
      recordCount: successCount,
      errorMessage: failedStocks.length > 0 ? `Failed stocks: ${failedStocks.join(', ')}` : null,
    }).onDuplicateKeyUpdate({
      set: {
        lastSyncAt: new Date(),
        status: failedStocks.length === 0 ? 'success' : 'partial',
        recordCount: successCount,
        errorMessage: failedStocks.length > 0 ? `Failed stocks: ${failedStocks.join(', ')}` : null,
      }
    });
    
    console.log(`[Sync] Historical prices sync completed. Success: ${successCount}, Failed: ${failedStocks.length}`);
    
    // 6. 如果有失敗的股票，發送通知
    if (failedStocks.length > 0) {
      await notifyOwner({
        title: '台股歷史價格同步部分失敗',
        content: `成功: ${successCount} 支股票\n失敗: ${failedStocks.length} 支股票\n失敗股票代號: ${failedStocks.join(', ')}`
      });
    }
    
  } catch (error) {
    console.error('[Sync] Historical prices sync failed:', error);
    
    // 發送錯誤通知
    await notifyOwner({
      title: '台股歷史價格同步失敗',
      content: `錯誤訊息: ${(error as Error).message}`
    });
    
    throw error;
  }
}

/**
 * 每日收盤後更新歷史價格（交易日 14:30）
 */
export function scheduleHistoricalPricesSync(): void {
  cron.schedule('30 14 * * 1-5', async () => {
    console.log('[Sync] Starting scheduled historical prices sync...');
    try {
      await syncHistoricalPrices();
    } catch (error) {
      console.error('[Sync] Scheduled historical prices sync failed:', error);
    }
  }, {
    timezone: 'Asia/Taipei'
  });
  
  console.log('[Sync] Scheduled historical prices sync (Mon-Fri 14:30 Asia/Taipei)');
}

/**
 * 每週日凌晨更新基本面資料
 * 注意：此功能需要在第二階段實作 FinMind API 整合後才能啟用
 */
export function scheduleFundamentalsSync(): void {
  cron.schedule('0 2 * * 0', async () => {
    console.log('[Sync] Starting scheduled fundamentals sync...');
    // TODO: 實作基本面資料同步邏輯（第二階段）
    console.log('[Sync] Fundamentals sync not implemented yet');
  }, {
    timezone: 'Asia/Taipei'
  });
  
  console.log('[Sync] Scheduled fundamentals sync (Sunday 02:00 Asia/Taipei)');
}

/**
 * 每日收盤後更新技術指標（交易日 15:00）
 * 注意：此功能需要在第二階段實作技術指標計算後才能啟用
 */
export function scheduleIndicatorsSync(): void {
  cron.schedule('0 15 * * 1-5', async () => {
    console.log('[Sync] Starting scheduled indicators sync...');
    // TODO: 實作技術指標計算與同步邏輯（第二階段）
    console.log('[Sync] Indicators sync not implemented yet');
  }, {
    timezone: 'Asia/Taipei'
  });
  
  console.log('[Sync] Scheduled indicators sync (Mon-Fri 15:00 Asia/Taipei)');
}

/**
 * 啟動所有排程任務
 */
export function startAllSchedules(): void {
  scheduleHistoricalPricesSync();
  scheduleFundamentalsSync();
  scheduleIndicatorsSync();
  console.log('[Sync] All schedules started');
}

/**
 * 手動觸發歷史價格同步（用於測試或手動補資料）
 */
export async function manualSyncHistoricalPrices(): Promise<void> {
  console.log('[Sync] Manual historical prices sync triggered');
  await syncHistoricalPrices();
}

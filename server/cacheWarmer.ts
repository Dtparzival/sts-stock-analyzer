import cron from 'node-cron';
import { getPopularUSStocks, getPopularTWStocks, getDefaultPopularStocks } from './popularStocks';
import { getTwelveDataQuote, getTwelveDataTimeSeries } from './twelvedata';
import { getTWSEStockHistory } from './twse';
import * as dbCache from './dbStockDataCache';

/**
 * 緩存預熱服務
 * 在凌晨自動更新熱門股票的緩存數據
 */

interface WarmupStats {
  startTime: Date;
  endTime?: Date;
  totalStocks: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  apiCallCount: number;
  errors: Array<{ symbol: string; error: string }>;
}

/**
 * 預熱單支美股的緩存
 */
async function warmupUSStock(symbol: string, stats: WarmupStats): Promise<boolean> {
  try {
    console.log(`[Cache Warmer] Warming up US stock: ${symbol}`);
    
    // 1. 獲取股票報價
    const quote = await getTwelveDataQuote(symbol);
    stats.apiCallCount++;
    
    if (!quote) {
      console.warn(`[Cache Warmer] Failed to fetch quote for ${symbol}`);
      stats.errors.push({ symbol, error: 'Failed to fetch quote' });
      return false;
    }
    
    // 2. 獲取歷史數據（1 年）
    const timeSeries = await getTwelveDataTimeSeries(symbol, '1day', 365);
    stats.apiCallCount++;
    
    if (!timeSeries) {
      console.warn(`[Cache Warmer] Failed to fetch time series for ${symbol}`);
      stats.errors.push({ symbol, error: 'Failed to fetch time series' });
      return false;
    }
    
    // 3. 儲存到緩存（1 小時）
    const cacheData = {
      quote,
      timeSeries,
    };
    
    await dbCache.setCache('twelvedata_stock_data', { symbol, range: '1y' }, cacheData, 60 * 60 * 1000);
    
    console.log(`[Cache Warmer] Successfully warmed up ${symbol}`);
    return true;
  } catch (error: any) {
    console.error(`[Cache Warmer] Error warming up ${symbol}:`, error.message);
    stats.errors.push({ symbol, error: error.message });
    return false;
  }
}

/**
 * 預熱單支台股的緩存
 */
async function warmupTWStock(symbol: string, stats: WarmupStats): Promise<boolean> {
  try {
    console.log(`[Cache Warmer] Warming up TW stock: ${symbol}`);
    
    // 獲取台股歷史數據（12 個月）
    const twseData = await getTWSEStockHistory(symbol, 12);
    stats.apiCallCount++;
    
    if (!twseData || twseData.length === 0) {
      console.warn(`[Cache Warmer] Failed to fetch TWSE data for ${symbol}`);
      stats.errors.push({ symbol, error: 'Failed to fetch TWSE data' });
      return false;
    }
    
    // 儲存到緩存（1 小時）
    await dbCache.setCache('twse_stock_data', { symbol, months: 12 }, twseData, 60 * 60 * 1000);
    
    console.log(`[Cache Warmer] Successfully warmed up ${symbol}`);
    return true;
  } catch (error: any) {
    console.error(`[Cache Warmer] Error warming up ${symbol}:`, error.message);
    stats.errors.push({ symbol, error: error.message });
    return false;
  }
}

/**
 * 執行緩存預熱任務
 */
export async function runCacheWarmup(): Promise<WarmupStats> {
  const stats: WarmupStats = {
    startTime: new Date(),
    totalStocks: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    apiCallCount: 0,
    errors: [],
  };

  console.log('[Cache Warmer] Starting cache warmup...');

  try {
    // 1. 獲取熱門股票列表
    let usStocks = await getPopularUSStocks(30, 20);
    let twStocks = await getPopularTWStocks(30, 20);
    
    // 如果沒有搜尋歷史，使用預設列表
    if (usStocks.length === 0 && twStocks.length === 0) {
      console.log('[Cache Warmer] No search history found, using default popular stocks');
      const defaultStocks = getDefaultPopularStocks();
      usStocks = defaultStocks.filter(s => s.market === 'US');
      twStocks = defaultStocks.filter(s => s.market === 'TW');
    }
    
    stats.totalStocks = usStocks.length + twStocks.length;
    console.log(`[Cache Warmer] Found ${usStocks.length} US stocks and ${twStocks.length} TW stocks to warm up`);
    
    // 2. 預熱美股（批次處理，避免速率限制）
    for (const stock of usStocks) {
      const success = await warmupUSStock(stock.symbol, stats);
      if (success) {
        stats.successCount++;
      } else {
        stats.failedCount++;
      }
      
      // 每支股票之間延遲 500ms，避免觸發速率限制
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. 預熱台股（批次處理）
    for (const stock of twStocks) {
      const success = await warmupTWStock(stock.symbol, stats);
      if (success) {
        stats.successCount++;
      } else {
        stats.failedCount++;
      }
      
      // 每支股票之間延遲 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    stats.endTime = new Date();
    const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
    
    console.log('[Cache Warmer] Cache warmup completed');
    console.log(`[Cache Warmer] Total: ${stats.totalStocks}, Success: ${stats.successCount}, Failed: ${stats.failedCount}`);
    console.log(`[Cache Warmer] API calls: ${stats.apiCallCount}, Duration: ${duration.toFixed(2)}s`);
    
    if (stats.errors.length > 0) {
      console.log('[Cache Warmer] Errors:', stats.errors);
    }
  } catch (error: any) {
    console.error('[Cache Warmer] Fatal error during cache warmup:', error);
    stats.endTime = new Date();
  }

  return stats;
}

/**
 * 啟動緩存預熱排程器
 * 每天凌晨 3:00 執行
 */
export function startCacheWarmerScheduler() {
  console.log('[Cache Warmer] Starting cache warmer scheduler...');
  console.log('[Cache Warmer] Schedule: Daily at 3:00 AM');
  
  // Cron 表達式：秒 分 時 日 月 週
  // 0 0 3 * * * = 每天凌晨 3:00:00
  const task = cron.schedule('0 0 3 * * *', async () => {
    console.log('[Cache Warmer] Scheduled warmup task triggered');
    await runCacheWarmup();
  }, {
    timezone: 'Asia/Taipei', // 使用台北時區
  });
  
  task.start();
  console.log('[Cache Warmer] Scheduler started successfully');
}

/**
 * 手動執行緩存預熱（用於測試）
 */
export async function manualWarmup(): Promise<WarmupStats> {
  console.log('[Cache Warmer] Manual warmup triggered');
  return await runCacheWarmup();
}

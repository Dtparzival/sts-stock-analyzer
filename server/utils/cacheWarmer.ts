/**
 * Redis 快取預熱模組
 * 預載入熱門股票資料到 Redis 快取，提升查詢效能
 */

import { getTwStockBySymbol, getTwStockPricesPaginated, getTwStockIndicatorsPaginated, getTwStockFundamentalsPaginated } from '../db';
import { setCache, CacheKey, CacheTTL } from './twStockCache';

/**
 * 熱門股票列表（台灣市值前 20 大）
 */
const POPULAR_STOCKS = [
  '2330', // 台積電
  '2317', // 鴻海
  '2454', // 聯發科
  '2412', // 中華電
  '2308', // 台達電
  '2882', // 國泰金
  '2881', // 富邦金
  '2886', // 兆豐金
  '2891', // 中信金
  '2303', // 聯電
  '2002', // 中鋼
  '1301', // 台塑
  '1303', // 南亞
  '2884', // 玉山金
  '2892', // 第一金
  '2395', // 研華
  '2357', // 華碩
  '2382', // 廣達
  '2409', // 友達
  '3008', // 大立光
];

/**
 * 預熱單一股票的快取
 */
async function warmupStockCache(symbol: string): Promise<{
  symbol: string;
  success: boolean;
  cached: string[];
  errors: string[];
}> {
  const cached: string[] = [];
  const errors: string[] = [];

  try {
    // 1. 預熱股票基本資料
    const stock = await getTwStockBySymbol(symbol);
    if (stock) {
      const cacheKey = CacheKey.stockInfo(symbol);
      await setCache(cacheKey, stock, CacheTTL.STOCK_INFO);
      cached.push('stockInfo');
    } else {
      errors.push('stockInfo: 股票不存在');
    }

    // 2. 預熱歷史價格（第一頁）
    try {
      const prices = await getTwStockPricesPaginated(symbol, 1, 30);
      if (prices.data.length > 0) {
        const cacheKey = CacheKey.stockPricesPaginated(symbol, 1, 30);
        await setCache(cacheKey, prices, CacheTTL.STOCK_PRICES);
        cached.push('stockPrices_page1');
      }
    } catch (error) {
      errors.push(`stockPrices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. 預熱技術指標（第一頁）
    try {
      const indicators = await getTwStockIndicatorsPaginated(symbol, 1, 30);
      if (indicators.data.length > 0) {
        const cacheKey = CacheKey.stockIndicatorsPaginated(symbol, 1, 30);
        await setCache(cacheKey, indicators, CacheTTL.STOCK_INDICATORS);
        cached.push('stockIndicators_page1');
      }
    } catch (error) {
      errors.push(`stockIndicators: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 4. 預熱基本面資料（第一頁）
    try {
      const fundamentals = await getTwStockFundamentalsPaginated(symbol, 1, 20);
      if (fundamentals.data.length > 0) {
        const cacheKey = CacheKey.stockFundamentalsPaginated(symbol, 1, 20);
        await setCache(cacheKey, fundamentals, CacheTTL.STOCK_FUNDAMENTALS);
        cached.push('stockFundamentals_page1');
      }
    } catch (error) {
      errors.push(`stockFundamentals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      symbol,
      success: errors.length === 0,
      cached,
      errors,
    };
  } catch (error) {
    return {
      symbol,
      success: false,
      cached,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * 預熱所有熱門股票的快取
 */
export async function warmupAllStocks(): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{
    symbol: string;
    success: boolean;
    cached: string[];
    errors: string[];
  }>;
}> {
  console.log(`[Cache Warmer] 開始預熱 ${POPULAR_STOCKS.length} 支熱門股票的快取...`);
  const startTime = Date.now();

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const symbol of POPULAR_STOCKS) {
    const result = await warmupStockCache(symbol);
    results.push(result);

    if (result.success) {
      successCount++;
      console.log(`[Cache Warmer] ✅ ${symbol} 預熱成功，已快取: ${result.cached.join(', ')}`);
    } else {
      failedCount++;
      console.error(`[Cache Warmer] ❌ ${symbol} 預熱失敗:`, result.errors);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[Cache Warmer] 預熱完成！總計: ${POPULAR_STOCKS.length}, 成功: ${successCount}, 失敗: ${failedCount}, 耗時: ${duration}ms`);

  return {
    total: POPULAR_STOCKS.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * 預熱指定股票列表的快取
 */
export async function warmupStocks(symbols: string[]): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{
    symbol: string;
    success: boolean;
    cached: string[];
    errors: string[];
  }>;
}> {
  console.log(`[Cache Warmer] 開始預熱 ${symbols.length} 支股票的快取...`);
  const startTime = Date.now();

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const symbol of symbols) {
    const result = await warmupStockCache(symbol);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[Cache Warmer] 預熱完成！總計: ${symbols.length}, 成功: ${successCount}, 失敗: ${failedCount}, 耗時: ${duration}ms`);

  return {
    total: symbols.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * 定期預熱快取（建議每日執行一次）
 */
export function scheduleWarmup(intervalHours: number = 24): NodeJS.Timeout {
  console.log(`[Cache Warmer] 設定定期預熱，間隔: ${intervalHours} 小時`);

  // 立即執行一次
  warmupAllStocks();

  // 設定定期執行
  return setInterval(() => {
    warmupAllStocks();
  }, intervalHours * 60 * 60 * 1000);
}

/**
 * 取得熱門股票列表
 */
export function getPopularStocks(): string[] {
  return [...POPULAR_STOCKS];
}

/**
 * 台股資料預載入腳本
 * 在伺服器啟動時預先載入熱門股票的資料到 Redis 快取
 * 減少首次查詢的延遲，提升使用者體驗
 */

import { getRedisClient } from '../redis';
import { getDb } from '../db';
import { twStocks, watchlist } from '../../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';
import { getTwStockBySymbol, getTwStockPrices, getTwStockIndicators } from '../db';

/**
 * 熱門台股列表（預設）
 * 包含台灣市值前 10 大股票和熱門 ETF
 */
const HOT_STOCKS = [
  '2330', // 台積電
  '2317', // 鴻海
  '2454', // 聯發科
  '2881', // 富邦金
  '2882', // 國泰金
  '2886', // 兆豐金
  '2891', // 中信金
  '2412', // 中華電
  '2308', // 台達電
  '2303', // 聯電
  '0050', // 元大台灣50
  '0056', // 元大高股息
  '006208', // 富邦台50
];

/**
 * 預載入單一股票的資料
 * @param symbol 股票代號
 */
async function preloadStockData(symbol: string): Promise<void> {
  try {
    console.log(`[Preload] 開始預載入股票 ${symbol} 的資料...`);
    
    // 1. 預載入基本資料
    const stockInfo = await getTwStockBySymbol(symbol);
    if (!stockInfo) {
      console.warn(`[Preload] 股票 ${symbol} 基本資料不存在，跳過`);
      return;
    }
    
    // 2. 預載入最近 30 天的歷史價格
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const prices = await getTwStockPrices(symbol, startDate, endDate);
    console.log(`[Preload] 股票 ${symbol} 載入 ${prices.length} 筆歷史價格`);
    
    // 3. 預載入最近 30 天的技術指標
    const indicators = await getTwStockIndicators(symbol, startDate, endDate);
    console.log(`[Preload] 股票 ${symbol} 載入 ${indicators.length} 筆技術指標`);
    
    console.log(`[Preload] 股票 ${symbol} 預載入完成`);
  } catch (error) {
    console.error(`[Preload] 預載入股票 ${symbol} 失敗:`, error);
  }
}

/**
 * 預載入熱門股票資料
 */
export async function preloadHotStocks(): Promise<void> {
  console.log('[Preload] 開始預載入熱門股票資料...');
  
  const redis = getRedisClient();
  if (!redis) {
    console.warn('[Preload] Redis 不可用，跳過預載入');
    return;
  }
  
  for (const symbol of HOT_STOCKS) {
    await preloadStockData(symbol);
  }
  
  console.log('[Preload] 熱門股票預載入完成');
}

/**
 * 預載入用戶收藏股票資料
 * @param userId 用戶 ID
 */
export async function preloadUserWatchlist(userId: number): Promise<void> {
  console.log(`[Preload] 開始預載入用戶 ${userId} 的收藏股票...`);
  
  const db = await getDb();
  if (!db) {
    console.error('[Preload] 無法連接資料庫');
    return;
  }
  
  const redis = getRedisClient();
  if (!redis) {
    console.warn('[Preload] Redis 不可用，跳過預載入');
    return;
  }
  
  try {
    // 取得用戶收藏的股票列表
    const userWatchlist = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId));
    
    if (userWatchlist.length === 0) {
      console.log(`[Preload] 用戶 ${userId} 沒有收藏股票`);
      return;
    }
    
    console.log(`[Preload] 用戶 ${userId} 共收藏 ${userWatchlist.length} 支股票`);
    
    // 預載入每支收藏股票的資料
    for (const item of userWatchlist) {
      await preloadStockData(item.symbol);
    }
    
    console.log(`[Preload] 用戶 ${userId} 的收藏股票預載入完成`);
  } catch (error) {
    console.error(`[Preload] 預載入用戶 ${userId} 收藏股票失敗:`, error);
  }
}

/**
 * 預載入所有活躍用戶的收藏股票（限制前 100 位用戶）
 */
export async function preloadAllUserWatchlists(): Promise<void> {
  console.log('[Preload] 開始預載入所有用戶的收藏股票...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Preload] 無法連接資料庫');
    return;
  }
  
  const redis = getRedisClient();
  if (!redis) {
    console.warn('[Preload] Redis 不可用，跳過預載入');
    return;
  }
  
  try {
    // 取得所有有收藏股票的用戶（限制前 100 位）
    const userWatchlists = await db
      .select()
      .from(watchlist)
      .limit(100);
    
    // 取得唯一的用戶 ID
    const userIds = [...new Set(userWatchlists.map(item => item.userId))];
    
    console.log(`[Preload] 共 ${userIds.length} 位用戶有收藏股票`);
    
    // 預載入每位用戶的收藏股票
    for (const userId of userIds) {
      await preloadUserWatchlist(userId);
    }
    
    console.log('[Preload] 所有用戶的收藏股票預載入完成');
  } catch (error) {
    console.error('[Preload] 預載入所有用戶收藏股票失敗:', error);
  }
}

/**
 * 執行完整的資料預載入流程
 */
export async function runFullPreload(): Promise<void> {
  console.log('[Preload] ========== 開始執行完整預載入流程 ==========');
  
  // 1. 預載入熱門股票
  await preloadHotStocks();
  
  // 2. 預載入所有用戶的收藏股票（可選，視伺服器負載決定）
  // await preloadAllUserWatchlists();
  
  console.log('[Preload] ========== 完整預載入流程執行完成 ==========');
}

/**
 * 台股資料預載入腳本
 * 用於首次啟動時預載入台股資料到資料庫和 Redis 快取
 */

import { getDb } from '../db';
import { twStocks, twStockPrices, twStockIndicators } from '../../drizzle/schema';
import { fetchTwseStockList } from '../integrations/twse';
import { fetchTpexStockList } from '../integrations/tpex';
import { transformTwseStock, transformTpexStock } from '../integrations/dataTransformer';
import { manualSync } from './twStockSync';
import { getRedisClient } from '../redis';
import { eq } from 'drizzle-orm';

/**
 * 檢查資料庫是否已有資料
 */
async function checkDataExists(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error('[Preload] 無法連接資料庫');
    return false;
  }

  try {
    const stockCount = await db.select().from(twStocks).limit(1);
    return stockCount.length > 0;
  } catch (error) {
    console.error('[Preload] 檢查資料失敗:', error);
    return false;
  }
}

/**
 * 預載入股票列表（TWSE + TPEx）
 */
async function preloadStockList() {
  console.log('[Preload] 開始預載入股票列表...');
  const db = await getDb();
  if (!db) {
    console.error('[Preload] 無法連接資料庫');
    return;
  }

  try {
    // 預載入 TWSE 上市股票
    console.log('[Preload] 載入 TWSE 上市股票...');
    const twseStocks = await fetchTwseStockList();
    let twseCount = 0;

    for (const rawStock of twseStocks) {
      try {
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
      } catch (error) {
        console.error(`[Preload] 載入 TWSE 股票失敗:`, error);
      }
    }

    console.log(`[Preload] TWSE 載入完成，共 ${twseCount} 筆`);

    // 預載入 TPEx 上櫃股票
    console.log('[Preload] 載入 TPEx 上櫃股票...');
    const tpexStocks = await fetchTpexStockList();
    let tpexCount = 0;

    for (const rawStock of tpexStocks) {
      try {
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
      } catch (error) {
        console.error(`[Preload] 載入 TPEx 股票失敗:`, error);
      }
    }

    console.log(`[Preload] TPEx 載入完成，共 ${tpexCount} 筆`);
    console.log(`[Preload] 股票列表預載入完成，總計 ${twseCount + tpexCount} 筆`);
  } catch (error) {
    console.error('[Preload] 股票列表預載入失敗:', error);
  }
}

/**
 * 預載入歷史價格（最近一年）
 */
async function preloadHistoricalPrices() {
  console.log('[Preload] 開始預載入歷史價格（最近一年）...');
  
  try {
    // 使用手動同步功能載入歷史價格
    await manualSync('prices');
    console.log('[Preload] 歷史價格預載入完成');
  } catch (error) {
    console.error('[Preload] 歷史價格預載入失敗:', error);
  }
}

/**
 * 預載入技術指標
 */
async function preloadTechnicalIndicators() {
  console.log('[Preload] 開始預載入技術指標...');
  
  try {
    // 使用手動同步功能計算並載入技術指標
    await manualSync('indicators');
    console.log('[Preload] 技術指標預載入完成');
  } catch (error) {
    console.error('[Preload] 技術指標預載入失敗:', error);
  }
}

/**
 * Redis 快取預熱
 * 將熱門股票的資料預先載入到 Redis 快取
 */
async function warmupRedisCache() {
  console.log('[Preload] 開始 Redis 快取預熱...');
  
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.log('[Preload] Redis 不可用，跳過快取預熱');
      return;
    }

    const db = await getDb();
    if (!db) {
      console.error('[Preload] 無法連接資料庫');
      return;
    }

    // 取得所有活躍的台股
    const stocks = await db.select().from(twStocks).where(eq(twStocks.isActive, true)).limit(100);

    let cacheCount = 0;

    for (const stock of stocks) {
      try {
        // 預載入股票基本資料到 Redis
        const cacheKey = `tw_stock:${stock.symbol}`;
        await redis.setex(cacheKey, 86400, JSON.stringify(stock)); // 快取 24 小時

        // 預載入最近的價格資料到 Redis
        const prices = await db
          .select()
          .from(twStockPrices)
          .where(eq(twStockPrices.symbol, stock.symbol))
          .orderBy(twStockPrices.date)
          .limit(30); // 最近 30 天

        if (prices.length > 0) {
          const priceCacheKey = `tw_stock_prices:${stock.symbol}`;
          await redis.setex(priceCacheKey, 21600, JSON.stringify(prices)); // 快取 6 小時
        }

        // 預載入技術指標到 Redis
        const indicators = await db
          .select()
          .from(twStockIndicators)
          .where(eq(twStockIndicators.symbol, stock.symbol))
          .orderBy(twStockIndicators.date)
          .limit(30); // 最近 30 天

        if (indicators.length > 0) {
          const indicatorCacheKey = `tw_stock_indicators:${stock.symbol}`;
          await redis.setex(indicatorCacheKey, 21600, JSON.stringify(indicators)); // 快取 6 小時
        }

        cacheCount++;
      } catch (error) {
        console.error(`[Preload] 預熱股票 ${stock.symbol} 快取失敗:`, error);
      }
    }

    console.log(`[Preload] Redis 快取預熱完成，共 ${cacheCount} 筆`);
  } catch (error) {
    console.error('[Preload] Redis 快取預熱失敗:', error);
  }
}

/**
 * 執行完整的資料預載入流程
 */
export async function runDataPreload(force = false) {
  console.log('[Preload] ========================================');
  console.log('[Preload] 台股資料預載入開始');
  console.log('[Preload] ========================================');

  // 檢查是否已有資料（除非強制重新載入）
  if (!force) {
    const hasData = await checkDataExists();
    if (hasData) {
      console.log('[Preload] 資料庫已有資料，跳過預載入');
      console.log('[Preload] 如需重新載入，請使用 force 參數');
      return;
    }
  }

  const startTime = Date.now();

  try {
    // 步驟 1: 預載入股票列表
    await preloadStockList();

    // 步驟 2: 預載入歷史價格（最近一年）
    await preloadHistoricalPrices();

    // 步驟 3: 預載入技術指標
    await preloadTechnicalIndicators();

    // 步驟 4: Redis 快取預熱
    await warmupRedisCache();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('[Preload] ========================================');
    console.log(`[Preload] 台股資料預載入完成（耗時 ${duration} 秒）`);
    console.log('[Preload] ========================================');
  } catch (error) {
    console.error('[Preload] 資料預載入失敗:', error);
    throw error;
  }
}

/**
 * 輕量級預載入（僅載入股票列表和 Redis 快取預熱）
 * 適用於快速啟動場景
 */
export async function runLightweightPreload() {
  console.log('[Preload] 執行輕量級預載入...');

  try {
    // 僅載入股票列表
    const hasData = await checkDataExists();
    if (!hasData) {
      await preloadStockList();
    }

    // Redis 快取預熱
    await warmupRedisCache();

    console.log('[Preload] 輕量級預載入完成');
  } catch (error) {
    console.error('[Preload] 輕量級預載入失敗:', error);
  }
}

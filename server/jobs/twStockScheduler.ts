/**
 * 台股資料同步排程系統
 * 每日自動更新股價、技術指標和基本面資料
 */

import cron from 'node-cron';
import { getDb } from '../db';
import { twStockPrices, twStockIndicators, twDataSyncStatus, InsertTwStockPrice, InsertTwStockIndicator } from '../../drizzle/schema';
import { calculateMA, calculateRSI } from '../integrations/dataTransformer';
import { notifyOwner } from '../_core/notification';
import axios from 'axios';
import { sql } from 'drizzle-orm';

/**
 * 轉換民國年日期為西元年 Date
 */
function parseROCDate(rocDateStr: string): Date {
  if (!rocDateStr || rocDateStr.length !== 7) {
    throw new Error(`Invalid ROC date format: ${rocDateStr}`);
  }
  
  const year = parseInt(rocDateStr.substring(0, 3)) + 1911;
  const month = parseInt(rocDateStr.substring(3, 5));
  const day = parseInt(rocDateStr.substring(5, 7));
  
  return new Date(year, month - 1, day);
}

/**
 * 解析價格
 */
function parsePrice(priceStr: string): string {
  if (!priceStr || priceStr === '') return '0';
  const numValue = parseFloat(priceStr.replace(/,/g, ''));
  if (isNaN(numValue)) return '0';
  return numValue.toFixed(2);
}

/**
 * 解析成交量
 */
function parseVolume(volumeStr: string): number {
  if (!volumeStr || volumeStr === '') return 0;
  const numValue = parseInt(volumeStr.replace(/,/g, ''));
  if (isNaN(numValue)) return 0;
  return numValue;
}

/**
 * 同步當日股價資料
 */
async function syncDailyPrices(): Promise<{ success: number; skip: number; error: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  console.log('[Scheduler] Syncing daily prices from TWSE...');
  
  try {
    const response = await axios.get('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid API response format');
    }
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const item of response.data) {
      try {
        if (!item.Code || !item.Date || !item.ClosingPrice || item.ClosingPrice === '') {
          skipCount++;
          continue;
        }
        
        const priceData: InsertTwStockPrice = {
          symbol: item.Code,
          date: parseROCDate(item.Date),
          open: parsePrice(item.OpeningPrice),
          high: parsePrice(item.HighestPrice),
          low: parsePrice(item.LowestPrice),
          close: parsePrice(item.ClosingPrice),
          volume: parseVolume(item.TradeVolume),
          amount: parsePrice(item.TradeValue),
          change: parsePrice(item.Change),
          changePercent: item.Change && item.ClosingPrice 
            ? ((parseFloat(item.Change) / (parseFloat(item.ClosingPrice) - parseFloat(item.Change))) * 100).toFixed(2)
            : '0',
        };
        
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
        
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    // 更新同步狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'prices',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: errorCount === 0 ? 'success' : 'partial',
      recordCount: successCount,
      errorMessage: errorCount > 0 ? `${errorCount} errors occurred` : null,
    });
    
    console.log(`[Scheduler] Daily prices sync completed: ${successCount} success, ${skipCount} skip, ${errorCount} error`);
    
    return { success: successCount, skip: skipCount, error: errorCount };
  } catch (error) {
    console.error('[Scheduler] Daily prices sync failed:', error);
    
    // 記錄失敗狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'prices',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: 0,
      errorMessage: (error as Error).message,
    });
    
    throw error;
  }
}

/**
 * 計算技術指標
 */
async function calculateIndicators(): Promise<{ success: number; total: number; error: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  console.log('[Scheduler] Calculating technical indicators...');
  
  try {
    // 取得所有有價格資料的股票
    const stocksWithPrices = await db.select({
      symbol: twStockPrices.symbol
    })
    .from(twStockPrices)
    .groupBy(twStockPrices.symbol);
    
    let totalIndicators = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const { symbol } of stocksWithPrices) {
      try {
        // 取得該股票的所有歷史價格
        const prices = await db.select()
          .from(twStockPrices)
          .where(sql`${twStockPrices.symbol} = ${symbol}`)
          .orderBy(twStockPrices.date);
        
        if (prices.length < 5) continue;
        
        const closePrices = prices.map(p => parseFloat(p.close));
        const indicators: InsertTwStockIndicator[] = [];
        
        for (let i = 0; i < prices.length; i++) {
          const pricesUpToNow = closePrices.slice(0, i + 1);
          
          const ma5 = calculateMA(pricesUpToNow, 5);
          const ma10 = calculateMA(pricesUpToNow, 10);
          const ma20 = calculateMA(pricesUpToNow, 20);
          const ma60 = calculateMA(pricesUpToNow, 60);
          const rsi14 = calculateRSI(pricesUpToNow, 14);
          
          indicators.push({
            symbol,
            date: prices[i].date,
            ma5: ma5 !== null ? String(ma5) : null,
            ma10: ma10 !== null ? String(ma10) : null,
            ma20: ma20 !== null ? String(ma20) : null,
            ma60: ma60 !== null ? String(ma60) : null,
            rsi14: rsi14 !== null ? String(rsi14) : null,
            macd: null,
            macdSignal: null,
            macdHistogram: null,
            kValue: null,
            dValue: null,
          });
        }
        
        if (indicators.length > 0) {
          for (const indicator of indicators) {
            await db.insert(twStockIndicators).values(indicator).onDuplicateKeyUpdate({
              set: {
                ma5: indicator.ma5,
                ma10: indicator.ma10,
                ma20: indicator.ma20,
                ma60: indicator.ma60,
                rsi14: indicator.rsi14,
              }
            });
          }
          totalIndicators += indicators.length;
          successCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }
    
    // 更新同步狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'indicators',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: errorCount === 0 ? 'success' : 'partial',
      recordCount: totalIndicators,
      errorMessage: errorCount > 0 ? `${errorCount} errors occurred` : null,
    });
    
    console.log(`[Scheduler] Indicators calculation completed: ${successCount} stocks, ${totalIndicators} indicators`);
    
    return { success: successCount, total: totalIndicators, error: errorCount };
  } catch (error) {
    console.error('[Scheduler] Indicators calculation failed:', error);
    
    // 記錄失敗狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'indicators',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: 'failed',
      recordCount: 0,
      errorMessage: (error as Error).message,
    });
    
    throw error;
  }
}

/**
 * 每日收盤後同步股價資料（交易日 14:30）
 */
export function scheduleDailyPricesSync(): void {
  cron.schedule('30 14 * * 1-5', async () => {
    console.log('[Scheduler] Starting daily prices sync...');
    try {
      const result = await syncDailyPrices();
      
      // 發送通知
      await notifyOwner({
        title: '台股每日股價同步完成',
        content: `成功: ${result.success} 筆\n跳過: ${result.skip} 筆\n錯誤: ${result.error} 筆`
      });
    } catch (error) {
      console.error('[Scheduler] Daily prices sync failed:', error);
      
      // 發送錯誤通知
      await notifyOwner({
        title: '台股每日股價同步失敗',
        content: `錯誤訊息: ${(error as Error).message}`
      });
    }
  }, {
    timezone: 'Asia/Taipei'
  });
  
  console.log('[Scheduler] Scheduled daily prices sync (Mon-Fri 14:30 Asia/Taipei)');
}

/**
 * 每日收盤後計算技術指標（交易日 15:00）
 */
export function scheduleDailyIndicatorsCalc(): void {
  cron.schedule('0 15 * * 1-5', async () => {
    console.log('[Scheduler] Starting daily indicators calculation...');
    try {
      const result = await calculateIndicators();
      
      // 發送通知
      await notifyOwner({
        title: '台股技術指標計算完成',
        content: `成功: ${result.success} 支股票\n指標數: ${result.total} 筆\n錯誤: ${result.error} 支`
      });
    } catch (error) {
      console.error('[Scheduler] Daily indicators calculation failed:', error);
      
      // 發送錯誤通知
      await notifyOwner({
        title: '台股技術指標計算失敗',
        content: `錯誤訊息: ${(error as Error).message}`
      });
    }
  }, {
    timezone: 'Asia/Taipei'
  });
  
  console.log('[Scheduler] Scheduled daily indicators calculation (Mon-Fri 15:00 Asia/Taipei)');
}

/**
 * 啟動所有排程任務
 */
export function startTwStockScheduler(): void {
  console.log('[Scheduler] Starting Taiwan stock data scheduler...');
  scheduleDailyPricesSync();
  scheduleDailyIndicatorsCalc();
  console.log('[Scheduler] All schedules started successfully');
}

/**
 * 手動觸發同步（用於測試或補資料）
 */
export async function manualSync(): Promise<void> {
  console.log('[Scheduler] Manual sync triggered');
  
  try {
    // 1. 同步股價
    const pricesResult = await syncDailyPrices();
    console.log(`[Scheduler] Prices: ${pricesResult.success} success, ${pricesResult.error} error`);
    
    // 2. 計算技術指標
    const indicatorsResult = await calculateIndicators();
    console.log(`[Scheduler] Indicators: ${indicatorsResult.success} stocks, ${indicatorsResult.total} indicators`);
    
    console.log('[Scheduler] Manual sync completed successfully');
  } catch (error) {
    console.error('[Scheduler] Manual sync failed:', error);
    throw error;
  }
}

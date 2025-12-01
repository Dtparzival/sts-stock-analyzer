/**
 * 載入範例台股資料（前 10 支股票）
 * 用於驗證資料載入流程
 */

import { getDb } from '../db';
import { twStocks, twStockPrices, twStockIndicators, twDataSyncStatus, InsertTwStockPrice, InsertTwStockIndicator } from '../../drizzle/schema';
import { fetchTwseHistoricalPrices } from '../integrations/twse';
import { transformHistoricalPrice, parsePrice } from '../integrations/dataTransformer';
import { calculateMA, calculateRSI } from '../integrations/dataTransformer';
import { eq } from 'drizzle-orm';

/**
 * 延遲函數
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化日期為 YYYYMM 格式
 */
function formatYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * 載入單一股票的歷史價格
 */
async function loadStockPrices(symbol: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  console.log(`  📥 載入 ${symbol} 的歷史價格...`);
  
  try {
    const prices: InsertTwStockPrice[] = [];
    
    // 載入過去 3 個月的資料
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - i);
      const dateStr = formatYYYYMM(targetDate);
      
      console.log(`    - 查詢 ${dateStr} 的資料...`);
      const rawData = await fetchTwseHistoricalPrices(symbol, dateStr);
      
      if (rawData && rawData.length > 0) {
        console.log(`    - 取得 ${rawData.length} 筆資料`);
        for (const item of rawData) {
          try {
            const transformed = transformHistoricalPrice(item, 'TWSE');
            prices.push({
              symbol,
              date: transformed.date,
              open: String(transformed.open),
              high: String(transformed.high),
              low: String(transformed.low),
              close: String(transformed.close),
              volume: transformed.volume,
              amount: String(transformed.amount),
              change: String(transformed.change),
              changePercent: String(transformed.changePercent),
            });
          } catch (err) {
            console.log(`    - 跳過無效資料: ${err}`);
          }
        }
      } else {
        console.log(`    - 無資料`);
      }
      
      // 延遲 1 秒避免 API 請求過於頻繁
      await delay(1000);
    }
    
    // 批次插入資料庫
    if (prices.length > 0) {
      // 使用 onDuplicateKeyUpdate 避免重複插入
      for (const price of prices) {
        await db.insert(twStockPrices).values(price).onDuplicateKeyUpdate({
          set: {
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
            amount: price.amount,
            change: price.change,
            changePercent: price.changePercent,
          }
        });
      }
      console.log(`  ✅ ${symbol}: 成功載入 ${prices.length} 筆歷史價格`);
    } else {
      console.log(`  ⚠️  ${symbol}: 無歷史價格資料`);
    }
    
    return prices.length;
  } catch (error) {
    console.error(`  ❌ ${symbol}: 載入失敗 - ${error}`);
    return 0;
  }
}

/**
 * 計算並載入技術指標
 */
async function loadStockIndicators(symbol: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  console.log(`  📊 計算 ${symbol} 的技術指標...`);
  
  try {
    // 取得歷史價格
    const prices = await db.select()
      .from(twStockPrices)
      .where(eq(twStockPrices.symbol, symbol))
      .orderBy(twStockPrices.date);
    
    if (prices.length < 20) {
      console.log(`  ⚠️  ${symbol}: 歷史價格不足（${prices.length} 筆），無法計算技術指標`);
      return 0;
    }
    
    const indicators: InsertTwStockIndicator[] = [];
    const closePrices = prices.map(p => parsePrice(p.close));
    
    // 計算每一天的技術指標
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
    
    // 批次插入資料庫
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
      console.log(`  ✅ ${symbol}: 成功計算 ${indicators.length} 筆技術指標`);
    }
    
    return indicators.length;
  } catch (error) {
    console.error(`  ❌ ${symbol}: 計算技術指標失敗 - ${error}`);
    return 0;
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('=== 載入範例台股資料（前 10 支股票）===\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ 資料庫連線失敗');
    return;
  }
  
  console.log('✅ 資料庫連線成功\n');
  
  try {
    // 取得前 10 支活躍的台股
    const stocks = await db.select()
      .from(twStocks)
      .where(eq(twStocks.isActive, true))
      .limit(10);
    
    console.log(`📋 準備載入 ${stocks.length} 支股票的資料\n`);
    
    let totalPrices = 0;
    let totalIndicators = 0;
    
    // 逐一載入每支股票的資料
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      console.log(`\n[${i + 1}/${stocks.length}] ${stock.symbol} ${stock.name}`);
      
      // 載入歷史價格
      const pricesCount = await loadStockPrices(stock.symbol);
      totalPrices += pricesCount;
      
      // 計算技術指標
      if (pricesCount > 0) {
        const indicatorsCount = await loadStockIndicators(stock.symbol);
        totalIndicators += indicatorsCount;
      }
    }
    
    // 更新同步狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'prices',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: 'success',
      recordCount: totalPrices,
    });
    
    await db.insert(twDataSyncStatus).values({
      dataType: 'indicators',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: 'success',
      recordCount: totalIndicators,
    });
    
    // 總結
    console.log('\n\n=== 載入完成 ===');
    console.log(`✅ 歷史價格: ${totalPrices} 筆`);
    console.log(`✅ 技術指標: ${totalIndicators} 筆`);
    
  } catch (error) {
    console.error('❌ 載入過程發生錯誤:', error);
  }
}

// 執行載入
main().then(() => {
  console.log('\n載入完成');
  process.exit(0);
}).catch(error => {
  console.error('載入失敗:', error);
  process.exit(1);
});

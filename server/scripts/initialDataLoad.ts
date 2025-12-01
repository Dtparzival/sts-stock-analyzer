/**
 * 台股初始資料載入腳本
 * 載入歷史價格、技術指標和基本面資料
 */

import { getDb } from '../db';
import { twStocks, twStockPrices, twStockIndicators, twDataSyncStatus, InsertTwStockPrice, InsertTwStockIndicator } from '../../drizzle/schema';
import { fetchTwseHistoricalPrices } from '../integrations/twse';
import { fetchTpexHistoricalPrices } from '../integrations/tpex';
import { transformHistoricalPrice, parsePrice } from '../integrations/dataTransformer';
import { calculateMA, calculateRSI } from '../integrations/technicalIndicators';
import { eq } from 'drizzle-orm';

/**
 * 延遲函數（避免 API 請求過於頻繁）
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化日期為 YYYYMM 格式（TWSE API 需要）
 */
function formatYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * 載入單一股票的歷史價格
 */
async function loadStockPrices(symbol: string, market: '上市' | '上櫃', months: number = 3): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  console.log(`  📥 載入 ${symbol} 的歷史價格...`);
  
  try {
    const prices: InsertTwStockPrice[] = [];
    const now = new Date();
    
    // 載入過去 N 個月的資料
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = formatYYYYMM(targetDate);
      
      // 根據市場選擇 API
      const rawData = market === '上市' 
        ? await fetchTwseHistoricalPrices(symbol, dateStr)
        : await fetchTpexHistoricalPrices(symbol, dateStr);
      
      if (rawData && rawData.length > 0) {
        for (const item of rawData) {
          const transformed = transformHistoricalPrice(item, market === '上市' ? 'TWSE' : 'TPEx');
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
        }
      }
      
      // 延遲 500ms 避免 API 請求過於頻繁
      await delay(500);
    }
    
    // 批次插入資料庫
    if (prices.length > 0) {
      await db.insert(twStockPrices).values(prices).onDuplicateKeyUpdate({
        set: {
          open: prices[0].open,
          high: prices[0].high,
          low: prices[0].low,
          close: prices[0].close,
          volume: prices[0].volume,
          amount: prices[0].amount,
          change: prices[0].change,
          changePercent: prices[0].changePercent,
        }
      });
      console.log(`  ✅ ${symbol}: 載入 ${prices.length} 筆歷史價格`);
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
    // 取得歷史價格（需要至少 60 天的資料才能計算 MA60）
    const prices = await db.select()
      .from(twStockPrices)
      .where(eq(twStockPrices.symbol, symbol))
      .orderBy(twStockPrices.date);
    
    if (prices.length < 20) {
      console.log(`  ⚠️  ${symbol}: 歷史價格不足，無法計算技術指標`);
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
        macd: null, // MACD 計算較複雜，暫時略過
        macdSignal: null,
        macdHistogram: null,
        kValue: null, // KD 指標計算較複雜，暫時略過
        dValue: null,
      });
    }
    
    // 批次插入資料庫
    if (indicators.length > 0) {
      await db.insert(twStockIndicators).values(indicators).onDuplicateKeyUpdate({
        set: {
          ma5: indicators[0].ma5,
          ma10: indicators[0].ma10,
          ma20: indicators[0].ma20,
          ma60: indicators[0].ma60,
          rsi14: indicators[0].rsi14,
        }
      });
      console.log(`  ✅ ${symbol}: 計算 ${indicators.length} 筆技術指標`);
    }
    
    return indicators.length;
  } catch (error) {
    console.error(`  ❌ ${symbol}: 計算技術指標失敗 - ${error}`);
    return 0;
  }
}

/**
 * 主函數：載入所有台股資料
 */
async function main() {
  console.log('=== 台股初始資料載入 ===\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ 資料庫連線失敗');
    return;
  }
  
  console.log('✅ 資料庫連線成功\n');
  
  try {
    // 1. 取得所有台股列表（限制前 50 支，避免載入時間過長）
    const stocks = await db.select()
      .from(twStocks)
      .where(eq(twStocks.isActive, true))
      .limit(50);
    
    console.log(`📋 準備載入 ${stocks.length} 支股票的資料\n`);
    
    let totalPrices = 0;
    let totalIndicators = 0;
    
    // 2. 逐一載入每支股票的資料
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      console.log(`\n[${i + 1}/${stocks.length}] ${stock.symbol} ${stock.name}`);
      
      // 載入歷史價格
      const pricesCount = await loadStockPrices(stock.symbol, stock.market, 3);
      totalPrices += pricesCount;
      
      // 計算技術指標
      if (pricesCount > 0) {
        const indicatorsCount = await loadStockIndicators(stock.symbol);
        totalIndicators += indicatorsCount;
      }
      
      // 每 10 支股票更新一次同步狀態
      if ((i + 1) % 10 === 0) {
        await db.insert(twDataSyncStatus).values({
          dataType: 'prices',
          source: 'TWSE',
          lastSyncAt: new Date(),
          status: 'in_progress',
          recordCount: totalPrices,
        });
      }
    }
    
    // 3. 更新最終同步狀態
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
    
    // 4. 總結
    console.log('\n\n=== 載入完成 ===');
    console.log(`✅ 歷史價格: ${totalPrices} 筆`);
    console.log(`✅ 技術指標: ${totalIndicators} 筆`);
    console.log('\n💡 提示：基本面資料需要 FinMind API Key，請參考文件配置後再執行');
    
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

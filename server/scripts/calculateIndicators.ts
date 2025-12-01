/**
 * 計算並載入台股技術指標
 * 基於已載入的歷史價格資料
 */

import { getDb } from '../db';
import { twStockPrices, twStockIndicators, twDataSyncStatus, InsertTwStockIndicator } from '../../drizzle/schema';
import { calculateMA, calculateRSI } from '../integrations/dataTransformer';
import { sql } from 'drizzle-orm';

/**
 * 計算單一股票的技術指標
 */
async function calculateStockIndicators(symbol: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  try {
    // 取得該股票的所有歷史價格（按日期排序）
    const prices = await db.select()
      .from(twStockPrices)
      .where(sql`${twStockPrices.symbol} = ${symbol}`)
      .orderBy(twStockPrices.date);
    
    if (prices.length < 5) {
      return 0; // 資料不足，無法計算指標
    }
    
    // 提取收盤價陣列
    const closePrices = prices.map(p => parseFloat(p.close));
    const indicators: InsertTwStockIndicator[] = [];
    
    // 計算每一天的技術指標
    for (let i = 0; i < prices.length; i++) {
      const pricesUpToNow = closePrices.slice(0, i + 1);
      
      // 計算移動平均線
      const ma5 = calculateMA(pricesUpToNow, 5);
      const ma10 = calculateMA(pricesUpToNow, 10);
      const ma20 = calculateMA(pricesUpToNow, 20);
      const ma60 = calculateMA(pricesUpToNow, 60);
      
      // 計算 RSI
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
    }
    
    return indicators.length;
  } catch (error) {
    console.error(`  ❌ ${symbol}: 計算失敗 - ${error}`);
    return 0;
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('=== 計算台股技術指標 ===\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ 資料庫連線失敗');
    return;
  }
  
  console.log('✅ 資料庫連線成功\n');
  
  try {
    // 1. 取得所有有價格資料的股票代號（去重）
    const stocksWithPrices = await db.select({
      symbol: twStockPrices.symbol
    })
    .from(twStockPrices)
    .groupBy(twStockPrices.symbol);
    
    console.log(`📋 準備計算 ${stocksWithPrices.length} 支股票的技術指標\n`);
    
    let totalIndicators = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // 2. 逐一計算每支股票的技術指標
    for (let i = 0; i < stocksWithPrices.length; i++) {
      const symbol = stocksWithPrices[i].symbol;
      
      try {
        const indicatorsCount = await calculateStockIndicators(symbol);
        
        if (indicatorsCount > 0) {
          totalIndicators += indicatorsCount;
          successCount++;
          
          // 每 50 支股票顯示一次進度
          if (successCount % 50 === 0) {
            console.log(`  進度: ${successCount}/${stocksWithPrices.length} 支股票已完成...`);
          }
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`  ❌ ${symbol}: 計算失敗 - ${error}`);
        }
      }
    }
    
    console.log(`\n=== 計算完成 ===`);
    console.log(`✅ 成功: ${successCount} 支股票`);
    console.log(`📊 技術指標: ${totalIndicators} 筆`);
    console.log(`❌ 錯誤: ${errorCount} 支股票`);
    
    // 3. 更新同步狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'indicators',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: 'success',
      recordCount: totalIndicators,
    });
    
    console.log('\n✅ 同步狀態已更新');
    
  } catch (error) {
    console.error('❌ 計算過程發生錯誤:', error);
  }
}

// 執行計算
main().then(() => {
  console.log('\n計算完成');
  process.exit(0);
}).catch(error => {
  console.error('計算失敗:', error);
  process.exit(1);
});

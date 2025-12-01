/**
 * 載入當日台股價格資料
 * 使用 TWSE STOCK_DAY_ALL API
 */

import { getDb } from '../db';
import { twStockPrices, twDataSyncStatus, InsertTwStockPrice } from '../../drizzle/schema';
import axios from 'axios';

/**
 * 轉換民國年日期為西元年 Date
 * 例如：1141128 → 2025-11-28
 */
function parseROCDate(rocDateStr: string): Date {
  if (!rocDateStr || rocDateStr.length !== 7) {
    throw new Error(`Invalid ROC date format: ${rocDateStr}`);
  }
  
  const year = parseInt(rocDateStr.substring(0, 3)) + 1911; // 民國年轉西元年
  const month = parseInt(rocDateStr.substring(3, 5));
  const day = parseInt(rocDateStr.substring(5, 7));
  
  return new Date(year, month - 1, day);
}

/**
 * 解析價格（移除逗號並轉換為數字）
 */
function parsePrice(priceStr: string): string {
  if (!priceStr || priceStr === '') {
    return '0';
  }
  const numValue = parseFloat(priceStr.replace(/,/g, ''));
  if (isNaN(numValue)) {
    return '0';
  }
  return numValue.toFixed(2);
}

/**
 * 解析成交量
 */
function parseVolume(volumeStr: string): number {
  if (!volumeStr || volumeStr === '') {
    return 0;
  }
  const numValue = parseInt(volumeStr.replace(/,/g, ''));
  if (isNaN(numValue)) {
    return 0;
  }
  return numValue;
}

/**
 * 載入當日股價資料
 */
async function loadTodayPrices() {
  console.log('=== 載入當日台股價格資料 ===\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ 資料庫連線失敗');
    return;
  }
  
  console.log('✅ 資料庫連線成功\n');
  
  try {
    // 1. 呼叫 TWSE API
    console.log('📥 呼叫 TWSE API: /v1/exchangeReport/STOCK_DAY_ALL');
    const response = await axios.get('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', {
      timeout: 60000, // 60 秒超時
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!Array.isArray(response.data)) {
      console.error('❌ API 回應格式錯誤');
      return;
    }
    
    console.log(`✅ 取得 ${response.data.length} 筆股票資料\n`);
    
    // 2. 轉換並插入資料
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const item of response.data) {
      try {
        // 跳過無效資料
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
        
        // 使用 onDuplicateKeyUpdate 避免重複插入
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
        
        // 每 100 筆顯示一次進度
        if (successCount % 100 === 0) {
          console.log(`  進度: ${successCount} 筆已載入...`);
        }
        
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`  ❌ 載入 ${item.Code} 失敗: ${error}`);
        }
      }
    }
    
    console.log(`\n=== 載入完成 ===`);
    console.log(`✅ 成功: ${successCount} 筆`);
    console.log(`⚠️  跳過: ${skipCount} 筆`);
    console.log(`❌ 錯誤: ${errorCount} 筆`);
    
    // 3. 更新同步狀態
    await db.insert(twDataSyncStatus).values({
      dataType: 'prices',
      source: 'TWSE',
      lastSyncAt: new Date(),
      status: 'success',
      recordCount: successCount,
    });
    
    console.log('\n✅ 同步狀態已更新');
    
  } catch (error) {
    console.error('❌ 載入過程發生錯誤:', error);
    
    // 記錄錯誤狀態
    const db = await getDb();
    if (db) {
      await db.insert(twDataSyncStatus).values({
        dataType: 'prices',
        source: 'TWSE',
        lastSyncAt: new Date(),
        status: 'failed',
        recordCount: 0,
        errorMessage: (error as Error).message,
      });
    }
  }
}

// 執行載入
loadTodayPrices().then(() => {
  console.log('\n載入完成');
  process.exit(0);
}).catch(error => {
  console.error('載入失敗:', error);
  process.exit(1);
});

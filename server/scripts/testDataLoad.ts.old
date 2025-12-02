/**
 * 台股資料載入測試腳本
 * 檢查資料庫中是否已有台股資料
 */

import { getDb } from '../db';
import { twStocks, twStockPrices, twStockIndicators, twStockFundamentals, twDataSyncStatus } from '../../drizzle/schema';
import { count } from 'drizzle-orm';

async function testDataLoad() {
  console.log('=== 台股資料載入測試 ===\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ 資料庫連線失敗');
    return;
  }
  
  console.log('✅ 資料庫連線成功\n');
  
  try {
    // 1. 檢查台股基本資料
    const stocksCount = await db.select({ count: count() }).from(twStocks);
    console.log(`📊 台股基本資料 (twStocks): ${stocksCount[0]?.count || 0} 筆`);
    
    // 2. 檢查台股歷史價格
    const pricesCount = await db.select({ count: count() }).from(twStockPrices);
    console.log(`📈 台股歷史價格 (twStockPrices): ${pricesCount[0]?.count || 0} 筆`);
    
    // 3. 檢查台股技術指標
    const indicatorsCount = await db.select({ count: count() }).from(twStockIndicators);
    console.log(`📉 台股技術指標 (twStockIndicators): ${indicatorsCount[0]?.count || 0} 筆`);
    
    // 4. 檢查台股基本面資料
    const fundamentalsCount = await db.select({ count: count() }).from(twStockFundamentals);
    console.log(`💰 台股基本面資料 (twStockFundamentals): ${fundamentalsCount[0]?.count || 0} 筆`);
    
    // 5. 檢查資料同步狀態
    const syncStatus = await db.select().from(twDataSyncStatus);
    console.log(`\n⏱️  資料同步狀態 (twDataSyncStatus): ${syncStatus.length} 筆`);
    
    if (syncStatus.length > 0) {
      console.log('\n最近同步記錄：');
      syncStatus.forEach(status => {
        console.log(`  - ${status.dataType} (${status.source}): ${status.status} at ${status.lastSyncAt}`);
      });
    }
    
    // 6. 取得範例資料
    if (stocksCount[0]?.count && stocksCount[0].count > 0) {
      const sampleStocks = await db.select().from(twStocks).limit(5);
      console.log('\n📋 範例股票資料：');
      sampleStocks.forEach(stock => {
        console.log(`  - ${stock.symbol}: ${stock.name} (${stock.market})`);
      });
    }
    
    // 7. 總結
    console.log('\n=== 測試總結 ===');
    const totalRecords = (stocksCount[0]?.count || 0) + 
                        (pricesCount[0]?.count || 0) + 
                        (indicatorsCount[0]?.count || 0) + 
                        (fundamentalsCount[0]?.count || 0);
    
    if (totalRecords === 0) {
      console.log('⚠️  資料庫中尚無台股資料，需要執行資料載入');
      console.log('💡 建議執行: pnpm run sync:tw-stocks');
    } else {
      console.log(`✅ 資料庫中已有 ${totalRecords} 筆台股資料`);
    }
    
  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  }
}

// 執行測試
testDataLoad().then(() => {
  console.log('\n測試完成');
  process.exit(0);
}).catch(error => {
  console.error('測試失敗:', error);
  process.exit(1);
});

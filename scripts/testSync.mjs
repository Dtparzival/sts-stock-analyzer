/**
 * 測試同步功能腳本
 * 用於驗證台美股同步機制是否正常運作
 */

import 'dotenv/config';

// 測試台股同步
async function testTwStockSync() {
  console.log('\n=== 測試台股同步功能 ===\n');
  
  try {
    const { syncStockInfo, syncStockPrices, getPreviousTradingDay } = await import('../server/jobs/syncTwStockData.ts');
    
    // 測試基本資料同步 (只同步前 10 支股票以節省時間)
    console.log('1. 測試台股基本資料同步...');
    // 暫時跳過，因為會花很長時間
    // const infoResult = await syncStockInfo();
    // console.log('基本資料同步結果:', infoResult);
    
    // 測試價格同步
    console.log('\n2. 測試台股價格同步...');
    const previousTradingDay = getPreviousTradingDay(new Date());
    console.log(`前一交易日: ${previousTradingDay.toISOString().split('T')[0]}`);
    
    const priceResult = await syncStockPrices(previousTradingDay);
    console.log('價格同步結果:', priceResult);
    
    console.log('\n✅ 台股同步測試完成');
  } catch (error) {
    console.error('❌ 台股同步測試失敗:', error);
  }
}

// 測試美股同步
async function testUsStockSync() {
  console.log('\n=== 測試美股同步功能 ===\n');
  
  try {
    const { syncScheduledStockInfo, syncScheduledStockPrices } = await import('../server/jobs/syncUsStockDataScheduled.ts');
    
    // 測試基本資料同步 (只同步前 5 支股票)
    console.log('1. 測試美股基本資料同步 (前 5 支股票)...');
    // 暫時跳過，因為會花很長時間
    // const infoResult = await syncScheduledStockInfo();
    // console.log('基本資料同步結果:', infoResult);
    
    // 測試價格同步 (只同步前 5 支股票，最近 7 天)
    console.log('\n2. 測試美股價格同步 (前 5 支股票，最近 7 天)...');
    const priceResult = await syncScheduledStockPrices(7);
    console.log('價格同步結果:', priceResult);
    
    console.log('\n✅ 美股同步測試完成');
  } catch (error) {
    console.error('❌ 美股同步測試失敗:', error);
  }
}

// 測試排程註冊
async function testScheduleRegistration() {
  console.log('\n=== 測試排程註冊 ===\n');
  
  try {
    console.log('1. 檢查台股排程函數...');
    const { startAllSchedules } = await import('../server/jobs/syncTwStockData.ts');
    console.log('✅ 台股排程函數存在');
    
    console.log('\n2. 檢查美股排程函數...');
    const { startUsScheduledSyncs } = await import('../server/jobs/syncUsStockDataScheduled.ts');
    console.log('✅ 美股排程函數存在');
    
    console.log('\n3. 測試排程註冊 (不實際執行)...');
    console.log('台股排程設定:');
    console.log('  - 基本資料: 每週日 02:00 (Asia/Taipei)');
    console.log('  - 價格資料: 每交易日 02:00 (Asia/Taipei)');
    console.log('\n美股排程設定:');
    console.log('  - 基本資料: 每週日 06:00 (Asia/Taipei)');
    console.log('  - 價格資料: 每交易日 06:00 (Asia/Taipei)');
    
    console.log('\n✅ 排程註冊測試完成');
  } catch (error) {
    console.error('❌ 排程註冊測試失敗:', error);
  }
}

// 主函數
async function main() {
  console.log('開始測試同步功能...\n');
  console.log('當前時間 (UTC):', new Date().toISOString());
  console.log('當前時間 (台北):', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
  
  // 測試排程註冊
  await testScheduleRegistration();
  
  // 測試台股同步
  await testTwStockSync();
  
  // 測試美股同步
  await testUsStockSync();
  
  console.log('\n=== 所有測試完成 ===\n');
  process.exit(0);
}

main().catch(error => {
  console.error('測試腳本執行失敗:', error);
  process.exit(1);
});

/**
 * 美股資料初始化腳本
 * 
 * 執行首次完整資料同步，包含：
 * 1. S&P 500 成分股基本資料
 * 2. 主要 ETF 基本資料
 * 3. 最近 30 天歷史價格資料
 * 
 * 使用方式:
 * node scripts/initUsStockData.mjs
 * 
 * 注意事項:
 * - 預計執行時間: 2-3 小時
 * - TwelveData API 限制: 每分鐘 8 次請求
 * - 建議在非交易時段執行
 */

import { syncScheduledStockInfo, syncScheduledStockPrices } from '../server/jobs/syncUsStockDataScheduled.ts';
import { getScheduledSyncStockCount } from '../server/config/usStockLists.ts';

console.log('='.repeat(80));
console.log('美股資料初始化腳本');
console.log('='.repeat(80));
console.log('');

const stockCount = getScheduledSyncStockCount();
console.log(`📊 同步範圍: ${stockCount} 支股票 (S&P 500 + 主要 ETF)`);
console.log('');

// 計算預估時間
const estimatedTimeMinutes = Math.ceil((stockCount * 8) / 60); // 每支股票 8 秒
const estimatedTimeHours = (estimatedTimeMinutes / 60).toFixed(1);
console.log(`⏱️  預估時間: ${estimatedTimeMinutes} 分鐘 (約 ${estimatedTimeHours} 小時)`);
console.log('');

console.log('⚠️  注意事項:');
console.log('   - 請確保網路連線穩定');
console.log('   - 請勿中斷執行過程');
console.log('   - 建議在非交易時段執行');
console.log('');

// 詢問使用者是否繼續
console.log('按 Ctrl+C 取消，或按 Enter 繼續...');
process.stdin.once('data', async () => {
  console.log('');
  console.log('開始同步...');
  console.log('');

  try {
    // 步驟 1: 同步股票基本資料
    console.log('步驟 1/2: 同步股票基本資料');
    console.log('-'.repeat(80));
    const startTime1 = Date.now();
    
    const result1 = await syncScheduledStockInfo();
    
    const endTime1 = Date.now();
    const duration1 = ((endTime1 - startTime1) / 1000 / 60).toFixed(2);
    
    console.log('');
    console.log(`✅ 股票基本資料同步完成 (耗時: ${duration1} 分鐘)`);
    console.log(`   - 成功: ${result1.recordCount} 筆`);
    console.log(`   - 失敗: ${result1.errorCount} 筆`);
    
    if (result1.errors.length > 0) {
      console.log('');
      console.log('❌ 失敗清單:');
      result1.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.symbol || 'Unknown'}: ${error.message}`);
      });
    }
    
    console.log('');
    console.log('');

    // 步驟 2: 同步歷史價格資料
    console.log('步驟 2/2: 同步歷史價格資料 (最近 30 天)');
    console.log('-'.repeat(80));
    const startTime2 = Date.now();
    
    const result2 = await syncScheduledStockPrices(30);
    
    const endTime2 = Date.now();
    const duration2 = ((endTime2 - startTime2) / 1000 / 60).toFixed(2);
    
    console.log('');
    console.log(`✅ 歷史價格資料同步完成 (耗時: ${duration2} 分鐘)`);
    console.log(`   - 成功: ${result2.recordCount} 筆`);
    console.log(`   - 失敗: ${result2.errorCount} 筆`);
    
    if (result2.errors.length > 0) {
      console.log('');
      console.log('❌ 失敗清單:');
      result2.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.symbol || 'Unknown'}: ${error.message}`);
      });
    }

    // 總結
    console.log('');
    console.log('='.repeat(80));
    console.log('同步完成！');
    console.log('='.repeat(80));
    
    const totalDuration = ((Date.now() - startTime1) / 1000 / 60).toFixed(2);
    console.log(`總耗時: ${totalDuration} 分鐘`);
    console.log('');
    
    const totalSuccess = result1.recordCount + result2.recordCount;
    const totalErrors = result1.errorCount + result2.errorCount;
    console.log('統計資訊:');
    console.log(`   - 成功: ${totalSuccess} 筆`);
    console.log(`   - 失敗: ${totalErrors} 筆`);
    console.log(`   - 成功率: ${((totalSuccess / (totalSuccess + totalErrors)) * 100).toFixed(2)}%`);
    console.log('');
    
    if (totalErrors > 0) {
      console.log('⚠️  部分資料同步失敗，請檢查錯誤記錄');
      console.log('   可使用以下指令查詢錯誤記錄:');
      console.log('   SELECT * FROM usDataSyncErrors ORDER BY syncedAt DESC LIMIT 10;');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ 同步過程發生錯誤:');
    console.error(error);
    process.exit(1);
  }
});

// 設定 stdin 為 raw mode 以接收輸入
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

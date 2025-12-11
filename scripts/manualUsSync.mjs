/**
 * 手動觸發美股完整同步
 * 
 * 此腳本會同步所有 S&P 500 + 主要 ETF 的基本資料和價格資料
 * 預計執行時間: 約 2.4 小時 (532 支股票 × 8 秒間隔)
 */

import 'dotenv/config';

async function main() {
  console.log('='.repeat(80));
  console.log('美股完整同步工具');
  console.log('='.repeat(80));
  console.log('\n⚠️  此腳本將同步 532 支股票的完整資料');
  console.log('⚠️  預計執行時間: 約 2.4 小時');
  console.log('⚠️  請確保網路連線穩定\n');
  
  const { 
    syncScheduledStockInfo, 
    syncScheduledStockPrices 
  } = await import('../server/jobs/syncUsStockDataScheduled.ts');
  
  console.log('開始時間:', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
  console.log('\n' + '='.repeat(80));
  
  // 1. 同步基本資料
  console.log('\n[1/2] 開始同步股票基本資料...\n');
  const infoResult = await syncScheduledStockInfo();
  
  console.log('\n基本資料同步結果:');
  console.log(`  成功: ${infoResult.recordCount} 支`);
  console.log(`  失敗: ${infoResult.errorCount} 支`);
  console.log(`  狀態: ${infoResult.success ? '✅ 成功' : '❌ 失敗'}`);
  
  if (infoResult.errorCount > 0) {
    console.log('\n失敗股票:');
    infoResult.errors.slice(0, 10).forEach(e => {
      console.log(`  - ${e.symbol || 'System'}: ${e.message}`);
    });
    if (infoResult.errors.length > 10) {
      console.log(`  ... 還有 ${infoResult.errors.length - 10} 個錯誤`);
    }
  }
  
  // 2. 同步價格資料 (最近 30 天)
  console.log('\n' + '='.repeat(80));
  console.log('\n[2/2] 開始同步歷史價格資料 (最近 30 天)...\n');
  const priceResult = await syncScheduledStockPrices(30);
  
  console.log('\n價格資料同步結果:');
  console.log(`  成功: ${priceResult.recordCount} 筆`);
  console.log(`  失敗: ${priceResult.errorCount} 支股票`);
  console.log(`  狀態: ${priceResult.success ? '✅ 成功' : '❌ 失敗'}`);
  
  if (priceResult.errorCount > 0) {
    console.log('\n失敗股票:');
    priceResult.errors.slice(0, 10).forEach(e => {
      console.log(`  - ${e.symbol || 'System'}: ${e.message}`);
    });
    if (priceResult.errors.length > 10) {
      console.log(`  ... 還有 ${priceResult.errors.length - 10} 個錯誤`);
    }
  }
  
  // 總結
  console.log('\n' + '='.repeat(80));
  console.log('同步完成！');
  console.log('='.repeat(80));
  console.log('\n結束時間:', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
  console.log('\n總結:');
  console.log(`  基本資料: ${infoResult.recordCount}/${infoResult.recordCount + infoResult.errorCount} 成功`);
  console.log(`  價格資料: ${priceResult.recordCount} 筆記錄`);
  console.log(`  整體狀態: ${infoResult.success && priceResult.success ? '✅ 完全成功' : '⚠️  部分失敗'}`);
  
  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ 同步失敗:', error);
  process.exit(1);
});

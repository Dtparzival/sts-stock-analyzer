/**
 * 美股首次完整資料同步腳本
 * 
 * 功能:
 * 1. 同步 S&P 500 + 主要 ETF 的基本資料
 * 2. 同步最近 30 天的歷史價格資料
 * 3. 即時顯示同步進度
 * 4. 記錄同步統計資訊
 * 
 * 預計執行時間: 約 2.4 小時
 * 
 * 使用方式:
 * node scripts/initialUsStockSync.mjs
 */

import { syncScheduledStockInfo, syncScheduledStockPrices } from '../server/jobs/syncUsStockDataScheduled.js';

/**
 * 格式化時間顯示
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * 主執行函數
 */
async function main() {
  console.log('='.repeat(80));
  console.log('美股首次完整資料同步');
  console.log('='.repeat(80));
  console.log('');
  console.log('同步範圍:');
  console.log('  - S&P 500 成分股: 501 支');
  console.log('  - 主要 ETF: 32 支');
  console.log('  - 總計: 533 支股票');
  console.log('');
  console.log('同步內容:');
  console.log('  - 股票基本資料 (名稱、交易所、產業等)');
  console.log('  - 歷史價格資料 (最近 30 天)');
  console.log('');
  console.log('預計執行時間: 約 2.4 小時');
  console.log('');
  console.log('='.repeat(80));
  console.log('');

  const overallStartTime = Date.now();

  // ========================================
  // 階段一: 同步股票基本資料
  // ========================================
  console.log('');
  console.log('▶ 階段一: 同步股票基本資料');
  console.log('-'.repeat(80));
  
  const stockInfoStartTime = Date.now();
  const stockInfoResult = await syncScheduledStockInfo();
  const stockInfoDuration = Date.now() - stockInfoStartTime;

  console.log('');
  console.log('階段一完成:');
  console.log(`  ✓ 成功: ${stockInfoResult.recordCount} 支股票`);
  console.log(`  ✗ 失敗: ${stockInfoResult.errorCount} 支股票`);
  console.log(`  ⏱ 耗時: ${formatDuration(stockInfoDuration)}`);
  
  if (stockInfoResult.errors.length > 0) {
    console.log('');
    console.log('失敗清單:');
    stockInfoResult.errors.slice(0, 10).forEach(err => {
      console.log(`  - ${err.symbol || 'SYSTEM'}: ${err.message}`);
    });
    if (stockInfoResult.errors.length > 10) {
      console.log(`  ... 還有 ${stockInfoResult.errors.length - 10} 個錯誤`);
    }
  }

  // ========================================
  // 階段二: 同步歷史價格資料
  // ========================================
  console.log('');
  console.log('▶ 階段二: 同步歷史價格資料 (最近 30 天)');
  console.log('-'.repeat(80));
  
  const priceStartTime = Date.now();
  const priceResult = await syncScheduledStockPrices(30);
  const priceDuration = Date.now() - priceStartTime;

  console.log('');
  console.log('階段二完成:');
  console.log(`  ✓ 成功: ${priceResult.recordCount} 筆價格記錄`);
  console.log(`  ✗ 失敗: ${priceResult.errorCount} 支股票`);
  console.log(`  ⏱ 耗時: ${formatDuration(priceDuration)}`);
  
  if (priceResult.errors.length > 0) {
    console.log('');
    console.log('失敗清單:');
    priceResult.errors.slice(0, 10).forEach(err => {
      console.log(`  - ${err.symbol || 'SYSTEM'}: ${err.message}`);
    });
    if (priceResult.errors.length > 10) {
      console.log(`  ... 還有 ${priceResult.errors.length - 10} 個錯誤`);
    }
  }

  // ========================================
  // 總結報告
  // ========================================
  const overallDuration = Date.now() - overallStartTime;

  console.log('');
  console.log('='.repeat(80));
  console.log('同步完成總結');
  console.log('='.repeat(80));
  console.log('');
  console.log('基本資料:');
  console.log(`  ✓ 成功: ${stockInfoResult.recordCount} 支`);
  console.log(`  ✗ 失敗: ${stockInfoResult.errorCount} 支`);
  console.log('');
  console.log('歷史價格:');
  console.log(`  ✓ 成功: ${priceResult.recordCount} 筆`);
  console.log(`  ✗ 失敗: ${priceResult.errorCount} 支股票`);
  console.log('');
  console.log('執行時間:');
  console.log(`  - 階段一 (基本資料): ${formatDuration(stockInfoDuration)}`);
  console.log(`  - 階段二 (歷史價格): ${formatDuration(priceDuration)}`);
  console.log(`  - 總計: ${formatDuration(overallDuration)}`);
  console.log('');
  
  const overallSuccess = stockInfoResult.success && priceResult.success;
  if (overallSuccess) {
    console.log('✅ 所有資料同步成功！');
  } else {
    console.log('⚠️  部分資料同步失敗，請檢查錯誤記錄');
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
}

// 執行主函數
main()
  .then(() => {
    console.log('腳本執行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('腳本執行失敗:', error);
    process.exit(1);
  });

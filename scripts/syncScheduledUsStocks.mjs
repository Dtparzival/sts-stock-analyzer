/**
 * 手動執行美股定期同步 (S&P 500 + 主要 ETF)
 * 
 * 使用方式:
 * node scripts/syncScheduledUsStocks.mjs [action]
 * 
 * action:
 * - info: 同步股票基本資料
 * - prices: 同步歷史價格 (最近 30 天)
 * - all: 同步所有資料 (預設)
 */

import {
  syncScheduledStockInfo,
  syncScheduledStockPrices,
} from '../server/jobs/syncUsStockDataScheduled.ts';
import {
  getScheduledSyncStockCount,
  getMajorETFCount,
  getSP500StockCount,
} from '../server/config/usStockLists.ts';

const action = process.argv[2] || 'all';

async function main() {
  console.log('='.repeat(60));
  console.log('美股定期同步腳本 (S&P 500 + 主要 ETF)');
  console.log('='.repeat(60));
  console.log(`同步範圍:`);
  console.log(`  - S&P 500 成分股: ${getSP500StockCount()} 支`);
  console.log(`  - 主要 ETF: ${getMajorETFCount()} 支`);
  console.log(`  - 總計: ${getScheduledSyncStockCount()} 支`);
  console.log('='.repeat(60));

  try {
    if (action === 'info' || action === 'all') {
      console.log('\n[1/2] 開始同步股票基本資料...');
      const infoResult = await syncScheduledStockInfo();
      
      console.log('\n股票基本資料同步結果:');
      console.log(`  - 成功: ${infoResult.recordCount} 筆`);
      console.log(`  - 失敗: ${infoResult.errorCount} 筆`);
      console.log(`  - 狀態: ${infoResult.success ? '✅ 成功' : '❌ 失敗'}`);
      
      if (infoResult.errorCount > 0) {
        console.log('\n錯誤詳情:');
        infoResult.errors.slice(0, 10).forEach(err => {
          console.log(`  - ${err.symbol || 'System'}: ${err.message}`);
        });
        if (infoResult.errors.length > 10) {
          console.log(`  ... 還有 ${infoResult.errors.length - 10} 個錯誤`);
        }
      }
    }

    if (action === 'prices' || action === 'all') {
      console.log('\n[2/2] 開始同步歷史價格 (最近 30 天)...');
      const priceResult = await syncScheduledStockPrices();
      
      console.log('\n歷史價格同步結果:');
      console.log(`  - 成功: ${priceResult.recordCount} 筆`);
      console.log(`  - 失敗: ${priceResult.errorCount} 筆`);
      console.log(`  - 狀態: ${priceResult.success ? '✅ 成功' : '❌ 失敗'}`);
      
      if (priceResult.errorCount > 0) {
        console.log('\n錯誤詳情:');
        priceResult.errors.slice(0, 10).forEach(err => {
          console.log(`  - ${err.symbol || 'System'}: ${err.message}`);
        });
        if (priceResult.errors.length > 10) {
          console.log(`  ... 還有 ${priceResult.errors.length - 10} 個錯誤`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('同步完成!');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('\n同步過程發生錯誤:', error);
    process.exit(1);
  }
}

main();

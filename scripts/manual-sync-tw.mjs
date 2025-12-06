/**
 * 台股資料手動同步腳本
 * 用於初始化或補充台股資料庫
 */

import { syncStockInfo, syncStockPrices } from '../server/jobs/syncTwStockData.ts';

async function main() {
  console.log('=== 台股資料手動同步開始 ===\n');
  
  try {
    // 1. 同步股票基本資料
    console.log('[1/2] 同步股票基本資料...');
    const stockInfoResult = await syncStockInfo();
    
    if (stockInfoResult.success) {
      console.log(`✓ 股票基本資料同步成功: ${stockInfoResult.recordCount} 檔股票`);
    } else {
      console.error(`✗ 股票基本資料同步失敗: ${stockInfoResult.errorCount} 個錯誤`);
      stockInfoResult.errors.forEach(err => {
        console.error(`  - ${err.symbol || 'SYSTEM'}: ${err.message}`);
      });
    }
    
    console.log('');
    
    // 2. 同步歷史價格資料（最近 5 個交易日）
    console.log('[2/2] 同步歷史價格資料（最近 5 個交易日）...');
    
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 10); // 往前推 10 天以確保涵蓋 5 個交易日
    
    const priceResult = await syncStockPrices(startDate, endDate);
    
    if (priceResult.success) {
      console.log(`✓ 歷史價格同步成功: ${priceResult.recordCount} 筆記錄`);
    } else {
      console.error(`✗ 歷史價格同步失敗: ${priceResult.errorCount} 個錯誤`);
      priceResult.errors.slice(0, 10).forEach(err => {
        console.error(`  - ${err.symbol || 'SYSTEM'}: ${err.message}`);
      });
      if (priceResult.errors.length > 10) {
        console.error(`  ... 還有 ${priceResult.errors.length - 10} 個錯誤`);
      }
    }
    
    console.log('\n=== 台股資料同步完成 ===');
    
  } catch (error) {
    console.error('\n同步過程發生錯誤:', error);
    process.exit(1);
  }
}

main();

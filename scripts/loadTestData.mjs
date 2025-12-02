/**
 * 美股測試資料載入腳本
 * 
 * 只載入少量股票用於測試，避免超過 API 限制
 * 
 * 使用方式:
 * pnpm exec tsx scripts/loadTestData.mjs
 */

import {
  syncSingleStockInfo,
  syncSingleStockPrices,
  getPreviousUsTradingDay,
} from '../server/jobs/syncUsStockData.ts';

/**
 * 測試用股票清單（只載入 3 支）
 */
const TEST_SYMBOLS = [
  'AAPL',  // Apple
  'MSFT',  // Microsoft
  'SPY',   // S&P 500 ETF
];

/**
 * 主程式
 */
async function main() {
  console.log('='.repeat(60));
  console.log('美股測試資料載入腳本');
  console.log('='.repeat(60));
  console.log(`\n要載入的股票: ${TEST_SYMBOLS.join(', ')}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const symbol of TEST_SYMBOLS) {
    console.log(`\n處理 ${symbol}...`);
    console.log('-'.repeat(60));

    try {
      // 步驟 1: 載入基本資料
      console.log(`  [1/2] 載入基本資料...`);
      const infoSuccess = await syncSingleStockInfo(symbol);
      
      if (infoSuccess) {
        console.log(`  ✓ 基本資料載入成功`);
      } else {
        console.log(`  ✗ 基本資料載入失敗`);
        errorCount++;
        continue;
      }

      // 等待 8 秒避免 API 限流
      console.log(`  等待 8 秒...`);
      await new Promise(resolve => setTimeout(resolve, 8000));

      // 步驟 2: 載入歷史價格（最近 7 天）
      console.log(`  [2/2] 載入歷史價格...`);
      const endDate = getPreviousUsTradingDay(new Date());
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const priceResult = await syncSingleStockPrices(symbol, startDate, endDate);
      
      if (priceResult.success) {
        console.log(`  ✓ 歷史價格載入成功 (${priceResult.recordCount} 筆)`);
        successCount++;
      } else {
        console.log(`  ✗ 歷史價格載入失敗`);
        errorCount++;
      }

      // 等待 8 秒避免 API 限流
      if (symbol !== TEST_SYMBOLS[TEST_SYMBOLS.length - 1]) {
        console.log(`  等待 8 秒...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
      }

    } catch (error) {
      console.error(`  ✗ 錯誤:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  // 總結
  console.log('\n' + '='.repeat(60));
  console.log('載入完成！');
  console.log('='.repeat(60));
  console.log(`成功: ${successCount} 支股票`);
  console.log(`失敗: ${errorCount} 支股票`);
  console.log('');

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('執行失敗:', error);
  process.exit(1);
});

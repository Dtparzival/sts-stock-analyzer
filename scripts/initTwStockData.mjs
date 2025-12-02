/**
 * 台股資料初始化腳本
 * 
 * 用於首次載入台股基本資料與歷史價格資料
 * 
 * 使用方式:
 *   node scripts/initTwStockData.mjs [options]
 * 
 * 選項:
 *   --stocks-only    僅初始化股票基本資料
 *   --prices-only    僅初始化歷史價格資料
 *   --days=N         載入最近 N 天的價格資料（預設 30 天）
 */

import { syncStockInfo, syncStockPricesRange, isTradingDay } from '../server/jobs/syncTwStockData.ts';
import { getDb } from '../server/db.ts';
import { twStocks } from '../drizzle/schema.ts';
import { count } from 'drizzle-orm';

/**
 * 解析命令列參數
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    stocksOnly: false,
    pricesOnly: false,
    days: 30,
  };

  for (const arg of args) {
    if (arg === '--stocks-only') {
      options.stocksOnly = true;
    } else if (arg === '--prices-only') {
      options.pricesOnly = true;
    } else if (arg.startsWith('--days=')) {
      options.days = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

/**
 * 計算日期範圍
 */
function calculateDateRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return { startDate, endDate };
}

/**
 * 主程式
 */
async function main() {
  console.log('='.repeat(60));
  console.log('台股資料初始化腳本');
  console.log('='.repeat(60));
  console.log();

  const options = parseArgs();

  console.log('執行選項:');
  console.log(`  - 僅初始化股票基本資料: ${options.stocksOnly}`);
  console.log(`  - 僅初始化歷史價格資料: ${options.pricesOnly}`);
  console.log(`  - 載入天數: ${options.days} 天`);
  console.log();

  try {
    // 1. 初始化股票基本資料
    if (!options.pricesOnly) {
      console.log('[1/2] 初始化股票基本資料...');
      console.log('-'.repeat(60));

      const stockResult = await syncStockInfo();

      if (stockResult.success) {
        console.log(`✓ 成功載入 ${stockResult.recordCount} 檔股票基本資料`);
      } else {
        console.error(`✗ 股票基本資料載入失敗`);
        console.error(`  錯誤數量: ${stockResult.errorCount}`);
        stockResult.errors.forEach(err => {
          console.error(`  - ${err.message}`);
        });
      }

      console.log();
    }

    // 2. 初始化歷史價格資料
    if (!options.stocksOnly) {
      console.log('[2/2] 初始化歷史價格資料...');
      console.log('-'.repeat(60));

      // 檢查是否有股票資料
      const db = await getDb();
      if (!db) {
        throw new Error('無法連接資料庫');
      }

      const stockCount = await db.select({ count: count() }).from(twStocks);
      if (stockCount[0].count === 0) {
        console.warn('⚠ 資料庫中沒有股票資料，請先執行股票基本資料初始化');
        console.warn('  執行指令: node scripts/initTwStockData.mjs --stocks-only');
        process.exit(1);
      }

      console.log(`資料庫中共有 ${stockCount[0].count} 檔股票`);
      console.log();

      // 計算日期範圍
      const { startDate, endDate } = calculateDateRange(options.days);
      console.log(`載入日期範圍: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`);
      console.log();

      // 計算預計交易日數量
      let tradingDays = 0;
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        if (isTradingDay(tempDate)) {
          tradingDays++;
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      console.log(`預計載入 ${tradingDays} 個交易日的資料`);
      console.log(`預計總筆數: ${stockCount[0].count * tradingDays} 筆 (${stockCount[0].count} 檔股票 × ${tradingDays} 天)`);
      console.log();

      console.log('開始載入歷史價格資料...');
      const priceResult = await syncStockPricesRange(startDate, endDate);

      console.log();
      console.log('-'.repeat(60));

      if (priceResult.success) {
        console.log(`✓ 成功載入 ${priceResult.recordCount} 筆歷史價格資料`);
      } else {
        console.log(`⚠ 歷史價格資料載入完成，但有部分錯誤`);
        console.log(`  成功: ${priceResult.recordCount} 筆`);
        console.log(`  失敗: ${priceResult.errorCount} 筆`);

        if (priceResult.errors.length > 0) {
          console.log();
          console.log('錯誤詳情（前 10 筆）:');
          priceResult.errors.slice(0, 10).forEach(err => {
            console.log(`  - ${err.symbol || 'System'}: ${err.message}`);
          });
        }
      }

      console.log();
    }

    // 3. 顯示最終統計
    console.log('='.repeat(60));
    console.log('初始化完成');
    console.log('='.repeat(60));

    const db = await getDb();
    if (db) {
      const stockCount = await db.select({ count: count() }).from(twStocks);
      console.log(`股票基本資料: ${stockCount[0].count} 檔`);

      // 計算價格資料筆數
      const { countTwStockPriceRecords } = await import('../server/db.ts');
      const priceCount = await countTwStockPriceRecords();
      console.log(`歷史價格資料: ${priceCount} 筆`);
    }

    console.log();
    console.log('✓ 初始化成功完成');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('初始化失敗');
    console.error('='.repeat(60));
    console.error(error);
    console.error();
    process.exit(1);
  }
}

main();

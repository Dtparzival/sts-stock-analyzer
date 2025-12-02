/**
 * 台股資料驗證腳本
 * 
 * 用於檢查資料完整性與品質
 * 
 * 使用方式:
 *   node scripts/validateData.mjs [options]
 * 
 * 選項:
 *   --type=TYPE    驗證類型: all, stocks, prices, sync
 *   --symbol=CODE  驗證特定股票（僅用於 prices 類型）
 *   --verbose      顯示詳細資訊
 * 
 * 範例:
 *   # 驗證所有資料
 *   node scripts/validateData.mjs --type=all
 * 
 *   # 驗證股票基本資料
 *   node scripts/validateData.mjs --type=stocks
 * 
 *   # 驗證價格資料
 *   node scripts/validateData.mjs --type=prices
 * 
 *   # 驗證特定股票的價格資料
 *   node scripts/validateData.mjs --type=prices --symbol=2330 --verbose
 */

import { getDb } from '../server/db.ts';
import {
  twStocks,
  twStockPrices,
  twDataSyncStatus,
  twDataSyncErrors,
} from '../drizzle/schema.ts';
import { count, eq, desc, sql } from 'drizzle-orm';

/**
 * 解析命令列參數
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'all',
    symbol: null,
    verbose: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1];
    } else if (arg.startsWith('--symbol=')) {
      options.symbol = arg.split('=')[1];
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

/**
 * 驗證股票基本資料
 */
async function validateStocks(db, verbose) {
  console.log('驗證股票基本資料...');
  console.log('-'.repeat(60));

  const issues = [];

  // 1. 統計總數
  const totalCount = await db.select({ count: count() }).from(twStocks);
  console.log(`✓ 總股票數: ${totalCount[0].count}`);

  // 2. 檢查活躍股票數
  const activeCount = await db
    .select({ count: count() })
    .from(twStocks)
    .where(eq(twStocks.isActive, true));
  console.log(`✓ 活躍股票數: ${activeCount[0].count}`);

  // 3. 檢查市場分布
  const twseCount = await db
    .select({ count: count() })
    .from(twStocks)
    .where(eq(twStocks.market, 'TWSE'));
  const tpexCount = await db
    .select({ count: count() })
    .from(twStocks)
    .where(eq(twStocks.market, 'TPEx'));
  console.log(`✓ 上市 (TWSE): ${twseCount[0].count}`);
  console.log(`✓ 上櫃 (TPEx): ${tpexCount[0].count}`);

  // 4. 檢查必填欄位
  const missingName = await db
    .select({ count: count() })
    .from(twStocks)
    .where(sql`${twStocks.name} IS NULL OR ${twStocks.name} = ''`);

  if (missingName[0].count > 0) {
    issues.push(`${missingName[0].count} 檔股票缺少名稱`);
  }

  // 5. 檢查產業分類
  const missingIndustry = await db
    .select({ count: count() })
    .from(twStocks)
    .where(sql`${twStocks.industry} IS NULL OR ${twStocks.industry} = ''`);

  if (missingIndustry[0].count > 0) {
    issues.push(`${missingIndustry[0].count} 檔股票缺少產業分類`);
  }

  console.log();

  if (issues.length > 0) {
    console.log('⚠ 發現問題:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('✓ 股票基本資料驗證通過');
  }

  console.log();

  return issues.length === 0;
}

/**
 * 驗證價格資料
 */
async function validatePrices(db, symbol, verbose) {
  console.log('驗證價格資料...');
  console.log('-'.repeat(60));

  const issues = [];

  if (symbol) {
    // 驗證特定股票
    console.log(`驗證股票: ${symbol}`);
    console.log();

    const priceCount = await db
      .select({ count: count() })
      .from(twStockPrices)
      .where(eq(twStockPrices.symbol, symbol));

    console.log(`✓ 價格記錄數: ${priceCount[0].count}`);

    if (priceCount[0].count === 0) {
      issues.push(`股票 ${symbol} 沒有價格資料`);
    } else {
      // 檢查最新日期
      const latestPrice = await db
        .select()
        .from(twStockPrices)
        .where(eq(twStockPrices.symbol, symbol))
        .orderBy(desc(twStockPrices.date))
        .limit(1);

      if (latestPrice.length > 0) {
        const latestDate = new Date(latestPrice[0].date);
        const today = new Date();
        const daysDiff = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24));

        console.log(`✓ 最新日期: ${latestDate.toISOString().split('T')[0]} (${daysDiff} 天前)`);

        if (daysDiff > 7) {
          issues.push(`股票 ${symbol} 的價格資料已超過 7 天未更新`);
        }

        if (verbose) {
          console.log();
          console.log('最新價格資料:');
          console.log(`  開盤: ${latestPrice[0].open / 100}`);
          console.log(`  最高: ${latestPrice[0].high / 100}`);
          console.log(`  最低: ${latestPrice[0].low / 100}`);
          console.log(`  收盤: ${latestPrice[0].close / 100}`);
          console.log(`  成交量: ${latestPrice[0].volume}`);
        }
      }
    }
  } else {
    // 驗證所有價格資料
    const totalPriceCount = await db.select({ count: count() }).from(twStockPrices);
    console.log(`✓ 總價格記錄數: ${totalPriceCount[0].count}`);

    // 檢查有價格資料的股票數
    const stocksWithPrices = await db
      .select({ count: sql`COUNT(DISTINCT ${twStockPrices.symbol})` })
      .from(twStockPrices);

    console.log(`✓ 有價格資料的股票數: ${stocksWithPrices[0].count}`);

    // 檢查沒有價格資料的活躍股票
    const activeStocks = await db
      .select({ symbol: twStocks.symbol })
      .from(twStocks)
      .where(eq(twStocks.isActive, true));

    let stocksWithoutPrices = 0;
    for (const stock of activeStocks) {
      const priceCount = await db
        .select({ count: count() })
        .from(twStockPrices)
        .where(eq(twStockPrices.symbol, stock.symbol));

      if (priceCount[0].count === 0) {
        stocksWithoutPrices++;
        if (verbose) {
          console.log(`  ⚠ 股票 ${stock.symbol} 沒有價格資料`);
        }
      }
    }

    if (stocksWithoutPrices > 0) {
      issues.push(`${stocksWithoutPrices} 檔活躍股票沒有價格資料`);
    }

    // 檢查最新日期
    const latestDate = await db
      .select({ date: twStockPrices.date })
      .from(twStockPrices)
      .orderBy(desc(twStockPrices.date))
      .limit(1);

    if (latestDate.length > 0) {
      const latest = new Date(latestDate[0].date);
      const today = new Date();
      const daysDiff = Math.floor((today - latest) / (1000 * 60 * 60 * 24));

      console.log(`✓ 最新價格日期: ${latest.toISOString().split('T')[0]} (${daysDiff} 天前)`);

      if (daysDiff > 7) {
        issues.push(`價格資料已超過 7 天未更新`);
      }
    }
  }

  console.log();

  if (issues.length > 0) {
    console.log('⚠ 發現問題:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('✓ 價格資料驗證通過');
  }

  console.log();

  return issues.length === 0;
}

/**
 * 驗證同步狀態
 */
async function validateSync(db, verbose) {
  console.log('驗證同步狀態...');
  console.log('-'.repeat(60));

  const issues = [];

  // 1. 檢查同步狀態記錄
  const syncStatuses = await db
    .select()
    .from(twDataSyncStatus)
    .orderBy(desc(twDataSyncStatus.lastSyncAt));

  console.log(`✓ 同步狀態記錄數: ${syncStatuses.length}`);
  console.log();

  if (syncStatuses.length === 0) {
    issues.push('沒有同步狀態記錄');
  } else {
    console.log('最近同步狀態:');
    syncStatuses.forEach(status => {
      const lastSync = status.lastSyncAt
        ? new Date(status.lastSyncAt).toLocaleString('zh-TW')
        : '從未同步';

      const statusIcon = status.status === 'success' ? '✓' : status.status === 'partial' ? '⚠' : '✗';

      console.log(`  ${statusIcon} ${status.dataType} (${status.source}): ${lastSync}`);
      console.log(`     狀態: ${status.status}, 記錄數: ${status.recordCount}`);

      if (status.errorMessage) {
        console.log(`     錯誤: ${status.errorMessage}`);
      }

      console.log();
    });
  }

  // 2. 檢查同步錯誤
  const unresolvedErrors = await db
    .select({ count: count() })
    .from(twDataSyncErrors)
    .where(eq(twDataSyncErrors.resolved, false));

  console.log(`未解決的同步錯誤: ${unresolvedErrors[0].count}`);

  if (unresolvedErrors[0].count > 0) {
    issues.push(`有 ${unresolvedErrors[0].count} 個未解決的同步錯誤`);

    if (verbose) {
      const errors = await db
        .select()
        .from(twDataSyncErrors)
        .where(eq(twDataSyncErrors.resolved, false))
        .orderBy(desc(twDataSyncErrors.syncedAt))
        .limit(10);

      console.log();
      console.log('最近錯誤（前 10 筆）:');
      errors.forEach(error => {
        console.log(`  - ${error.dataType} ${error.symbol || 'System'}: ${error.errorMessage}`);
      });
    }
  }

  console.log();

  if (issues.length > 0) {
    console.log('⚠ 發現問題:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('✓ 同步狀態驗證通過');
  }

  console.log();

  return issues.length === 0;
}

/**
 * 主程式
 */
async function main() {
  console.log('='.repeat(60));
  console.log('台股資料驗證腳本');
  console.log('='.repeat(60));
  console.log();

  try {
    const options = parseArgs();

    const db = await getDb();
    if (!db) {
      throw new Error('無法連接資料庫');
    }

    console.log('執行選項:');
    console.log(`  - 驗證類型: ${options.type}`);
    if (options.symbol) console.log(`  - 股票代號: ${options.symbol}`);
    console.log(`  - 詳細模式: ${options.verbose ? '是' : '否'}`);
    console.log();
    console.log('='.repeat(60));
    console.log();

    let allPassed = true;

    switch (options.type) {
      case 'all':
        allPassed = await validateStocks(db, options.verbose);
        allPassed = (await validatePrices(db, null, options.verbose)) && allPassed;
        allPassed = (await validateSync(db, options.verbose)) && allPassed;
        break;

      case 'stocks':
        allPassed = await validateStocks(db, options.verbose);
        break;

      case 'prices':
        allPassed = await validatePrices(db, options.symbol, options.verbose);
        break;

      case 'sync':
        allPassed = await validateSync(db, options.verbose);
        break;

      default:
        throw new Error('不支援的驗證類型，請使用 all, stocks, prices 或 sync');
    }

    console.log('='.repeat(60));
    console.log('驗證結果');
    console.log('='.repeat(60));

    if (allPassed) {
      console.log('✓ 所有驗證項目通過');
      console.log();
      process.exit(0);
    } else {
      console.log('⚠ 發現資料品質問題，請檢查上方詳情');
      console.log();
      process.exit(1);
    }
  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('驗證失敗');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error();
    process.exit(1);
  }
}

main();

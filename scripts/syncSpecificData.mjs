/**
 * 台股特定資料同步腳本
 * 
 * 用於手動同步特定股票或日期的資料
 * 
 * 使用方式:
 *   node scripts/syncSpecificData.mjs [options]
 * 
 * 選項:
 *   --type=TYPE          同步類型: stocks, prices, pricesRange
 *   --date=YYYY-MM-DD    同步日期（用於 prices 類型）
 *   --start=YYYY-MM-DD   起始日期（用於 pricesRange 類型）
 *   --end=YYYY-MM-DD     結束日期（用於 pricesRange 類型）
 * 
 * 範例:
 *   # 同步股票基本資料
 *   node scripts/syncSpecificData.mjs --type=stocks
 * 
 *   # 同步特定日期的價格資料
 *   node scripts/syncSpecificData.mjs --type=prices --date=2024-01-15
 * 
 *   # 同步日期範圍的價格資料
 *   node scripts/syncSpecificData.mjs --type=pricesRange --start=2024-01-01 --end=2024-01-31
 */

import {
  syncStockInfo,
  syncStockPrices,
  syncStockPricesRange,
  getPreviousTradingDay,
} from '../server/jobs/syncTwStockData.ts';

/**
 * 解析命令列參數
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: null,
    date: null,
    start: null,
    end: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1];
    } else if (arg.startsWith('--date=')) {
      options.date = arg.split('=')[1];
    } else if (arg.startsWith('--start=')) {
      options.start = arg.split('=')[1];
    } else if (arg.startsWith('--end=')) {
      options.end = arg.split('=')[1];
    }
  }

  return options;
}

/**
 * 驗證參數
 */
function validateOptions(options) {
  if (!options.type) {
    throw new Error('請指定同步類型 --type=TYPE (stocks, prices, pricesRange)');
  }

  if (!['stocks', 'prices', 'pricesRange'].includes(options.type)) {
    throw new Error('不支援的同步類型，請使用 stocks, prices 或 pricesRange');
  }

  if (options.type === 'prices' && !options.date) {
    throw new Error('prices 類型需要指定日期 --date=YYYY-MM-DD');
  }

  if (options.type === 'pricesRange' && (!options.start || !options.end)) {
    throw new Error('pricesRange 類型需要指定起始與結束日期 --start=YYYY-MM-DD --end=YYYY-MM-DD');
  }

  // 驗證日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (options.date && !dateRegex.test(options.date)) {
    throw new Error('日期格式錯誤，請使用 YYYY-MM-DD 格式');
  }
  if (options.start && !dateRegex.test(options.start)) {
    throw new Error('起始日期格式錯誤，請使用 YYYY-MM-DD 格式');
  }
  if (options.end && !dateRegex.test(options.end)) {
    throw new Error('結束日期格式錯誤，請使用 YYYY-MM-DD 格式');
  }
}

/**
 * 格式化同步結果
 */
function formatResult(result) {
  console.log();
  console.log('='.repeat(60));
  console.log('同步結果');
  console.log('='.repeat(60));
  console.log(`狀態: ${result.success ? '✓ 成功' : '✗ 失敗'}`);
  console.log(`成功筆數: ${result.recordCount}`);
  console.log(`錯誤筆數: ${result.errorCount}`);

  if (result.errors.length > 0) {
    console.log();
    console.log('錯誤詳情（前 10 筆）:');
    result.errors.slice(0, 10).forEach(err => {
      console.log(`  - ${err.symbol || 'System'}: ${err.message}`);
    });
  }

  console.log('='.repeat(60));
  console.log();
}

/**
 * 主程式
 */
async function main() {
  console.log('='.repeat(60));
  console.log('台股特定資料同步腳本');
  console.log('='.repeat(60));
  console.log();

  try {
    const options = parseArgs();
    validateOptions(options);

    console.log('執行選項:');
    console.log(`  - 同步類型: ${options.type}`);
    if (options.date) console.log(`  - 日期: ${options.date}`);
    if (options.start) console.log(`  - 起始日期: ${options.start}`);
    if (options.end) console.log(`  - 結束日期: ${options.end}`);
    console.log();

    let result;

    switch (options.type) {
      case 'stocks':
        console.log('開始同步股票基本資料...');
        result = await syncStockInfo();
        break;

      case 'prices':
        const targetDate = options.date ? new Date(options.date) : getPreviousTradingDay(new Date());
        console.log(`開始同步 ${targetDate.toISOString().split('T')[0]} 的價格資料...`);
        result = await syncStockPrices(targetDate);
        break;

      case 'pricesRange':
        const startDate = new Date(options.start);
        const endDate = new Date(options.end);

        if (startDate > endDate) {
          throw new Error('起始日期不可晚於結束日期');
        }

        console.log(`開始同步 ${options.start} ~ ${options.end} 的價格資料...`);
        result = await syncStockPricesRange(startDate, endDate);
        break;
    }

    formatResult(result);

    if (result.success) {
      console.log('✓ 同步成功完成');
      process.exit(0);
    } else {
      console.log('⚠ 同步完成，但有部分錯誤');
      process.exit(1);
    }
  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('同步失敗');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error();
    process.exit(1);
  }
}

main();

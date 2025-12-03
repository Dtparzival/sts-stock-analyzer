/**
 * 批次載入 S&P 500 成分股與主要 ETF
 * 
 * 此腳本會載入:
 * - 503 支 S&P 500 成分股
 * - 32 支主要 ETF (SPY, QQQ, VOO, VTI 等)
 * 
 * 使用方式:
 * node scripts/loadSP500AndETFs.mjs
 * 
 * 參數:
 * --batch-size=50              每批處理的股票數量（預設 50）
 * --delay=8                    每批之間的延遲秒數（預設 8 秒）
 * --days=30                    載入最近 N 天的歷史價格（預設 30 天）
 * --json-file=/path/to/file    指定股票清單 JSON 檔案（預設使用內建清單）
 * --info-only                  只載入基本資料，不載入歷史價格
 * --prices-only                只載入歷史價格，不載入基本資料
 * --start-batch=1              從第 N 批開始（用於中斷後繼續）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  syncStockInfoBatch,
  syncStockPricesBatch,
  getPreviousUsTradingDay,
} from '../server/jobs/syncUsStockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 解析命令列參數
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    batchSize: 50,
    delay: 8,
    days: 30,
    jsonFile: null,
    infoOnly: false,
    pricesOnly: false,
    startBatch: 1,
  };

  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) {
      params.batchSize = parseInt(arg.replace('--batch-size=', ''), 10);
    } else if (arg.startsWith('--delay=')) {
      params.delay = parseInt(arg.replace('--delay=', ''), 10);
    } else if (arg.startsWith('--days=')) {
      params.days = parseInt(arg.replace('--days=', ''), 10);
    } else if (arg.startsWith('--json-file=')) {
      params.jsonFile = arg.replace('--json-file=', '');
    } else if (arg === '--info-only') {
      params.infoOnly = true;
    } else if (arg === '--prices-only') {
      params.pricesOnly = true;
    } else if (arg.startsWith('--start-batch=')) {
      params.startBatch = parseInt(arg.replace('--start-batch=', ''), 10);
    }
  }

  return params;
}

/**
 * 載入股票清單
 */
function loadStockList(jsonFile) {
  let filePath;
  
  if (jsonFile) {
    filePath = jsonFile;
  } else {
    // 使用預設檔案
    filePath = '/home/ubuntu/us_stocks_to_load.json';
  }

  console.log(`讀取股票清單: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`股票清單檔案不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const stocks = JSON.parse(content);
  
  return stocks.map(s => s.symbol);
}

/**
 * 延遲函數
 */
function delay(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * 批次處理股票基本資料
 */
async function processStockInfoInBatches(symbols, batchSize, delaySeconds, startBatch) {
  const totalBatches = Math.ceil(symbols.length / batchSize);
  const results = {
    totalRecords: 0,
    totalErrors: 0,
    allErrors: [],
  };

  console.log(`\n總共 ${symbols.length} 支股票，分成 ${totalBatches} 批處理`);
  console.log(`每批 ${batchSize} 支，批次間延遲 ${delaySeconds} 秒\n`);

  for (let i = startBatch - 1; i < totalBatches; i++) {
    const batchNum = i + 1;
    const start = i * batchSize;
    const end = Math.min(start + batchSize, symbols.length);
    const batch = symbols.slice(start, end);

    console.log(`\n[${'='.repeat(50)}]`);
    console.log(`處理第 ${batchNum}/${totalBatches} 批 (${batch.length} 支股票)`);
    console.log(`代碼: ${batch.join(', ')}`);
    console.log(`[${'='.repeat(50)}]\n`);

    try {
      const result = await syncStockInfoBatch(batch);
      
      results.totalRecords += result.recordCount;
      results.totalErrors += result.errorCount;
      results.allErrors.push(...result.errors);

      console.log(`✓ 批次 ${batchNum} 完成: 成功 ${result.recordCount} 筆，失敗 ${result.errorCount} 筆`);

      if (result.errors.length > 0) {
        console.log(`  錯誤詳情:`);
        result.errors.forEach(e => {
          console.log(`    - ${e.symbol || 'System'}: ${e.message}`);
        });
      }

      // 如果不是最後一批，則延遲
      if (batchNum < totalBatches) {
        console.log(`\n⏳ 等待 ${delaySeconds} 秒後處理下一批...`);
        await delay(delaySeconds);
      }
    } catch (error) {
      console.error(`✗ 批次 ${batchNum} 失敗:`, error.message);
      results.totalErrors += batch.length;
      results.allErrors.push({
        symbol: `Batch ${batchNum}`,
        message: error.message,
      });
    }
  }

  return results;
}

/**
 * 批次處理股票歷史價格
 */
async function processStockPricesInBatches(symbols, batchSize, delaySeconds, startDate, endDate, startBatch) {
  const totalBatches = Math.ceil(symbols.length / batchSize);
  const results = {
    totalRecords: 0,
    totalErrors: 0,
    allErrors: [],
  };

  console.log(`\n總共 ${symbols.length} 支股票，分成 ${totalBatches} 批處理`);
  console.log(`每批 ${batchSize} 支，批次間延遲 ${delaySeconds} 秒`);
  console.log(`日期範圍: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}\n`);

  for (let i = startBatch - 1; i < totalBatches; i++) {
    const batchNum = i + 1;
    const start = i * batchSize;
    const end = Math.min(start + batchSize, symbols.length);
    const batch = symbols.slice(start, end);

    console.log(`\n[${'='.repeat(50)}]`);
    console.log(`處理第 ${batchNum}/${totalBatches} 批 (${batch.length} 支股票)`);
    console.log(`代碼: ${batch.join(', ')}`);
    console.log(`[${'='.repeat(50)}]\n`);

    try {
      const result = await syncStockPricesBatch(batch, startDate, endDate);
      
      results.totalRecords += result.recordCount;
      results.totalErrors += result.errorCount;
      results.allErrors.push(...result.errors);

      console.log(`✓ 批次 ${batchNum} 完成: 成功 ${result.recordCount} 筆，失敗 ${result.errorCount} 筆`);

      if (result.errors.length > 0 && result.errors.length <= 5) {
        console.log(`  錯誤詳情:`);
        result.errors.forEach(e => {
          console.log(`    - ${e.symbol || 'System'}: ${e.message}`);
        });
      } else if (result.errors.length > 5) {
        console.log(`  有 ${result.errors.length} 個錯誤（過多，不顯示詳情）`);
      }

      // 如果不是最後一批，則延遲
      if (batchNum < totalBatches) {
        console.log(`\n⏳ 等待 ${delaySeconds} 秒後處理下一批...`);
        await delay(delaySeconds);
      }
    } catch (error) {
      console.error(`✗ 批次 ${batchNum} 失敗:`, error.message);
      results.totalErrors += batch.length;
      results.allErrors.push({
        symbol: `Batch ${batchNum}`,
        message: error.message,
      });
    }
  }

  return results;
}

/**
 * 主程式
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('批次載入 S&P 500 成分股與主要 ETF');
  console.log('='.repeat(70));

  const params = parseArgs();
  
  console.log(`\n參數設定:`);
  console.log(`  每批數量: ${params.batchSize} 支`);
  console.log(`  批次延遲: ${params.delay} 秒`);
  console.log(`  歷史天數: ${params.days} 天`);
  console.log(`  開始批次: 第 ${params.startBatch} 批`);
  console.log(`  只載入基本資料: ${params.infoOnly ? '是' : '否'}`);
  console.log(`  只載入歷史價格: ${params.pricesOnly ? '是' : '否'}`);

  // 載入股票清單
  let symbols;
  try {
    symbols = loadStockList(params.jsonFile);
    console.log(`\n✓ 成功載入 ${symbols.length} 支股票`);
  } catch (error) {
    console.error(`\n✗ 載入股票清單失敗:`, error.message);
    process.exit(1);
  }

  const startTime = Date.now();

  // 步驟 1: 同步股票基本資料
  let infoResult = null;
  if (!params.pricesOnly) {
    console.log('\n' + '='.repeat(70));
    console.log('步驟 1: 同步股票基本資料');
    console.log('='.repeat(70));

    infoResult = await processStockInfoInBatches(
      symbols,
      params.batchSize,
      params.delay,
      params.startBatch
    );

    console.log(`\n基本資料同步結果:`);
    console.log(`  成功: ${infoResult.totalRecords} 筆`);
    console.log(`  失敗: ${infoResult.totalErrors} 筆`);
  }

  // 步驟 2: 同步歷史價格資料
  let priceResult = null;
  if (!params.infoOnly) {
    console.log('\n' + '='.repeat(70));
    console.log(`步驟 2: 同步歷史價格資料 (最近 ${params.days} 天)`);
    console.log('='.repeat(70));

    const endDate = getPreviousUsTradingDay(new Date());
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - params.days);

    priceResult = await processStockPricesInBatches(
      symbols,
      params.batchSize,
      params.delay,
      startDate,
      endDate,
      params.startBatch
    );

    console.log(`\n歷史價格同步結果:`);
    console.log(`  成功: ${priceResult.totalRecords} 筆`);
    console.log(`  失敗: ${priceResult.totalErrors} 筆`);
  }

  // 總結
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  console.log('\n' + '='.repeat(70));
  console.log('載入完成！');
  console.log('='.repeat(70));
  console.log(`總共處理: ${symbols.length} 支股票`);
  if (infoResult) {
    console.log(`股票基本資料: ${infoResult.totalRecords} 筆成功，${infoResult.totalErrors} 筆失敗`);
  }
  if (priceResult) {
    console.log(`歷史價格資料: ${priceResult.totalRecords} 筆成功，${priceResult.totalErrors} 筆失敗`);
  }
  console.log(`總耗時: ${minutes} 分 ${seconds} 秒`);
  console.log('='.repeat(70));
  console.log('');

  // 如果有錯誤，顯示摘要
  const allErrors = [
    ...(infoResult?.allErrors || []),
    ...(priceResult?.allErrors || [])
  ];

  if (allErrors.length > 0) {
    console.log(`\n⚠️  共有 ${allErrors.length} 個錯誤`);
    console.log(`前 20 個錯誤:`);
    allErrors.slice(0, 20).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.symbol || 'System'}: ${e.message}`);
    });
    if (allErrors.length > 20) {
      console.log(`  ... 以及其他 ${allErrors.length - 20} 個錯誤`);
    }
  }

  process.exit(0);
}

main().catch(error => {
  console.error('\n✗ 載入失敗:', error);
  console.error(error.stack);
  process.exit(1);
});

/**
 * 美股資料初始化腳本
 * 
 * 載入常見美股股票的基本資料與歷史價格
 * 
 * 使用方式:
 * node scripts/initUsStockData.mjs
 * 
 * 參數:
 * --symbols=AAPL,MSFT,GOOGL  指定要載入的股票代碼（逗號分隔）
 * --days=30                  載入最近 N 天的歷史價格（預設 30 天）
 */

import {
  syncStockInfoBatch,
  syncStockPricesBatch,
  getPreviousUsTradingDay,
} from '../server/jobs/syncUsStockData.ts';

/**
 * 常見美股股票清單（科技股、指數 ETF、熱門股）
 */
const DEFAULT_SYMBOLS = [
  // 科技巨頭 (FAANG+)
  'AAPL',  // Apple
  'MSFT',  // Microsoft
  'GOOGL', // Alphabet (Google)
  'AMZN',  // Amazon
  'META',  // Meta (Facebook)
  'NVDA',  // NVIDIA
  'TSLA',  // Tesla
  
  // 其他科技股
  'NFLX',  // Netflix
  'AMD',   // AMD
  'INTC',  // Intel
  'CRM',   // Salesforce
  'ORCL',  // Oracle
  'ADBE',  // Adobe
  
  // 金融股
  'JPM',   // JPMorgan Chase
  'BAC',   // Bank of America
  'WFC',   // Wells Fargo
  'GS',    // Goldman Sachs
  
  // 消費品
  'KO',    // Coca-Cola
  'PEP',   // PepsiCo
  'WMT',   // Walmart
  'HD',    // Home Depot
  
  // 醫療保健
  'JNJ',   // Johnson & Johnson
  'PFE',   // Pfizer
  'UNH',   // UnitedHealth
  
  // 指數 ETF
  'SPY',   // S&P 500 ETF
  'QQQ',   // NASDAQ-100 ETF
  'DIA',   // Dow Jones ETF
  'IWM',   // Russell 2000 ETF
  'VTI',   // Total Stock Market ETF
];

/**
 * 解析命令列參數
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    symbols: DEFAULT_SYMBOLS,
    days: 30,
  };

  for (const arg of args) {
    if (arg.startsWith('--symbols=')) {
      const symbolsStr = arg.replace('--symbols=', '');
      params.symbols = symbolsStr.split(',').map(s => s.trim().toUpperCase());
    } else if (arg.startsWith('--days=')) {
      const daysStr = arg.replace('--days=', '');
      params.days = parseInt(daysStr, 10);
      if (isNaN(params.days) || params.days < 1) {
        console.error('Invalid --days parameter, using default 30');
        params.days = 30;
      }
    }
  }

  return params;
}

/**
 * 主程式
 */
async function main() {
  console.log('='.repeat(60));
  console.log('美股資料初始化腳本');
  console.log('='.repeat(60));

  const { symbols, days } = parseArgs();

  console.log(`\n要載入的股票數量: ${symbols.length}`);
  console.log(`歷史價格天數: ${days} 天`);
  console.log(`股票代碼: ${symbols.join(', ')}\n`);

  // 步驟 1: 同步股票基本資料
  console.log('步驟 1/2: 同步股票基本資料...');
  console.log('-'.repeat(60));

  const infoResult = await syncStockInfoBatch(symbols);

  console.log(`\n基本資料同步結果:`);
  console.log(`  成功: ${infoResult.recordCount} 筆`);
  console.log(`  失敗: ${infoResult.errorCount} 筆`);

  if (infoResult.errors.length > 0) {
    console.log(`\n錯誤詳情:`);
    infoResult.errors.forEach(e => {
      console.log(`  - ${e.symbol || 'System'}: ${e.message}`);
    });
  }

  // 步驟 2: 同步歷史價格資料
  console.log(`\n步驟 2/2: 同步歷史價格資料 (最近 ${days} 天)...`);
  console.log('-'.repeat(60));

  // 計算日期範圍
  const endDate = getPreviousUsTradingDay(new Date());
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  console.log(`日期範圍: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`);

  const priceResult = await syncStockPricesBatch(symbols, startDate, endDate);

  console.log(`\n歷史價格同步結果:`);
  console.log(`  成功: ${priceResult.recordCount} 筆`);
  console.log(`  失敗: ${priceResult.errorCount} 筆`);

  if (priceResult.errors.length > 0) {
    console.log(`\n錯誤詳情:`);
    priceResult.errors.slice(0, 10).forEach(e => {
      console.log(`  - ${e.symbol || 'System'}: ${e.message}`);
    });
    if (priceResult.errors.length > 10) {
      console.log(`  ... 以及其他 ${priceResult.errors.length - 10} 個錯誤`);
    }
  }

  // 總結
  console.log('\n' + '='.repeat(60));
  console.log('初始化完成！');
  console.log('='.repeat(60));
  console.log(`總共載入:`);
  console.log(`  股票基本資料: ${infoResult.recordCount} 筆`);
  console.log(`  歷史價格資料: ${priceResult.recordCount} 筆`);
  console.log(`  總錯誤數: ${infoResult.errorCount + priceResult.errorCount} 筆`);
  console.log('');

  process.exit(0);
}

main().catch(error => {
  console.error('初始化失敗:', error);
  process.exit(1);
});

/**
 * 台股特定資料類型同步腳本
 * 
 * 此腳本用於同步特定類型的資料
 * 
 * 使用方式：
 * - node scripts/syncSpecificData.mjs prices      # 只同步歷史價格
 * - node scripts/syncSpecificData.mjs fundamentals # 只同步基本面資料
 * - node scripts/syncSpecificData.mjs indicators   # 只計算技術指標
 * - node scripts/syncSpecificData.mjs financials   # 只同步財務報表
 * - node scripts/syncSpecificData.mjs dividends    # 只同步股利資訊
 */

import {
  manualSyncHistoricalPrices,
  manualSyncFundamentals,
  manualSyncIndicators,
  manualSyncFinancials,
  manualSyncDividends,
} from '../server/jobs/syncTwStockData.ts';

const dataType = process.argv[2];

const syncFunctions = {
  prices: {
    name: '歷史價格',
    fn: manualSyncHistoricalPrices,
  },
  fundamentals: {
    name: '基本面資料',
    fn: manualSyncFundamentals,
  },
  indicators: {
    name: '技術指標',
    fn: manualSyncIndicators,
  },
  financials: {
    name: '財務報表',
    fn: manualSyncFinancials,
  },
  dividends: {
    name: '股利資訊',
    fn: manualSyncDividends,
  },
};

async function main() {
  if (!dataType || !syncFunctions[dataType]) {
    console.error('錯誤：請指定有效的資料類型');
    console.error('');
    console.error('使用方式：');
    console.error('  node scripts/syncSpecificData.mjs <data_type>');
    console.error('');
    console.error('可用的資料類型：');
    Object.keys(syncFunctions).forEach(key => {
      console.error(`  - ${key.padEnd(15)} (${syncFunctions[key].name})`);
    });
    process.exit(1);
  }

  const { name, fn } = syncFunctions[dataType];

  console.log('='.repeat(60));
  console.log(`同步台股${name}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    const startTime = Date.now();
    
    console.log(`[${new Date().toLocaleTimeString()}] 開始同步${name}...`);
    console.log('');
    
    await fn();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    console.log('');
    console.log('='.repeat(60));
    console.log(`[${new Date().toLocaleTimeString()}] ${name}同步完成！`);
    console.log(`總執行時間：${minutes} 分 ${seconds} 秒`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error(`[${new Date().toLocaleTimeString()}] ${name}同步失敗！`);
    console.error('錯誤訊息：', error.message);
    console.error('='.repeat(60));
    
    process.exit(1);
  }
}

main();

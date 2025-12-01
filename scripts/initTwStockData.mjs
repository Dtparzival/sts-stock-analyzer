/**
 * 台股資料庫初始化腳本
 * 
 * 此腳本用於首次載入所有台股資料到資料庫
 * 包含：股票列表、歷史價格、基本面資料、技術指標、財務報表、股利資訊
 * 
 * 使用方式：node scripts/initTwStockData.mjs
 */

import { manualSyncAll } from '../server/jobs/syncTwStockData.ts';

console.log('='.repeat(60));
console.log('台股資料庫初始化腳本');
console.log('='.repeat(60));
console.log('');
console.log('此腳本將執行以下步驟：');
console.log('1. 同步歷史價格資料');
console.log('2. 同步基本面資料');
console.log('3. 計算技術指標');
console.log('4. 同步財務報表');
console.log('5. 同步股利資訊');
console.log('');
console.log('預計執行時間：30-60 分鐘（取決於股票數量和網路速度）');
console.log('');
console.log('='.repeat(60));
console.log('');

async function main() {
  try {
    const startTime = Date.now();
    
    console.log(`[${new Date().toLocaleTimeString()}] 開始執行完整資料同步...`);
    console.log('');
    
    await manualSyncAll();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    console.log('');
    console.log('='.repeat(60));
    console.log(`[${new Date().toLocaleTimeString()}] 初始化完成！`);
    console.log(`總執行時間：${minutes} 分 ${seconds} 秒`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error(`[${new Date().toLocaleTimeString()}] 初始化失敗！`);
    console.error('錯誤訊息：', error.message);
    console.error('='.repeat(60));
    
    process.exit(1);
  }
}

main();

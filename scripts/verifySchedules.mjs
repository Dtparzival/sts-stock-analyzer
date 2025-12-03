/**
 * 驗證排程註冊腳本
 * 檢查美股定期同步排程是否正確設定
 */

import { startUsScheduledSyncs, scheduleStockInfoSync, scheduleStockPriceSync } from '../server/jobs/syncUsStockDataScheduled.ts';
import { getScheduledSyncStockCount } from '../server/config/usStockLists.ts';

console.log('=== 美股定期同步排程驗證 ===\n');

console.log('1. 檢查函數匯出狀態:');
console.log(`   - startUsScheduledSyncs: ${typeof startUsScheduledSyncs === 'function' ? '✅' : '❌'}`);
console.log(`   - scheduleStockInfoSync: ${typeof scheduleStockInfoSync === 'function' ? '✅' : '❌'}`);
console.log(`   - scheduleStockPriceSync: ${typeof scheduleStockPriceSync === 'function' ? '✅' : '❌'}`);

console.log('\n2. 檢查同步股票數量:');
const stockCount = getScheduledSyncStockCount();
console.log(`   - 定期同步股票總數: ${stockCount}`);

console.log('\n3. 排程設定:');
console.log('   - 股票基本資料: 每週日 06:00 (台北時間)');
console.log('   - 歷史價格資料: 每交易日 06:00 (台北時間)');

console.log('\n4. 測試排程註冊 (不實際執行同步):');
try {
  startUsScheduledSyncs();
  console.log('   ✅ 排程註冊成功');
} catch (error) {
  console.error('   ❌ 排程註冊失敗:', error.message);
}

console.log('\n=== 驗證完成 ===');

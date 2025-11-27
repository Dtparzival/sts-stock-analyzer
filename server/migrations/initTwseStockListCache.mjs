/**
 * 初始化 TWSE Stock List 數據庫緩存腳本
 * 
 * 功能：從 TWSE OpenAPI 獲取完整的股票列表並儲存到資料庫
 * 使用方法：node server/migrations/initTwseStockListCache.mjs
 */

// 動態導入模組
const { forceUpdateCache } = await import('../dbTwseStockListCache.ts');

console.log('='.repeat(60));
console.log('初始化 TWSE Stock List 數據庫緩存');
console.log('='.repeat(60));
console.log('');

try {
  console.log('[Step 1/2] 從 TWSE OpenAPI 獲取股票列表並儲存到資料庫...');
  await forceUpdateCache();
  
  console.log('');
  console.log('[Step 2/2] 初始化完成！');
  console.log('='.repeat(60));
  console.log('✓ 數據庫緩存已成功初始化');
  console.log('='.repeat(60));
  
  process.exit(0);
} catch (error) {
  console.error('');
  console.error('✗ 初始化失敗:', error);
  console.error('='.repeat(60));
  process.exit(1);
}

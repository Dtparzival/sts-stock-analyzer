/**
 * 測試 TWSE、TPEx 和 FinMind API 連線
 */

import { fetchTwseStockList, fetchTwseHistoricalPrices } from '../integrations/twse';
import { fetchTpexStockList, fetchTpexHistoricalPrices } from '../integrations/tpex';

async function testApis() {
  console.log('=== 測試台股 API 連線 ===\n');
  
  // 1. 測試 TWSE API
  console.log('1️⃣  測試 TWSE API...');
  try {
    const twseStocks = await fetchTwseStockList();
    console.log(`   ✅ TWSE 股票列表: ${twseStocks.length} 筆`);
    
    if (twseStocks.length > 0) {
      const sampleStock = twseStocks[0];
      console.log(`   📋 範例: ${JSON.stringify(sampleStock).substring(0, 100)}...`);
    }
  } catch (error) {
    console.error(`   ❌ TWSE API 測試失敗: ${error}`);
  }
  
  console.log('');
  
  // 2. 測試 TWSE 歷史價格 API（以台積電 2330 為例）
  console.log('2️⃣  測試 TWSE 歷史價格 API (2330 台積電)...');
  try {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prices = await fetchTwseHistoricalPrices('2330', dateStr);
    console.log(`   ✅ 歷史價格: ${prices.length} 筆`);
    
    if (prices.length > 0) {
      const samplePrice = prices[0];
      console.log(`   📋 範例: ${JSON.stringify(samplePrice).substring(0, 150)}...`);
    }
  } catch (error) {
    console.error(`   ❌ TWSE 歷史價格 API 測試失敗: ${error}`);
  }
  
  console.log('');
  
  // 3. 測試 TPEx API
  console.log('3️⃣  測試 TPEx API...');
  try {
    const tpexStocks = await fetchTpexStockList();
    console.log(`   ✅ TPEx 股票列表: ${tpexStocks.length} 筆`);
    
    if (tpexStocks.length > 0) {
      const sampleStock = tpexStocks[0];
      console.log(`   📋 範例: ${JSON.stringify(sampleStock).substring(0, 100)}...`);
    }
  } catch (error) {
    console.error(`   ❌ TPEx API 測試失敗: ${error}`);
  }
  
  console.log('');
  
  // 4. 測試 TPEx 歷史價格 API（以聯發科 2454 為例）
  console.log('4️⃣  測試 TPEx 歷史價格 API (5483 中美晶)...');
  try {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prices = await fetchTpexHistoricalPrices('5483', dateStr);
    console.log(`   ✅ 歷史價格: ${prices.length} 筆`);
    
    if (prices.length > 0) {
      const samplePrice = prices[0];
      console.log(`   📋 範例: ${JSON.stringify(samplePrice).substring(0, 150)}...`);
    }
  } catch (error) {
    console.error(`   ❌ TPEx 歷史價格 API 測試失敗: ${error}`);
  }
  
  console.log('\n=== 測試完成 ===');
  console.log('💡 如果所有 API 測試通過，可以執行 initialDataLoad.ts 載入完整資料');
}

// 執行測試
testApis().then(() => {
  console.log('\n測試完成');
  process.exit(0);
}).catch(error => {
  console.error('測試失敗:', error);
  process.exit(1);
});

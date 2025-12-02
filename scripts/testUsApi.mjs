#!/usr/bin/env node

/**
 * 美股 API 測試腳本
 * 測試 TwelveData API 整合與資料庫操作
 */

import 'dotenv/config';
import { 
  getTwelveDataQuote, 
  getTwelveDataTimeSeries,
  convertPriceToCents,
  convertCentsToDollars,
  calculateChangePercent
} from '../server/integrations/twelvedata.js';
import * as dbUs from '../server/db_us.js';

// 測試股票代號
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL'];

/**
 * 測試 TwelveData Quote API
 */
async function testQuoteAPI() {
  console.log('\n=== 測試 TwelveData Quote API ===\n');
  
  for (const symbol of TEST_SYMBOLS) {
    try {
      console.log(`\n測試股票: ${symbol}`);
      const quote = await getTwelveDataQuote(symbol);
      
      console.log(`✅ 成功獲取 ${symbol} 報價:`);
      console.log(`  - 名稱: ${quote.name}`);
      console.log(`  - 交易所: ${quote.exchange}`);
      console.log(`  - 幣別: ${quote.currency}`);
      console.log(`  - 收盤價: $${quote.close}`);
      console.log(`  - 漲跌: ${quote.change} (${quote.percent_change}%)`);
      console.log(`  - 成交量: ${quote.volume}`);
      
      if (quote.fifty_two_week) {
        console.log(`  - 52週高低: $${quote.fifty_two_week.low} - $${quote.fifty_two_week.high}`);
      }
    } catch (error) {
      console.error(`❌ 獲取 ${symbol} 報價失敗:`, error.message);
    }
  }
}

/**
 * 測試 TwelveData Time Series API
 */
async function testTimeSeriesAPI() {
  console.log('\n=== 測試 TwelveData Time Series API ===\n');
  
  const symbol = TEST_SYMBOLS[0]; // 只測試第一個股票
  const interval = '1day';
  const outputsize = 5;
  
  try {
    console.log(`\n測試股票: ${symbol} (最近 ${outputsize} 天)`);
    const timeSeries = await getTwelveDataTimeSeries(symbol, interval, outputsize);
    
    console.log(`✅ 成功獲取 ${symbol} 歷史數據:`);
    console.log(`  - 時間區間: ${timeSeries.meta.interval}`);
    console.log(`  - 交易所: ${timeSeries.meta.exchange}`);
    console.log(`  - 資料點數: ${timeSeries.values.length}`);
    
    console.log('\n最近 5 天價格:');
    timeSeries.values.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.datetime}: 開 $${v.open}, 高 $${v.high}, 低 $${v.low}, 收 $${v.close}, 量 ${v.volume}`);
    });
  } catch (error) {
    console.error(`❌ 獲取 ${symbol} 歷史數據失敗:`, error.message);
  }
}

/**
 * 測試價格轉換函數
 */
async function testPriceConversion() {
  console.log('\n=== 測試價格轉換函數 ===\n');
  
  const testCases = [
    { price: '150.25', expected: 15025 },
    { price: '1.50', expected: 150 },
    { price: '1000.00', expected: 100000 },
  ];
  
  testCases.forEach(({ price, expected }) => {
    const cents = convertPriceToCents(price);
    const dollars = convertCentsToDollars(cents);
    
    if (cents === expected) {
      console.log(`✅ $${price} → ${cents} 美分 → $${dollars}`);
    } else {
      console.log(`❌ $${price} → ${cents} 美分 (預期: ${expected})`);
    }
  });
  
  // 測試漲跌幅計算
  console.log('\n測試漲跌幅計算:');
  const current = 15025; // $150.25
  const previous = 15000; // $150.00
  const changePercent = calculateChangePercent(current, previous);
  const expectedPercent = 17; // 0.17% = 17 基點
  
  if (Math.abs(changePercent - expectedPercent) < 1) {
    console.log(`✅ 漲跌幅: ${changePercent} 基點 (${(changePercent / 100).toFixed(2)}%)`);
  } else {
    console.log(`❌ 漲跌幅: ${changePercent} 基點 (預期: ${expectedPercent})`);
  }
}

/**
 * 測試資料庫操作
 */
async function testDatabaseOperations() {
  console.log('\n=== 測試資料庫操作 ===\n');
  
  try {
    // 測試統計查詢
    const totalStocks = await dbUs.countUsStocks();
    const activeStocks = await dbUs.countActiveUsStocks();
    const totalPrices = await dbUs.countUsStockPriceRecords();
    
    console.log('✅ 資料庫統計:');
    console.log(`  - 總股票數: ${totalStocks}`);
    console.log(`  - 活躍股票數: ${activeStocks}`);
    console.log(`  - 總價格記錄數: ${totalPrices}`);
    
    // 測試搜尋功能
    console.log('\n測試搜尋功能:');
    const searchResults = await dbUs.searchUsStocks('AAPL', 5);
    console.log(`✅ 搜尋 "AAPL" 結果: ${searchResults.length} 筆`);
    
    if (searchResults.length > 0) {
      searchResults.forEach((stock, i) => {
        console.log(`  ${i + 1}. ${stock.symbol} - ${stock.name}`);
      });
    }
    
    // 測試快取操作
    console.log('\n測試快取操作:');
    const testCacheKey = 'test:cache:key';
    const testData = { test: 'data', timestamp: Date.now() };
    const expiresAt = new Date(Date.now() + 60000); // 1 分鐘後過期
    
    await dbUs.setStockDataCache({
      cacheKey: testCacheKey,
      market: 'US',
      symbol: 'TEST',
      dataType: 'test',
      data: JSON.stringify(testData),
      expiresAt,
    });
    console.log('✅ 寫入快取成功');
    
    const cachedData = await dbUs.getStockDataCache(testCacheKey);
    if (cachedData) {
      console.log('✅ 讀取快取成功');
      console.log(`  - 快取鍵值: ${cachedData.cacheKey}`);
      console.log(`  - 過期時間: ${cachedData.expiresAt}`);
    } else {
      console.log('❌ 讀取快取失敗');
    }
    
    // 清理測試快取
    await dbUs.deleteStockCache('US', 'TEST');
    console.log('✅ 清理測試快取成功');
    
  } catch (error) {
    console.error('❌ 資料庫操作失敗:', error.message);
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('='.repeat(60));
  console.log('美股 API 測試腳本');
  console.log('='.repeat(60));
  
  // 檢查環境變數
  if (!process.env.TWELVEDATA_TOKEN) {
    console.error('\n❌ 錯誤: TWELVEDATA_TOKEN 環境變數未設定');
    console.log('請在 .env 檔案中設定 TWELVEDATA_TOKEN');
    process.exit(1);
  }
  
  console.log(`\n✅ TwelveData API Token: ${process.env.TWELVEDATA_TOKEN.substring(0, 10)}...`);
  
  try {
    // 執行測試
    await testPriceConversion();
    await testQuoteAPI();
    await testTimeSeriesAPI();
    await testDatabaseOperations();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有測試完成');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 執行主函數
main();

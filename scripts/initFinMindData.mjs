/**
 * 使用 FinMind API 初始化台股資料
 * 資料來源：https://finmind.github.io
 */

import 'dotenv/config';
import axios from 'axios';
import { drizzle } from 'drizzle-orm/mysql2';
import { twStocks, twStockPrices, twStockFundamentals, twStockDividends } from '../drizzle/schema.ts';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4';
const FINMIND_TOKEN = process.env.FINMIND_TOKEN;

if (!FINMIND_TOKEN) {
  console.error('❌ FINMIND_TOKEN 環境變數未設定');
  process.exit(1);
}

// 建立資料庫連線
const db = drizzle(process.env.DATABASE_URL);

/**
 * 延遲函數（避免 API 限流）
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 從 FinMind API 取得資料
 */
async function fetchFromFinMind(dataset, dataId = null, startDate = null) {
  try {
    const params = {
      dataset,
      token: FINMIND_TOKEN,
    };
    
    if (dataId) params.data_id = dataId;
    if (startDate) params.start_date = startDate;
    
    const response = await axios.get(`${FINMIND_BASE_URL}/data`, {
      params,
      timeout: 30000,
    });
    
    if (response.data.msg === 'success') {
      return response.data.data || [];
    } else {
      console.error(`API 錯誤: ${response.data.msg}`);
      return [];
    }
  } catch (error) {
    console.error(`API 請求失敗:`, error.message);
    return [];
  }
}

/**
 * 1. 載入股票清單
 */
async function loadStockList() {
  console.log('\n📋 步驟 1: 載入股票清單...');
  
  // 取得台灣股票資訊
  const stockInfo = await fetchFromFinMind('TaiwanStockInfo');
  
  if (stockInfo.length === 0) {
    console.error('❌ 無法取得股票清單');
    return [];
  }
  
  console.log(`✅ 取得 ${stockInfo.length} 支股票資訊`);
  
  // 轉換並寫入資料庫
  let insertCount = 0;
  for (const stock of stockInfo) {
    try {
      // 判斷市場類型
      let market = '上市';
      if (stock.type === 'twse') {
        market = '上市';
      } else if (stock.type === 'tpex') {
        market = '上櫃';
      }
      
      // 判斷股票類型
      let stockType = '股票';
      if (stock.industry_category && stock.industry_category.includes('ETF')) {
        stockType = 'ETF';
      }
      
      await db.insert(twStocks).values({
        symbol: stock.stock_id,
        name: stock.stock_name,
        shortName: stock.stock_name.replace(/股份有限公司|有限公司|公司/g, '').trim(),
        market,
        industry: stock.industry_category || null,
        type: stockType,
        isActive: true,
      }).onDuplicateKeyUpdate({
        set: {
          name: stock.stock_name,
          shortName: stock.stock_name.replace(/股份有限公司|有限公司|公司/g, '').trim(),
          industry: stock.industry_category || null,
        }
      });
      
      insertCount++;
      
      if (insertCount % 100 === 0) {
        console.log(`已處理 ${insertCount} 支股票...`);
      }
    } catch (error) {
      console.error(`寫入股票 ${stock.stock_id} 失敗:`, error.message);
    }
  }
  
  console.log(`✅ 成功載入 ${insertCount} 支股票`);
  
  // 回傳股票代號清單
  return stockInfo.map(s => s.stock_id);
}

/**
 * 2. 載入歷史價格（最近 3 個月）
 */
async function loadHistoricalPrices(symbols) {
  console.log('\n📈 步驟 2: 載入歷史價格（最近 3 個月）...');
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  let successCount = 0;
  let totalPrices = 0;
  
  // 只處理前 50 支股票作為示範（避免載入時間過長）
  const symbolsToProcess = symbols.slice(0, 50);
  
  for (let i = 0; i < symbolsToProcess.length; i++) {
    const symbol = symbolsToProcess[i];
    
    try {
      console.log(`[${i + 1}/${symbolsToProcess.length}] 載入 ${symbol} 的價格資料...`);
      
      const priceData = await fetchFromFinMind('TaiwanStockPrice', symbol, startDateStr);
      
      if (priceData.length === 0) {
        console.log(`  ⚠️  ${symbol} 無價格資料`);
        continue;
      }
      
      // 批次寫入價格資料
      for (const price of priceData) {
        await db.insert(twStockPrices).values({
          symbol: price.stock_id,
          date: new Date(price.date),
          open: parseFloat(price.open) || 0,
          high: parseFloat(price.max) || 0,
          low: parseFloat(price.min) || 0,
          close: parseFloat(price.close) || 0,
          volume: parseInt(price.Trading_Volume) || 0,
          amount: parseFloat(price.Trading_money) || 0,
          change: parseFloat(price.spread) || 0,
          changePercent: 0, // FinMind 沒有提供，需要自行計算
        }).onDuplicateKeyUpdate({
          set: {
            open: parseFloat(price.open) || 0,
            high: parseFloat(price.max) || 0,
            low: parseFloat(price.min) || 0,
            close: parseFloat(price.close) || 0,
            volume: parseInt(price.Trading_Volume) || 0,
            amount: parseFloat(price.Trading_money) || 0,
            change: parseFloat(price.spread) || 0,
          }
        });
      }
      
      totalPrices += priceData.length;
      successCount++;
      console.log(`  ✅ 成功載入 ${priceData.length} 筆價格資料`);
      
      // 延遲避免 API 限流
      await delay(500);
      
    } catch (error) {
      console.error(`  ❌ ${symbol} 載入失敗:`, error.message);
    }
  }
  
  console.log(`\n✅ 成功載入 ${successCount} 支股票的價格資料，共 ${totalPrices} 筆`);
}

/**
 * 3. 載入股利資訊（最近 3 年）
 */
async function loadDividends(symbols) {
  console.log('\n💰 步驟 3: 載入股利資訊（最近 3 年）...');
  
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 3);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  let successCount = 0;
  let totalDividends = 0;
  
  // 只處理前 50 支股票作為示範
  const symbolsToProcess = symbols.slice(0, 50);
  
  for (let i = 0; i < symbolsToProcess.length; i++) {
    const symbol = symbolsToProcess[i];
    
    try {
      console.log(`[${i + 1}/${symbolsToProcess.length}] 載入 ${symbol} 的股利資訊...`);
      
      const dividendData = await fetchFromFinMind('TaiwanStockDividend', symbol, startDateStr);
      
      if (dividendData.length === 0) {
        console.log(`  ⚠️  ${symbol} 無股利資訊`);
        continue;
      }
      
      // 批次寫入股利資料
      for (const dividend of dividendData) {
        const year = parseInt(dividend.stock_year) || 0;
        const cashDividend = parseFloat(dividend.CashEarningsDistribution) || 0;
        
        if (year > 0) {
          await db.insert(twStockDividends).values({
            symbol: dividend.stock_id,
            year,
            dividend: cashDividend,
            yieldRate: 0, // 需要另外計算
          }).onDuplicateKeyUpdate({
            set: {
              dividend: cashDividend,
            }
          });
        }
      }
      
      totalDividends += dividendData.length;
      successCount++;
      console.log(`  ✅ 成功載入 ${dividendData.length} 筆股利資料`);
      
      // 延遲避免 API 限流
      await delay(500);
      
    } catch (error) {
      console.error(`  ❌ ${symbol} 載入失敗:`, error.message);
    }
  }
  
  console.log(`\n✅ 成功載入 ${successCount} 支股票的股利資訊，共 ${totalDividends} 筆`);
}

/**
 * 主程式
 */
async function main() {
  console.log('🚀 開始使用 FinMind API 載入台股資料...');
  console.log(`📅 執行時間: ${new Date().toLocaleString('zh-TW')}`);
  
  try {
    // 1. 載入股票清單
    const symbols = await loadStockList();
    
    if (symbols.length === 0) {
      console.error('❌ 無法取得股票清單，終止執行');
      process.exit(1);
    }
    
    console.log('\n✅ 股票清單載入完成！');
    console.log('⚠️  歷史價格和股利資訊載入已暫停（依使用者要求）');
    
    // 2. 載入歷史價格（已暫停）
    // await loadHistoricalPrices(symbols);
    
    // 3. 載入股利資訊（已暫停）
    // await loadDividends(symbols);
    
    console.log('\n✅ 資料載入完成！');
    
  } catch (error) {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  }
}

main();

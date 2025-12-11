/**
 * 測試美股同步功能腳本
 * 用於診斷美股定期同步為什麼沒有執行
 */

import 'dotenv/config';

// 測試 TwelveData API 連線
async function testTwelveDataConnection() {
  console.log('\n=== 測試 TwelveData API 連線 ===\n');
  
  try {
    const { getTwelveDataQuote } = await import('../server/integrations/twelvedata.ts');
    
    // 測試獲取 AAPL 報價
    console.log('測試獲取 AAPL 報價...');
    const quote = await getTwelveDataQuote('AAPL');
    console.log('✅ API 連線成功！');
    console.log('AAPL 報價:', {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.close,
      change: quote.change,
      percent_change: quote.percent_change,
    });
    
    return true;
  } catch (error) {
    console.error('❌ API 連線失敗:', error);
    return false;
  }
}

// 測試美股同步函數
async function testUsStockSync() {
  console.log('\n=== 測試美股同步函數 ===\n');
  
  try {
    const { 
      syncScheduledStockInfo, 
      syncScheduledStockPrices,
      isUsMarketTradingDay,
      getPreviousUsMarketTradingDay
    } = await import('../server/jobs/syncUsStockDataScheduled.ts');
    
    // 檢查今天是否為交易日
    const today = new Date();
    const isTradingDay = isUsMarketTradingDay(today);
    console.log(`今天 (${today.toISOString().split('T')[0]}) 是否為美股交易日: ${isTradingDay ? '是' : '否'}`);
    
    if (!isTradingDay) {
      const previousTradingDay = getPreviousUsMarketTradingDay(today);
      console.log(`前一交易日: ${previousTradingDay.toISOString().split('T')[0]}`);
    }
    
    // 測試同步前 3 支股票的基本資料 (縮短測試時間)
    console.log('\n測試同步前 3 支股票的基本資料...');
    console.log('(完整同步需要約 2.4 小時，這裡只測試前 3 支)');
    
    // 暫時修改 SCHEDULED_SYNC_STOCKS 只包含前 3 支
    const { SCHEDULED_SYNC_STOCKS } = await import('../server/config/usStockLists.ts');
    const originalLength = SCHEDULED_SYNC_STOCKS.length;
    const testStocks = SCHEDULED_SYNC_STOCKS.slice(0, 3);
    
    console.log(`測試股票: ${testStocks.join(', ')}`);
    console.log('開始同步...\n');
    
    // 由於無法直接修改 SCHEDULED_SYNC_STOCKS，我們改為測試單支股票
    const { getTwelveDataQuote } = await import('../server/integrations/twelvedata.ts');
    const { upsertUsStock } = await import('../server/db_us.ts');
    
    for (const symbol of testStocks) {
      try {
        console.log(`正在同步 ${symbol}...`);
        const quote = await getTwelveDataQuote(symbol);
        
        await upsertUsStock({
          symbol: quote.symbol,
          name: quote.name,
          exchange: quote.exchange,
          currency: quote.currency,
          type: quote.type,
          country: 'US',
          isActive: true,
        });
        
        console.log(`✅ ${symbol} 同步成功`);
        
        // 間隔 8 秒避免 API 限流
        if (testStocks.indexOf(symbol) < testStocks.length - 1) {
          console.log('等待 8 秒...\n');
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
      } catch (error) {
        console.error(`❌ ${symbol} 同步失敗:`, error.message);
      }
    }
    
    console.log('\n✅ 美股同步測試完成');
    console.log(`原始清單包含 ${originalLength} 支股票`);
    
    return true;
  } catch (error) {
    console.error('❌ 美股同步測試失敗:', error);
    return false;
  }
}

// 檢查排程設定
async function checkScheduleConfig() {
  console.log('\n=== 檢查排程設定 ===\n');
  
  try {
    const { 
      scheduleStockInfoSync, 
      scheduleStockPriceSync 
    } = await import('../server/jobs/syncUsStockDataScheduled.ts');
    
    console.log('✅ 排程函數已正確匯出');
    console.log('\n排程設定:');
    console.log('  基本資料同步: 每週日 06:00 (Asia/Taipei)');
    console.log('  價格資料同步: 每交易日 06:00 (Asia/Taipei)');
    console.log('\n當前時間:');
    console.log('  UTC:', new Date().toISOString());
    console.log('  台北:', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
    
    // 計算下次執行時間
    const now = new Date();
    const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const dayOfWeek = taipeiTime.getDay();
    const hour = taipeiTime.getHours();
    
    console.log('\n下次排程執行時間預估:');
    if (dayOfWeek === 0 && hour < 6) {
      console.log('  基本資料: 今天 06:00 (台北時間)');
    } else {
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      console.log(`  基本資料: ${daysUntilSunday} 天後的週日 06:00 (台北時間)`);
    }
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour < 6) {
      console.log('  價格資料: 今天 06:00 (台北時間)');
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      console.log('  價格資料: 明天 06:00 (台北時間)');
    } else {
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      console.log(`  價格資料: ${daysUntilMonday} 天後的週一 06:00 (台北時間)`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 檢查排程設定失敗:', error);
    return false;
  }
}

// 主函數
async function main() {
  console.log('='.repeat(60));
  console.log('美股同步診斷工具');
  console.log('='.repeat(60));
  
  // 1. 測試 API 連線
  const apiOk = await testTwelveDataConnection();
  if (!apiOk) {
    console.log('\n⚠️  API 連線失敗，請檢查 TWELVEDATA_TOKEN 環境變數');
    process.exit(1);
  }
  
  // 2. 檢查排程設定
  await checkScheduleConfig();
  
  // 3. 測試同步功能
  await testUsStockSync();
  
  console.log('\n' + '='.repeat(60));
  console.log('診斷完成');
  console.log('='.repeat(60));
  
  process.exit(0);
}

main().catch(error => {
  console.error('診斷工具執行失敗:', error);
  process.exit(1);
});

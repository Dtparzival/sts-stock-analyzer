/**
 * TwelveData API 測試腳本
 * 
 * 測試即時報價功能是否正常運作
 */

import { getTwelveDataQuote } from '../server/integrations/twelvedata.ts';

async function main() {
  console.log('='.repeat(60));
  console.log('TwelveData API 測試');
  console.log('='.repeat(60));
  console.log('');

  const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];

  console.log(`測試股票: ${testSymbols.join(', ')}\n`);

  for (const symbol of testSymbols) {
    try {
      console.log(`正在獲取 ${symbol} 即時報價...`);
      const quote = await getTwelveDataQuote(symbol);
      
      console.log(`✓ ${symbol} 報價成功:`);
      console.log(`  名稱: ${quote.name}`);
      console.log(`  價格: $${quote.close}`);
      console.log(`  開盤: $${quote.open}`);
      console.log(`  最高: $${quote.high}`);
      console.log(`  最低: $${quote.low}`);
      console.log(`  成交量: ${quote.volume?.toLocaleString() || 'N/A'}`);
      console.log(`  時間: ${quote.datetime}`);
      console.log('');
    } catch (error) {
      console.error(`✗ ${symbol} 報價失敗:`, error.message);
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('測試完成！');
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch(error => {
  console.error('測試失敗:', error);
  process.exit(1);
});

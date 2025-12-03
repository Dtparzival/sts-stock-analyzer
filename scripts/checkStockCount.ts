import { drizzle } from 'drizzle-orm/mysql2';
import { ENV } from '../server/_core/env';
import { usStocks, usStockPrices } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

async function main() {
  const db = drizzle(ENV.databaseUrl);
  
  const stockCount = await db.select({ count: sql`COUNT(*)` }).from(usStocks);
  const priceCount = await db.select({ count: sql`COUNT(*)` }).from(usStockPrices);
  
  console.log('='.repeat(60));
  console.log('美股資料庫統計');
  console.log('='.repeat(60));
  console.log(`股票總數: ${stockCount[0].count}`);
  console.log(`價格記錄總數: ${priceCount[0].count}`);
  
  // Get sample stocks
  const samples = await db.select().from(usStocks).limit(10);
  console.log('\n前 10 支股票:');
  samples.forEach((s, i) => {
    console.log(`${i + 1}. ${s.symbol.padEnd(6)} - ${s.name}`);
  });
  
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

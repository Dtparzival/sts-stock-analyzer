import { getDb } from '../server/db.ts';
import { twStocks, twStockPrices } from '../drizzle/schema.ts';

const db = await getDb();
if (!db) {
  console.log('❌ 資料庫連線失敗');
  process.exit(1);
}

const stockCount = await db.select().from(twStocks).then(r => r.length);
const priceCount = await db.select().from(twStockPrices).then(r => r.length);

console.log('📊 資料庫狀態：');
console.log(`  - 台股基本資料：${stockCount} 筆`);
console.log(`  - 台股價格資料：${priceCount} 筆`);

process.exit(0);

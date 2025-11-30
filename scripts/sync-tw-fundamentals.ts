/**
 * 台股基本面資料同步腳本
 * 從 FinMind API 抓取台股的基本面指標（EPS、本益比、殖利率等）並存入資料庫
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { twStockFundamentals, twseStockList } from '../drizzle/schema';
import { fetchFundamentals } from '../server/integrations/finmind';
import { eq } from 'drizzle-orm';

// 延遲函數（避免 API 速率限制）
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 同步單一股票的基本面資料
 */
async function syncStockFundamentals(
  db: ReturnType<typeof drizzle>,
  symbol: string,
  startDate: string
): Promise<number> {
  try {
    console.log(`[Sync] 正在同步 ${symbol} 的基本面資料...`);
    
    // 從 FinMind API 獲取基本面資料
    const data = await fetchFundamentals(symbol, startDate);
    
    if (!data || data.length === 0) {
      console.log(`[Sync] ${symbol} 無基本面資料`);
      return 0;
    }
    
    // 批次插入資料庫
    let insertCount = 0;
    for (const item of data) {
      try {
        // 檢查資料是否已存在
        const existing = await db
          .select()
          .from(twStockFundamentals)
          .where(eq(twStockFundamentals.symbol, symbol))
          .limit(1);
        
        if (existing.length > 0) {
          // 如果已存在，則更新
          await db
            .update(twStockFundamentals)
            .set({
              date: new Date(item.date),
              eps: item.eps || null,
              peRatio: item.PER || null,
              pbRatio: item.PBR || null,
              dividendYield: item.dividend_yield || null,
              roe: item.ROE || null,
              roa: item.ROA || null,
              updatedAt: new Date(),
            })
            .where(eq(twStockFundamentals.symbol, symbol));
        } else {
          // 如果不存在，則插入
          await db.insert(twStockFundamentals).values({
            symbol,
            date: new Date(item.date),
            year: item.year || null,
            quarter: item.quarter || null,
            eps: item.eps || null,
            peRatio: item.PER || null,
            pbRatio: item.PBR || null,
            dividendYield: item.dividend_yield || null,
            roe: item.ROE || null,
            roa: item.ROA || null,
            revenue: item.revenue || null,
            netIncome: item.net_income || null,
            totalAssets: item.total_assets || null,
            totalLiabilities: item.total_liabilities || null,
            cashDividend: item.cash_dividend || null,
            stockDividend: item.stock_dividend || null,
          });
        }
        
        insertCount++;
      } catch (error: any) {
        console.error(`[Sync] 插入 ${symbol} 資料失敗:`, error.message);
      }
    }
    
    console.log(`[Sync] ${symbol} 同步完成，共 ${insertCount} 筆資料`);
    return insertCount;
  } catch (error: any) {
    console.error(`[Sync] 同步 ${symbol} 失敗:`, error.message);
    return 0;
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('========================================');
  console.log('台股基本面資料同步腳本');
  console.log('========================================');
  
  // 連接資料庫
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);
  
  try {
    // 獲取所有台股代碼
    console.log('[Sync] 正在獲取台股列表...');
    const stocks = await db.select().from(twseStockList);
    console.log(`[Sync] 共 ${stocks.length} 支台股`);
    
    // 計算開始日期（過去 2 年）
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    const startDateStr = formatDate(startDate);
    
    console.log(`[Sync] 開始日期: ${startDateStr}`);
    console.log('[Sync] 開始同步基本面資料...');
    
    let totalInserted = 0;
    let successCount = 0;
    let failCount = 0;
    
    // 批次同步（每次 10 支股票）
    const batchSize = 10;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      console.log(`\n[Sync] 處理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(stocks.length / batchSize)}`);
      
      for (const stock of batch) {
        const insertCount = await syncStockFundamentals(db, stock.symbol, startDateStr);
        
        if (insertCount > 0) {
          totalInserted += insertCount;
          successCount++;
        } else {
          failCount++;
        }
        
        // 延遲 500ms 避免 API 速率限制
        await delay(500);
      }
      
      console.log(`[Sync] 批次完成，成功: ${successCount}, 失敗: ${failCount}, 總資料: ${totalInserted}`);
    }
    
    console.log('\n========================================');
    console.log('同步完成！');
    console.log(`成功: ${successCount} 支股票`);
    console.log(`失敗: ${failCount} 支股票`);
    console.log(`總資料: ${totalInserted} 筆`);
    console.log('========================================');
  } catch (error: any) {
    console.error('[Sync] 同步失敗:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 執行主函數
main().catch(error => {
  console.error('腳本執行失敗:', error);
  process.exit(1);
});

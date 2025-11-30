/**
 * 台股基本面資料測試同步腳本
 * 僅同步前 5 支股票，用於測試 FinMind API 整合是否正常
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { twStockFundamentals, twseStockList } from '../drizzle/schema';
import { fetchFundamentals } from '../server/integrations/finmind';
import { eq, and } from 'drizzle-orm';

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
 * 從日期字串提取年份和季度
 */
function extractYearQuarter(dateStr: string): { year: number; quarter: number } {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return { year, quarter };
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
    console.log(`[Test] 正在同步 ${symbol} 的基本面資料...`);
    
    // 從 FinMind API 獲取基本面資料
    const data = await fetchFundamentals(symbol, startDate);
    
    if (!data || data.length === 0) {
      console.log(`[Test] ${symbol} 無基本面資料`);
      return 0;
    }
    
    console.log(`[Test] ${symbol} 獲取到 ${data.length} 筆資料`);
    console.log(`[Test] 範例資料:`, JSON.stringify(data[0], null, 2));
    
    // 批次插入資料庫
    let insertCount = 0;
    for (const item of data) {
      try {
        // 從日期提取年份和季度
        const { year, quarter } = extractYearQuarter(item.date);
        
        // 檢查資料是否已存在
        const existing = await db
          .select()
          .from(twStockFundamentals)
          .where(
            and(
              eq(twStockFundamentals.symbol, symbol),
              eq(twStockFundamentals.year, year),
              eq(twStockFundamentals.quarter, quarter)
            )
          )
          .limit(1);
        
        // 準備插入的資料（轉換為整數，使用萬分之一和分為單位）
        const values = {
          symbol,
          year,
          quarter,
          eps: null, // FinMind TaiwanStockPER dataset 沒有 EPS
          pe: item.PER ? Math.round(item.PER * 10000) : null, // 本益比，轉換為萬分之一
          pb: item.PBR ? Math.round(item.PBR * 10000) : null, // 股價淨值比，轉換為萬分之一
          roe: null, // FinMind TaiwanStockPER dataset 沒有 ROE
          dividend: null, // FinMind TaiwanStockPER dataset 沒有 dividend
          yieldRate: item.dividend_yield ? Math.round(item.dividend_yield * 10000) : null, // 殖利率，轉換為萬分之一
          revenue: null, // FinMind TaiwanStockPER dataset 沒有 revenue
          netIncome: null, // FinMind TaiwanStockPER dataset 沒有 netIncome
        };
        
        if (existing.length > 0) {
          // 如果已存在，則更新
          await db
            .update(twStockFundamentals)
            .set({
              ...values,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(twStockFundamentals.symbol, symbol),
                eq(twStockFundamentals.year, year),
                eq(twStockFundamentals.quarter, quarter)
              )
            );
        } else {
          // 如果不存在，則插入
          await db.insert(twStockFundamentals).values(values);
        }
        
        insertCount++;
      } catch (error: any) {
        console.error(`[Test] 插入 ${symbol} 資料失敗:`, error.message);
      }
    }
    
    console.log(`[Test] ${symbol} 同步完成，共 ${insertCount} 筆資料`);
    return insertCount;
  } catch (error: any) {
    console.error(`[Test] 同步 ${symbol} 失敗:`, error.message);
    return 0;
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('========================================');
  console.log('台股基本面資料測試同步腳本');
  console.log('========================================');
  
  // 連接資料庫
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);
  
  try {
    // 獲取前 5 支台股
    console.log('[Test] 正在獲取台股列表...');
    const stocks = await db.select().from(twseStockList).limit(5);
    console.log(`[Test] 測試 ${stocks.length} 支台股`);
    
    // 計算開始日期（過去 1 年）
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = formatDate(startDate);
    
    console.log(`[Test] 開始日期: ${startDateStr}`);
    console.log('[Test] 開始同步基本面資料...\n');
    
    let totalInserted = 0;
    let successCount = 0;
    let failCount = 0;
    
    for (const stock of stocks) {
      const insertCount = await syncStockFundamentals(db, stock.symbol, startDateStr);
      
      if (insertCount > 0) {
        totalInserted += insertCount;
        successCount++;
      } else {
        failCount++;
      }
      
      // 延遲 1 秒避免 API 速率限制
      await delay(1000);
      console.log(''); // 空行分隔
    }
    
    console.log('========================================');
    console.log('測試同步完成！');
    console.log(`成功: ${successCount} 支股票`);
    console.log(`失敗: ${failCount} 支股票`);
    console.log(`總資料: ${totalInserted} 筆`);
    console.log('========================================');
  } catch (error: any) {
    console.error('[Test] 同步失敗:', error);
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

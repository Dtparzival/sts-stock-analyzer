/**
 * 更新搜尋歷史記錄的 shortName 欄位
 * 
 * 功能：為所有台股記錄添加簡稱（例如：台積電）
 * 使用方法：node server/migrations/updateShortName.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import mysql from 'mysql2/promise';

// 動態導入 schema
const { searchHistory } = await import('../../drizzle/schema.ts');

// 動態導入數據庫緩存服務
const { getStockList } = await import('../dbTwseStockListCache.ts');

// 主遷移函數
async function updateShortName() {
  console.log('='.repeat(60));
  console.log('更新搜尋歷史記錄的 shortName 欄位');
  console.log('='.repeat(60));
  console.log('');

  // 連接資料庫
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 1. 獲取 TWSE 股票列表（從數據庫緩存）
    console.log('[Step 1/4] 獲取 TWSE 股票列表...');
    const stockMap = await getStockList();
    console.log(`✓ 成功獲取 ${stockMap.size} 支股票資訊\n`);

    // 2. 查詢所有搜尋歷史記錄
    console.log('[Step 2/4] 查詢所有搜尋歷史記錄...');
    const records = await db.select().from(searchHistory);
    console.log(`✓ 找到 ${records.length} 筆記錄\n`);

    if (records.length === 0) {
      console.log('沒有需要更新的記錄，結束遷移。');
      return;
    }

    // 3. 批量更新記錄
    console.log('[Step 3/4] 批量更新 shortName 欄位...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        // 提取台股代碼（移除 .TW 或 .TWO 後綴）
        const cleanSymbol = record.symbol.replace(/\.(TW|TWO)$/i, '');
        
        // 檢查是否為台股（4 位數字）
        if (!/^\d{4}$/.test(cleanSymbol)) {
          // 美股或其他市場，跳過
          skipCount++;
          continue;
        }

        // 從數據庫緩存獲取股票資訊
        const stockInfo = stockMap.get(cleanSymbol);
        
        if (!stockInfo) {
          console.log(`  ⊘ 跳過無法找到資訊的記錄: ${cleanSymbol} (ID: ${record.id})`);
          skipCount++;
          continue;
        }

        // 更新 shortName 欄位
        const shortName = stockInfo.shortName || stockInfo.name;
        
        await db.update(searchHistory)
          .set({ shortName })
          .where(eq(searchHistory.id, record.id));

        console.log(`  ✓ 更新成功: ${cleanSymbol} → ${shortName} (ID: ${record.id})`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ 更新失敗: ${record.symbol} (ID: ${record.id})`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('[Step 4/4] 遷移完成！');
    console.log('='.repeat(60));
    console.log(`總計: ${records.length} 筆記錄`);
    console.log(`✓ 成功更新: ${successCount} 筆`);
    console.log(`⊘ 跳過: ${skipCount} 筆`);
    console.log(`✗ 失敗: ${errorCount} 筆`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('[Migration] 遷移過程發生錯誤:', error);
    throw error;
  } finally {
    // 關閉資料庫連接
    await connection.end();
  }
}

// 執行遷移
updateShortName()
  .then(() => {
    console.log('\n遷移腳本執行完畢。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n遷移腳本執行失敗:', error);
    process.exit(1);
  });

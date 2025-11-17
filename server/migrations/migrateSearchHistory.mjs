/**
 * 搜尋歷史數據遷移腳本
 * 
 * 功能：批量更新資料庫中舊格式的 companyName 欄位為新格式
 * 例如：2330.TW → 2330 台積電
 * 
 * 使用方法：node server/migrations/migrateSearchHistory.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { eq, like, or } from 'drizzle-orm';
import mysql from 'mysql2/promise';

// 動態導入 schema
const { searchHistory } = await import('../../drizzle/schema.ts');

// TWSE Stock List API
async function fetchTWSEStockList() {
  try {
    console.log('[Migration] Fetching TWSE stock list from OpenAPI...');
    
    const response = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TWSE API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Migration] Successfully fetched ${data.length} companies`);
    
    // 建立代碼到名稱的映射表
    const stockMap = new Map();
    for (const company of data) {
      if (company.公司代號 && /^\d{4}$/.test(company.公司代號)) {
        stockMap.set(company.公司代號, company.公司名稱 || '');
      }
    }
    
    return stockMap;
  } catch (error) {
    console.error('[Migration] Error fetching TWSE stock list:', error);
    throw error;
  }
}

// 主遷移函數
async function migrateSearchHistory() {
  console.log('='.repeat(60));
  console.log('搜尋歷史數據遷移腳本');
  console.log('='.repeat(60));
  console.log('');

  // 連接資料庫
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 1. 獲取 TWSE 股票列表
    console.log('[Step 1/4] 獲取 TWSE 股票列表...');
    const stockMap = await fetchTWSEStockList();
    console.log(`✓ 成功獲取 ${stockMap.size} 支股票資訊\n`);

    // 2. 查詢需要遷移的記錄（companyName 包含 .TW 或等於 symbol）
    console.log('[Step 2/4] 查詢需要遷移的記錄...');
    const records = await db.select().from(searchHistory).where(
      or(
        like(searchHistory.companyName, '%.TW%'),
        like(searchHistory.companyName, '%.TWO%')
      )
    );
    console.log(`✓ 找到 ${records.length} 筆需要遷移的記錄\n`);

    if (records.length === 0) {
      console.log('沒有需要遷移的記錄，結束遷移。');
      return;
    }

    // 3. 批量更新記錄
    console.log('[Step 3/4] 批量更新記錄...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        // 提取台股代碼（移除 .TW 或 .TWO 後綴）
        const cleanSymbol = record.symbol.replace(/\.(TW|TWO)$/i, '');
        
        // 檢查是否為台股（4 位數字）
        if (!/^\d{4}$/.test(cleanSymbol)) {
          console.log(`  ⊘ 跳過非台股記錄: ${record.symbol} (ID: ${record.id})`);
          skipCount++;
          continue;
        }

        // 從映射表獲取中文名稱
        const chineseName = stockMap.get(cleanSymbol);
        
        if (!chineseName) {
          console.log(`  ⊘ 跳過無法找到名稱的記錄: ${cleanSymbol} (ID: ${record.id})`);
          skipCount++;
          continue;
        }

        // 更新為新格式：代碼 + 空格 + 中文名稱
        const newCompanyName = `${cleanSymbol} ${chineseName}`;
        
        await db.update(searchHistory)
          .set({ companyName: newCompanyName })
          .where(eq(searchHistory.id, record.id));

        console.log(`  ✓ 更新成功: ${record.companyName} → ${newCompanyName} (ID: ${record.id})`);
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
migrateSearchHistory()
  .then(() => {
    console.log('\n遷移腳本執行完畢。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n遷移腳本執行失敗:', error);
    process.exit(1);
  });

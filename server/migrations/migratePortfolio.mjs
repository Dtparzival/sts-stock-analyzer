import { drizzle } from 'drizzle-orm/mysql2';
import { eq, or, like } from 'drizzle-orm';
import { portfolio } from '../../drizzle/schema.ts';
import { getTWStockName } from '../../shared/markets.ts';

/**
 * 遷移腳本：更新投資組合中的舊格式 companyName
 * 將所有包含 .TW 或 .TWO 的 companyName 更新為正確的中文名稱
 */

async function migratePortfolio() {
  console.log('🚀 開始遷移投資組合資料...\n');

  // 連接資料庫
  const db = drizzle(process.env.DATABASE_URL);

  try {
    // 1. 查詢所有需要更新的記錄（companyName 包含 .TW 或 .TWO）
    console.log('📊 查詢需要更新的記錄...');
    const recordsToUpdate = await db
      .select()
      .from(portfolio)
      .where(
        or(
          like(portfolio.companyName, '%.TW%'),
          like(portfolio.companyName, '%.TWO%')
        )
      );

    console.log(`找到 ${recordsToUpdate.length} 筆需要更新的記錄\n`);

    if (recordsToUpdate.length === 0) {
      console.log('✅ 沒有需要更新的記錄，遷移完成！');
      return;
    }

    // 2. 批量更新記錄
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const record of recordsToUpdate) {
      try {
        // 使用 getTWStockName 獲取中文名稱
        const chineseName = getTWStockName(record.symbol);

        if (chineseName) {
          // 更新記錄
          await db
            .update(portfolio)
            .set({ companyName: chineseName })
            .where(eq(portfolio.id, record.id));

          console.log(`✓ 更新成功：${record.symbol} | ${record.companyName} → ${chineseName}`);
          successCount++;
        } else {
          // 如果映射表中沒有這支股票，保持原樣
          console.log(`⊘ 跳過：${record.symbol} | 映射表中沒有此股票`);
          skipCount++;
        }
      } catch (error) {
        console.error(`✗ 更新失敗：${record.symbol} | 錯誤：${error.message}`);
        failCount++;
      }
    }

    // 3. 顯示統計結果
    console.log('\n' + '='.repeat(60));
    console.log('📈 遷移統計結果：');
    console.log(`  ✓ 成功更新：${successCount} 筆`);
    console.log(`  ⊘ 跳過：${skipCount} 筆`);
    console.log(`  ✗ 失敗：${failCount} 筆`);
    console.log('='.repeat(60));

    if (failCount === 0) {
      console.log('\n✅ 遷移完成！所有記錄已成功更新。');
    } else {
      console.log('\n⚠️  遷移完成，但有部分記錄更新失敗，請檢查錯誤日誌。');
    }
  } catch (error) {
    console.error('\n❌ 遷移過程中發生錯誤：', error);
    throw error;
  }
}

// 執行遷移
migratePortfolio()
  .then(() => {
    console.log('\n🎉 遷移腳本執行完畢！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 遷移腳本執行失敗：', error);
    process.exit(1);
  });

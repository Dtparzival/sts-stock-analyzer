#!/usr/bin/env node
/**
 * 執行 SQL 腳本建立台股資料表
 */

import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('錯誤：未設定 DATABASE_URL 環境變數');
    process.exit(1);
  }

  let connection;
  
  try {
    console.log('正在連接資料庫...');
    connection = await createConnection(databaseUrl);
    console.log('✓ 資料庫連接成功');

    // 讀取 SQL 腳本
    const sqlScript = readFileSync('/home/ubuntu/us-stock-analyzer/scripts/create-tw-stock-tables.sql', 'utf8');
    
    // 移除註解並分割 SQL 語句
    const cleanedScript = sqlScript
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // 以分號 + 換行分隔 CREATE TABLE 語句
    const statements = cleanedScript
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.startsWith('CREATE'));

    console.log(`\n準備執行 ${statements.length} 個 SQL 語句...\n`);

    // 逐一執行 SQL 語句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const tableName = statement.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/)?.[1];
      
      if (tableName) {
        console.log(`[${i + 1}/${statements.length}] 建立資料表: ${tableName}`);
      }
      
      await connection.execute(statement);
      
      if (tableName) {
        console.log(`✓ 資料表 ${tableName} 建立成功`);
      }
    }

    console.log('\n✓ 所有台股資料表建立完成！');
    console.log('\n建立的資料表：');
    console.log('  - twStocks (台股基本資料)');
    console.log('  - twStockPrices (台股歷史價格)');
    console.log('  - twStockIndicators (台股技術指標)');
    console.log('  - twStockFundamentals (台股基本面資料)');
    console.log('  - twDataSyncStatus (資料同步狀態)');

  } catch (error) {
    console.error('\n✗ 執行 SQL 腳本時發生錯誤：');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n資料庫連接已關閉');
    }
  }
}

runMigration();

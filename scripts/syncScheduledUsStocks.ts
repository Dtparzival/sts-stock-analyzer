#!/usr/bin/env tsx

/**
 * 美股定期同步手動執行腳本
 * 
 * 用途:手動觸發 S&P 500 與主要 ETF 的資料同步
 * 
 * 使用方式:
 * - tsx scripts/syncScheduledUsStocks.ts all     # 同步所有資料 (基本資料 + 價格)
 * - tsx scripts/syncScheduledUsStocks.ts info    # 僅同步基本資料
 * - tsx scripts/syncScheduledUsStocks.ts prices  # 僅同步歷史價格 (最近 30 天)
 * 
 * 應用場景:
 * - 首次部署時初始化資料
 * - 排程失敗後手動補充
 * - 測試同步功能
 * - 緊急資料更新
 */

import 'dotenv/config';
import {
  syncScheduledStockInfo,
  syncScheduledStockPrices,
} from '../server/jobs/syncUsStockDataScheduled';
import { getScheduledSyncStockCount } from '../server/config/usStockLists';

interface SyncResult {
  success: boolean;
  recordCount: number;
  errorCount: number;
  errors: Array<{ symbol?: string; message: string }>;
}

/**
 * 顯示使用說明
 */
function showUsage() {
  console.log('\n美股定期同步手動執行腳本');
  console.log('='.repeat(60));
  console.log('\n使用方式:');
  console.log('  tsx scripts/syncScheduledUsStocks.ts <command>');
  console.log('\n可用命令:');
  console.log('  all     - 同步所有資料 (基本資料 + 價格)');
  console.log('  info    - 僅同步基本資料');
  console.log('  prices  - 僅同步歷史價格 (最近 30 天)');
  console.log('\n範例:');
  console.log('  tsx scripts/syncScheduledUsStocks.ts all');
  console.log('  tsx scripts/syncScheduledUsStocks.ts info');
  console.log('  tsx scripts/syncScheduledUsStocks.ts prices');
  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * 格式化同步結果
 */
function formatResult(result: SyncResult, dataType: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`${dataType} 同步結果`);
  console.log('='.repeat(60));
  console.log(`狀態: ${result.success ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`成功記錄數: ${result.recordCount}`);
  console.log(`錯誤數: ${result.errorCount}`);

  if (result.errors.length > 0) {
    console.log('\n錯誤詳情:');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.symbol || 'N/A'}: ${error.message}`);
    });
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * 主函數
 */
async function main() {
  const command = process.argv[2];

  // 檢查命令參數
  if (!command || !['all', 'info', 'prices'].includes(command)) {
    showUsage();
    process.exit(1);
  }

  // 檢查環境變數
  if (!process.env.TWELVEDATA_TOKEN) {
    console.error('\n❌ 錯誤: TWELVEDATA_TOKEN 環境變數未設定');
    console.log('請在 .env 檔案中設定 TWELVEDATA_TOKEN\n');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('美股定期同步手動執行腳本');
  console.log('='.repeat(60));
  console.log(`\n✅ TwelveData API Token: ${process.env.TWELVEDATA_TOKEN.substring(0, 10)}...`);
  console.log(`✅ 定期同步股票數量: ${getScheduledSyncStockCount()} 支`);
  console.log(`✅ 執行命令: ${command}\n`);

  const startTime = Date.now();

  try {
    if (command === 'all' || command === 'info') {
      console.log('開始同步股票基本資料...\n');
      const infoResult = await syncScheduledStockInfo();
      formatResult(infoResult, '股票基本資料');
    }

    if (command === 'all' || command === 'prices') {
      console.log('開始同步歷史價格資料 (最近 30 天)...\n');
      const pricesResult = await syncScheduledStockPrices(30);
      formatResult(pricesResult, '歷史價格資料');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

    console.log('='.repeat(60));
    console.log('✅ 所有同步任務完成');
    console.log(`⏱️  總耗時: ${duration} 分鐘`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ 同步過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 執行主函數
main();

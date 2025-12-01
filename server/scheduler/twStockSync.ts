/**
 * 台股資料定期同步排程任務
 * 使用 node-cron 建立定期更新排程
 */

import { startTwStockScheduler, manualSync } from '../jobs/twStockScheduler';

/**
 * 初始化台股資料同步排程器
 * 在伺服器啟動時呼叫此函數
 */
export function initTwStockScheduler() {
  console.log('[Scheduler] 初始化台股資料同步排程器...');
  startTwStockScheduler();
}

/**
 * 手動觸發完整同步（用於測試或初始化）
 */
export async function manualFullSync() {
  console.log('[Scheduler] 手動觸發完整同步...');
  await manualSync();
}

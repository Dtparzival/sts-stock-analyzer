/**
 * 快取清理排程
 * 
 * 定期清理過期的 MySQL 快取資料
 * 
 * 排程設定:
 * - 每天凌晨 03:00 執行
 */

import cron from 'node-cron';
import { clearExpiredCache } from '../cache/cacheManager';

/**
 * 執行快取清理
 */
export async function runCacheCleanup(): Promise<void> {
  console.log('[Cache Cleanup] Starting cache cleanup...');

  try {
    await clearExpiredCache();
    console.log('[Cache Cleanup] Cache cleanup completed');
  } catch (error) {
    console.error('[Cache Cleanup] Cache cleanup failed:', error);
  }
}

/**
 * 設定快取清理排程
 * 每天凌晨 03:00 執行
 */
export function scheduleCacheCleanup() {
  // Cron 表達式: 0 0 3 * * * (每天 03:00)
  cron.schedule('0 0 3 * * *', async () => {
    console.log('[Cache Cleanup] Cache cleanup triggered by schedule');
    await runCacheCleanup();
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log('[Scheduler] Cache cleanup scheduled: Every day 03:00 (Taipei Time)');
}

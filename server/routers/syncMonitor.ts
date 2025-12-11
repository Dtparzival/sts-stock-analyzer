/**
 * 資料同步監控 API
 * 
 * 提供排程執行狀態、同步歷史、錯誤記錄等監控功能
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { 
  getAllTwDataSyncStatus, 
  getUnresolvedTwDataSyncErrors,
  getActiveTwStocks 
} from '../db';
import {
  getActiveUsStocks
} from '../db_us';

/**
 * 同步監控 Router
 */
export const syncMonitorRouter = router({
  /**
   * 獲取台股同步狀態
   */
  getTwSyncStatus: publicProcedure.query(async () => {
    const status = await getAllTwDataSyncStatus();
    const errors = await getUnresolvedTwDataSyncErrors();
    const activeStocks = await getActiveTwStocks();
    
    return {
      latestSync: status[0] || null,
      recentSyncs: status,
      recentErrors: errors,
      totalActiveStocks: activeStocks.length,
      nextScheduledSync: getNextTwScheduledSync(),
    };
  }),

  /**
   * 獲取美股同步狀態
   */
  getUsSyncStatus: publicProcedure.query(async () => {
    const { getAllUsDataSyncStatus, getUnresolvedUsDataSyncErrors } = await import('../db_us');
    const status = await getAllUsDataSyncStatus();
    const errors = await getUnresolvedUsDataSyncErrors();
    const activeStocks = await getActiveUsStocks();
    
    return {
      latestSync: status[0] || null,
      recentSyncs: status,
      recentErrors: errors,
      totalActiveStocks: activeStocks.length,
      nextScheduledSync: getNextUsScheduledSync(),
    };
  }),

  /**
   * 獲取整體同步健康狀態
   */
  getOverallHealth: publicProcedure.query(async () => {
    const twStatus = await getAllTwDataSyncStatus();
    const { getAllUsDataSyncStatus } = await import('../db_us');
    const usStatus = await getAllUsDataSyncStatus();
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // 檢查台股同步健康狀態
    const twHealthy = twStatus[0] && 
      new Date(twStatus[0].lastSyncAt) > oneDayAgo &&
      twStatus[0].status !== 'failed';
    
    // 檢查美股同步健康狀態
    const usHealthy = usStatus[0] && 
      new Date(usStatus[0].lastSyncAt) > oneDayAgo &&
      usStatus[0].status !== 'failed';
    
    return {
      overall: twHealthy && usHealthy ? 'healthy' : 'unhealthy',
      tw: {
        status: twHealthy ? 'healthy' : 'unhealthy',
        lastSync: twStatus[0]?.lastSyncAt || null,
        lastStatus: twStatus[0]?.status || null,
      },
      us: {
        status: usHealthy ? 'healthy' : 'unhealthy',
        lastSync: usStatus[0]?.lastSyncAt || null,
        lastStatus: usStatus[0]?.status || null,
      },
      nextScheduledSyncs: {
        tw: getNextTwScheduledSync(),
        us: getNextUsScheduledSync(),
      },
    };
  }),

  /**
   * 獲取同步錯誤詳情
   */
  getSyncErrors: publicProcedure
    .input(z.object({
      market: z.enum(['tw', 'us']),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      if (input.market === 'tw') {
        const errors = await getUnresolvedTwDataSyncErrors();
        return errors.slice(0, input.limit);
      } else {
        const { getUnresolvedUsDataSyncErrors } = await import('../db_us');
        const errors = await getUnresolvedUsDataSyncErrors();
        return errors.slice(0, input.limit);
      }
    }),
});

/**
 * 計算下次台股排程執行時間
 */
function getNextTwScheduledSync(): { stocks: Date | null; prices: Date | null } {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  
  // 基本資料：每週日 02:00
  const nextStocksSync = getNextScheduledTime(taipeiTime, 0, 2); // 週日 02:00
  
  // 價格資料：每交易日 02:00 (週一到週五)
  const nextPricesSync = getNextWeekdayScheduledTime(taipeiTime, 2); // 週一到週五 02:00
  
  return {
    stocks: nextStocksSync,
    prices: nextPricesSync,
  };
}

/**
 * 計算下次美股排程執行時間
 */
function getNextUsScheduledSync(): { stocks: Date | null; prices: Date | null } {
  const now = new Date();
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  
  // 基本資料：每週日 06:00
  const nextStocksSync = getNextScheduledTime(taipeiTime, 0, 6); // 週日 06:00
  
  // 價格資料：每交易日 06:00 (週一到週五)
  const nextPricesSync = getNextWeekdayScheduledTime(taipeiTime, 6); // 週一到週五 06:00
  
  return {
    stocks: nextStocksSync,
    prices: nextPricesSync,
  };
}

/**
 * 計算下次指定星期幾和時間的排程執行時間
 */
function getNextScheduledTime(now: Date, targetDayOfWeek: number, targetHour: number): Date {
  const result = new Date(now);
  const currentDayOfWeek = result.getDay();
  const currentHour = result.getHours();
  
  // 計算距離目標星期幾還有幾天
  let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;
  
  // 如果今天就是目標星期幾，但時間已過，則推到下週
  if (daysUntilTarget === 0 && currentHour >= targetHour) {
    daysUntilTarget = 7;
  } else if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }
  
  result.setDate(result.getDate() + daysUntilTarget);
  result.setHours(targetHour, 0, 0, 0);
  
  return result;
}

/**
 * 計算下次工作日（週一到週五）指定時間的排程執行時間
 */
function getNextWeekdayScheduledTime(now: Date, targetHour: number): Date {
  const result = new Date(now);
  const currentDayOfWeek = result.getDay();
  const currentHour = result.getHours();
  
  // 如果今天是工作日且時間未到，返回今天
  if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5 && currentHour < targetHour) {
    result.setHours(targetHour, 0, 0, 0);
    return result;
  }
  
  // 否則找下一個工作日
  let daysToAdd = 1;
  let nextDay = new Date(result);
  nextDay.setDate(nextDay.getDate() + daysToAdd);
  
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    daysToAdd++;
    nextDay = new Date(result);
    nextDay.setDate(nextDay.getDate() + daysToAdd);
  }
  
  nextDay.setHours(targetHour, 0, 0, 0);
  return nextDay;
}

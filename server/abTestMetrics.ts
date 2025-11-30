/**
 * A/B 測試指標追蹤模組
 * 
 * 用於收集和分析 A/B 測試的效果指標
 * - 點擊率（CTR）：用戶點擊推薦股票的比例
 * - 停留時間：用戶在推薦股票詳情頁的停留時間
 * - 收藏率：用戶收藏推薦股票的比例
 */

import { getDb } from './db';
import { userBehavior, watchlist } from '../drizzle/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getUserABTestVariant, type ABTestVariant } from './abTestConfig';

export interface ABTestMetrics {
  variant: ABTestVariant;
  totalRecommendations: number;
  clickedRecommendations: number;
  clickThroughRate: number;
  averageViewTime: number;
  favoritedRecommendations: number;
  favoriteRate: number;
}

/**
 * 計算 A/B 測試指標
 * 
 * @param userId 用戶 ID
 * @param startDate 開始日期（可選）
 * @returns A/B 測試指標
 */
export async function calculateABTestMetrics(
  userId: number,
  startDate?: Date
): Promise<ABTestMetrics> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // 獲取用戶的 A/B 測試組別
  const variant = getUserABTestVariant(userId).variant;

  // 獲取用戶的行為數據
  const behaviors = startDate
    ? await db
        .select()
        .from(userBehavior)
        .where(and(
          eq(userBehavior.userId, userId),
          gte(userBehavior.lastViewedAt, startDate)
        ))
    : await db
        .select()
        .from(userBehavior)
        .where(eq(userBehavior.userId, userId));

  // 獲取用戶的收藏列表
  const favorites = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId));

  const favoriteSymbols = new Set(favorites.map(f => f.symbol));

  // 計算指標
  const totalRecommendations = behaviors.length;
  const clickedRecommendations = behaviors.filter((b: any) => b.viewCount > 0).length;
  const clickThroughRate = totalRecommendations > 0
    ? clickedRecommendations / totalRecommendations
    : 0;

  const totalViewTime = behaviors.reduce((sum: number, b: any) => sum + b.totalViewTime, 0);
  const averageViewTime = clickedRecommendations > 0
    ? totalViewTime / clickedRecommendations
    : 0;

  const favoritedRecommendations = behaviors.filter((b: any) =>
    favoriteSymbols.has(b.symbol)
  ).length;
  const favoriteRate = totalRecommendations > 0
    ? favoritedRecommendations / totalRecommendations
    : 0;

  return {
    variant,
    totalRecommendations,
    clickedRecommendations,
    clickThroughRate,
    averageViewTime,
    favoritedRecommendations,
    favoriteRate,
  };
}

/**
 * 比較兩個 A/B 測試變體的效果
 * 
 * @param metricsA Variant A 的指標
 * @param metricsB Variant B 的指標
 * @returns 比較結果
 */
export function compareABTestMetrics(
  metricsA: ABTestMetrics,
  metricsB: ABTestMetrics
) {
  return {
    clickThroughRateDiff: metricsB.clickThroughRate - metricsA.clickThroughRate,
    averageViewTimeDiff: metricsB.averageViewTime - metricsA.averageViewTime,
    favoriteRateDiff: metricsB.favoriteRate - metricsA.favoriteRate,
    winner: determineWinner(metricsA, metricsB),
  };
}

/**
 * 判斷哪個變體表現更好
 * 
 * 綜合考慮三個指標：
 * - 點擊率（40% 權重）
 * - 平均停留時間（30% 權重）
 * - 收藏率（30% 權重）
 * 
 * @param metricsA Variant A 的指標
 * @param metricsB Variant B 的指標
 * @returns 獲勝的變體
 */
function determineWinner(
  metricsA: ABTestMetrics,
  metricsB: ABTestMetrics
): ABTestVariant | 'tie' {
  const scoreA =
    metricsA.clickThroughRate * 0.4 +
    (metricsA.averageViewTime / 60) * 0.3 + // 轉換為分鐘
    metricsA.favoriteRate * 0.3;

  const scoreB =
    metricsB.clickThroughRate * 0.4 +
    (metricsB.averageViewTime / 60) * 0.3 +
    metricsB.favoriteRate * 0.3;

  const diff = Math.abs(scoreA - scoreB);
  
  // 如果差異小於 5%，視為平手
  if (diff < 0.05) {
    return 'tie';
  }

  return scoreA > scoreB ? 'A' : 'B';
}

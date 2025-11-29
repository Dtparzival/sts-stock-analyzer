import { getDb } from "./db";
import { userBehavior, watchlist } from "../drizzle/schema";
import { eq, and, desc, sql, notInArray } from "drizzle-orm";

/**
 * 智能推薦演算法配置
 */
const RECOMMENDATION_CONFIG = {
  // 權重配置
  weights: {
    viewCount: 0.3,      // 查看頻率權重
    searchCount: 0.2,    // 搜尋頻率權重
    viewTime: 0.25,      // 停留時間權重
    favorite: 0.25,      // 收藏偏好權重
  },
  // 時間衰減因子（天數）
  timeDecayDays: 30,
  // 最大推薦數量
  maxRecommendations: 6,
  // 最小行為次數閾值（過濾低頻行為）
  minBehaviorThreshold: 1,
};

/**
 * 推薦股票介面
 */
export interface RecommendedStock {
  symbol: string;
  score: number;
  reason: string;
  viewCount: number;
  searchCount: number;
  totalViewTime: number;
  isFavorite: boolean;
  lastViewedAt: Date;
}

/**
 * 計算時間衰減係數
 * 近期行為權重更高，使用指數衰減
 */
function calculateTimeDecay(lastViewedAt: Date): number {
  const now = new Date();
  const daysSinceLastView = (now.getTime() - lastViewedAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // 指數衰減公式: e^(-days / decayDays)
  // 例如：1天前 = 0.97, 7天前 = 0.80, 30天前 = 0.37
  const decay = Math.exp(-daysSinceLastView / RECOMMENDATION_CONFIG.timeDecayDays);
  
  return Math.max(decay, 0.1); // 最小衰減係數為 0.1
}

/**
 * 計算單一股票的推薦評分
 */
function calculateStockScore(
  viewCount: number,
  searchCount: number,
  totalViewTime: number,
  isFavorite: boolean,
  lastViewedAt: Date
): number {
  const { weights } = RECOMMENDATION_CONFIG;
  
  // 正規化各項指標（使用對數函數平滑高頻值）
  const normalizedViewCount = Math.log1p(viewCount);
  const normalizedSearchCount = Math.log1p(searchCount);
  const normalizedViewTime = Math.log1p(totalViewTime / 60); // 轉換為分鐘
  const favoriteScore = isFavorite ? 1 : 0;
  
  // 計算基礎評分
  const baseScore = 
    normalizedViewCount * weights.viewCount +
    normalizedSearchCount * weights.searchCount +
    normalizedViewTime * weights.viewTime +
    favoriteScore * weights.favorite;
  
  // 應用時間衰減
  const timeDecay = calculateTimeDecay(lastViewedAt);
  const finalScore = baseScore * timeDecay;
  
  return finalScore;
}

/**
 * 生成推薦理由
 */
function generateRecommendationReason(
  viewCount: number,
  searchCount: number,
  totalViewTime: number,
  isFavorite: boolean
): string {
  const reasons: string[] = [];
  
  if (isFavorite) {
    reasons.push("您已收藏此股票");
  }
  
  if (viewCount >= 5) {
    reasons.push("您經常查看此股票");
  } else if (viewCount >= 3) {
    reasons.push("您多次查看此股票");
  }
  
  if (searchCount >= 3) {
    reasons.push("您多次搜尋此股票");
  }
  
  if (totalViewTime >= 300) { // 5分鐘以上
    reasons.push("您在此股票停留時間較長");
  }
  
  if (reasons.length === 0) {
    reasons.push("基於您的瀏覽記錄");
  }
  
  return reasons.join("，");
}

/**
 * 獲取用戶的個人化推薦股票
 * 
 * @param userId 用戶ID
 * @returns 推薦股票列表，按評分降序排列
 */
export async function getPersonalizedRecommendations(
  userId: number
): Promise<RecommendedStock[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Recommendation] Database not available");
    return [];
  }

  try {
    // 1. 獲取用戶的所有行為數據
    const behaviors = await db
      .select()
      .from(userBehavior)
      .where(eq(userBehavior.userId, userId))
      .orderBy(desc(userBehavior.lastViewedAt));

    if (behaviors.length === 0) {
      console.log("[Recommendation] No user behavior found for userId:", userId);
      return [];
    }

    // 2. 獲取用戶的收藏列表
    const favorites = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId));

    const favoriteSymbols = new Set(favorites.map(f => f.symbol));

    // 3. 過濾並計算每個股票的推薦評分
    const recommendations: RecommendedStock[] = behaviors
      .filter(b => {
        // 過濾低頻行為
        const totalActivity = b.viewCount + b.searchCount;
        return totalActivity >= RECOMMENDATION_CONFIG.minBehaviorThreshold;
      })
      .map(b => {
        const isFavorite = favoriteSymbols.has(b.symbol);
        const score = calculateStockScore(
          b.viewCount,
          b.searchCount,
          b.totalViewTime,
          isFavorite,
          b.lastViewedAt
        );
        const reason = generateRecommendationReason(
          b.viewCount,
          b.searchCount,
          b.totalViewTime,
          isFavorite
        );

        return {
          symbol: b.symbol,
          score,
          reason,
          viewCount: b.viewCount,
          searchCount: b.searchCount,
          totalViewTime: b.totalViewTime,
          isFavorite,
          lastViewedAt: b.lastViewedAt,
        };
      })
      .sort((a, b) => b.score - a.score) // 按評分降序排列
      .slice(0, RECOMMENDATION_CONFIG.maxRecommendations); // 取前N個

    console.log(`[Recommendation] Generated ${recommendations.length} recommendations for userId: ${userId}`);
    
    return recommendations;
  } catch (error) {
    console.error("[Recommendation] Failed to generate recommendations:", error);
    return [];
  }
}

/**
 * 推薦結果快取
 * 使用 Map 結構，key 為 userId，value 為 { recommendations, timestamp }
 */
const recommendationCache = new Map<number, {
  recommendations: RecommendedStock[];
  timestamp: number;
}>();

/**
 * 快取過期時間（毫秒）
 */
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5分鐘

/**
 * 獲取快取的推薦結果（如果有效）
 */
export async function getCachedRecommendations(
  userId: number
): Promise<RecommendedStock[] | null> {
  const cached = recommendationCache.get(userId);
  
  if (!cached) {
    return null;
  }
  
  const now = Date.now();
  const age = now - cached.timestamp;
  
  if (age > CACHE_EXPIRY_MS) {
    // 快取已過期，清除
    recommendationCache.delete(userId);
    return null;
  }
  
  console.log(`[Recommendation] Cache hit for userId: ${userId}, age: ${Math.round(age / 1000)}s`);
  return cached.recommendations;
}

/**
 * 設定推薦結果快取
 */
export function setCachedRecommendations(
  userId: number,
  recommendations: RecommendedStock[]
): void {
  recommendationCache.set(userId, {
    recommendations,
    timestamp: Date.now(),
  });
  
  console.log(`[Recommendation] Cache set for userId: ${userId}, count: ${recommendations.length}`);
}

/**
 * 清除用戶的推薦快取
 */
export function clearRecommendationCache(userId: number): void {
  recommendationCache.delete(userId);
  console.log(`[Recommendation] Cache cleared for userId: ${userId}`);
}

/**
 * 清除所有過期的快取
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  recommendationCache.forEach((cached, userId) => {
    const age = now - cached.timestamp;
    if (age > CACHE_EXPIRY_MS) {
      recommendationCache.delete(userId);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`[Recommendation] Cleaned up ${cleanedCount} expired cache entries`);
  }
}

// 定期清理過期快取（每10分鐘）
setInterval(cleanupExpiredCache, 10 * 60 * 1000);

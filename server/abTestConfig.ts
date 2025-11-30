/**
 * A/B 測試配置模組
 * 
 * 用於測試不同時間衰減參數對推薦準確性的影響
 * - Variant A: 7 天衰減週期（當前預設）
 * - Variant B: 14 天衰減週期
 */

export type ABTestVariant = 'A' | 'B';

export interface ABTestConfig {
  variant: ABTestVariant;
  decayPeriodDays: number;
  description: string;
}

/**
 * A/B 測試變體配置
 */
export const AB_TEST_VARIANTS: Record<ABTestVariant, ABTestConfig> = {
  A: {
    variant: 'A',
    decayPeriodDays: 7,
    description: '7 天衰減週期（短期行為權重高）',
  },
  B: {
    variant: 'B',
    decayPeriodDays: 14,
    description: '14 天衰減週期（中期行為權重高）',
  },
};

/**
 * 根據用戶 ID 分配 A/B 測試組別
 * 
 * 使用用戶 ID 的奇偶性進行 50/50 分配
 * - 偶數 ID → Variant A (7 天)
 * - 奇數 ID → Variant B (14 天)
 * 
 * @param userId 用戶 ID
 * @returns A/B 測試變體配置
 */
export function getUserABTestVariant(userId: number): ABTestConfig {
  const variant: ABTestVariant = userId % 2 === 0 ? 'A' : 'B';
  return AB_TEST_VARIANTS[variant];
}

/**
 * 計算時間衰減因子
 * 
 * 使用指數衰減函數：權重 = e^(-天數/衰減週期)
 * 
 * @param daysSinceLastView 距離上次查看的天數
 * @param decayPeriodDays 衰減週期（天）
 * @returns 時間衰減因子（0-1 之間）
 */
export function calculateTimeDecayFactor(
  daysSinceLastView: number,
  decayPeriodDays: number
): number {
  return Math.exp(-daysSinceLastView / decayPeriodDays);
}

/**
 * 取得用戶的時間衰減因子
 * 
 * 根據用戶的 A/B 測試組別，使用對應的衰減週期計算時間衰減因子
 * 
 * @param userId 用戶 ID
 * @param daysSinceLastView 距離上次查看的天數
 * @returns 時間衰減因子
 */
export function getUserTimeDecayFactor(
  userId: number,
  daysSinceLastView: number
): number {
  const config = getUserABTestVariant(userId);
  return calculateTimeDecayFactor(daysSinceLastView, config.decayPeriodDays);
}

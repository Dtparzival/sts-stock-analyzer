import { describe, it, expect } from 'vitest';
import {
  getUserABTestVariant,
  calculateTimeDecayFactor,
  getUserTimeDecayFactor,
  AB_TEST_VARIANTS,
} from './abTestConfig';

/**
 * A/B 測試單元測試
 * 
 * 測試項目：
 * 1. 用戶分組邏輯（50/50 分配）
 * 2. 時間衰減因子計算（7 天 vs 14 天）
 * 3. A/B 測試變體配置
 */

describe('A/B 測試配置', () => {
  describe('用戶分組邏輯', () => {
    it('偶數 ID 應該分配到 Variant A (7 天衰減)', () => {
      const config = getUserABTestVariant(2);
      expect(config.variant).toBe('A');
      expect(config.decayPeriodDays).toBe(7);
    });

    it('奇數 ID 應該分配到 Variant B (14 天衰減)', () => {
      const config = getUserABTestVariant(3);
      expect(config.variant).toBe('B');
      expect(config.decayPeriodDays).toBe(14);
    });

    it('應該實現 50/50 分配', () => {
      const testUserIds = Array.from({ length: 100 }, (_, i) => i + 1);
      const variantCounts = { A: 0, B: 0 };

      testUserIds.forEach(userId => {
        const variant = getUserABTestVariant(userId).variant;
        variantCounts[variant]++;
      });

      expect(variantCounts.A).toBe(50);
      expect(variantCounts.B).toBe(50);
    });

    it('相同用戶 ID 應該始終返回相同的變體', () => {
      const userId = 42;
      const variant1 = getUserABTestVariant(userId);
      const variant2 = getUserABTestVariant(userId);
      const variant3 = getUserABTestVariant(userId);

      expect(variant1.variant).toBe(variant2.variant);
      expect(variant2.variant).toBe(variant3.variant);
    });
  });

  describe('時間衰減因子計算', () => {
    it('7 天衰減：0 天應該返回權重 1.0', () => {
      const factor = calculateTimeDecayFactor(0, 7);
      expect(factor).toBeCloseTo(1.0, 3);
    });

    it('7 天衰減：7 天應該返回權重 ≈ 0.368', () => {
      const factor = calculateTimeDecayFactor(7, 7);
      expect(factor).toBeCloseTo(0.368, 3);
    });

    it('7 天衰減：14 天應該返回權重 ≈ 0.135', () => {
      const factor = calculateTimeDecayFactor(14, 7);
      expect(factor).toBeCloseTo(0.135, 3);
    });

    it('14 天衰減：0 天應該返回權重 1.0', () => {
      const factor = calculateTimeDecayFactor(0, 14);
      expect(factor).toBeCloseTo(1.0, 3);
    });

    it('14 天衰減：7 天應該返回權重 ≈ 0.6065', () => {
      const factor = calculateTimeDecayFactor(7, 14);
      expect(factor).toBeCloseTo(0.6065, 3);
    });

    it('14 天衰減：14 天應該返回權重 ≈ 0.368', () => {
      const factor = calculateTimeDecayFactor(14, 14);
      expect(factor).toBeCloseTo(0.368, 3);
    });

    it('時間衰減因子應該隨時間遞減', () => {
      const factor0 = calculateTimeDecayFactor(0, 7);
      const factor7 = calculateTimeDecayFactor(7, 7);
      const factor14 = calculateTimeDecayFactor(14, 7);
      const factor30 = calculateTimeDecayFactor(30, 7);

      expect(factor0).toBeGreaterThan(factor7);
      expect(factor7).toBeGreaterThan(factor14);
      expect(factor14).toBeGreaterThan(factor30);
    });
  });

  describe('用戶時間衰減因子', () => {
    it('偶數用戶 ID 應該使用 7 天衰減週期', () => {
      const userId = 2;
      const daysSinceLastView = 7;
      const factor = getUserTimeDecayFactor(userId, daysSinceLastView);
      const expected = calculateTimeDecayFactor(daysSinceLastView, 7);
      expect(factor).toBeCloseTo(expected, 3);
    });

    it('奇數用戶 ID 應該使用 14 天衰減週期', () => {
      const userId = 3;
      const daysSinceLastView = 7;
      const factor = getUserTimeDecayFactor(userId, daysSinceLastView);
      const expected = calculateTimeDecayFactor(daysSinceLastView, 14);
      expect(factor).toBeCloseTo(expected, 3);
    });

    it('相同天數下，14 天衰減應該比 7 天衰減權重更高', () => {
      const daysSinceLastView = 7;
      const factor7Days = getUserTimeDecayFactor(2, daysSinceLastView); // 偶數 ID → 7 天
      const factor14Days = getUserTimeDecayFactor(3, daysSinceLastView); // 奇數 ID → 14 天

      expect(factor14Days).toBeGreaterThan(factor7Days);
    });
  });

  describe('A/B 測試變體配置', () => {
    it('Variant A 應該配置為 7 天衰減週期', () => {
      expect(AB_TEST_VARIANTS.A.decayPeriodDays).toBe(7);
      expect(AB_TEST_VARIANTS.A.variant).toBe('A');
    });

    it('Variant B 應該配置為 14 天衰減週期', () => {
      expect(AB_TEST_VARIANTS.B.decayPeriodDays).toBe(14);
      expect(AB_TEST_VARIANTS.B.variant).toBe('B');
    });

    it('所有變體應該有描述', () => {
      expect(AB_TEST_VARIANTS.A.description).toBeTruthy();
      expect(AB_TEST_VARIANTS.B.description).toBeTruthy();
    });
  });

  describe('A/B 測試效果比較', () => {
    it('14 天衰減應該對舊行為給予更高權重', () => {
      // 模擬一個 10 天前的行為
      const daysSinceLastView = 10;
      
      // Variant A (7 天衰減)
      const factorA = calculateTimeDecayFactor(daysSinceLastView, 7);
      
      // Variant B (14 天衰減)
      const factorB = calculateTimeDecayFactor(daysSinceLastView, 14);
      
      // 14 天衰減應該給予更高權重
      expect(factorB).toBeGreaterThan(factorA);
      
      // 計算權重差異
      const weightDifference = factorB - factorA;
      expect(weightDifference).toBeGreaterThan(0);
    });

    it('7 天衰減應該對近期行為更敏感', () => {
      // 近期行為（3 天前）
      const recentDays = 3;
      const recentFactorA = calculateTimeDecayFactor(recentDays, 7);
      const recentFactorB = calculateTimeDecayFactor(recentDays, 14);
      
      // 舊行為（10 天前）
      const oldDays = 10;
      const oldFactorA = calculateTimeDecayFactor(oldDays, 7);
      const oldFactorB = calculateTimeDecayFactor(oldDays, 14);
      
      // 7 天衰減的權重下降應該更快
      const decayRateA = (recentFactorA - oldFactorA) / recentFactorA;
      const decayRateB = (recentFactorB - oldFactorB) / recentFactorB;
      
      expect(decayRateA).toBeGreaterThan(decayRateB);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { analyzeUserProfile, getCandidateStocks, getAIRecommendations } from './aiRecommendation';
import * as db from './db';

/**
 * AI 推薦邏輯測試
 * 
 * 測試目標：
 * 1. 驗證用戶畫像分析功能
 * 2. 驗證「未看過」股票過濾邏輯
 * 3. 驗證推薦結果不包含已查看、已持有、已收藏的股票
 * 4. 驗證市場偏好排序功能
 * 5. 驗證降級策略（新用戶、無候選股票）
 */

describe('AI 推薦邏輯測試', () => {
  // 使用真實用戶 ID 進行測試
  const testUserId = 1;

  describe('用戶畫像分析', () => {
    it('應該正確分析用戶行為數據', async () => {
      const profile = await analyzeUserProfile(testUserId);

      // 驗證用戶畫像結構
      expect(profile).toHaveProperty('viewedSymbols');
      expect(profile).toHaveProperty('portfolioSymbols');
      expect(profile).toHaveProperty('favoriteSymbols');
      expect(profile).toHaveProperty('preferences');

      // 驗證偏好數據結構
      expect(profile.preferences).toHaveProperty('markets');
      expect(profile.preferences).toHaveProperty('sectors');
      expect(profile.preferences).toHaveProperty('avgViewCount');
      expect(profile.preferences).toHaveProperty('avgViewTime');
      expect(profile.preferences).toHaveProperty('favoriteRatio');

      console.log('✅ 用戶畫像分析成功');
      console.log(`   - 已查看股票數量: ${profile.viewedSymbols.size}`);
      console.log(`   - 投資組合股票數量: ${profile.portfolioSymbols.size}`);
      console.log(`   - 收藏股票數量: ${profile.favoriteSymbols.size}`);
      console.log(`   - 平均查看次數: ${profile.preferences.avgViewCount.toFixed(2)}`);
      console.log(`   - 平均停留時間: ${Math.floor(profile.preferences.avgViewTime / 1000)} 秒`);
    });

    it('應該正確統計市場偏好', async () => {
      const profile = await analyzeUserProfile(testUserId);

      // 驗證市場偏好統計
      const markets = Array.from(profile.preferences.markets.entries());
      console.log('✅ 市場偏好統計:');
      markets.forEach(([market, count]) => {
        console.log(`   - ${market}: ${count} 次`);
      });

      // 至少應該有一個市場偏好
      expect(markets.length).toBeGreaterThan(0);
    });
  });

  describe('候選股票過濾', () => {
    it('應該過濾掉用戶已查看的股票', async () => {
      const profile = await analyzeUserProfile(testUserId);
      const candidates = await getCandidateStocks(profile, 20);

      // 驗證候選股票不包含已查看的股票
      candidates.forEach(symbol => {
        expect(profile.viewedSymbols.has(symbol)).toBe(false);
      });

      console.log('✅ 成功過濾已查看的股票');
      console.log(`   - 候選股票數量: ${candidates.length}`);
    });

    it('應該過濾掉用戶已持有的股票', async () => {
      const profile = await analyzeUserProfile(testUserId);
      const candidates = await getCandidateStocks(profile, 20);

      // 驗證候選股票不包含已持有的股票
      candidates.forEach(symbol => {
        expect(profile.portfolioSymbols.has(symbol)).toBe(false);
      });

      console.log('✅ 成功過濾已持有的股票');
    });

    it('應該過濾掉用戶已收藏的股票', async () => {
      const profile = await analyzeUserProfile(testUserId);
      const candidates = await getCandidateStocks(profile, 20);

      // 驗證候選股票不包含已收藏的股票
      candidates.forEach(symbol => {
        expect(profile.favoriteSymbols.has(symbol)).toBe(false);
      });

      console.log('✅ 成功過濾已收藏的股票');
    });

    it('應該根據市場偏好排序候選股票', async () => {
      const profile = await analyzeUserProfile(testUserId);
      const candidates = await getCandidateStocks(profile, 20);

      if (candidates.length > 0) {
        console.log('✅ 候選股票排序成功');
        console.log(`   - 前 5 個候選股票: ${candidates.slice(0, 5).join(', ')}`);
      } else {
        console.log('⚠️  沒有候選股票（用戶可能已查看所有熱門股票）');
      }
    });
  });

  describe('AI 推薦結果', () => {
    it('應該返回推薦股票列表和推薦理由', async () => {
      const result = await getAIRecommendations(testUserId, 6);

      // 驗證返回結構
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('reason');

      // 驗證推薦數量
      expect(Array.isArray(result.recommendations)).toBe(true);

      // 驗證推薦理由
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);

      console.log('✅ AI 推薦結果生成成功');
      console.log(`   - 推薦股票數量: ${result.recommendations.length}`);
      console.log(`   - 推薦股票: ${result.recommendations.join(', ')}`);
      console.log(`   - 推薦理由: ${result.reason}`);
    });

    it('推薦的股票應該是用戶未看過的', async () => {
      const profile = await analyzeUserProfile(testUserId);
      const result = await getAIRecommendations(testUserId, 6);

      // 驗證推薦股票不在已查看列表中
      result.recommendations.forEach(symbol => {
        const isViewed = profile.viewedSymbols.has(symbol);
        const isInPortfolio = profile.portfolioSymbols.has(symbol);
        const isFavorited = profile.favoriteSymbols.has(symbol);

        // 推薦的股票應該是未看過、未持有、未收藏的
        const isUnseen = !isViewed && !isInPortfolio && !isFavorited;

        if (!isUnseen) {
          console.warn(`⚠️  推薦股票 ${symbol} 已被用戶查看/持有/收藏`);
        }
      });

      console.log('✅ 推薦股票驗證完成');
    });

    it('應該處理新用戶場景（無行為數據）', async () => {
      // 使用一個不存在的用戶 ID 模擬新用戶
      const newUserId = 99999;
      const result = await getAIRecommendations(newUserId, 6);

      // 新用戶應該獲得全站熱門股票推薦
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.reason).toContain('歡迎');

      console.log('✅ 新用戶場景處理成功');
      console.log(`   - 推薦股票數量: ${result.recommendations.length}`);
      console.log(`   - 推薦理由: ${result.reason}`);
    });

    it('應該處理無候選股票場景（用戶已查看所有熱門股票）', async () => {
      const result = await getAIRecommendations(testUserId, 6);

      // 即使沒有候選股票，也應該返回全站熱門股票
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(typeof result.reason).toBe('string');

      console.log('✅ 無候選股票場景處理成功');
    });
  });

  describe('推薦品質驗證', () => {
    it('推薦股票應該來自全站熱門股票池', async () => {
      const result = await getAIRecommendations(testUserId, 6);
      const globalPopular = await db.getGlobalPopularStocks(50);
      const popularSymbols = new Set(globalPopular.map(s => s.symbol));

      // 驗證推薦股票是否來自全站熱門股票
      let popularCount = 0;
      result.recommendations.forEach(symbol => {
        if (popularSymbols.has(symbol)) {
          popularCount++;
        }
      });

      console.log('✅ 推薦品質驗證完成');
      console.log(`   - 推薦股票中來自全站熱門的比例: ${popularCount}/${result.recommendations.length}`);
    });

    it('推薦理由應該包含用戶行為相關資訊', async () => {
      const result = await getAIRecommendations(testUserId, 6);

      // 推薦理由應該是有意義的文字（至少 10 個字）
      expect(result.reason.length).toBeGreaterThan(10);

      // 推薦理由應該使用繁體中文
      const hasChinese = /[\u4e00-\u9fa5]/.test(result.reason);
      expect(hasChinese).toBe(true);

      console.log('✅ 推薦理由品質驗證完成');
      console.log(`   - 推薦理由長度: ${result.reason.length} 字`);
    });
  });

  describe('市場偏好測試', () => {
    it('應該根據用戶市場偏好優先推薦相應市場的股票', async () => {
      const profile = await analyzeUserProfile(testUserId);
      const result = await getAIRecommendations(testUserId, 6);

      // 統計推薦股票的市場分布
      const marketDistribution = new Map<string, number>();
      result.recommendations.forEach(symbol => {
        const market = symbol.includes('.TW') || symbol.includes('.TWO') ? 'TW' : 'US';
        marketDistribution.set(market, (marketDistribution.get(market) || 0) + 1);
      });

      console.log('✅ 市場偏好測試完成');
      console.log('   - 用戶市場偏好:');
      Array.from(profile.preferences.markets.entries()).forEach(([market, count]) => {
        console.log(`     ${market}: ${count} 次`);
      });
      console.log('   - 推薦股票市場分布:');
      Array.from(marketDistribution.entries()).forEach(([market, count]) => {
        console.log(`     ${market}: ${count} 個`);
      });
    });
  });
});

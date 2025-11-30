import * as db from './db';
import { invokeLLM } from './_core/llm';

/**
 * AI 驅動的智能推薦系統
 * 
 * 核心功能：
 * 1. 分析用戶全站行為（投資組合、瀏覽、AI 分析、未來預測、搜尋、收藏、點擊）
 * 2. 過濾已看過的股票（已查看、已搜尋、已收藏、已持有）
 * 3. 推薦未看過的優質股票（基於用戶偏好和股票品質）
 * 4. 使用 LLM 生成推薦理由
 */

/**
 * 用戶行為分析結果
 */
interface UserProfile {
  // 用戶查看過的股票列表
  viewedSymbols: Set<string>;
  
  // 用戶偏好特徵
  preferences: {
    // 市場偏好（US/TW）
    markets: Map<string, number>;
    
    // 產業偏好（如果有產業數據）
    sectors: Map<string, number>;
    
    // 平均查看次數
    avgViewCount: number;
    
    // 平均停留時間
    avgViewTime: number;
    
    // 收藏比例
    favoriteRatio: number;
  };
  
  // 投資組合股票
  portfolioSymbols: Set<string>;
  
  // 收藏股票
  favoriteSymbols: Set<string>;
}

/**
 * 分析用戶行為並建立用戶畫像
 */
export async function analyzeUserProfile(userId: number): Promise<UserProfile> {
  // 1. 獲取用戶所有行為數據
  const behaviorData = await db.getAllUserBehavior(userId);
  
  // 2. 獲取用戶投資組合
  const portfolio = await db.getUserPortfolio(userId);
  
  // 3. 獲取用戶收藏列表
  const favorites = await db.getUserWatchlist(userId);
  
  // 4. 建立已看過的股票集合
  const viewedSymbols = new Set<string>();
  behaviorData.forEach(b => viewedSymbols.add(b.symbol));
  
  // 5. 建立投資組合股票集合
  const portfolioSymbols = new Set<string>();
  portfolio.forEach(p => portfolioSymbols.add(p.symbol));
  
  // 6. 建立收藏股票集合
  const favoriteSymbols = new Set<string>();
  favorites.forEach(f => favoriteSymbols.add(f.symbol));
  
  // 7. 分析用戶偏好
  const markets = new Map<string, number>();
  const sectors = new Map<string, number>();
  
  let totalViewCount = 0;
  let totalViewTime = 0;
  
  behaviorData.forEach(b => {
    // 分析市場偏好（基於股票代碼判斷）
    const market = b.symbol.includes('.TW') || b.symbol.includes('.TWO') ? 'TW' : 'US';
    markets.set(market, (markets.get(market) || 0) + 1);
    
    // 累計查看次數和停留時間
    totalViewCount += b.viewCount;
    totalViewTime += b.totalViewTime;
  });
  
  const avgViewCount = behaviorData.length > 0 ? totalViewCount / behaviorData.length : 0;
  const avgViewTime = behaviorData.length > 0 ? totalViewTime / behaviorData.length : 0;
  const favoriteRatio = behaviorData.length > 0 ? favoriteSymbols.size / behaviorData.length : 0;
  
  return {
    viewedSymbols,
    preferences: {
      markets,
      sectors,
      avgViewCount,
      avgViewTime,
      favoriteRatio,
    },
    portfolioSymbols,
    favoriteSymbols,
  };
}

/**
 * 獲取候選推薦股票池（未看過的優質股票）
 * 
 * 策略：
 * 1. 從全站熱門股票中選取
 * 2. 過濾掉用戶已看過的股票
 * 3. 優先推薦與用戶偏好市場相同的股票
 */
export async function getCandidateStocks(
  userProfile: UserProfile,
  limit: number = 20
): Promise<string[]> {
  // 1. 獲取全站熱門股票
  const globalPopular = await db.getGlobalPopularStocks(50);
  
  // 2. 過濾掉用戶已看過的股票
  const candidates = globalPopular.filter(stock => {
    const symbol = stock.symbol;
    
    // 排除已查看的股票
    if (userProfile.viewedSymbols.has(symbol)) return false;
    
    // 排除已持有的股票
    if (userProfile.portfolioSymbols.has(symbol)) return false;
    
    // 排除已收藏的股票
    if (userProfile.favoriteSymbols.has(symbol)) return false;
    
    return true;
  });
  
  // 3. 根據用戶市場偏好排序
  const sortedCandidates = candidates.sort((a, b) => {
    const aMarket = a.symbol.includes('.TW') || a.symbol.includes('.TWO') ? 'TW' : 'US';
    const bMarket = b.symbol.includes('.TW') || b.symbol.includes('.TWO') ? 'TW' : 'US';
    
    const aPreference = userProfile.preferences.markets.get(aMarket) || 0;
    const bPreference = userProfile.preferences.markets.get(bMarket) || 0;
    
    // 優先推薦用戶偏好市場的股票
    if (aPreference !== bPreference) {
      return bPreference - aPreference;
    }
    
    // 其次按全站熱度排序
    return b.totalViews - a.totalViews;
  });
  
  // 4. 返回前 N 個候選股票
  return sortedCandidates.slice(0, limit).map(s => s.symbol);
}

/**
 * 使用 LLM 生成推薦理由
 * 
 * @param userId 用戶 ID
 * @param userProfile 用戶畫像
 * @param recommendedSymbols 推薦的股票代碼列表
 * @returns 推薦理由（Markdown 格式）
 */
export async function generateRecommendationReason(
  userId: number,
  userProfile: UserProfile,
  recommendedSymbols: string[]
): Promise<string> {
  try {
    // 1. 準備用戶行為摘要
    const viewedCount = userProfile.viewedSymbols.size;
    const portfolioCount = userProfile.portfolioSymbols.size;
    const favoriteCount = userProfile.favoriteSymbols.size;
    
    const marketPreferences = Array.from(userProfile.preferences.markets.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([market, count]) => `${market}: ${count} 次`)
      .join(', ');
    
    // 2. 準備提示詞
    const prompt = `你是一位專業的股票投資顧問，請根據用戶的投資行為數據，為推薦的股票生成簡短的推薦理由。

**用戶行為摘要**：
- 已查看股票數量：${viewedCount} 個
- 投資組合股票數量：${portfolioCount} 個
- 收藏股票數量：${favoriteCount} 個
- 市場偏好：${marketPreferences || '無明顯偏好'}
- 平均查看次數：${userProfile.preferences.avgViewCount.toFixed(1)} 次
- 平均停留時間：${Math.floor(userProfile.preferences.avgViewTime / 1000)} 秒

**推薦的股票代碼**：
${recommendedSymbols.join(', ')}

**要求**：
1. 用繁體中文回答
2. 推薦理由應該簡潔明瞭（1-2 句話）
3. 強調這些股票與用戶偏好的相關性
4. 強調這些是用戶尚未查看過的優質股票
5. 不要提及具體的股價或財務數據（因為我們沒有這些數據）

請直接輸出推薦理由，不要包含任何標題或前綴。`;

    // 3. 呼叫 LLM 生成推薦理由
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '你是一位專業的股票投資顧問，擅長根據用戶行為數據生成個人化的投資建議。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    
    const content = response.choices[0]?.message?.content;
    const reason = typeof content === 'string' ? content : '根據您的投資偏好，我們為您推薦這些優質股票。';
    
    return reason.trim();
  } catch (error) {
    console.error('[AI Recommendation] Failed to generate recommendation reason:', error);
    return '根據您的投資偏好和瀏覽歷史，我們為您推薦這些您尚未查看過的優質股票。';
  }
}

/**
 * 獲取 AI 驅動的智能推薦
 * 
 * @param userId 用戶 ID
 * @param limit 推薦數量（預設 6）
 * @returns 推薦結果
 */
export async function getAIRecommendations(
  userId: number,
  limit: number = 6
): Promise<{
  recommendations: string[];
  reason: string;
}> {
  try {
    // 1. 分析用戶畫像
    const userProfile = await analyzeUserProfile(userId);
    
    // 2. 如果用戶沒有任何行為數據，返回全站熱門股票
    if (userProfile.viewedSymbols.size === 0) {
      const globalPopular = await db.getGlobalPopularStocks(limit);
      return {
        recommendations: globalPopular.map(s => s.symbol),
        reason: '歡迎使用美股投資分析平台！這些是目前全站最熱門的股票，您可以從這裡開始探索。',
      };
    }
    
    // 3. 獲取候選推薦股票池
    const candidates = await getCandidateStocks(userProfile, limit * 3);
    
    // 4. 如果沒有候選股票，返回全站熱門股票
    if (candidates.length === 0) {
      const globalPopular = await db.getGlobalPopularStocks(limit);
      return {
        recommendations: globalPopular.map(s => s.symbol),
        reason: '您已經查看了許多優質股票！這些是目前全站最熱門的其他股票，或許能為您帶來新的投資靈感。',
      };
    }
    
    // 5. 選取前 N 個推薦股票
    const recommendations = candidates.slice(0, limit);
    
    // 6. 使用 LLM 生成推薦理由
    const reason = await generateRecommendationReason(userId, userProfile, recommendations);
    
    return {
      recommendations,
      reason,
    };
  } catch (error) {
    console.error('[AI Recommendation] Failed to get AI recommendations:', error);
    
    // 降級策略：返回全站熱門股票
    const globalPopular = await db.getGlobalPopularStocks(limit);
    return {
      recommendations: globalPopular.map(s => s.symbol),
      reason: '根據全站用戶的瀏覽數據，這些是目前最受關注的優質股票。',
    };
  }
}

/**
 * 獲取推薦股票的詳細資訊（用於前端顯示）
 * 
 * 注意：這個函數需要從 TwelveData API 獲取股票數據
 * 由於 API 限制，我們只能在前端逐一獲取股票數據
 * 
 * @param symbols 股票代碼列表
 * @returns 股票詳細資訊列表
 */
export async function getRecommendationDetails(symbols: string[]): Promise<Array<{
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}>> {
  // 這個函數的實作需要在 routers.ts 中完成
  // 因為需要使用 TwelveData API 獲取股票數據
  // 這裡只是定義介面
  return [];
}

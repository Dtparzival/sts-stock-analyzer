import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { callDataApi } from "./_core/dataApi";
import { withRateLimit } from "./apiQueue";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { getUSDToTWDRate, getExchangeRateUpdateTime } from "./exchangeRate";
import * as dbCache from './dbStockDataCache';
// import { convertTiingoToYahooFormat } from './tiingo'; // 不再使用 Tiingo API
// import { convertAlphaVantageToYahooFormat } from './alphaVantage'; // 不再使用 Alpha Vantage API
import { getTWSEStockHistory, convertTWSEToYahooFormat, convertSymbolToTWSE } from './twse';
import { calculateAccuracyStats } from './analysisAccuracy';

/**
 * 使用 TWSE API 獲取台股數據，轉換為 Yahoo Finance 格式
 */
async function getTWSEStockData(symbol: string, range: string, ctx: any) {
  // 將 range 轉換為 TWSE 的月份數
  const rangeToMonths: Record<string, number> = {
    '1d': 1,
    '5d': 1,
    '1mo': 1,
    '3mo': 3,
    '6mo': 6,
    '1y': 12,
    '2y': 12, // TWSE API 最多只能獲取 12 個月
    '5y': 12,
    'max': 12,
  };
  
  const months = rangeToMonths[range] || 1;
  const stockNo = convertSymbolToTWSE(symbol);
  
  try {
    // 獲取 TWSE 數據
    const twseData = await getTWSEStockHistory(stockNo, months);
    
    if (!twseData || twseData.length === 0) {
      throw new Error('無法獲取股票數據');
    }
    
    // 記錄搜尋歷史
    if (ctx.user) {
      (async () => {
        try {
          // 獲取台股中文名稱
          const { getTWStockInfo } = await import('./twseStockList');
          const stockInfo = await getTWStockInfo(stockNo);
          const companyName = stockInfo ? `${stockNo} ${stockInfo.name}` : stockNo;
          const shortName = stockInfo?.shortName || stockInfo?.name || null;
          
          await db.addSearchHistory({
            userId: ctx.user.id,
            symbol,
            companyName,
            shortName,
          });
        } catch (error) {
          console.error("[Search History] Failed to add:", error);
        }
      })();
    }
    
    // 轉換為 Yahoo Finance 格式
    const result = convertTWSEToYahooFormat(stockNo, twseData);
    
    if (!result) {
      throw new Error('無法轉換股票數據');
    }
    
    // 添加時間戳元數據
    const now = new Date();
    return {
      ...result,
      _metadata: {
        lastUpdated: now,
        isFromCache: false, // TWSE API 無緩存機制
        expiresAt: now, // 立即過期（每次都獲取最新數據）
      }
    };
  } catch (error: any) {
    console.error('[TWSE] Error fetching stock data:', error);
    throw new Error(`無法獲取 ${symbol} 的股票數據：${error.message}`);
  }
}

// getTiingoStockData 函數已移除，美股改用 Yahoo Finance API

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  exchangeRate: router({
    // 獲取 USD 到 TWD 的即時匯率
    getUSDToTWD: publicProcedure
      .query(async () => {
        const rate = await getUSDToTWDRate();
        const updateTime = getExchangeRateUpdateTime();
        
        return {
          rate,
          updateTime,
        };
      }),
  }),

  stock: router({
    // 獲取股票基本資訊和價格數據
    getStockData: publicProcedure
      .input(z.object({
        symbol: z.string(),
        range: z.string().optional().default('1mo'),
        interval: z.string().optional().default('1d'),
      }))
      .query(async ({ input, ctx }) => {
        let { symbol, range, interval } = input;
        
        // 從 shared/markets.ts 引入工具函數
        const { getMarketFromSymbol, getFullTWSymbol } = await import('../shared/markets');
        
        // 根據股票代碼判斷市場區域
        const market = getMarketFromSymbol(symbol);
        const region = market === 'TW' ? 'TW' : 'US';
        
        // 台股使用 TWSE API（自動添加 .TW 後綴）
        if (region === 'TW') {
          const fullSymbol = getFullTWSymbol(symbol);
          return await getTWSEStockData(fullSymbol, range, ctx);
        }
        
        // 美股使用 Yahoo Finance API（通過 callDataApi）
        
        // 生成緩存參數
        const cacheParams = { symbol, region, range, interval };
        
        // 處理自訂日期範圍 (timestamp 格式: "startTimestamp-endTimestamp")
        let period1: string | undefined;
        let period2: string | undefined;
        
        if (range.includes('-')) {
          const [start, end] = range.split('-');
          period1 = start;
          period2 = end;
          range = undefined as any; // 使用 period1/period2 時不需要 range
        }
        
        // 記錄搜尋歷史（如果用戶已登入）
        if (ctx.user) {
          // 異步處理搜尋歷史，不阻塞主請求
          (async () => {
            try {
              // 先檢查資料庫緩存中是否有公司名稱
              const companyNameCacheKey = { symbol, region, type: 'companyName' };
              let companyName = await dbCache.getCache('company_name', companyNameCacheKey);
              
              if (!companyName) {
                // 嘗試從 API 獲取公司名稱
                try {
                const chartData = await withRateLimit(() => callDataApi("YahooFinance/get_stock_chart", {
                  query: {
                    symbol,
                      region,
                      interval: '1d',
                      range: '1d',
                      includeAdjustedClose: 'true',
                    },
                  })) as any;
                  
                  companyName = symbol;
                  if (chartData?.chart?.result?.[0]?.meta?.longName) {
                    companyName = chartData.chart.result[0].meta.longName;
                  }
                  
                  // 儲存公司名稱到資料庫緩存（24 小時）
                  await dbCache.setCache('company_name', companyNameCacheKey, companyName, 24 * 60 * 60 * 1000);
                } catch (apiError: any) {
                  // 如果 API 失敗，使用股票代碼作為公司名稱
                  console.warn('[Search History] Failed to fetch company name:', apiError.message);
                  companyName = symbol;
                }
              }
              
              if (ctx.user) {
                await db.addSearchHistory({
                  userId: ctx.user.id,
                  symbol,
                  companyName: companyName as string,
                  shortName: companyName as string, // 美股使用 companyName 作為 shortName
                });
              }
            } catch (error) {
              console.error("[Search History] Failed to add:", error);
            }
          })();
        }
        
        // 檢查資料庫緩存
        const cacheResult = await dbCache.getCacheWithMetadata('get_stock_chart', cacheParams);
        if (cacheResult) {
          // 返回緩存數據並附帶時間戳
          return {
            ...cacheResult.data,
            _metadata: {
              lastUpdated: cacheResult.createdAt,
              isFromCache: true,
              expiresAt: cacheResult.expiresAt,
            }
          };
        }
        
        const queryParams: any = {
          symbol,
          region,
          interval,
          includeAdjustedClose: 'true',
          events: 'div,split',
        };
        
        // 根據是否有自訂日期範圍使用不同參數
        if (period1 && period2) {
          queryParams.period1 = period1;
          queryParams.period2 = period2;
        } else {
          queryParams.range = range;
        }
        
        try {
          const data = await withRateLimit(() => callDataApi("YahooFinance/get_stock_chart", {
            query: queryParams,
          }));
          
          // 儲存到資料庫緩存（30 分鐘）
          const now = new Date();
          await dbCache.setCache('get_stock_chart', cacheParams, data, 30 * 60 * 1000);
          
          // 返回數據並附帶時間戳
          return {
            ...(data as object),
            _metadata: {
              lastUpdated: now,
              isFromCache: false,
              expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
            }
          };
        } catch (error: any) {
          // 如果是 429 錯誤，嘗試返回緩存數據（即使過期）
          if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            console.warn('[Stock API] Rate limit hit, attempting to use stale cache');
            const staleData = await dbCache.getStaleCache('get_stock_chart', cacheParams);
            if (staleData) {
              console.log('[Stock API] Returning stale cached data');
              return staleData;
            }
            // 如果沒有緩存數據，拋出友好的錯誤訊息
            throw new Error('股票數據服務暫時繁忙（API 速率限制），請稍後再試。系統已啟用 30 分鐘緩存機制，再次查詢會更快。');
          }
          throw error;
        }
      }),

    // 獲取股票分析洞察
    getStockInsights: publicProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { symbol } = input;
        
        // 檢查資料庫緩存
        const cacheParams = { symbol };
        const cachedData = await dbCache.getCache('get_stock_insights', cacheParams);
        if (cachedData) {
          return cachedData;
        }
        
        try {
          const data = await withRateLimit(() => callDataApi("YahooFinance/get_stock_insights", {
            query: { symbol },
          }));
          
          // 儲存到資料庫緩存（10 分鐘）
          await dbCache.setCache('get_stock_insights', cacheParams, data, 10 * 60 * 1000);
          
          return data;
        } catch (error: any) {
          if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            console.warn('[Stock API] Rate limit hit for insights');
            const staleData = await dbCache.getStaleCache('get_stock_insights', cacheParams);
            if (staleData) {
              return staleData;
            }
          }
          throw error;
        }
      }),

    // 獲取股東資訊
    getStockHolders: publicProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { symbol } = input;
        
        // 檢查資料庫緩存
        const cacheParams = { symbol, region: 'US', lang: 'en-US' };
        const cachedData = await dbCache.getCache('get_stock_holders', cacheParams);
        if (cachedData) {
          return cachedData;
        }
        
        try {
          const data = await withRateLimit(() => callDataApi("YahooFinance/get_stock_holders", {
            query: {
              symbol,
              region: 'US',
              lang: 'en-US',
            },
          }));
          
          // 儲存到資料庫緩存（1 小時，股東資訊變化較少）
          await dbCache.setCache('get_stock_holders', cacheParams, data, 60 * 60 * 1000);
          
          return data;
        } catch (error: any) {
          if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            console.warn('[Stock API] Rate limit hit for holders');
            const staleData = await dbCache.getStaleCache('get_stock_holders', cacheParams);
            if (staleData) {
              return staleData;
            }
          }
          throw error;
        }
      }),

    // 獲取 AI 分析歷史記錄
    getAnalysisHistory: publicProcedure
      .input(z.object({
        symbol: z.string(),
        analysisType: z.string().optional().default('investment_analysis'),
        limit: z.number().optional().default(10),
      }))
      .query(async ({ input }) => {
        const { symbol, analysisType, limit } = input;
        return db.getAnalysisHistory(symbol, analysisType, limit);
      }),

    // AI 投資分析
    getAIAnalysis: publicProcedure
      .input(z.object({
        symbol: z.string(),
        companyName: z.string().optional(),
        currentPrice: z.number().optional(),
        marketData: z.any().optional(),
        forceRefresh: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { symbol, companyName, currentPrice, marketData, forceRefresh } = input;
        
        // 檢查緩存（除非強制更新）
        if (!forceRefresh) {
          const cached = await db.getAnalysisCache(symbol, 'investment_analysis');
          if (cached) {
            return { 
              analysis: cached.content, 
              fromCache: true,
              cachedAt: cached.createdAt,
            };
          }
        }
        
        // 準備分析提示
        const prompt = `你是一位專業的股票投資分析師。請針對以下美股進行深入的投資分析：

股票代碼: ${symbol}
${companyName ? `公司名稱: ${companyName}` : ''}
${currentPrice ? `當前價格: $${currentPrice}` : ''}

請提供以下分析：

1. **公司概況與業務分析**
   - 公司主要業務和競爭優勢
   - 所處行業的發展趨勢

2. **財務健康度評估**
   - 營收和盈利能力分析
   - 財務穩定性評估

3. **技術面分析**
   - 當前價格趨勢
   - 關鍵支撐和阻力位

4. **投資建議**
   - 短期（1-3個月）展望
   - 中長期（6-12個月）展望
   - 風險評估
   - 建議操作策略（買入/持有/賣出）

5. **風險提示**
   - 主要風險因素
   - 需要關注的指標

請以專業、客觀的角度進行分析，並使用繁體中文回覆。`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一位專業的股票投資分析師，擅長基本面分析、技術分析和市場趨勢預測。" },
            { role: "user", content: prompt },
          ],
        });

        const analysis = typeof response.choices[0].message.content === 'string' 
          ? response.choices[0].message.content 
          : "無法生成分析";
        
        // 提取建議（買入/持有/賣出）
        let recommendation = null;
        if (analysis.includes('買入') || analysis.includes('买入')) {
          recommendation = '買入';
        } else if (analysis.includes('賣出') || analysis.includes('卖出')) {
          recommendation = '賣出';
        } else if (analysis.includes('持有')) {
          recommendation = '持有';
        }
        
        const now = new Date();
        
        // 緩存分析結果（24小時）
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await db.setAnalysisCache({
          symbol,
          analysisType: 'investment_analysis',
          content: analysis,
          expiresAt,
        });
        
        // 保存歷史記錄
        await db.saveAnalysisHistory({
          symbol,
          analysisType: 'investment_analysis',
          content: analysis,
          recommendation,
          priceAtAnalysis: currentPrice ? Math.round(currentPrice * 100) : null,
        });
        
        return { 
          analysis, 
          fromCache: false,
          cachedAt: now,
        };
      }),

    // 未來趨勢預測
    getTrendPrediction: publicProcedure
      .input(z.object({
        symbol: z.string(),
        companyName: z.string().optional(),
        historicalData: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { symbol, companyName, historicalData } = input;
        
        // 檢查緩存
        const cached = await db.getAnalysisCache(symbol, 'trend_prediction');
        if (cached) {
          return { prediction: cached.content, fromCache: true };
        }
        
        // 獲取系統當前日期
        const today = new Date();
        const currentDate = today.toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          weekday: 'long'
        });
        
        // 計算未來日期範圍
        const shortTermEnd = new Date(today);
        shortTermEnd.setMonth(shortTermEnd.getMonth() + 3);
        const shortTermEndDate = shortTermEnd.toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: 'long'
        });
        
        const midTermEnd = new Date(today);
        midTermEnd.setMonth(midTermEnd.getMonth() + 6);
        const midTermEndDate = midTermEnd.toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: 'long'
        });
        
        // 準備歷史數據摘要（最近30天的數據）
        let dataContext = '';
        if (historicalData && Array.isArray(historicalData) && historicalData.length > 0) {
          const recentData = historicalData.slice(-30); // 取最近30天
          const latestPrice = recentData[recentData.length - 1];
          const oldestPrice = recentData[0];
          const priceChange = latestPrice.close - oldestPrice.close;
          const priceChangePercent = ((priceChange / oldestPrice.close) * 100).toFixed(2);
          
          dataContext = `

**❗️ 實際市場數據（截至 ${currentDate}）：**
- **當前實際股價：$${latestPrice.close.toFixed(2)}** ← 這是真實的最新價格，不是模擬數據
- 最近30天張跌：${priceChange > 0 ? '+' : ''}$${priceChange.toFixed(2)} (${priceChangePercent}%)
- 30天最高價：$${Math.max(...recentData.map((d: any) => d.high)).toFixed(2)}
- 30天最低價：$${Math.min(...recentData.map((d: any) => d.low)).toFixed(2)}
- 平均成交量：${(recentData.reduce((sum: number, d: any) => sum + d.volume, 0) / recentData.length / 1000000).toFixed(2)}M

**⚠️ 嚴重警告：**
- 以上是真實的市場數據，不是模擬或假設
- 所有預測分析必須以 $${latestPrice.close.toFixed(2)} 這個當前價格為基準
- 禁止使用任何模擬數據或假設價格進行分析`;
        }
        
        const prompt = `你是一位專業的股票市場分析師，專長於趨勢預測和技術分析。

**重要指示：**
1. 請以今天（${currentDate}）為起算點，進行未來趨勢預測
2. **嚴格禁止使用模擬數據或假設數據**
3. **必須基於以下提供的實際市場數據進行分析**
4. 所有價格預測都應該以當前實際股價為基準

股票代碼: ${symbol}
${companyName ? `公司名稱: ${companyName}` : ''}${dataContext}

請提供以下預測分析：

1. **短期趨勢預測（從今天起至 ${shortTermEndDate}，未來3個月）**
   - 價格走勢預測（請明確指出預期的價格範圍）
   - 關鍵技術指標分析
   - 可能的突破點或轉折點

2. **中期趨勢預測（從今天起至 ${midTermEndDate}，未來6個月）**
   - 整體趨勢方向
   - 影響因素分析
   - 潛在催化劑

3. **市場情緒分析**
   - 當前市場對該股的看法
   - 機構投資者動向
   - 散戶情緒指標

4. **技術指標解讀**
   - 移動平均線分析
   - 相對強弱指標(RSI)
   - 成交量分析

5. **情境分析**
   - 最佳情境：可能達到的目標價
   - 基準情境：最可能的走勢
   - 最差情境：需要注意的下行風險

請以數據驅動的方式進行分析，並使用繁體中文回覆。所有預測都應該基於今天（${currentDate}）的時間點。`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一位專業的股票市場分析師，擅長技術分析和趨勢預測。" },
            { role: "user", content: prompt },
          ],
        });

        const prediction = typeof response.choices[0].message.content === 'string' 
          ? response.choices[0].message.content 
          : "無法生成預測";
        
        // 緩存預測結果（4小時）
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 4);
        
        await db.setAnalysisCache({
          symbol,
          analysisType: 'trend_prediction',
          content: prediction,
          expiresAt,
        });
        
        return { prediction, fromCache: false };
      }),

    // AI 聊天功能
    chatWithAI: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { messages } = input;
        
        const systemMessage = {
          role: "system" as const,
          content: "你是一位專業的美股投資顧問，擁有豐富的市場分析經驗。你可以回答關於美股投資、技術分析、基本面分析、風險管理等各方面的問題。請用繁體中文回答，並提供專業且易懂的建議。"
        };
        
        const response = await invokeLLM({
          messages: [systemMessage, ...messages],
        });
        
        const message = typeof response.choices[0].message.content === 'string'
          ? response.choices[0].message.content
          : "無法生成回懆";
        
        return { message };
      }),
  }),

  watchlist: router({
    // 獲取用戶的收藏列表
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserWatchlist(ctx.user.id);
    }),

    // 添加到收藏
    add: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        companyName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.addToWatchlist({
          userId: ctx.user.id,
          symbol: input.symbol,
          companyName: input.companyName,
        });
        return { success: true };
      }),

    // 批量 AI 分析
    batchAnalyze: protectedProcedure
      .mutation(async ({ ctx }) => {
        const watchlist = await db.getUserWatchlist(ctx.user.id);
        
        if (watchlist.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '收藏列表為空',
          });
        }
        
        const results: Array<{
          symbol: string;
          companyName: string | null;
          recommendation: string | null;
          summary: string;
          error: string | null;
        }> = [];
        
        // 並行分析所有股票
        await Promise.all(
          watchlist.map(async (item) => {
            try {
              // 檢查緩存
              const cached = await db.getAnalysisCache(item.symbol, 'investment_analysis');
              let analysis: string;
              let recommendation: string | null = null;
              
              if (cached) {
                analysis = cached.content;
              } else {
                // 生成新分析
                const prompt = `你是一位專業的股票投資分析師。請針對 ${item.symbol} (${item.companyName || ''}) 進行簡要的投資分析，包括：

1. 公司概況與業務分析
2. 財務健康度評估
3. 技術面分析
4. 投資建議（買入/持有/賣出）
5. 風險提示

請以簡潔、專業的角度進行分析，並使用繁體中文回覆。`;

                const response = await invokeLLM({
                  messages: [
                    { role: "system", content: "你是一位專業的股票投資分析師。" },
                    { role: "user", content: prompt },
                  ],
                });

                analysis = typeof response.choices[0].message.content === 'string' 
                  ? response.choices[0].message.content 
                  : "無法生成分析";
                
                // 緩存分析結果（24小時）
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24);
                
                await db.setAnalysisCache({
                  symbol: item.symbol,
                  analysisType: 'investment_analysis',
                  content: analysis,
                  expiresAt,
                });
              }
              
              // 提取建議
              if (analysis.includes('買入') || analysis.includes('买入')) {
                recommendation = '買入';
              } else if (analysis.includes('賣出') || analysis.includes('卖出')) {
                recommendation = '賣出';
              } else if (analysis.includes('持有')) {
                recommendation = '持有';
              }
              
              // 提取摘要（前 200 字）
              const summary = analysis.substring(0, 200) + '...';
              
              // 保存歷史記錄
              await db.saveAnalysisHistory({
                symbol: item.symbol,
                analysisType: 'investment_analysis',
                content: analysis,
                recommendation,
                priceAtAnalysis: null,
              });
              
              results.push({
                symbol: item.symbol,
                companyName: item.companyName,
                recommendation,
                summary,
                error: null,
              });
            } catch (error: any) {
              console.error(`批量分析 ${item.symbol} 失敗:`, error);
              results.push({
                symbol: item.symbol,
                companyName: item.companyName,
                recommendation: null,
                summary: '',
                error: error.message || '分析失敗',
              });
            }
          })
        );
        
        return { results };
      }),

    // 從收藏中移除
    remove: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.removeFromWatchlist(ctx.user.id, input.symbol);
        return { success: true };
      }),

    // 檢查是否已收藏
    check: protectedProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        console.log('[watchlist.check] userId:', ctx.user.id, 'symbol:', input.symbol);
        const isInList = await db.isInWatchlist(ctx.user.id, input.symbol);
        console.log('[watchlist.check] isInList:', isInList);
        return { isInWatchlist: isInList };
      }),
    // 搜尋台股（根據中文名稱）
    searchTWStock: publicProcedure
      .input(z.object({
        query: z.string(),
      }))
      .query(async ({ input }) => {
        const { searchTWStockByName } = await import('./twseStockList');
        const results = await searchTWStockByName(input.query);
        return results;
      }),
  }),

  history: router({
    // 獲取搜尋歷史
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(20),
      }))
      .query(async ({ input, ctx }) => {
        return db.getUserSearchHistory(ctx.user.id, input.limit);
      }),
    
    // 刪除單筆搜尋記錄
    deleteOne: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteSearchHistory(ctx.user.id, input.id);
        return { success: true };
      }),
    
    // 清空所有搜尋記錄
    deleteAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.clearAllSearchHistory(ctx.user.id);
        return { success: true };
      }),
    
    // 獲取最常查看的股票排行榜
    getTopStocks: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(10),
      }))
      .query(async ({ input, ctx }) => {
        return db.getTopStocks(ctx.user.id, input.limit);
      }),
  }),

  portfolio: router({
    // 獲取投資組合
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserPortfolio(ctx.user.id);
    }),

    // 添加持倉
    add: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        companyName: z.string().optional(),
        shares: z.number().int().positive(),
        purchasePrice: z.number().positive(),
        purchaseDate: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.addToPortfolio({
          userId: ctx.user.id,
          symbol: input.symbol,
          companyName: input.companyName,
          shares: input.shares,
          purchasePrice: Math.round(input.purchasePrice * 100), // 轉換為美分
          purchaseDate: input.purchaseDate,
          notes: input.notes,
        });
        return { success: true };
      }),

    // 更新持倉
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        shares: z.number().int().positive().optional(),
        purchasePrice: z.number().positive().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const updateData: any = {};
        if (input.shares !== undefined) updateData.shares = input.shares;
        if (input.purchasePrice !== undefined) updateData.purchasePrice = Math.round(input.purchasePrice * 100);
        if (input.notes !== undefined) updateData.notes = input.notes;
        
        await db.updatePortfolio(input.id, updateData);
        return { success: true };
      }),

    // 刪除持倉
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteFromPortfolio(input.id, ctx.user.id);
        return { success: true };
      }),

    // 獲取投資組合歷史記錄
    getHistory: protectedProcedure
      .input(z.object({
        days: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const history = await db.getPortfolioHistory(ctx.user.id, input.days);
        // 轉換數據格式（從分轉換為美元）
        return history.map(record => ({
          ...record,
          totalValue: record.totalValue / 100,
          totalCost: record.totalCost / 100,
          totalGainLoss: record.totalGainLoss / 100,
          gainLossPercent: record.gainLossPercent / 100, // 從萬分之一轉換為百分比
        }));
      }),

    // 記錄當前投資組合價值
    recordCurrentValue: protectedProcedure
      .input(z.object({
        totalValue: z.number(),
        totalCost: z.number(),
        totalGainLoss: z.number(),
        gainLossPercent: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        await db.addPortfolioHistory({
          userId: ctx.user.id,
          totalValue: Math.round(input.totalValue * 100),
          totalCost: Math.round(input.totalCost * 100),
          totalGainLoss: Math.round(input.totalGainLoss * 100),
          gainLossPercent: Math.round(input.gainLossPercent * 100),
          recordDate: today,
        });
        
        return { success: true };
      }),

    // AI 智能分析投資組合
    getPortfolioAIAnalysis: protectedProcedure
      .input(z.object({
        currentPrices: z.record(z.string(), z.number()), // 當前股價
      }))
      .mutation(async ({ input, ctx }) => {
        const { currentPrices } = input;
        const holdings = await db.getUserPortfolio(ctx.user.id);
        
        if (holdings.length === 0) {
          return {
            analysis: "您的投資組合為空，無法進行分析。請先添加持倉。",
            fromCache: false,
          };
        }
        
        // 準備持倉數據
        const portfolioData = holdings.map(h => {
          const purchasePrice = h.purchasePrice / 100;
          const currentPrice = currentPrices[h.symbol] || purchasePrice;
          const cost = purchasePrice * h.shares;
          const value = currentPrice * h.shares;
          const gainLoss = value - cost;
          const gainLossPercent = (gainLoss / cost) * 100;
          
          return {
            symbol: h.symbol,
            companyName: h.companyName || h.symbol,
            shares: h.shares,
            purchasePrice,
            currentPrice,
            cost,
            value,
            gainLoss,
            gainLossPercent,
            percentage: 0, // 將在下面計算
          };
        });
        
        // 計算總市值和比例
        const totalValue = portfolioData.reduce((sum, h) => sum + h.value, 0);
        portfolioData.forEach(h => {
          h.percentage = (h.value / totalValue) * 100;
        });
        
        // 計算風險指標
        const maxConcentration = Math.max(...portfolioData.map(h => h.percentage));
        const numHoldings = holdings.length;
        
        // 計算市場分布
        const twStocks = portfolioData.filter(h => h.symbol.endsWith('.TW'));
        const usStocks = portfolioData.filter(h => !h.symbol.endsWith('.TW'));
        const twPercentage = twStocks.reduce((sum, h) => sum + h.percentage, 0);
        const usPercentage = usStocks.reduce((sum, h) => sum + h.percentage, 0);
        
        // 準備 AI 分析的 prompt
        const prompt = `你是一位專業的投資組合分析師，請根據以下投資組合數據提供全面的風險評估和優化建議。

**投資組合概況：**
- 持倉數量：${numHoldings} 支股票
- 總市值：$${totalValue.toFixed(2)}
- 最大個股集中度：${maxConcentration.toFixed(2)}%
- 市場分布：美股 ${usPercentage.toFixed(1)}% / 台股 ${twPercentage.toFixed(1)}%

**詳細持倉：**
${portfolioData.map(h => `
- **${h.symbol}** (${h.companyName})
  - 持倉比例：${h.percentage.toFixed(2)}%
  - 持股數：${h.shares}
  - 購買價：$${h.purchasePrice.toFixed(2)}
  - 當前價：$${h.currentPrice.toFixed(2)}
  - 市值：$${h.value.toFixed(2)}
  - 損益：${h.gainLoss >= 0 ? '+' : ''}$${h.gainLoss.toFixed(2)} (${h.gainLossPercent >= 0 ? '+' : ''}${h.gainLossPercent.toFixed(2)}%)
`).join('')}

請提供以下分析：

## 1. 風險評估
- 整體風險等級（低/中/高）
- 集中度風險分析
- 市場分散程度評估
- 波動性風險評估

## 2. 資產配置分析
- 行業分布分析（根據股票代碼推測行業）
- 市場配置合理性（美股 vs 台股）
- 個股權重分析

## 3. 優化建議
- 具體的調整建議（增持/減持/新增標的）
- 再平衡建議（目標配置比例）
- 風險降低策略

請用繁體中文回答，並使用 Markdown 格式。分析要具體、實用，並提供可執行的建議。`;
        
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一位專業的投資組合分析師，擅長風險管理和資產配置。" },
            { role: "user", content: prompt },
          ],
        });
        
        const analysis = typeof response.choices[0].message.content === 'string'
          ? response.choices[0].message.content
          : "無法生成分析";
        
        return { analysis, fromCache: false };
      }),

    // 獲取持倉分析數據
    getAnalysis: protectedProcedure.query(async ({ ctx }) => {
      const holdings = await db.getUserPortfolio(ctx.user.id);
      
      if (holdings.length === 0) {
        return {
          distribution: [],
          sectors: [],
          riskMetrics: {
            concentration: 0,
            diversification: 0,
          },
        };
      }
      
      // 計算持倉分布（按市值）
      const totalValue = holdings.reduce((sum, h) => sum + (h.shares * h.purchasePrice), 0);
      const distribution = holdings.map(h => ({
        symbol: h.symbol,
        companyName: h.companyName || h.symbol,
        value: h.shares * h.purchasePrice / 100,
        percentage: (h.shares * h.purchasePrice / totalValue) * 100,
      }));
      
      // 計算風險指標
      const concentrationIndex = Math.max(...distribution.map(d => d.percentage));
      const diversificationScore = Math.min(100, (holdings.length / 10) * 100);
      
      return {
        distribution,
        sectors: [], // 產業分類需要額外的API調用，暫時返回空陣列
        riskMetrics: {
          concentration: concentrationIndex,
          diversification: diversificationScore,
        },
      };
    }),

    // 獲取投資組合績效統計
    getPerformance: protectedProcedure
      .input(z.object({
        currentPrices: z.record(z.string(), z.number()), // 當前股價
        days: z.number().optional(), // 時間範圍（天數）
      }))
      .query(async ({ input, ctx }) => {
        const { currentPrices, days } = input;
        const holdings = await db.getUserPortfolio(ctx.user.id);
        
        if (holdings.length === 0) {
          return {
            totalInvestment: 0,
            currentValue: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            periodGainLoss: 0,
            periodGainLossPercent: 0,
            holdings: [],
          };
        }
        
        // 計算當前總成本和總市值
        let totalCost = 0;
        let totalValue = 0;
        
        const holdingsWithCurrentPrice = holdings.map(h => {
          const purchasePrice = h.purchasePrice / 100;
          const currentPrice = currentPrices[h.symbol] || purchasePrice;
          const cost = purchasePrice * h.shares;
          const value = currentPrice * h.shares;
          const gainLoss = value - cost;
          const gainLossPercent = (gainLoss / cost) * 100;
          
          totalCost += cost;
          totalValue += value;
          
          return {
            symbol: h.symbol,
            companyName: h.companyName || h.symbol,
            shares: h.shares,
            purchasePrice,
            currentPrice,
            cost,
            value,
            gainLoss,
            gainLossPercent,
            percentage: 0, // 將在下面計算
          };
        });
        
        // 計算持股比例
        holdingsWithCurrentPrice.forEach(h => {
          h.percentage = (h.value / totalValue) * 100;
        });
        
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPercent = (totalGainLoss / totalCost) * 100;
        
        // 獲取歷史記錄以計算期間報酬
        let periodGainLoss = 0;
        let periodGainLossPercent = 0;
        
        if (days) {
          const history = await db.getPortfolioHistory(ctx.user.id, days);
          if (history.length > 0) {
            const oldestRecord = history[0];
            const oldValue = oldestRecord.totalValue / 100;
            periodGainLoss = totalValue - oldValue;
            periodGainLossPercent = (periodGainLoss / oldValue) * 100;
          }
        }
        
        return {
          totalInvestment: totalCost,
          currentValue: totalValue,
          totalGainLoss,
          totalGainLossPercent,
          periodGainLoss,
          periodGainLossPercent,
          holdings: holdingsWithCurrentPrice,
        };
      }),
  }),

  analysis: router({
    // 獲取 AI 分析準確度統計
    getAccuracyStats: publicProcedure
      .query(async () => {
        return calculateAccuracyStats();
      }),
  }),
});

export type AppRouter = typeof appRouter;

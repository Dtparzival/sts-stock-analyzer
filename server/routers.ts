import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { callDataApi } from "./_core/dataApi";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

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

  stock: router({
    // 獲取股票基本資訊和價格數據
    getStockData: publicProcedure
      .input(z.object({
        symbol: z.string(),
        range: z.string().optional().default('1mo'),
        interval: z.string().optional().default('1d'),
      }))
      .query(async ({ input, ctx }) => {
        const { symbol, range, interval } = input;
        
        // 記錄搜尋歷史（如果用戶已登入）
        if (ctx.user) {
          try {
            const chartData = await callDataApi("YahooFinance/get_stock_chart", {
              query: {
                symbol,
                region: 'US',
                interval: '1d',
                range: '1d',
                includeAdjustedClose: 'true',
              },
            }) as any;
            
            let companyName = symbol;
            if (chartData?.chart?.result?.[0]?.meta?.longName) {
              companyName = chartData.chart.result[0].meta.longName;
            }
            
            await db.addSearchHistory({
              userId: ctx.user.id,
              symbol,
              companyName,
            });
          } catch (error) {
            console.error("Failed to add search history:", error);
          }
        }
        
        const data = await callDataApi("YahooFinance/get_stock_chart", {
          query: {
            symbol,
            region: 'US',
            interval,
            range,
            includeAdjustedClose: 'true',
            events: 'div,split',
          },
        });
        
        return data;
      }),

    // 獲取股票分析洞察
    getStockInsights: publicProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { symbol } = input;
        
        const data = await callDataApi("YahooFinance/get_stock_insights", {
          query: { symbol },
        });
        
        return data;
      }),

    // 獲取股東資訊
    getStockHolders: publicProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .query(async ({ input }) => {
        const { symbol } = input;
        
        const data = await callDataApi("YahooFinance/get_stock_holders", {
          query: {
            symbol,
            region: 'US',
            lang: 'en-US',
          },
        });
        
        return data;
      }),

    // AI 投資分析
    getAIAnalysis: publicProcedure
      .input(z.object({
        symbol: z.string(),
        companyName: z.string().optional(),
        currentPrice: z.number().optional(),
        marketData: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { symbol, companyName, currentPrice, marketData } = input;
        
        // 檢查緩存
        const cached = await db.getAnalysisCache(symbol, 'investment_analysis');
        if (cached) {
          return { analysis: cached.content, fromCache: true };
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
        
        // 緩存分析結果（24小時）
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await db.setAnalysisCache({
          symbol,
          analysisType: 'investment_analysis',
          content: analysis,
          expiresAt,
        });
        
        return { analysis, fromCache: false };
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
        
        const prompt = `你是一位專業的股票市場分析師，專長於趨勢預測和技術分析。請針對以下美股進行未來趨勢預測：

股票代碼: ${symbol}
${companyName ? `公司名稱: ${companyName}` : ''}

請提供以下預測分析：

1. **短期趨勢預測（未來1-3個月）**
   - 價格走勢預測
   - 關鍵技術指標分析
   - 可能的突破點或轉折點

2. **中期趨勢預測（未來3-6個月）**
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

請以數據驅動的方式進行分析，並使用繁體中文回覆。`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一位專業的股票市場分析師，擅長技術分析和趨勢預測。" },
            { role: "user", content: prompt },
          ],
        });

        const prediction = typeof response.choices[0].message.content === 'string' 
          ? response.choices[0].message.content 
          : "無法生成預測";
        
        // 緩存預測結果（12小時）
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12);
        
        await db.setAnalysisCache({
          symbol,
          analysisType: 'trend_prediction',
          content: prediction,
          expiresAt,
        });
        
        return { prediction, fromCache: false };
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
        const isInList = await db.isInWatchlist(ctx.user.id, input.symbol);
        return { isInWatchlist: isInList };
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
  }),
});

export type AppRouter = typeof appRouter;

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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

  // 搜尋歷史
  history: router({
    add: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        shortName: z.string().nullable().optional(),
        companyName: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addSearchHistory({
          userId: ctx.user.id,
          symbol: input.symbol,
          shortName: input.shortName || null,
          companyName: input.companyName || null,
        });
        return { success: true };
      }),
    
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit || 20;
        return await db.getSearchHistory(ctx.user.id, limit);
      }),
    
    getRecommendations: protectedProcedure
      .input(z.object({ 
        market: z.enum(['US', 'TW']),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const limit = input.limit || 6;
        return await db.getRecommendations(ctx.user.id, input.market, limit);
      }),
  }),
  
  // 收藏清單
  watchlist: router({
    add: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addToWatchlist({
          userId: ctx.user.id,
          symbol: input.symbol,
          name: input.name || null,
        });
        return { success: true };
      }),
    
    remove: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFromWatchlist(ctx.user.id, input.symbol);
        return { success: true };
      }),
    
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getWatchlist(ctx.user.id);
      }),
  }),
  
  // 用戶互動追蹤
  interactions: router({
    track: protectedProcedure
      .input(z.object({
        symbol: z.string(),
        interactionType: z.enum(['click', 'swipe_left', 'swipe_right', 'long_press', 'favorite', 'unfavorite']),
        context: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.trackInteraction({
          userId: ctx.user.id,
          symbol: input.symbol,
          interactionType: input.interactionType,
          context: input.context || null,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

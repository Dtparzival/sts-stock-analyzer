import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * API 回應時間監控中介層
 * 記錄每個 API 的回應時間，並在超過門檻值時發出警告
 */
export const monitoringMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  
  try {
    const result = await next();
    const duration = Date.now() - start;
    
    // 判斷狀態
    let status: 'success' | 'slow' | 'very_slow' | 'error' = 'success';
    if (duration > 3000) {
      status = 'very_slow';
    } else if (duration > 1000) {
      status = 'slow';
    }
    
    // 記錄效能指標
    const { recordMetric } = await import('../utils/performanceMonitor');
    recordMetric(path, type, duration, status);
    
    // 記錄 API 回應時間
    console.log(`[API Monitor] ${type}.${path} - ${duration}ms`);
    
    // 若回應時間超過 1 秒，記錄警告
    if (duration > 1000) {
      console.warn(`[API Monitor] ❗ Slow query detected: ${type}.${path} - ${duration}ms`);
    }
    
    // 若回應時間超過 3 秒，記錄錯誤
    if (duration > 3000) {
      console.error(`[API Monitor] ❌ Very slow query: ${type}.${path} - ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    // 記錄錯誤指標
    const { recordMetric } = await import('../utils/performanceMonitor');
    recordMetric(path, type, duration, 'error');
    
    console.error(`[API Monitor] ❌ Error in ${type}.${path} after ${duration}ms:`, error);
    throw error;
  }
});

/**
 * 帶監控的 public procedure
 */
export const monitoredPublicProcedure = publicProcedure.use(monitoringMiddleware);

/**
 * 帶監控的 protected procedure
 */
export const monitoredProtectedProcedure = protectedProcedure.use(monitoringMiddleware);

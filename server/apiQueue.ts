/**
 * API 請求佇列管理模組
 * 使用 Token Bucket 算法限制 API 請求速率
 * 
 * 設計目標：
 * - 每分鐘最多 4 次 API 請求（避免觸發 Yahoo Finance API 速率限制）
 * - 每 15 秒補充 1 個令牌（60秒 ÷ 4次 = 15秒/次）
 * - 最大令牌數：4（允許短時間內連續請求）
 */

interface QueueItem {
  resolve: (value: void) => void;
  reject: (reason: Error) => void;
  timestamp: number;
}

class APIRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // 毫秒
  private queue: QueueItem[] = [];
  private lastRefillTime: number;
  private refillInterval: NodeJS.Timeout | null = null;

  constructor(maxTokens: number = 4, refillRate: number = 15000) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefillTime = Date.now();
    
    // 啟動令牌補充定時器
    this.startRefillTimer();
    
    console.log(`[API Queue] Initialized with ${maxTokens} tokens, refill every ${refillRate}ms`);
  }

  /**
   * 啟動令牌補充定時器
   */
  private startRefillTimer() {
    this.refillInterval = setInterval(() => {
      this.refillTokens();
    }, this.refillRate);
  }

  /**
   * 補充令牌
   */
  private refillTokens() {
    if (this.tokens < this.maxTokens) {
      this.tokens++;
      console.log(`[API Queue] Token refilled, current tokens: ${this.tokens}/${this.maxTokens}`);
      
      // 如果有等待中的請求，立即處理
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * 處理佇列中的請求
   */
  private processQueue() {
    while (this.queue.length > 0 && this.tokens > 0) {
      const item = this.queue.shift();
      if (item) {
        this.tokens--;
        console.log(`[API Queue] Processing queued request, remaining tokens: ${this.tokens}/${this.maxTokens}, queue length: ${this.queue.length}`);
        item.resolve();
      }
    }
  }

  /**
   * 請求令牌（異步）
   * 如果沒有可用令牌，請求會進入佇列等待
   */
  async acquireToken(timeout: number = 30000): Promise<void> {
    // 如果有可用令牌，立即返回
    if (this.tokens > 0) {
      this.tokens--;
      console.log(`[API Queue] Token acquired immediately, remaining tokens: ${this.tokens}/${this.maxTokens}`);
      return Promise.resolve();
    }

    // 沒有可用令牌，進入佇列等待
    console.log(`[API Queue] No tokens available, adding to queue. Queue length: ${this.queue.length + 1}`);
    
    return new Promise<void>((resolve, reject) => {
      const item: QueueItem = {
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(item);

      // 設置超時機制
      const timeoutId = setTimeout(() => {
        const index = this.queue.indexOf(item);
        if (index > -1) {
          this.queue.splice(index, 1);
          reject(new Error(`API request timeout after ${timeout}ms`));
        }
      }, timeout);

      // 當請求被處理時，清除超時定時器
      const originalResolve = item.resolve;
      item.resolve = () => {
        clearTimeout(timeoutId);
        originalResolve();
      };
    });
  }

  /**
   * 獲取當前狀態
   */
  getStatus() {
    return {
      availableTokens: this.tokens,
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
      refillRate: this.refillRate,
    };
  }

  /**
   * 清理資源
   */
  destroy() {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
      this.refillInterval = null;
    }
    
    // 拒絕所有等待中的請求
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.reject(new Error('Rate limiter destroyed'));
      }
    }
    
    console.log('[API Queue] Destroyed');
  }
}

// 創建全局 Yahoo Finance API 速率限制器
// 每分鐘最多 4 次請求，每 15 秒補充 1 個令牌
export const yahooFinanceRateLimiter = new APIRateLimiter(4, 15000);

/**
 * 包裝 API 調用，自動應用速率限制
 */
export async function withRateLimit<T>(
  apiCall: () => Promise<T>,
  timeout: number = 30000
): Promise<T> {
  try {
    // 獲取令牌（可能需要等待）
    await yahooFinanceRateLimiter.acquireToken(timeout);
    
    // 執行 API 調用
    return await apiCall();
  } catch (error) {
    console.error('[API Queue] Error:', error);
    throw error;
  }
}

/**
 * TwelveData API 請求佇列管理模組
 * 使用 Token Bucket 算法限制 API 請求速率
 * 
 * TwelveData Basic 8 方案限制：
 * - API credits: 800 / 天
 * - Minutely maximum: 8 / 分鐘
 * 
 * 策略：
 * - 每分鐘最多 7 次請求（留 1 次緩衝）
 * - 使用 Token Bucket 算法平滑請求流量
 * - 請求排隊等待可用 token
 */

interface QueueItem {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  fn: () => Promise<any>;
  timestamp: number;
}

class TwelveDataQueue {
  private tokens: number; // 可用令牌數
  private maxTokens: number = 7; // 最大令牌數（每分鐘 7 次）
  private refillRate: number = 7; // 令牌補充速率（每分鐘 7 個）
  private refillInterval: number = 60000; // 令牌補充間隔（60 秒）
  private queue: QueueItem[] = []; // 請求佇列
  private processing: boolean = false; // 是否正在處理佇列
  private lastRefillTime: number = Date.now(); // 上次補充令牌的時間
  
  // 統計數據
  private stats = {
    totalRequests: 0, // 總請求數
    successRequests: 0, // 成功請求數
    failedRequests: 0, // 失敗請求數
    queuedRequests: 0, // 排隊請求數
    currentMinuteRequests: 0, // 當前分鐘請求數
    currentMinuteStart: Date.now(), // 當前分鐘開始時間
  };

  constructor() {
    this.tokens = this.maxTokens;
    
    // 啟動令牌補充定時器
    setInterval(() => {
      this.refillTokens();
    }, this.refillInterval);
    
    console.log('[TwelveData Queue] Queue initialized with', this.maxTokens, 'tokens');
  }

  /**
   * 補充令牌
   */
  private refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    
    if (elapsed >= this.refillInterval) {
      this.tokens = this.maxTokens;
      this.lastRefillTime = now;
      console.log('[TwelveData Queue] Tokens refilled:', this.tokens);
      
      // 重置當前分鐘統計
      this.stats.currentMinuteRequests = 0;
      this.stats.currentMinuteStart = now;
      
      // 如果有排隊的請求，開始處理
      if (this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }
  }

  /**
   * 消耗一個令牌
   */
  private consumeToken(): boolean {
    if (this.tokens > 0) {
      this.tokens--;
      this.stats.currentMinuteRequests++;
      console.log('[TwelveData Queue] Token consumed. Remaining:', this.tokens);
      return true;
    }
    return false;
  }

  /**
   * 處理佇列中的請求
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // 檢查是否有可用令牌
      if (!this.consumeToken()) {
        console.log('[TwelveData Queue] No tokens available. Waiting for refill...');
        break;
      }

      // 取出第一個請求
      const item = this.queue.shift();
      if (!item) break;

      this.stats.queuedRequests = this.queue.length;

      try {
        const result = await item.fn();
        item.resolve(result);
        this.stats.successRequests++;
      } catch (error) {
        item.reject(error);
        this.stats.failedRequests++;
      }

      // 短暫延遲，避免請求過於密集
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  /**
   * 將請求加入佇列
   */
  public async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    return new Promise((resolve, reject) => {
      const item: QueueItem = {
        resolve,
        reject,
        fn,
        timestamp: Date.now(),
      };

      this.queue.push(item);
      this.stats.queuedRequests = this.queue.length;

      console.log('[TwelveData Queue] Request queued. Queue length:', this.queue.length);

      // 開始處理佇列
      this.processQueue();
    });
  }

  /**
   * 獲取當前統計數據
   */
  public getStats() {
    return {
      ...this.stats,
      availableTokens: this.tokens,
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
      utilizationRate: ((this.maxTokens - this.tokens) / this.maxTokens * 100).toFixed(2) + '%',
    };
  }

  /**
   * 檢查是否接近速率限制
   */
  public isNearLimit(): boolean {
    return this.tokens <= 2 || this.queue.length > 5;
  }

  /**
   * 獲取警告訊息
   */
  public getWarningMessage(): string | null {
    if (this.tokens === 0) {
      return 'API 請求速率已達上限，請求已排隊等待處理';
    }
    if (this.tokens <= 2) {
      return 'API 請求速率接近上限，建議稍後再試';
    }
    if (this.queue.length > 5) {
      return `當前有 ${this.queue.length} 個請求正在排隊`;
    }
    return null;
  }
}

// 創建全局佇列實例
export const twelveDataQueue = new TwelveDataQueue();

/**
 * FinMind API 整合模組
 * 
 * 提供台股基本資料與歷史價格的 API 整合
 * 支援指數退避重試機制與完整錯誤處理
 */

import { ENV } from '../_core/env';

// FinMind API 基礎設定
const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4';
const DEFAULT_TIMEOUT = 30000; // 30 秒
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 秒

/**
 * FinMind API 錯誤類型
 */
export class FinMindError extends Error {
  constructor(
    message: string,
    public readonly type: 'API' | 'Network' | 'Parse' | 'Validation',
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'FinMindError';
  }
}

/**
 * API 請求選項
 */
interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * 股票基本資料 API 回應
 */
export interface StockInfoResponse {
  stock_id: string;
  stock_name: string;
  industry_category: string;
  type: string; // '上市' or '上櫃'
  date?: string; // 上市日期
}

/**
 * 歷史價格 API 回應
 */
export interface StockPriceResponse {
  date: string; // YYYY-MM-DD
  stock_id: string;
  Trading_Volume: number; // 成交股數
  Trading_money: number; // 成交金額
  open: number;
  max: number; // 最高價
  min: number; // 最低價
  close: number;
  spread: number; // 漲跌
  Trading_turnover: number; // 成交筆數
}

/**
 * FinMind API 通用回應格式
 */
interface FinMindApiResponse<T> {
  status: number;
  msg: string;
  data: T[];
}

/**
 * 執行 HTTP 請求（帶指數退避重試）
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    retryDelay = INITIAL_RETRY_DELAY,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // API 回傳錯誤狀態碼
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new FinMindError(
          `FinMind API returned ${response.status}: ${errorText}`,
          'API',
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;

      // 判斷是否應該重試
      const shouldRetry =
        attempt < retries &&
        (error instanceof FinMindError
          ? error.type === 'Network' || error.statusCode === 429 || error.statusCode! >= 500
          : true);

      if (!shouldRetry) {
        break;
      }

      // 指數退避：每次重試延遲時間加倍
      const delay = retryDelay * Math.pow(2, attempt);
      console.log(
        `[FinMind] Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 所有重試都失敗
  if (lastError instanceof FinMindError) {
    throw lastError;
  }

  throw new FinMindError(
    `Request failed after ${retries + 1} attempts: ${lastError?.message}`,
    'Network',
    undefined,
    lastError
  );
}

/**
 * 建立 API URL
 */
function buildApiUrl(dataset: string, params: Record<string, string>): string {
  const url = new URL(`${FINMIND_BASE_URL}/data`);
  url.searchParams.set('dataset', dataset);

  // 加入 token（如果有設定）
  if (ENV.finmindToken) {
    url.searchParams.set('token', ENV.finmindToken);
  }

  // 加入其他參數
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * 驗證 API 回應格式
 */
function validateResponse<T>(response: FinMindApiResponse<T>): T[] {
  if (response.status !== 200) {
    throw new FinMindError(
      `FinMind API error: ${response.msg}`,
      'API',
      response.status
    );
  }

  if (!Array.isArray(response.data)) {
    throw new FinMindError(
      'Invalid response format: data is not an array',
      'Parse'
    );
  }

  return response.data;
}

/**
 * 獲取所有台股基本資料
 * 
 * @returns 股票基本資料陣列
 */
export async function fetchAllStockInfo(
  options?: RequestOptions
): Promise<StockInfoResponse[]> {
  console.log('[FinMind] Fetching all stock info...');

  const url = buildApiUrl('TaiwanStockInfo', {});

  try {
    const response = await fetchWithRetry<FinMindApiResponse<StockInfoResponse>>(
      url,
      options
    );

    const data = validateResponse(response);
    console.log(`[FinMind] Fetched ${data.length} stocks`);

    return data;
  } catch (error) {
    console.error('[FinMind] Failed to fetch stock info:', error);
    throw error;
  }
}

/**
 * 獲取指定股票的歷史價格
 * 
 * @param symbol 股票代號
 * @param startDate 起始日期 (YYYY-MM-DD)
 * @param endDate 結束日期 (YYYY-MM-DD)
 * @returns 歷史價格陣列
 */
export async function fetchStockPrice(
  symbol: string,
  startDate: string,
  endDate: string,
  options?: RequestOptions
): Promise<StockPriceResponse[]> {
  console.log(
    `[FinMind] Fetching price for ${symbol} from ${startDate} to ${endDate}...`
  );

  // 驗證日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new FinMindError(
      'Invalid date format. Expected YYYY-MM-DD',
      'Validation'
    );
  }

  const url = buildApiUrl('TaiwanStockPrice', {
    stock_id: symbol,
    start_date: startDate,
    end_date: endDate,
  });

  try {
    const response = await fetchWithRetry<FinMindApiResponse<StockPriceResponse>>(
      url,
      options
    );

    const data = validateResponse(response);
    console.log(`[FinMind] Fetched ${data.length} price records for ${symbol}`);

    return data;
  } catch (error) {
    console.error(`[FinMind] Failed to fetch price for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 批次獲取多檔股票的歷史價格
 * 
 * @param symbols 股票代號陣列
 * @param startDate 起始日期 (YYYY-MM-DD)
 * @param endDate 結束日期 (YYYY-MM-DD)
 * @param concurrency 並行請求數量（預設 5）
 * @returns 股票代號與價格資料的對應表
 */
export async function fetchBatchStockPrices(
  symbols: string[],
  startDate: string,
  endDate: string,
  concurrency: number = 5,
  options?: RequestOptions
): Promise<Map<string, StockPriceResponse[]>> {
  console.log(
    `[FinMind] Batch fetching prices for ${symbols.length} stocks (concurrency: ${concurrency})...`
  );

  const results = new Map<string, StockPriceResponse[]>();
  const errors: Array<{ symbol: string; error: Error }> = [];

  // 分批處理，避免同時發送過多請求
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);

    const promises = batch.map(async symbol => {
      try {
        const prices = await fetchStockPrice(symbol, startDate, endDate, options);
        results.set(symbol, prices);
      } catch (error) {
        errors.push({ symbol, error: error as Error });
      }
    });

    await Promise.all(promises);

    // 批次之間稍微延遲，避免 API 限流
    if (i + concurrency < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (errors.length > 0) {
    console.warn(
      `[FinMind] Batch fetch completed with ${errors.length} errors:`,
      errors.map(e => `${e.symbol}: ${e.error.message}`)
    );
  }

  console.log(
    `[FinMind] Batch fetch completed: ${results.size}/${symbols.length} successful`
  );

  return results;
}

/**
 * 健康檢查：測試 FinMind API 連線
 */
export async function healthCheck(): Promise<boolean> {
  try {
    console.log('[FinMind] Performing health check...');

    // 嘗試獲取單一股票資料（台積電 2330）
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - 7); // 一週前
    const startDate = testDate.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    await fetchStockPrice('2330', startDate, endDate, {
      timeout: 10000,
      retries: 1,
    });

    console.log('[FinMind] Health check passed');
    return true;
  } catch (error) {
    console.error('[FinMind] Health check failed:', error);
    return false;
  }
}

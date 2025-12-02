import { ENV } from '../_core/env';

/**
 * TwelveData API 整合模組
 * 提供美股即時報價與歷史數據查詢功能
 */

const TWELVEDATA_BASE_URL = (process.env.TWELVEDATA_BASE_URL || 'https://api.twelvedata.com').replace(/\/$/, '');
const TWELVEDATA_TOKEN = process.env.TWELVEDATA_TOKEN;

if (!TWELVEDATA_TOKEN) {
  console.warn('[TwelveData] API token not configured');
}

/**
 * TwelveData Quote 回應格式
 */
export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  fifty_two_week?: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

/**
 * TwelveData Time Series 資料點
 */
export interface TwelveDataTimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

/**
 * TwelveData Time Series 回應格式
 */
export interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: TwelveDataTimeSeriesValue[];
  status: string;
}

/**
 * 指數退避重試機制
 */
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[TwelveData] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 獲取美股即時報價
 * @param symbol 股票代號 (例如: AAPL)
 * @returns 即時報價資料
 */
export async function getTwelveDataQuote(symbol: string): Promise<TwelveDataQuote> {
  if (!TWELVEDATA_TOKEN) {
    throw new Error('TwelveData API token not configured');
  }

  return fetchWithRetry(async () => {
    const url = `${TWELVEDATA_BASE_URL}/quote`;
    const params = new URLSearchParams({
      symbol,
      apikey: TWELVEDATA_TOKEN,
    });

    const response = await fetch(`${url}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TwelveData API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 檢查 API 錯誤回應
    if (data.code && data.message) {
      throw new Error(`TwelveData API error: ${data.message}`);
    }

    return data as TwelveDataQuote;
  });
}

/**
 * 獲取美股歷史數據
 * @param symbol 股票代號 (例如: AAPL)
 * @param interval 時間區間 (1min/5min/15min/30min/1h/1day/1week/1month)
 * @param outputsize 輸出數量 (預設 30)
 * @returns 歷史數據
 */
export async function getTwelveDataTimeSeries(
  symbol: string,
  interval: string = '1day',
  outputsize: number = 30
): Promise<TwelveDataTimeSeries> {
  if (!TWELVEDATA_TOKEN) {
    throw new Error('TwelveData API token not configured');
  }

  return fetchWithRetry(async () => {
    const url = `${TWELVEDATA_BASE_URL}/time_series`;
    const params = new URLSearchParams({
      symbol,
      interval,
      outputsize: outputsize.toString(),
      apikey: TWELVEDATA_TOKEN,
    });

    const response = await fetch(`${url}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TwelveData API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 檢查 API 錯誤回應
    if (data.code && data.message) {
      throw new Error(`TwelveData API error: ${data.message}`);
    }

    return data as TwelveDataTimeSeries;
  });
}

/**
 * 將價格字串轉換為整數 (以美分為單位)
 * @param priceStr 價格字串 (例如: "150.25")
 * @returns 以美分為單位的整數 (例如: 15025)
 */
export function convertPriceToCents(priceStr: string): number {
  const price = parseFloat(priceStr);
  if (isNaN(price)) {
    throw new Error(`Invalid price: ${priceStr}`);
  }
  return Math.round(price * 100);
}

/**
 * 將美分轉換為美元字串
 * @param cents 以美分為單位的整數
 * @returns 美元字串 (例如: "150.25")
 */
export function convertCentsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * 計算漲跌幅 (以基點為單位)
 * @param current 當前價格
 * @param previous 前一日價格
 * @returns 以基點為單位的漲跌幅 (例如: 325 代表 3.25%)
 */
export function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  const changePercent = ((current - previous) / previous) * 10000;
  return Math.round(changePercent);
}

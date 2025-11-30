/**
 * TWSE (台灣證券交易所) API 整合模組
 * 提供上市股票的基本資料、即時報價、歷史價格等資料
 */

import axios, { AxiosError } from 'axios';

const TWSE_BASE_URL = 'https://openapi.twse.com.tw/v1';

// 重試配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 秒

/**
 * 延遲函數
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 統一錯誤處理與重試機制
 */
async function fetchWithRetry<T>(
  url: string,
  params?: Record<string, any>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    const response = await axios.get<T>(url, {
      params,
      timeout: 10000, // 10 秒超時
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // 如果還有重試次數，則重試
    if (retries > 0) {
      console.warn(`TWSE API 請求失敗，${RETRY_DELAY}ms 後重試... (剩餘重試次數: ${retries})`);
      await delay(RETRY_DELAY);
      return fetchWithRetry<T>(url, params, retries - 1);
    }
    
    // 重試次數用盡，拋出錯誤
    throw new Error(`TWSE API 請求失敗: ${axiosError.message}`);
  }
}

/**
 * 取得上市股票基本資料
 * 端點：/v1/exchangeReport/STOCK_DAY_ALL
 * 回傳：所有上市股票的當日交易資料
 */
export async function fetchTwseStockList(): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any[]>(`${TWSE_BASE_URL}/exchangeReport/STOCK_DAY_ALL`);
    return data || [];
  } catch (error) {
    console.error('取得 TWSE 股票列表失敗:', error);
    return [];
  }
}

/**
 * 取得上市股票即時報價
 * 端點：/v1/exchangeReport/MI_INDEX
 * 參數：response=json, type=ALLBUT0999
 * 回傳：所有上市股票的即時報價
 */
export async function fetchTwseQuote(symbol: string): Promise<any | null> {
  try {
    const data = await fetchWithRetry<any>(`${TWSE_BASE_URL}/exchangeReport/MI_INDEX`, {
      response: 'json',
      type: 'ALLBUT0999',
    });
    
    // 從 msgArray 中找到指定股票代號的資料
    if (data && Array.isArray(data.msgArray)) {
      const stockData = data.msgArray.find((item: any) => item.c === symbol);
      return stockData || null;
    }
    
    return null;
  } catch (error) {
    console.error(`取得 TWSE 股票 ${symbol} 即時報價失敗:`, error);
    return null;
  }
}

/**
 * 取得上市股票歷史價格
 * 端點：/v1/exchangeReport/STOCK_DAY
 * 參數：stockNo (股票代號), date (日期，格式：YYYYMM)
 * 回傳：指定股票的月度歷史價格
 */
export async function fetchTwseHistoricalPrices(symbol: string, date: string): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any>(`${TWSE_BASE_URL}/exchangeReport/STOCK_DAY`, {
      stockNo: symbol,
      date, // 格式：YYYYMM，例如：202311
    });
    
    // 回傳資料中的 data 欄位包含歷史價格陣列
    return data?.data || [];
  } catch (error) {
    console.error(`取得 TWSE 股票 ${symbol} 歷史價格失敗:`, error);
    return [];
  }
}

/**
 * 取得產業分類資訊
 * 端點：/v1/exchangeReport/BWIBBU_ALL
 * 回傳：所有產業別的股票代號和產業指數
 */
export async function fetchTwseIndustryData(): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any[]>(`${TWSE_BASE_URL}/exchangeReport/BWIBBU_ALL`);
    return data || [];
  } catch (error) {
    console.error('取得 TWSE 產業分類資訊失敗:', error);
    return [];
  }
}

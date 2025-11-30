/**
 * TPEx (櫃買中心) API 整合模組
 * 提供上櫃股票的基本資料、即時報價、歷史價格等資料
 */

import axios, { AxiosError } from 'axios';

const TPEX_BASE_URL = 'https://www.tpex.org.tw';

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
      console.warn(`TPEx API 請求失敗，${RETRY_DELAY}ms 後重試... (剩餘重試次數: ${retries})`);
      await delay(RETRY_DELAY);
      return fetchWithRetry<T>(url, params, retries - 1);
    }
    
    // 重試次數用盡，拋出錯誤
    throw new Error(`TPEx API 請求失敗: ${axiosError.message}`);
  }
}

/**
 * 格式化日期為 TPEx API 所需格式 (YYYY/MM/DD)
 */
function formatDateForTpex(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * 取得上櫃股票基本資料
 * 端點：/web/stock/aftertrading/daily_trading_info/st43_result.php
 * 參數：l=zh-tw, d=日期 (YYYY/MM/DD)
 * 回傳：所有上櫃股票的當日交易資料
 */
export async function fetchTpexStockList(): Promise<any[]> {
  try {
    const today = formatDateForTpex(new Date());
    const data = await fetchWithRetry<any>(
      `${TPEX_BASE_URL}/web/stock/aftertrading/daily_trading_info/st43_result.php`,
      {
        l: 'zh-tw',
        d: today,
      }
    );
    
    // 回傳資料中的 aaData 欄位包含股票列表
    return data?.aaData || [];
  } catch (error) {
    console.error('取得 TPEx 股票列表失敗:', error);
    return [];
  }
}

/**
 * 取得上櫃股票即時報價
 * 端點：/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php
 * 參數：l=zh-tw, se=EW
 * 回傳：所有上櫃股票的即時報價
 */
export async function fetchTpexQuote(symbol: string): Promise<any | null> {
  try {
    const data = await fetchWithRetry<any>(
      `${TPEX_BASE_URL}/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php`,
      {
        l: 'zh-tw',
        se: 'EW',
      }
    );
    
    // 從 aaData 中找到指定股票代號的資料
    if (data && Array.isArray(data.aaData)) {
      const stockData = data.aaData.find((item: any) => item[0] === symbol);
      return stockData || null;
    }
    
    return null;
  } catch (error) {
    console.error(`取得 TPEx 股票 ${symbol} 即時報價失敗:`, error);
    return null;
  }
}

/**
 * 取得上櫃股票歷史價格
 * 端點：/web/stock/historical/trading_info/st43_result.php
 * 參數：l=zh-tw, stkno=股票代號, startDate=開始日期, endDate=結束日期
 * 回傳：指定股票的歷史價格
 */
export async function fetchTpexHistoricalPrices(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any>(
      `${TPEX_BASE_URL}/web/stock/historical/trading_info/st43_result.php`,
      {
        l: 'zh-tw',
        stkno: symbol,
        startDate, // 格式：YYYY/MM/DD
        endDate,   // 格式：YYYY/MM/DD
      }
    );
    
    // 回傳資料中的 aaData 欄位包含歷史價格陣列
    return data?.aaData || [];
  } catch (error) {
    console.error(`取得 TPEx 股票 ${symbol} 歷史價格失敗:`, error);
    return [];
  }
}

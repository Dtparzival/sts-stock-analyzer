/**
 * FinMind API 整合模組
 * 提供台股財務報表、股利資訊、技術指標、基本面指標等資料
 */

import axios, { AxiosError } from 'axios';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4';

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
      timeout: 15000, // 15 秒超時（FinMind API 較慢）
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // 如果還有重試次數，則重試
    if (retries > 0) {
      console.warn(`FinMind API 請求失敗，${RETRY_DELAY}ms 後重試... (剩餘重試次數: ${retries})`);
      await delay(RETRY_DELAY);
      return fetchWithRetry<T>(url, params, retries - 1);
    }
    
    // 重試次數用盡，拋出錯誤
    throw new Error(`FinMind API 請求失敗: ${axiosError.message}`);
  }
}

/**
 * 格式化日期為 FinMind API 所需格式 (YYYY-MM-DD)
 */
function formatDateForFinMind(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 取得台股財務報表
 * 端點：/api/v4/data?dataset=TaiwanStockFinancialStatement
 * 參數：data_id=股票代號, start_date=開始日期
 * 回傳：資產負債表、損益表、現金流量表
 */
export async function fetchFinancialStatement(
  symbol: string,
  startDate: string
): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any>(`${FINMIND_BASE_URL}/data`, {
      dataset: 'TaiwanStockFinancialStatement',
      data_id: symbol,
      start_date: startDate, // 格式：YYYY-MM-DD
    });
    
    return data?.data || [];
  } catch (error) {
    console.error(`取得股票 ${symbol} 財務報表失敗:`, error);
    return [];
  }
}

/**
 * 取得台股股利資訊
 * 端點：/api/v4/data?dataset=TaiwanStockDividend
 * 參數：data_id=股票代號, start_date=開始日期
 * 回傳：現金股利、股票股利、除息日、殖利率
 */
export async function fetchDividend(symbol: string, startDate: string): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any>(`${FINMIND_BASE_URL}/data`, {
      dataset: 'TaiwanStockDividend',
      data_id: symbol,
      start_date: startDate, // 格式：YYYY-MM-DD
    });
    
    return data?.data || [];
  } catch (error) {
    console.error(`取得股票 ${symbol} 股利資訊失敗:`, error);
    return [];
  }
}

/**
 * 取得台股歷史價格（用於計算技術指標）
 * 端點：/api/v4/data?dataset=TaiwanStockPrice
 * 參數：data_id=股票代號, start_date=開始日期
 * 回傳：日期、開盤價、最高價、最低價、收盤價、成交量
 */
export async function fetchStockPrice(symbol: string, startDate: string): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any>(`${FINMIND_BASE_URL}/data`, {
      dataset: 'TaiwanStockPrice',
      data_id: symbol,
      start_date: startDate, // 格式：YYYY-MM-DD
    });
    
    return data?.data || [];
  } catch (error) {
    console.error(`取得股票 ${symbol} 歷史價格失敗:`, error);
    return [];
  }
}

/**
 * 取得台股基本面指標
 * 端點：/api/v4/data?dataset=TaiwanStockPER
 * 參數：data_id=股票代號, start_date=開始日期
 * 回傳：本益比、股價淨值比、殖利率、EPS
 */
export async function fetchFundamentals(symbol: string, startDate: string): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any>(`${FINMIND_BASE_URL}/data`, {
      dataset: 'TaiwanStockPER',
      data_id: symbol,
      start_date: startDate, // 格式：YYYY-MM-DD
    });
    
    return data?.data || [];
  } catch (error) {
    console.error(`取得股票 ${symbol} 基本面指標失敗:`, error);
    return [];
  }
}

/**
 * 取得台股月營收資料
 * 端點：/api/v4/data?dataset=TaiwanStockMonthRevenue
 * 參數：data_id=股票代號, start_date=開始日期
 * 回傳：月營收、年增率、月增率
 */
export async function fetchMonthlyRevenue(symbol: string, startDate: string): Promise<any[]> {
  try {
    const data = await fetchWithRetry<any>(`${FINMIND_BASE_URL}/data`, {
      dataset: 'TaiwanStockMonthRevenue',
      data_id: symbol,
      start_date: startDate, // 格式：YYYY-MM-DD
    });
    
    return data?.data || [];
  } catch (error) {
    console.error(`取得股票 ${symbol} 月營收資料失敗:`, error);
    return [];
  }
}

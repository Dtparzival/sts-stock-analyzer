/**
 * 資料轉換與驗證模組
 * 
 * 將 FinMind API 回應轉換為資料庫格式
 * 提供資料驗證與清理功能
 */

import type { StockInfoResponse, StockPriceResponse } from './finmind';
import type { InsertTwStock, InsertTwStockPrice } from '../../drizzle/schema';

/**
 * 轉換股票基本資料
 * 
 * @param apiData FinMind API 回應
 * @returns 資料庫格式的股票資料
 */
export function transformStockInfo(apiData: StockInfoResponse): InsertTwStock {
  // 解析市場類型
  const market = apiData.type === '上市' ? 'TWSE' : 'TPEx';

  // 解析上市日期
  let listedDate: Date | null = null;
  if (apiData.date) {
    try {
      listedDate = new Date(apiData.date);
      // 驗證日期有效性
      if (isNaN(listedDate.getTime())) {
        listedDate = null;
      }
    } catch {
      listedDate = null;
    }
  }

  return {
    symbol: apiData.stock_id,
    name: apiData.stock_name,
    shortName: apiData.stock_name, // FinMind 未提供簡稱，使用全名
    market,
    industry: apiData.industry_category || '未分類',
    isActive: true, // 預設為活躍
    listedDate,
  };
}

/**
 * 批次轉換股票基本資料
 * 
 * @param apiDataList FinMind API 回應陣列
 * @returns 資料庫格式的股票資料陣列
 */
export function transformStockInfoBatch(
  apiDataList: StockInfoResponse[]
): InsertTwStock[] {
  return apiDataList
    .map(transformStockInfo)
    .filter(stock => validateStockInfo(stock));
}

/**
 * 驗證股票基本資料
 * 
 * @param stock 股票資料
 * @returns 是否有效
 */
export function validateStockInfo(stock: InsertTwStock): boolean {
  // 必填欄位檢查
  if (!stock.symbol || !stock.name) {
    console.warn('[DataTransformer] Invalid stock: missing symbol or name', stock);
    return false;
  }

  // 股票代號格式檢查（4-6 位數字）
  if (!/^\d{4,6}$/.test(stock.symbol)) {
    console.warn('[DataTransformer] Invalid stock symbol format:', stock.symbol);
    return false;
  }

  // 市場類型檢查
  if (stock.market !== 'TWSE' && stock.market !== 'TPEx') {
    console.warn('[DataTransformer] Invalid market type:', stock.market);
    return false;
  }

  return true;
}

/**
 * 轉換歷史價格資料
 * 
 * @param apiData FinMind API 回應
 * @returns 資料庫格式的價格資料
 */
export function transformStockPrice(
  apiData: StockPriceResponse
): InsertTwStockPrice {
  // 解析日期
  const date = new Date(apiData.date);

  // 轉換價格：元 -> 分（乘以 100）
  const open = Math.round(apiData.open * 100);
  const high = Math.round(apiData.max * 100);
  const low = Math.round(apiData.min * 100);
  const close = Math.round(apiData.close * 100);
  const change = Math.round(apiData.spread * 100);

  // 計算漲跌幅（基點，萬分之一）
  // 漲跌幅 = (漲跌 / 昨收) * 10000
  const previousClose = close - change;
  const changePercent =
    previousClose !== 0 ? Math.round((change / previousClose) * 10000) : 0;

  // 成交量與成交金額
  const volume = Math.round(apiData.Trading_Volume);
  const amount = Math.round(apiData.Trading_money);

  return {
    symbol: apiData.stock_id,
    date,
    open,
    high,
    low,
    close,
    volume,
    amount,
    change,
    changePercent,
  };
}

/**
 * 批次轉換歷史價格資料
 * 
 * @param apiDataList FinMind API 回應陣列
 * @returns 資料庫格式的價格資料陣列
 */
export function transformStockPriceBatch(
  apiDataList: StockPriceResponse[]
): InsertTwStockPrice[] {
  return apiDataList
    .map(transformStockPrice)
    .filter(price => validateStockPrice(price));
}

/**
 * 驗證歷史價格資料
 * 
 * @param price 價格資料
 * @returns 是否有效
 */
export function validateStockPrice(price: InsertTwStockPrice): boolean {
  // 必填欄位檢查
  if (!price.symbol || !price.date) {
    console.warn('[DataTransformer] Invalid price: missing symbol or date', price);
    return false;
  }

  // 股票代號格式檢查
  if (!/^\d{4,6}$/.test(price.symbol)) {
    console.warn('[DataTransformer] Invalid stock symbol format:', price.symbol);
    return false;
  }

  // 日期有效性檢查
  if (isNaN(price.date.getTime())) {
    console.warn('[DataTransformer] Invalid date:', price.date);
    return false;
  }

  // 價格合理性檢查（必須為正數）
  if (
    price.open <= 0 ||
    price.high <= 0 ||
    price.low <= 0 ||
    price.close <= 0
  ) {
    console.warn('[DataTransformer] Invalid price values (must be positive):', price);
    return false;
  }

  // 價格邏輯檢查（最高價 >= 最低價）
  if (price.high < price.low) {
    console.warn('[DataTransformer] Invalid price logic (high < low):', price);
    return false;
  }

  // 成交量與成交金額檢查（必須為非負數）
  if (price.volume < 0 || price.amount < 0) {
    console.warn('[DataTransformer] Invalid volume or amount (must be non-negative):', price);
    return false;
  }

  return true;
}

/**
 * 清理股票名稱（移除特殊字元）
 * 
 * @param name 股票名稱
 * @returns 清理後的名稱
 */
export function cleanStockName(name: string): string {
  return name
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字元
    .replace(/\s+/g, ' ') // 合併多個空白
    .trim();
}

/**
 * 格式化日期為 YYYY-MM-DD
 * 
 * @param date 日期物件
 * @returns 格式化的日期字串
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析日期字串（支援多種格式）
 * 
 * @param dateStr 日期字串
 * @returns 日期物件，解析失敗回傳 null
 */
export function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * 計算日期範圍內的交易日數量（估算）
 * 
 * @param startDate 起始日期
 * @param endDate 結束日期
 * @returns 估算的交易日數量
 */
export function estimateTradingDays(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / msPerDay
  );

  // 估算：每週 5 個交易日，扣除約 10% 的國定假日
  const weeks = totalDays / 7;
  const tradingDays = Math.floor(weeks * 5 * 0.9);

  return Math.max(0, tradingDays);
}

/**
 * 轉換價格顯示格式（分 -> 元）
 * 
 * @param cents 價格（分）
 * @returns 價格（元，保留兩位小數）
 */
export function centsToYuan(cents: number): number {
  return cents / 100;
}

/**
 * 轉換漲跌幅顯示格式（基點 -> 百分比）
 * 
 * @param basisPoints 漲跌幅（基點）
 * @returns 漲跌幅（百分比，保留兩位小數）
 */
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

/**
 * 資料轉換與驗證模組
 * 
 * 將 FinMind API 回應轉換為資料庫格式
 * 提供資料驗證與清理功能
 * 
 * 注意: 價格資料轉換已移除，改為即時 API 呼叫
 */

import type { StockInfoResponse } from './finmind';
import type { InsertTwStock } from '../../drizzle/schema';

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
 * 格式化日期為 YYYY-MM-DD 字串
 * 
 * @param date 日期物件或字串
 * @returns 格式化的日期字串
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 解析日期字串為 Date 物件
 * 
 * @param dateStr 日期字串 (YYYY-MM-DD 或 YYYYMMDD)
 * @returns Date 物件或 null
 */
export function parseDate(dateStr: string): Date | null {
  try {
    // 處理 YYYYMMDD 格式
    if (/^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      dateStr = `${year}-${month}-${day}`;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

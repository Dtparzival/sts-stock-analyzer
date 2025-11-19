import { getDb } from "./db";
import { searchHistory } from "../drizzle/schema";
import { count, desc, gte, sql } from "drizzle-orm";

/**
 * 熱門股票分析模組
 * 用於緩存預熱機制
 */

export interface PopularStock {
  symbol: string;
  companyName: string | null;
  searchCount: number;
  market: 'US' | 'TW';
}

/**
 * 獲取全站熱門股票（不限用戶）
 * @param days 統計最近幾天的數據（默認 30 天）
 * @param limit 返回數量限制（默認 20）
 */
export async function getGlobalPopularStocks(days: number = 30, limit: number = 20): Promise<PopularStock[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // 計算起始日期
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 查詢最近 N 天的搜尋歷史，按股票代碼分組統計
    const result = await db
      .select({
        symbol: searchHistory.symbol,
        companyName: searchHistory.companyName,
        searchCount: count(searchHistory.id),
      })
      .from(searchHistory)
      .where(gte(searchHistory.searchedAt, startDate))
      .groupBy(searchHistory.symbol, searchHistory.companyName)
      .orderBy(desc(count(searchHistory.id)))
      .limit(limit);

    // 轉換為 PopularStock 格式並判斷市場
    return result.map(row => ({
      symbol: row.symbol,
      companyName: row.companyName,
      searchCount: Number(row.searchCount),
      market: row.symbol.includes('.TW') || /^\d{4}$/.test(row.symbol) ? 'TW' : 'US',
    }));
  } catch (error) {
    console.error('[Popular Stocks] Error fetching global popular stocks:', error);
    return [];
  }
}

/**
 * 獲取美股熱門股票
 * @param days 統計最近幾天的數據（默認 30 天）
 * @param limit 返回數量限制（默認 20）
 */
export async function getPopularUSStocks(days: number = 30, limit: number = 20): Promise<PopularStock[]> {
  const allStocks = await getGlobalPopularStocks(days, limit * 2); // 獲取更多以確保有足夠的美股
  return allStocks
    .filter(stock => stock.market === 'US')
    .slice(0, limit);
}

/**
 * 獲取台股熱門股票
 * @param days 統計最近幾天的數據（默認 30 天）
 * @param limit 返回數量限制（默認 20）
 */
export async function getPopularTWStocks(days: number = 30, limit: number = 20): Promise<PopularStock[]> {
  const allStocks = await getGlobalPopularStocks(days, limit * 2); // 獲取更多以確保有足夠的台股
  return allStocks
    .filter(stock => stock.market === 'TW')
    .slice(0, limit);
}

/**
 * 獲取預設熱門股票（當沒有搜尋歷史時使用）
 */
export function getDefaultPopularStocks(): PopularStock[] {
  return [
    // 美股熱門股票
    { symbol: 'AAPL', companyName: 'Apple Inc.', searchCount: 0, market: 'US' },
    { symbol: 'MSFT', companyName: 'Microsoft Corporation', searchCount: 0, market: 'US' },
    { symbol: 'GOOGL', companyName: 'Alphabet Inc.', searchCount: 0, market: 'US' },
    { symbol: 'AMZN', companyName: 'Amazon.com Inc.', searchCount: 0, market: 'US' },
    { symbol: 'TSLA', companyName: 'Tesla Inc.', searchCount: 0, market: 'US' },
    { symbol: 'META', companyName: 'Meta Platforms Inc.', searchCount: 0, market: 'US' },
    { symbol: 'NVDA', companyName: 'NVIDIA Corporation', searchCount: 0, market: 'US' },
    { symbol: 'NFLX', companyName: 'Netflix Inc.', searchCount: 0, market: 'US' },
    { symbol: 'AMD', companyName: 'Advanced Micro Devices Inc.', searchCount: 0, market: 'US' },
    { symbol: 'INTC', companyName: 'Intel Corporation', searchCount: 0, market: 'US' },
    
    // 台股熱門股票
    { symbol: '2330', companyName: '台積電', searchCount: 0, market: 'TW' },
    { symbol: '2317', companyName: '鴻海', searchCount: 0, market: 'TW' },
    { symbol: '2454', companyName: '聯發科', searchCount: 0, market: 'TW' },
    { symbol: '2412', companyName: '中華電', searchCount: 0, market: 'TW' },
    { symbol: '2882', companyName: '國泰金', searchCount: 0, market: 'TW' },
    { symbol: '2881', companyName: '富邦金', searchCount: 0, market: 'TW' },
    { symbol: '2886', companyName: '兆豐金', searchCount: 0, market: 'TW' },
    { symbol: '2303', companyName: '聯電', searchCount: 0, market: 'TW' },
    { symbol: '2308', companyName: '台達電', searchCount: 0, market: 'TW' },
    { symbol: '2382', companyName: '廣達', searchCount: 0, market: 'TW' },
  ];
}

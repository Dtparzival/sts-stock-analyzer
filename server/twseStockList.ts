/**
 * TWSE 股票代碼對照表整合模組
 * 
 * 整合台灣證券交易所 OpenAPI，提供完整的上市公司代碼與中文名稱對照表
 * 已整合數據庫緩存，減少 API 調用次數並提升響應速度
 */

interface TWSECompanyData {
  出表日期: string;
  公司代號: string;
  公司名稱: string;
  公司簡稱: string;
  外國企業註冊地國: string;
  產業別: string;
  住址: string;
  營利事業統一編號: string;
  董事長: string;
  總經理: string;
  發言人: string;
  發言人職稱: string;
  代理發言人: string;
  總機電話: string;
  成立日期: string;
}

interface StockInfo {
  symbol: string;
  name: string;
  shortName: string;
  industry: string;
}

// 引入數據庫緩存服務
import * as dbCache from './dbTwseStockListCache';

// 記憶體緩存（用於單次請求內的快速存取）
let memoryCache: Map<string, StockInfo> | null = null;
let lastFetchTime: number = 0;
const MEMORY_CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘

// fetchTWSEStockList 已移至 dbTwseStockListCache.ts

/**
 * 初始化或更新股票列表（整合數據庫緩存）
 */
async function initializeStockList(): Promise<Map<string, StockInfo>> {
  const now = Date.now();
  
  // 1. 如果記憶體緩存存在且未過期，直接返回
  if (memoryCache && (now - lastFetchTime) < MEMORY_CACHE_DURATION) {
    console.log("[TWSE Stock List] Using memory cache");
    return memoryCache;
  }

  console.log("[TWSE Stock List] Loading from database cache...");
  
  try {
    // 2. 從數據庫緩存獲取股票列表（會自動管理緩存更新）
    const stockMap = await dbCache.getStockList();
    
    // 3. 更新記憶體緩存
    memoryCache = stockMap;
    lastFetchTime = now;
    
    console.log(`[TWSE Stock List] Loaded ${stockMap.size} stocks`);
    return stockMap;
  } catch (error) {
    console.error("[TWSE Stock List] Failed to load stock list:", error);
    
    // 如果有舊的記憶體緩存，返回舊緩存
    if (memoryCache) {
      console.log("[TWSE Stock List] Using stale memory cache due to error");
      return memoryCache;
    }
    
    // 否則返回空 Map
    return new Map();
  }
}

/**
 * 根據股票代碼獲取股票資訊
 */
export async function getTWStockInfo(symbol: string): Promise<StockInfo | null> {
  const stockList = await initializeStockList();
  return stockList.get(symbol) || null;
}

/**
 * 根據中文名稱搜尋股票（支援部分匹配）
 */
export async function searchTWStockByName(query: string): Promise<StockInfo[]> {
  const stockList = await initializeStockList();
  const results: StockInfo[] = [];
  const stocks = Array.from(stockList.values());

  for (const stock of stocks) {
    if (stock.name.includes(query) || stock.shortName.includes(query)) {
      results.push(stock);
    }
  }

  return results.slice(0, 10); // 最多返回 10 個結果
}

/**
 * 獲取所有台股列表
 */
export async function getAllTWStocks(): Promise<StockInfo[]> {
  const stockList = await initializeStockList();
  return Array.from(stockList.values());
}

/**
 * 清除緩存（用於測試或強制更新）
 */
export function clearCache(): void {
  memoryCache = null;
  lastFetchTime = 0;
  console.log("[TWSE Stock List] Memory cache cleared");
}

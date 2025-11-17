/**
 * TWSE 股票代碼對照表整合模組
 * 
 * 整合台灣證券交易所 OpenAPI，提供完整的上市公司代碼與中文名稱對照表
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

// 緩存數據
let cachedStockList: Map<string, StockInfo> | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 小時

/**
 * 從 TWSE OpenAPI 獲取完整的上市公司基本資料
 */
async function fetchTWSEStockList(): Promise<TWSECompanyData[]> {
  try {
    console.log("[TWSE Stock List] Fetching stock list from TWSE OpenAPI...");
    
    const response = await fetch("https://openapi.twse.com.tw/v1/opendata/t187ap03_L", {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`TWSE API request failed: ${response.status} ${response.statusText}`);
    }

    const data: TWSECompanyData[] = await response.json();
    console.log(`[TWSE Stock List] Successfully fetched ${data.length} companies`);
    
    return data;
  } catch (error) {
    console.error("[TWSE Stock List] Error fetching stock list:", error);
    throw error;
  }
}

/**
 * 初始化或更新緩存的股票列表
 */
async function initializeStockList(): Promise<Map<string, StockInfo>> {
  const now = Date.now();
  
  // 如果緩存存在且未過期，直接返回
  if (cachedStockList && (now - lastFetchTime) < CACHE_DURATION) {
    console.log("[TWSE Stock List] Using cached stock list");
    return cachedStockList;
  }

  console.log("[TWSE Stock List] Initializing stock list...");
  
  try {
    const companies = await fetchTWSEStockList();
    const stockMap = new Map<string, StockInfo>();

    for (const company of companies) {
      // 過濾掉無效的代碼（例如空字符串或非數字代碼）
      if (!company.公司代號 || !/^\d{4}$/.test(company.公司代號)) {
        continue;
      }

      stockMap.set(company.公司代號, {
        symbol: company.公司代號,
        name: company.公司名稱 || "",
        shortName: company.公司簡稱 || company.公司名稱 || "",
        industry: company.產業別 || "",
      });
    }

    cachedStockList = stockMap;
    lastFetchTime = now;
    
    console.log(`[TWSE Stock List] Initialized with ${stockMap.size} stocks`);
    return stockMap;
  } catch (error) {
    console.error("[TWSE Stock List] Failed to initialize stock list:", error);
    
    // 如果有舊的緩存，返回舊緩存
    if (cachedStockList) {
      console.log("[TWSE Stock List] Using stale cache due to fetch error");
      return cachedStockList;
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
  cachedStockList = null;
  lastFetchTime = 0;
  console.log("[TWSE Stock List] Cache cleared");
}

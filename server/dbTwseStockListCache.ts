/**
 * TWSE Stock List 數據庫緩存服務
 * 
 * 功能：
 * 1. 將 TWSE OpenAPI 的股票列表儲存到資料庫
 * 2. 提供本地持久化緩存，減少 API 調用次數
 * 3. 實作自動更新機制（每 24 小時更新一次）
 * 4. 提供降級策略（API 失敗時使用資料庫緩存）
 */

import { getDb } from './db';
import { twseStockList, type InsertTwseStockList } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 小時

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

export interface StockInfo {
  symbol: string;
  name: string;
  shortName: string;
  industry: string;
}

/**
 * 從 TWSE OpenAPI 獲取完整的上市公司基本資料
 */
async function fetchTWSEStockList(): Promise<TWSECompanyData[]> {
  try {
    console.log('[TWSE DB Cache] Fetching stock list from TWSE OpenAPI...');
    
    const response = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TWSE API request failed: ${response.status} ${response.statusText}`);
    }

    const data: TWSECompanyData[] = await response.json();
    console.log(`[TWSE DB Cache] Successfully fetched ${data.length} companies`);
    
    return data;
  } catch (error) {
    console.error('[TWSE DB Cache] Error fetching stock list:', error);
    throw error;
  }
}

/**
 * 檢查緩存是否需要更新
 */
async function shouldUpdateCache(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn('[TWSE DB Cache] Database not available');
    return false;
  }

  try {
    // 查詢任意一筆記錄的更新時間
    const result = await db.select().from(twseStockList).limit(1);
    
    if (result.length === 0) {
      console.log('[TWSE DB Cache] No cache found, need to update');
      return true;
    }

    const lastUpdated = result[0].updatedAt;
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdated.getTime();

    if (timeDiff > CACHE_DURATION) {
      console.log(`[TWSE DB Cache] Cache expired (${Math.floor(timeDiff / 1000 / 60 / 60)} hours old), need to update`);
      return true;
    }

    console.log(`[TWSE DB Cache] Cache is fresh (${Math.floor(timeDiff / 1000 / 60)} minutes old)`);
    return false;
  } catch (error) {
    console.error('[TWSE DB Cache] Error checking cache:', error);
    return false;
  }
}

/**
 * 更新數據庫緩存
 */
async function updateCache(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    // 1. 從 TWSE OpenAPI 獲取最新數據
    const companies = await fetchTWSEStockList();
    
    // 2. 清空舊緩存（使用 DELETE 語句）
    console.log('[TWSE DB Cache] Clearing old cache...');
    await db.delete(twseStockList);
    
    // 3. 批量插入新數據
    console.log('[TWSE DB Cache] Inserting new data...');
    const records: InsertTwseStockList[] = [];
    
    for (const company of companies) {
      // 過濾掉無效的代碼（例如空字符串或非數字代碼）
      if (!company.公司代號 || !/^\d{4}$/.test(company.公司代號)) {
        continue;
      }

      records.push({
        symbol: company.公司代號,
        name: company.公司名稱 || '',
        shortName: company.公司簡稱 || company.公司名稱 || '',
        industry: company.產業別 || '',
      });
    }

    // 批量插入（每次 100 筆）
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.insert(twseStockList).values(batch);
    }

    console.log(`[TWSE DB Cache] Successfully cached ${records.length} stocks`);
  } catch (error) {
    console.error('[TWSE DB Cache] Error updating cache:', error);
    throw error;
  }
}

/**
 * 從數據庫緩存獲取所有股票列表
 */
async function getCachedStockList(): Promise<Map<string, StockInfo>> {
  const db = await getDb();
  if (!db) {
    console.warn('[TWSE DB Cache] Database not available');
    return new Map();
  }

  try {
    const records = await db.select().from(twseStockList);
    const stockMap = new Map<string, StockInfo>();

    for (const record of records) {
      stockMap.set(record.symbol, {
        symbol: record.symbol,
        name: record.name,
        shortName: record.shortName || record.name,
        industry: record.industry || '',
      });
    }

    console.log(`[TWSE DB Cache] Loaded ${stockMap.size} stocks from database cache`);
    return stockMap;
  } catch (error) {
    console.error('[TWSE DB Cache] Error loading cache:', error);
    return new Map();
  }
}

/**
 * 獲取股票列表（自動管理緩存更新）
 */
export async function getStockList(): Promise<Map<string, StockInfo>> {
  try {
    // 1. 檢查是否需要更新緩存
    const needUpdate = await shouldUpdateCache();
    
    if (needUpdate) {
      try {
        // 2. 嘗試更新緩存
        await updateCache();
      } catch (error) {
        console.warn('[TWSE DB Cache] Failed to update cache, using existing cache:', error);
      }
    }

    // 3. 從數據庫緩存獲取股票列表
    return await getCachedStockList();
  } catch (error) {
    console.error('[TWSE DB Cache] Error getting stock list:', error);
    return new Map();
  }
}

/**
 * 根據股票代碼獲取股票資訊
 */
export async function getStockInfo(symbol: string): Promise<StockInfo | null> {
  const stockList = await getStockList();
  return stockList.get(symbol) || null;
}

/**
 * 根據中文名稱搜尋股票（支援部分匹配）
 */
export async function searchStockByName(query: string): Promise<StockInfo[]> {
  const stockList = await getStockList();
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
 * 強制更新緩存（用於手動觸發更新）
 */
export async function forceUpdateCache(): Promise<void> {
  console.log('[TWSE DB Cache] Force updating cache...');
  await updateCache();
}

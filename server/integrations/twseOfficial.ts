/**
 * TWSE/TPEx 官方 OpenAPI 整合模組
 * 
 * 使用台灣證券交易所 (TWSE) 與櫃買中心 (TPEx) 官方 OpenAPI
 * 獲取上市櫃股票與 ETF 的基本資料
 * 
 * API 來源:
 * - TWSE: https://openapi.twse.com.tw/v1
 * - TPEx: https://www.tpex.org.tw/openapi/v1
 */

import axios, { AxiosError } from 'axios';

// API 基礎 URL
const TWSE_OPENAPI_URL = 'https://openapi.twse.com.tw/v1';
const TPEX_OPENAPI_URL = 'https://www.tpex.org.tw/openapi/v1';

// 重試配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 秒

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
  retries = MAX_RETRIES
): Promise<T> {
  try {
    const response = await axios.get<T>(url, {
      timeout: 30000, // 30 秒超時 (官方 API 可能較慢)
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // 如果還有重試次數，則重試
    if (retries > 0) {
      console.warn(`API 請求失敗，${RETRY_DELAY}ms 後重試... (剩餘重試次數: ${retries})`);
      await delay(RETRY_DELAY);
      return fetchWithRetry<T>(url, retries - 1);
    }
    
    // 重試次數用盡，拋出錯誤
    throw new Error(`API 請求失敗: ${axiosError.message}`);
  }
}

// ============================================================================
// TWSE 上市股票 API
// ============================================================================

/**
 * TWSE 上市公司基本資料 (t187ap03_L)
 */
export interface TwseCompanyInfo {
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
  上市日期: string;
  普通股每股面額: string;
  實收資本額: string;
  私募股數: string;
  特別股: string;
  編制財務報表類型: string;
  股票過戶機構: string;
  過戶電話: string;
  過戶地址: string;
  簽證會計師事務所: string;
  簽證會計師1: string;
  簽證會計師2: string;
  英文簡稱: string;
  英文通訊地址: string;
  傳真機號碼: string;
  電子郵件信箱: string;
  網址: string;
  已發行普通股數或TDR原股發行股數: string;
}

/**
 * TWSE 每日交易資料 (STOCK_DAY_ALL)
 */
export interface TwseDailyTrading {
  Date: string;
  Code: string;
  Name: string;
  TradeVolume: string;
  TradeValue: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
  ClosingPrice: string;
  Change: string;
  Transaction: string;
}

/**
 * 取得 TWSE 上市公司基本資料
 * 
 * @returns 上市公司基本資料列表
 */
export async function fetchTwseCompanyList(): Promise<TwseCompanyInfo[]> {
  console.log('[TWSE Official] Fetching listed company info...');
  
  try {
    const data = await fetchWithRetry<TwseCompanyInfo[]>(
      `${TWSE_OPENAPI_URL}/opendata/t187ap03_L`
    );
    
    console.log(`[TWSE Official] Retrieved ${data.length} listed companies`);
    return data || [];
  } catch (error) {
    console.error('[TWSE Official] Failed to fetch company list:', error);
    return [];
  }
}

/**
 * 取得 TWSE 每日交易資料 (含 ETF)
 * 
 * @returns 每日交易資料列表
 */
export async function fetchTwseDailyTrading(): Promise<TwseDailyTrading[]> {
  console.log('[TWSE Official] Fetching daily trading data...');
  
  try {
    const data = await fetchWithRetry<TwseDailyTrading[]>(
      `${TWSE_OPENAPI_URL}/exchangeReport/STOCK_DAY_ALL`
    );
    
    console.log(`[TWSE Official] Retrieved ${data.length} daily trading records`);
    return data || [];
  } catch (error) {
    console.error('[TWSE Official] Failed to fetch daily trading:', error);
    return [];
  }
}

// ============================================================================
// TPEx 上櫃股票 API
// ============================================================================

/**
 * TPEx 上櫃公司基本資料
 */
export interface TpexCompanyInfo {
  Date: string;
  SecuritiesCompanyCode: string;
  CompanyName: string;
  CompanyAbbreviation: string;
  Registration: string;
  SecuritiesIndustryCode: string;
  Address: string;
  'UnifiedBusinessNo.': string;
  Chairman: string;
  GeneralManager: string;
  Spokesman: string;
  TitleOfSpokesman: string;
  DeputySpokesperson: string;
  Telephone: string;
  DateOfIncorporation: string;
  DateOfListing: string;
  ParValueOfCommonStock: string;
  'Paidin.Capital.NTDollars': string;
  'PrivateStock.shares': string;
  'PreferredStock.shares': string;
  PreparationOfFinancialReportType: string;
  StockTransferAgent: string;
  StockTransferAgentTelephone: string;
  StockTransferAgentAddress: string;
  AccountingFirm: string;
  'CPA.CharteredPublicAccountant.First': string;
  'CPA.CharteredPublicAccountant.Second': string;
  Symbol: string;
  Fax: string;
  EmailAddress: string;
  WebAddress: string;
  IssueShares: string;
}

/**
 * TPEx 每日交易資料
 */
export interface TpexDailyTrading {
  Date: string;
  SecuritiesCompanyCode: string;
  CompanyName: string;
  Close: string;
  Change: string;
  Open: string;
  High: string;
  Low: string;
  TradingShares: string;
  TransactionAmount: string;
  TransactionNumber: string;
  LatestBidPrice: string;
  LatesAskPrice: string;
  Capitals: string;
  NextLimitUp: string;
  NextLimitDown: string;
}

/**
 * 取得 TPEx 上櫃公司基本資料
 * 
 * @returns 上櫃公司基本資料列表
 */
export async function fetchTpexCompanyList(): Promise<TpexCompanyInfo[]> {
  console.log('[TPEx Official] Fetching OTC company info...');
  
  try {
    const data = await fetchWithRetry<TpexCompanyInfo[]>(
      `${TPEX_OPENAPI_URL}/mopsfin_t187ap03_O`
    );
    
    console.log(`[TPEx Official] Retrieved ${data.length} OTC companies`);
    return data || [];
  } catch (error) {
    console.error('[TPEx Official] Failed to fetch company list:', error);
    return [];
  }
}

/**
 * 取得 TPEx 每日交易資料 (含 ETF)
 * 
 * @returns 每日交易資料列表
 */
export async function fetchTpexDailyTrading(): Promise<TpexDailyTrading[]> {
  console.log('[TPEx Official] Fetching daily trading data...');
  
  try {
    const data = await fetchWithRetry<TpexDailyTrading[]>(
      `${TPEX_OPENAPI_URL}/tpex_mainboard_quotes`
    );
    
    console.log(`[TPEx Official] Retrieved ${data.length} daily trading records`);
    return data || [];
  } catch (error) {
    console.error('[TPEx Official] Failed to fetch daily trading:', error);
    return [];
  }
}

// ============================================================================
// 資料轉換函數
// ============================================================================

/**
 * 產業代碼對照表 (TWSE)
 */
const TWSE_INDUSTRY_MAP: Record<string, string> = {
  '01': '水泥工業',
  '02': '食品工業',
  '03': '塑膠工業',
  '04': '紡織纖維',
  '05': '電機機械',
  '06': '電器電纜',
  '21': '化學工業',
  '22': '生技醫療業',
  '08': '玻璃陶瓷',
  '09': '造紙工業',
  '10': '鋼鐵工業',
  '11': '橡膠工業',
  '12': '汽車工業',
  '24': '半導體業',
  '25': '電腦及週邊設備業',
  '26': '光電業',
  '27': '通信網路業',
  '28': '電子零組件業',
  '29': '電子通路業',
  '30': '資訊服務業',
  '31': '其他電子業',
  '14': '建材營造業',
  '15': '航運業',
  '16': '觀光餐旅',
  '17': '金融保險業',
  '18': '貿易百貨業',
  '23': '油電燃氣業',
  '19': '綜合',
  '20': '其他業',
  '32': '文化創意業',
  '33': '農業科技業',
  '34': '電子商務',
  '80': 'ETF',
};

/**
 * TPEx 產業代碼對照表
 */
const TPEX_INDUSTRY_MAP: Record<string, string> = {
  '01': '食品工業',
  '02': '塑膠工業',
  '03': '紡織纖維',
  '04': '電機機械',
  '05': '電器電纜',
  '06': '化學工業',
  '07': '生技醫療業',
  '08': '玻璃陶瓷',
  '09': '鋼鐵工業',
  '10': '橡膠工業',
  '11': '半導體業',
  '12': '電腦及週邊設備業',
  '13': '光電業',
  '14': '通信網路業',
  '15': '電子零組件業',
  '16': '電子通路業',
  '17': '資訊服務業',
  '18': '其他電子業',
  '19': '建材營造業',
  '20': '航運業',
  '21': '觀光餐旅',
  '22': '金融保險業',
  '23': '貿易百貨業',
  '24': '油電燃氣業',
  '25': '綜合',
  '26': '其他業',
  '27': '文化創意業',
  '28': '農業科技業',
  '29': '電子商務',
  '30': '居家生活',
  '31': '數位雲端',
  '32': '運動休閒',
  '33': '綠能環保',
  '80': 'ETF',
};

/**
 * 判斷股票類型
 */
export function getStockType(code: string): 'stock' | 'etf' | 'other' {
  // ETF 代碼通常以 00 開頭
  if (code.startsWith('00')) {
    return 'etf';
  }
  // 一般股票代碼為 4 位數字
  if (/^\d{4}$/.test(code)) {
    return 'stock';
  }
  return 'other';
}

/**
 * 轉換 TWSE 公司資料為統一格式
 */
export function transformTwseCompany(company: TwseCompanyInfo) {
  const industryCode = company.產業別;
  const industry = TWSE_INDUSTRY_MAP[industryCode] || '其他業';
  const stockType = getStockType(company.公司代號);
  
  return {
    symbol: company.公司代號,
    name: company.公司名稱,
    shortName: company.公司簡稱,
    industry: industry,
    market: 'TWSE' as const,
    type: stockType,
    listedDate: company.上市日期 ? formatTwDate(company.上市日期) : null,
    capital: company.實收資本額 ? parseInt(company.實收資本額) : null,
    isActive: true,
  };
}

/**
 * 轉換 TPEx 公司資料為統一格式
 */
export function transformTpexCompany(company: TpexCompanyInfo) {
  const industryCode = company.SecuritiesIndustryCode;
  const industry = TPEX_INDUSTRY_MAP[industryCode] || '其他業';
  const stockType = getStockType(company.SecuritiesCompanyCode);
  
  return {
    symbol: company.SecuritiesCompanyCode,
    name: company.CompanyName,
    shortName: company.CompanyAbbreviation,
    industry: industry,
    market: 'TPEx' as const,
    type: stockType,
    listedDate: company.DateOfListing ? formatTwDate(company.DateOfListing) : null,
    capital: company['Paidin.Capital.NTDollars'] ? parseInt(company['Paidin.Capital.NTDollars']) : null,
    isActive: true,
  };
}

/**
 * 從每日交易資料提取股票基本資訊 (TWSE)
 * 用於補充 ETF 等未在公司基本資料中的標的
 */
export function transformTwseDailyToStock(daily: TwseDailyTrading) {
  const stockType = getStockType(daily.Code);
  
  return {
    symbol: daily.Code,
    name: daily.Name,
    shortName: daily.Name,
    industry: stockType === 'etf' ? 'ETF' : '其他業',
    market: 'TWSE' as const,
    type: stockType,
    listedDate: null,
    capital: null,
    isActive: true,
  };
}

/**
 * 從每日交易資料提取股票基本資訊 (TPEx)
 * 用於補充 ETF 等未在公司基本資料中的標的
 */
export function transformTpexDailyToStock(daily: TpexDailyTrading) {
  const stockType = getStockType(daily.SecuritiesCompanyCode);
  
  return {
    symbol: daily.SecuritiesCompanyCode,
    name: daily.CompanyName,
    shortName: daily.CompanyName,
    industry: stockType === 'etf' ? 'ETF' : '其他業',
    market: 'TPEx' as const,
    type: stockType,
    listedDate: null,
    capital: null,
    isActive: true,
  };
}

/**
 * 格式化台灣日期 (民國年 YYYMMDD 或 YYYYMMDD)
 */
function formatTwDate(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 7) return null;
  
  try {
    // 民國年格式 (7位數: YYYMMDD)
    if (dateStr.length === 7) {
      const year = parseInt(dateStr.substring(0, 3)) + 1911;
      const month = dateStr.substring(3, 5);
      const day = dateStr.substring(5, 7);
      return `${year}-${month}-${day}`;
    }
    
    // 西元年格式 (8位數: YYYYMMDD)
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// 整合同步函數
// ============================================================================

/**
 * 同步結果
 */
export interface SyncResult {
  twseStocks: number;
  twseEtfs: number;
  tpexStocks: number;
  tpexEtfs: number;
  total: number;
  errors: string[];
}

/**
 * 獲取所有台股基本資料 (上市 + 上櫃 + ETF)
 * 
 * @returns 統一格式的股票資料列表
 */
/**
 * 統一的股票資料格式
 */
export interface UnifiedStockInfo {
  symbol: string;
  name: string;
  shortName: string;
  industry: string;
  market: 'TWSE' | 'TPEx';
  type: 'stock' | 'etf' | 'other';
  listedDate: string | null;
  capital: number | null;
  isActive: boolean;
}

export async function fetchAllTwStockInfo(): Promise<{
  stocks: UnifiedStockInfo[];
  stats: SyncResult;
}> {
  const stats: SyncResult = {
    twseStocks: 0,
    twseEtfs: 0,
    tpexStocks: 0,
    tpexEtfs: 0,
    total: 0,
    errors: [],
  };
  
  const allStocks: UnifiedStockInfo[] = [];
  const symbolSet = new Set<string>();
  
  try {
    // 1. 取得 TWSE 上市公司基本資料
    console.log('[Sync] Fetching TWSE company list...');
    const twseCompanies = await fetchTwseCompanyList();
    
    for (const company of twseCompanies) {
      const stock = transformTwseCompany(company);
      if (!symbolSet.has(stock.symbol)) {
        symbolSet.add(stock.symbol);
        allStocks.push(stock);
        if (stock.type === 'etf') {
          stats.twseEtfs++;
        } else {
          stats.twseStocks++;
        }
      }
    }
    
    // 2. 取得 TWSE 每日交易資料 (補充 ETF)
    console.log('[Sync] Fetching TWSE daily trading for ETFs...');
    const twseDaily = await fetchTwseDailyTrading();
    
    for (const daily of twseDaily) {
      if (!symbolSet.has(daily.Code)) {
        const stock = transformTwseDailyToStock(daily);
        symbolSet.add(stock.symbol);
        allStocks.push(stock);
        if (stock.type === 'etf') {
          stats.twseEtfs++;
        } else {
          stats.twseStocks++;
        }
      }
    }
    
    // 3. 取得 TPEx 上櫃公司基本資料
    console.log('[Sync] Fetching TPEx company list...');
    const tpexCompanies = await fetchTpexCompanyList();
    
    for (const company of tpexCompanies) {
      const stock = transformTpexCompany(company);
      if (!symbolSet.has(stock.symbol)) {
        symbolSet.add(stock.symbol);
        allStocks.push(stock);
        if (stock.type === 'etf') {
          stats.tpexEtfs++;
        } else {
          stats.tpexStocks++;
        }
      }
    }
    
    // 4. 取得 TPEx 每日交易資料 (補充 ETF)
    console.log('[Sync] Fetching TPEx daily trading for ETFs...');
    const tpexDaily = await fetchTpexDailyTrading();
    
    for (const daily of tpexDaily) {
      if (!symbolSet.has(daily.SecuritiesCompanyCode)) {
        const stock = transformTpexDailyToStock(daily);
        symbolSet.add(stock.symbol);
        allStocks.push(stock);
        if (stock.type === 'etf') {
          stats.tpexEtfs++;
        } else {
          stats.tpexStocks++;
        }
      }
    }
    
    stats.total = allStocks.length;
    
    console.log(`[Sync] Total stocks fetched: ${stats.total}`);
    console.log(`[Sync] TWSE: ${stats.twseStocks} stocks, ${stats.twseEtfs} ETFs`);
    console.log(`[Sync] TPEx: ${stats.tpexStocks} stocks, ${stats.tpexEtfs} ETFs`);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    stats.errors.push(errorMsg);
    console.error('[Sync] Error fetching stock info:', error);
  }
  
  return { stocks: allStocks, stats };
}

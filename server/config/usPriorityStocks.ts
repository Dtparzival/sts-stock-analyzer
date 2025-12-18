/**
 * 美股優先同步清單
 * 
 * 啟動時同步最重要的股票，確保關鍵資料即時更新
 * 
 * 同步策略：
 * - 啟動時同步：優先清單（約 50 支）
 * - 定期排程同步：完整清單（約 500 支）
 * 
 * 注意: TwelveData API 已無限流限制
 */

/**
 * 優先同步的美股清單
 * 包含：
 * - 科技巨頭 (FAANG + Microsoft + NVIDIA)
 * - 主要指數 ETF
 * - 產業龍頭
 */
export const PRIORITY_US_STOCKS = [
  // 科技巨頭 (Magnificent 7)
  'AAPL',   // Apple
  'MSFT',   // Microsoft
  'GOOGL',  // Alphabet (Google)
  'GOOG',   // Alphabet Class C
  'AMZN',   // Amazon
  'META',   // Meta (Facebook)
  'NVDA',   // NVIDIA
  'TSLA',   // Tesla
  
  // 其他重要科技股
  'AMD',    // AMD
  'INTC',   // Intel
  'NFLX',   // Netflix
  'CRM',    // Salesforce
  'ORCL',   // Oracle
  'ADBE',   // Adobe
  'CSCO',   // Cisco
  'AVGO',   // Broadcom
  'QCOM',   // Qualcomm
  'TXN',    // Texas Instruments
  
  // 金融巨頭
  'JPM',    // JPMorgan Chase
  'BAC',    // Bank of America
  'WFC',    // Wells Fargo
  'GS',     // Goldman Sachs
  'MS',     // Morgan Stanley
  'V',      // Visa
  'MA',     // Mastercard
  'BRK.B',  // Berkshire Hathaway
  
  // 消費品龍頭
  'WMT',    // Walmart
  'COST',   // Costco
  'HD',     // Home Depot
  'MCD',    // McDonald's
  'NKE',    // Nike
  'SBUX',   // Starbucks
  'KO',     // Coca-Cola
  'PEP',    // PepsiCo
  
  // 醫療保健
  'JNJ',    // Johnson & Johnson
  'UNH',    // UnitedHealth
  'PFE',    // Pfizer
  'ABBV',   // AbbVie
  'MRK',    // Merck
  'LLY',    // Eli Lilly
  
  // 能源
  'XOM',    // Exxon Mobil
  'CVX',    // Chevron
  
  // 工業
  'BA',     // Boeing
  'CAT',    // Caterpillar
  'GE',     // General Electric
  'HON',    // Honeywell
  
  // 主要 ETF
  'SPY',    // S&P 500 ETF
  'QQQ',    // Nasdaq 100 ETF
  'DIA',    // Dow Jones ETF
  'IWM',    // Russell 2000 ETF
  'VTI',    // Vanguard Total Stock Market
  'VOO',    // Vanguard S&P 500
];

/**
 * 取得優先同步股票數量
 */
export function getPriorityStockCount(): number {
  return PRIORITY_US_STOCKS.length;
}

/**
 * 判斷是否為優先同步股票
 */
export function isPriorityStock(symbol: string): boolean {
  return PRIORITY_US_STOCKS.includes(symbol.toUpperCase());
}

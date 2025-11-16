/**
 * 市場配置
 */

export type MarketType = 'US' | 'TW';

export interface MarketConfig {
  id: MarketType;
  name: string;
  currency: string;
  currencySymbol: string;
  region: string;
  tradingHours: string;
  timezone: string;
}

export const MARKETS: Record<MarketType, MarketConfig> = {
  US: {
    id: 'US',
    name: '美股市場',
    currency: 'USD',
    currencySymbol: '$',
    region: 'US',
    tradingHours: '09:30-16:00 (EST)',
    timezone: 'America/New_York',
  },
  TW: {
    id: 'TW',
    name: '台股市場',
    currency: 'TWD',
    currencySymbol: 'NT$',
    region: 'TW',
    tradingHours: '09:00-13:30 (GMT+8)',
    timezone: 'Asia/Taipei',
  },
};

export interface HotStock {
  symbol: string;
  name: string;
  market: MarketType;
}

export const HOT_STOCKS: Record<MarketType, HotStock[]> = {
  US: [
    { symbol: 'AAPL', name: 'Apple Inc.', market: 'US' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US' },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', market: 'US' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'US' },
    { symbol: 'META', name: 'Meta Platforms, Inc.', market: 'US' },
    { symbol: 'NFLX', name: 'Netflix, Inc.', market: 'US' },
  ],
  TW: [
    { symbol: '2330', name: '台積電', market: 'TW' },
    { symbol: '2317', name: '鴻海', market: 'TW' },
    { symbol: '2454', name: '聯發科', market: 'TW' },
    { symbol: '2412', name: '中華電', market: 'TW' },
    { symbol: '2882', name: '國泰金', market: 'TW' },
    { symbol: '2891', name: '中信金', market: 'TW' },
    { symbol: '2303', name: '聯電', market: 'TW' },
    { symbol: '2308', name: '台達電', market: 'TW' },
  ],
};

/**
 * 根據股票代碼判斷市場類型
 * 台股：4 位數字代碼（例如 2330）或帶 .TW 後綴（例如 2330.TW）
 * 美股：英文字母代碼（例如 AAPL）
 */
export function getMarketFromSymbol(symbol: string): MarketType {
  // 帶 .TW 或 .TWO 後綴的是台股
  if (symbol.includes('.TW') || symbol.includes('.TWO')) {
    return 'TW';
  }
  // 4 位純數字代碼也是台股
  if (/^\d{4}$/.test(symbol)) {
    return 'TW';
  }
  return 'US';
}

/**
 * 移除台股代碼的 .TW 後綴
 */
export function cleanTWSymbol(symbol: string): string {
  return symbol.replace(/\.(TW|TWO)$/i, '');
}

/**
 * 台股中文名稱映射表（部分常見股票）
 * 可以根據需要擴充更多股票
 */
export const TW_STOCK_NAMES: Record<string, string> = {
  '2330': '台積電',
  '2317': '鴻海',
  '2454': '聯發科',
  '2412': '中華電',
  '2882': '國泰金',
  '2891': '中信金',
  '2303': '聯電',
  '2308': '台達電',
  '2881': '富邦金',
  '2886': '兆豐金',
  '2884': '玉山金',
  '2892': '第一金',
  '2002': '中鋼',
  '2912': '統一超',
  '1301': '台塑',
  '1303': '南亞',
  '2357': '華碩',
  '3008': '大立光',
  '2382': '廣達',
  '2395': '研華',
  '6505': '台塑化',
  '2801': '彰銀',
  '2880': '華南金',
  '2887': '台新金',
  '2890': '永豐金',
  '2885': '元大金',
  '2883': '開發金',
  '5880': '合庫',
  '2379': '瑞昂',
  '2377': '微星',
  '2409': '友達',
  '2408': '南亞科',
  '3045': '台灣大',
  '2301': '光寶科',
  '2327': '國巨',
  '2345': '智邦',
  '2347': '聯強',
  '3711': '日月光',
  '2603': '長榮',
  '2609': '陽明',
  '2615': '萬海',
  '2618': '長興',
};

/**
 * 根據中文名稱搜尋台股代碼
 * 支援部分匹配（例如輸入「台積」可以匹配到「台積電」）
 */
export function searchTWStockByName(query: string): Array<{ symbol: string; name: string }> {
  const results: Array<{ symbol: string; name: string }> = [];
  const normalizedQuery = query.trim().toLowerCase();
  
  for (const [symbol, name] of Object.entries(TW_STOCK_NAMES)) {
    if (name.toLowerCase().includes(normalizedQuery)) {
      results.push({ symbol, name });
    }
  }
  
  return results;
}

/**
 * 獲取台股中文名稱
 */
export function getTWStockName(symbol: string): string | undefined {
  const cleanSymbol = cleanTWSymbol(symbol);
  return TW_STOCK_NAMES[cleanSymbol];
}

/**
 * 獲取台股代碼的完整格式（帶 .TW 後綴）
 * 用於 API 請求
 */
export function getFullTWSymbol(symbol: string): string {
  const market = getMarketFromSymbol(symbol);
  if (market === 'TW' && !symbol.includes('.TW') && !symbol.includes('.TWO')) {
    return `${symbol}.TW`;
  }
  return symbol;
}

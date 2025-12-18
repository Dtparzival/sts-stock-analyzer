/**
 * 市場配置
 */

export type MarketType = 'US' | 'TW' | 'ALL';

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
  ALL: {
    id: 'ALL',
    name: '全部市場',
    currency: 'USD',
    currencySymbol: '$',
    region: 'ALL',
    tradingHours: '24/7',
    timezone: 'UTC',
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
    { symbol: '2330.TW', name: '台積電', market: 'TW' },
    { symbol: '2317.TW', name: '鴻海', market: 'TW' },
    { symbol: '2454.TW', name: '聯發科', market: 'TW' },
    { symbol: '2412.TW', name: '中華電', market: 'TW' },
    { symbol: '2882.TW', name: '國泰金', market: 'TW' },
    { symbol: '2891.TW', name: '中信金', market: 'TW' },
    { symbol: '2303.TW', name: '聯電', market: 'TW' },
    { symbol: '2308.TW', name: '台達電', market: 'TW' },
  ],
  ALL: [
    { symbol: 'AAPL', name: 'Apple Inc.', market: 'US' },
    { symbol: '2330.TW', name: '台積電', market: 'TW' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' },
    { symbol: '2317.TW', name: '鴻海', market: 'TW' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'US' },
    { symbol: '2454.TW', name: '聯發科', market: 'TW' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'US' },
    { symbol: '2882.TW', name: '國泰金', market: 'TW' },
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
 * 台股中文名稱映射表（備用，當 TWSE API 不可用時使用）
 * 主要功能已移至 server/twseStockList.ts，使用 TWSE OpenAPI 獲取完整的股票列表
 * 已擴充至前 95 大市值股票（根據 2024-2025 年市值排名）
 */
export const TW_STOCK_NAMES: Record<string, string> = {
  '1101.TW': '台泥',
  '1102.TW': '亞泥',
  '1216.TW': '統一',
  '1301.TW': '台塑',
  '1303.TW': '南亞',
  '1326.TW': '台化',
  '1402.TW': '遠東新',
  '2002.TW': '中鋼',
  '2105.TW': '正新',
  '2201.TW': '裕隆',
  '2207.TW': '和泰車',
  '2301.TW': '光寶科',
  '2303.TW': '聯電',
  '2308.TW': '台達電',
  '2317.TW': '鴻海',
  '2324.TW': '仁寶',
  '2327.TW': '國巨',
  '2330.TW': '台積電',
  '2345.TW': '智邦',
  '2347.TW': '聯強',
  '2353.TW': '宏碁',
  '2356.TW': '英業達',
  '2357.TW': '華碩',
  '2371.TW': '大同',
  '2376.TW': '技嘉',
  '2377.TW': '微星',
  '2379.TW': '瑞昂',
  '2382.TW': '廣達',
  '2385.TW': '群光',
  '2393.TW': '億光',
  '2395.TW': '研華',
  '2404.TW': '漢唐',
  '2408.TW': '南亞科',
  '2409.TW': '友達',
  '2412.TW': '中華電',
  '2439.TW': '美律',
  '2449.TW': '京元電子',
  '2454.TW': '聯發科',
  '2474.TW': '可成',
  '2603.TW': '長榮',
  '2609.TW': '陽明',
  '2610.TW': '華航',
  '2615.TW': '萬海',
  '2618.TW': '長榮航',
  '2801.TW': '彰銀',
  '2823.TW': '中壽',
  '2834.TW': '臺企銀',
  '2845.TW': '遠東銀',
  '2849.TW': '安泰銀',
  '2850.TW': '新產',
  '2851.TW': '中再保',
  '2852.TW': '第一保',
  '2867.TW': '三商壽',
  '2880.TW': '華南金',
  '2881.TW': '富邦金',
  '2882.TW': '國泰金',
  '2883.TW': '開發金',
  '2884.TW': '玉山金',
  '2885.TW': '元大金',
  '2886.TW': '兆豐金',
  '2887.TW': '台新金',
  '2888.TW': '新光金',
  '2889.TW': '國票金',
  '2890.TW': '永豐金',
  '2891.TW': '中信金',
  '2892.TW': '第一金',
  '2903.TW': '遠百',
  '2912.TW': '統一超',
  '2915.TW': '潤泰全',
  '3008.TW': '大立光',
  '3034.TW': '聯詠',
  '3037.TW': '欣興',
  '3045.TW': '台灣大',
  '3231.TW': '緯創',
  '3443.TW': '創意',
  '3481.TW': '群創',
  '3533.TW': '嘉澤',
  '3711.TW': '日月光投控',
  '4904.TW': '遠傳',
  '4906.TW': '正文',
  '4938.TW': '和碩',
  '5871.TW': '中租-KY',
  '5880.TW': '合庫金',
  '6176.TW': '瑞儀',
  '6239.TW': '力成',
  '6271.TW': '同欣電',
  '6415.TW': '矽力-KY',
  '6446.TW': '藥華藥',
  '6488.TW': '環球晶',
  '6505.TW': '台塑化',
  '6669.TW': '緯穎',
  '6770.TW': '力積電',
  '9910.TW': '豐泰',
  '9921.TW': '巨大',
  '9945.TW': '潤泰新',
};

/**
 * 根據中文名稱搜尋台股代碼
 * 支援部分匹配（例如輸入「台積」可以匹配到「台積電」）
 */
export function searchTWStockByName(query: string): Array<{ symbol: string; name: string }> {
  const results: Array<{ symbol: string; name: string }> = [];
  const normalizedQuery = query.trim().toLowerCase();
  
  // 處理空字串查詢
  if (!normalizedQuery) {
    return results;
  }
  
  for (const [symbol, name] of Object.entries(TW_STOCK_NAMES)) {
    if (name.toLowerCase().includes(normalizedQuery)) {
      // TW_STOCK_NAMES 的 key 已經是完整格式（例如：2330.TW），直接使用
      results.push({ symbol, name });
    }
  }
  
  return results;
}

/**
 * 獲取台股中文名稱
 */
export function getTWStockName(symbol: string): string | undefined {
  // TW_STOCK_NAMES 的 key 已經是完整格式（例如：2330.TW）
  // 確保 symbol 也是完整格式
  const fullSymbol = getFullTWSymbol(symbol);
  return TW_STOCK_NAMES[fullSymbol];
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

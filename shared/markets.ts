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
    { symbol: '2330.TW', name: '台積電', market: 'TW' },
    { symbol: '2317.TW', name: '鴻海', market: 'TW' },
    { symbol: '2454.TW', name: '聯發科', market: 'TW' },
    { symbol: '2412.TW', name: '中華電', market: 'TW' },
    { symbol: '2882.TW', name: '國泰金', market: 'TW' },
    { symbol: '2891.TW', name: '中信金', market: 'TW' },
    { symbol: '2303.TW', name: '聯電', market: 'TW' },
    { symbol: '2308.TW', name: '台達電', market: 'TW' },
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
  '1101': '台泥',
  '1102': '亞泥',
  '1216': '統一',
  '1301': '台塑',
  '1303': '南亞',
  '1326': '台化',
  '1402': '遠東新',
  '2002': '中鋼',
  '2105': '正新',
  '2201': '裕隆',
  '2207': '和泰車',
  '2301': '光寶科',
  '2303': '聯電',
  '2308': '台達電',
  '2317': '鴻海',
  '2324': '仁寶',
  '2327': '國巨',
  '2330': '台積電',
  '2345': '智邦',
  '2347': '聯強',
  '2353': '宏碁',
  '2356': '英業達',
  '2357': '華碩',
  '2371': '大同',
  '2376': '技嘉',
  '2377': '微星',
  '2379': '瑞昂',
  '2382': '廣達',
  '2385': '群光',
  '2393': '億光',
  '2395': '研華',
  '2404': '漢唐',
  '2408': '南亞科',
  '2409': '友達',
  '2412': '中華電',
  '2439': '美律',
  '2449': '京元電子',
  '2454': '聯發科',
  '2474': '可成',
  '2603': '長榮',
  '2609': '陽明',
  '2610': '華航',
  '2615': '萬海',
  '2618': '長榮航',
  '2801': '彰銀',
  '2823': '中壽',
  '2834': '臺企銀',
  '2845': '遠東銀',
  '2849': '安泰銀',
  '2850': '新產',
  '2851': '中再保',
  '2852': '第一保',
  '2867': '三商壽',
  '2880': '華南金',
  '2881': '富邦金',
  '2882': '國泰金',
  '2883': '開發金',
  '2884': '玉山金',
  '2885': '元大金',
  '2886': '兆豐金',
  '2887': '台新金',
  '2888': '新光金',
  '2889': '國票金',
  '2890': '永豐金',
  '2891': '中信金',
  '2892': '第一金',
  '2903': '遠百',
  '2912': '統一超',
  '2915': '潤泰全',
  '3008': '大立光',
  '3034': '聯詠',
  '3037': '欣興',
  '3045': '台灣大',
  '3231': '緯創',
  '3443': '創意',
  '3481': '群創',
  '3533': '嘉澤',
  '3711': '日月光投控',
  '4904': '遠傳',
  '4906': '正文',
  '4938': '和碩',
  '5871': '中租-KY',
  '5880': '合庫金',
  '6176': '瑞儀',
  '6239': '力成',
  '6271': '同欣電',
  '6415': '矽力-KY',
  '6446': '藥華藥',
  '6488': '環球晶',
  '6505': '台塑化',
  '6669': '緯穎',
  '6770': '力積電',
  '9910': '豐泰',
  '9921': '巨大',
  '9945': '潤泰新',
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

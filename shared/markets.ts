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

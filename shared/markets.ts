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
 */
export function getMarketFromSymbol(symbol: string): MarketType {
  if (symbol.includes('.TW') || symbol.includes('.TWO')) {
    return 'TW';
  }
  return 'US';
}

/**
 * Tiingo API 整合模組
 * 用於獲取美股的即時報價和歷史數據
 */

import { ENV } from './_core/env';

const TIINGO_BASE_URL = 'https://api.tiingo.com';

interface TiingoQuote {
  ticker: string;
  timestamp: string;
  last: number;
  lastSize: number;
  lastSaleTimestamp: string;
  lastTrade: string;
  open: number;
  high: number;
  low: number;
  mid: number;
  volume: number;
  bidSize: number;
  bidPrice: number;
  askSize: number;
  askPrice: number;
  prevClose: number;
  tngoLast: number;
}

interface TiingoHistoricalPrice {
  date: string;
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  adjClose: number;
  adjHigh: number;
  adjLow: number;
  adjOpen: number;
  adjVolume: number;
  divCash: number;
  splitFactor: number;
}

interface TiingoMeta {
  ticker: string;
  name: string;
  exchangeCode: string;
  startDate: string;
  endDate: string;
  description: string;
}

/**
 * 獲取股票即時報價（使用 End-of-Day API 的最新價格）
 * @param symbol 股票代碼（例如：AAPL）
 */
export async function getTiingoQuote(symbol: string): Promise<TiingoQuote | null> {
  try {
    // 使用 End-of-Day API 的 prices endpoint 獲取最近 10 天的數據
    // 這樣可以確保即使在交易日之前也能獲取到最新的收盤數據
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 10);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`[Tiingo] Fetching quote for ${symbol} from ${startDateStr} to ${endDateStr}`);
    
    const url = `${TIINGO_BASE_URL}/tiingo/daily/${symbol}/prices?startDate=${startDateStr}&endDate=${endDateStr}&token=${ENV.tiingoApiToken}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Tiingo] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    console.log(`[Tiingo] Received ${data.length} data points for ${symbol}`);
    
    if (!data || data.length === 0) {
      console.error(`[Tiingo] No data found for ${symbol}`);
      return null;
    }
    
    // 如果 API 返回錯誤訊息
    if (data.detail) {
      console.error(`[Tiingo] API returned error: ${data.detail}`);
      return null;
    }

    // End-of-Day API 返回的數據格式不同，需要轉換
    const latestData = data[data.length - 1]; // 獲取最新的一筆數據
    const prevData = data.length > 1 ? data[data.length - 2] : latestData; // 獲取前一天的數據
    
    return {
      ticker: symbol,
      timestamp: latestData.date,
      last: latestData.close,
      lastSize: 0,
      lastSaleTimestamp: latestData.date,
      lastTrade: latestData.date,
      open: latestData.open,
      high: latestData.high,
      low: latestData.low,
      mid: (latestData.high + latestData.low) / 2,
      volume: latestData.volume,
      bidSize: 0,
      bidPrice: 0,
      askSize: 0,
      askPrice: 0,
      prevClose: prevData.close,
      tngoLast: latestData.close,
    } as TiingoQuote;
  } catch (error) {
    console.error(`[Tiingo] Failed to fetch quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * 獲取股票歷史價格數據
 * @param symbol 股票代碼
 * @param startDate 開始日期（格式：YYYY-MM-DD）
 * @param endDate 結束日期（格式：YYYY-MM-DD）
 */
export async function getTiingoHistoricalPrices(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<TiingoHistoricalPrice[] | null> {
  try {
    const url = `${TIINGO_BASE_URL}/tiingo/daily/${symbol}/prices?startDate=${startDate}&endDate=${endDate}&token=${ENV.tiingoApiToken}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Tiingo] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // 如果 API 返回錯誤訊息
    if (data.detail) {
      console.error(`[Tiingo] API returned error: ${data.detail}`);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.error(`[Tiingo] No historical data found for ${symbol}`);
      return null;
    }

    console.log(`[Tiingo] Received ${data.length} historical data points for ${symbol}`);
    return data as TiingoHistoricalPrice[];
  } catch (error) {
    console.error(`[Tiingo] Failed to fetch historical prices for ${symbol}:`, error);
    return null;
  }
}

/**
 * 獲取股票元數據（公司名稱等）
 * @param symbol 股票代碼
 */
export async function getTiingoMeta(symbol: string): Promise<TiingoMeta | null> {
  try {
    const url = `${TIINGO_BASE_URL}/tiingo/daily/${symbol}?token=${ENV.tiingoApiToken}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Tiingo] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // 如果 API 返回錯誤訊息
    if (data.detail) {
      console.error(`[Tiingo] API returned error: ${data.detail}`);
      return null;
    }
    
    if (!data) {
      console.error(`[Tiingo] No meta data found for ${symbol}`);
      return null;
    }

    console.log(`[Tiingo] Received meta data for ${symbol}: ${data.name}`);
    return data as TiingoMeta;
  } catch (error) {
    console.error(`[Tiingo] Failed to fetch meta for ${symbol}:`, error);
    return null;
  }
}

/**
 * 將 range 轉換為日期範圍
 */
function rangeToDateRange(range: string): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '1d':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case '5d':
      startDate.setDate(endDate.getDate() - 5);
      break;
    case '1mo':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3mo':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6mo':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case '2y':
      startDate.setFullYear(endDate.getFullYear() - 2);
      break;
    case '5y':
      startDate.setFullYear(endDate.getFullYear() - 5);
      break;
    case 'max':
      startDate.setFullYear(endDate.getFullYear() - 20);
      break;
    default:
      startDate.setMonth(endDate.getMonth() - 1);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * 將 Tiingo 數據轉換為 Yahoo Finance 格式
 */
export async function convertTiingoToYahooFormat(symbol: string, range: string) {
  try {
    // 獲取即時報價
    const quote = await getTiingoQuote(symbol);
    if (!quote) {
      throw new Error('無法獲取股票報價');
    }

    // 獲取歷史數據
    const { startDate, endDate } = rangeToDateRange(range);
    const historicalPrices = await getTiingoHistoricalPrices(symbol, startDate, endDate);
    if (!historicalPrices || historicalPrices.length === 0) {
      throw new Error('無法獲取歷史數據');
    }

    // 獲取元數據
    const meta = await getTiingoMeta(symbol);

    // 構建時間序列數據
    const timestamps: number[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    const volumes: number[] = [];

    for (const price of historicalPrices) {
      const date = new Date(price.date);
      timestamps.push(Math.floor(date.getTime() / 1000));
      opens.push(price.open);
      highs.push(price.high);
      lows.push(price.low);
      closes.push(price.close);
      volumes.push(price.volume);
    }

    // 計算 52 週高低
    const fiftyTwoWeekHigh = Math.max(...highs);
    const fiftyTwoWeekLow = Math.min(...lows);

    // 構建 Yahoo Finance 格式的返回數據
    return {
      chart: {
        result: [
          {
            meta: {
              currency: 'USD',
              symbol: symbol,
              exchangeName: quote.ticker,
              fullExchangeName: meta?.exchangeCode || 'Unknown',
              instrumentType: 'EQUITY',
              firstTradeDate: null,
              regularMarketTime: Math.floor(new Date(quote.timestamp).getTime() / 1000),
              hasPrePostMarketData: false,
              gmtoffset: -18000,
              timezone: 'EST',
              exchangeTimezoneName: 'America/New_York',
              regularMarketPrice: quote.last,
              fiftyTwoWeekHigh: fiftyTwoWeekHigh,
              fiftyTwoWeekLow: fiftyTwoWeekLow,
              regularMarketDayHigh: quote.high,
              regularMarketDayLow: quote.low,
              regularMarketVolume: quote.volume,
              longName: meta?.name || symbol,
              shortName: meta?.name || symbol,
              chartPreviousClose: quote.prevClose,
              previousClose: quote.prevClose,
              scale: 3,
              priceHint: 2,
              currentTradingPeriod: null,
              tradingPeriods: null,
              dataGranularity: '1d',
              range: range,
              validRanges: ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'],
            },
            timestamp: timestamps,
            indicators: {
              quote: [
                {
                  open: opens,
                  high: highs,
                  low: lows,
                  close: closes,
                  volume: volumes,
                },
              ],
              adjclose: [
                {
                  adjclose: closes,
                },
              ],
            },
          },
        ],
        error: null,
      },
    };
  } catch (error: any) {
    console.error('[Tiingo] Error converting to Yahoo format:', error);
    throw error;
  }
}

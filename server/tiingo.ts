/**
 * Tiingo API 整合模組
 * 用於獲取美股的即時報價和歷史數據
 */

import { ENV } from './_core/env';

const TIINGO_BASE_URL = 'https://api.tiingo.com';

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
 * 獲取股票歷史價格數據（包含最新報價）
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
    console.log(`[Tiingo] Fetching historical prices for ${symbol} from ${startDate} to ${endDate}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tiingo] API error: ${response.status} ${response.statusText}`, errorText);
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

    console.log(`[Tiingo] Successfully received ${data.length} data points for ${symbol}`);
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
    console.log(`[Tiingo] Fetching meta data for ${symbol}`);
    
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

    console.log(`[Tiingo] Successfully received meta data for ${symbol}: ${data.name}`);
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
 * 優化版本：只調用一次歷史價格 API 和一次元數據 API
 */
export async function convertTiingoToYahooFormat(symbol: string, range: string) {
  try {
    // 獲取日期範圍
    const { startDate, endDate } = rangeToDateRange(range);
    
    // 並行獲取歷史數據和元數據（只需要 2 個 API 調用）
    const [historicalPrices, meta] = await Promise.all([
      getTiingoHistoricalPrices(symbol, startDate, endDate),
      getTiingoMeta(symbol)
    ]);
    
    if (!historicalPrices || historicalPrices.length === 0) {
      throw new Error('無法獲取歷史數據');
    }

    // 從歷史數據中提取最新報價和前一天收盤價
    const latestData = historicalPrices[historicalPrices.length - 1];
    const prevData = historicalPrices.length > 1 ? historicalPrices[historicalPrices.length - 2] : latestData;

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
              exchangeName: symbol,
              fullExchangeName: meta?.exchangeCode || 'Unknown',
              instrumentType: 'EQUITY',
              firstTradeDate: null,
              regularMarketTime: Math.floor(new Date(latestData.date).getTime() / 1000),
              hasPrePostMarketData: false,
              gmtoffset: -18000,
              timezone: 'EST',
              exchangeTimezoneName: 'America/New_York',
              regularMarketPrice: latestData.close,
              fiftyTwoWeekHigh: fiftyTwoWeekHigh,
              fiftyTwoWeekLow: fiftyTwoWeekLow,
              regularMarketDayHigh: latestData.high,
              regularMarketDayLow: latestData.low,
              regularMarketVolume: latestData.volume,
              longName: meta?.name || symbol,
              shortName: meta?.name || symbol,
              chartPreviousClose: prevData.close,
              previousClose: prevData.close,
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

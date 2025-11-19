import { ENV } from "./_core/env";
import { twelveDataQueue } from "./twelvedataQueue";

/**
 * TwelveData API 整合模組
 * 用於獲取美股的即時報價和歷史數據
 */

interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

interface TwelveDataTimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: TwelveDataTimeSeriesValue[];
  status: string;
}

/**
 * 獲取股票即時報價
 */
export async function getTwelveDataQuote(symbol: string): Promise<TwelveDataQuote | null> {
  // 使用請求佇列管理 API 調用
  return twelveDataQueue.enqueue(async () => {
    try {
      const url = new URL("quote", ENV.twelveDataBaseUrl);
      url.searchParams.append("symbol", symbol);
      url.searchParams.append("apikey", ENV.twelveDataToken);

      console.log(`[TwelveData] Fetching quote for ${symbol}`);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`[TwelveData] Quote API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (data.code || data.status === "error") {
        console.error(`[TwelveData] Quote API error:`, data.message || data);
        return null;
      }

      console.log(`[TwelveData] Successfully fetched quote for ${symbol}`);
      return data as TwelveDataQuote;
    } catch (error) {
      console.error(`[TwelveData] Failed to fetch quote for ${symbol}:`, error);
      return null;
    }
  });
}

/**
 * 獲取股票歷史數據（時間序列）
 * @param symbol 股票代碼
 * @param interval 時間間隔 (1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month)
 * @param outputsize 返回數據量 (默認 30，最大 5000)
 */
export async function getTwelveDataTimeSeries(
  symbol: string,
  interval: string = "1day",
  outputsize: number = 30
): Promise<TwelveDataTimeSeries | null> {
  // 使用請求佇列管理 API 調用
  return twelveDataQueue.enqueue(async () => {
    try {
      const url = new URL("time_series", ENV.twelveDataBaseUrl);
      url.searchParams.append("symbol", symbol);
      url.searchParams.append("interval", interval);
      url.searchParams.append("outputsize", outputsize.toString());
      url.searchParams.append("apikey", ENV.twelveDataToken);

      console.log(`[TwelveData] Fetching time series for ${symbol} (interval: ${interval}, outputsize: ${outputsize})`);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`[TwelveData] TimeSeries API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (data.code || data.status === "error") {
        console.error(`[TwelveData] TimeSeries API error:`, data.message || data);
        return null;
      }

      console.log(`[TwelveData] Successfully fetched time series for ${symbol}`);
      return data as TwelveDataTimeSeries;
    } catch (error) {
      console.error(`[TwelveData] Failed to fetch time series for ${symbol}:`, error);
      return null;
    }
  });
}

/**
 * 將 TwelveData 報價轉換為應用程式格式
 */
export function convertTwelveDataQuoteToStockData(quote: TwelveDataQuote) {
  const currentPrice = parseFloat(quote.close);
  const previousClose = parseFloat(quote.previous_close);
  const change = parseFloat(quote.change);
  const changePercent = parseFloat(quote.percent_change);

  return {
    symbol: quote.symbol,
    companyName: quote.name,
    currentPrice,
    previousClose,
    change,
    changePercent,
    dayHigh: parseFloat(quote.high),
    dayLow: parseFloat(quote.low),
    open: parseFloat(quote.open),
    volume: parseInt(quote.volume),
    avgVolume: parseInt(quote.average_volume),
    fiftyTwoWeekHigh: parseFloat(quote.fifty_two_week.high),
    fiftyTwoWeekLow: parseFloat(quote.fifty_two_week.low),
    lastUpdated: new Date(quote.datetime),
  };
}

/**
 * 將 TwelveData 時間序列轉換為圖表數據格式
 */
export function convertTwelveDataTimeSeriesToChartData(timeSeries: TwelveDataTimeSeries) {
  // TwelveData 返回的數據是從最新到最舊，需要反轉
  const reversedValues = [...timeSeries.values].reverse();
  
  return reversedValues.map((value) => ({
    date: value.datetime,
    open: parseFloat(value.open),
    high: parseFloat(value.high),
    low: parseFloat(value.low),
    close: parseFloat(value.close),
    volume: parseInt(value.volume),
  }));
}

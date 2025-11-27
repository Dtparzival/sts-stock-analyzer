/**
 * AI 聊天功能的股票數據整合模組
 * 自動檢測用戶消息中的股票代碼，並獲取即時數據提供給 AI
 */

import { getCacheWithMetadata, setCache } from './dbStockDataCache';
import { callDataApi } from './_core/dataApi';
import { withRateLimit } from './apiQueue';
import { getTWSEStockHistory, convertTWSEToYahooFormat, convertSymbolToTWSE } from './twse';

export interface StockDataResult {
  symbol: string;
  data: any;
  fromCache?: boolean;
  error?: string;
  // 簡化的股票資訊（用於多股票對比）
  companyName?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: string;
  peRatio?: number;
  dividendYield?: number;
  avgVolume?: string;
}

/**
 * 從用戶消息中檢測股票代碼
 * 支援美股代碼（1-5個大寫字母）和台股代碼（4個數字）
 */
export function detectStockSymbols(message: string): string[] {
  // 檢測美股代碼（1-5個大寫字母）和台股代碼（4個數字）
  const usStockRegex = /\b[A-Z]{1,5}\b/g;
  const twStockRegex = /\b\d{4}\b/g;
  
  const usMatches = message.match(usStockRegex) || [];
  const twMatches = message.match(twStockRegex) || [];
  
  // 過濾常見非股票代碼的詞（如 AI, RSI, PE 等）
  const excludeWords = ['AI', 'PE', 'PB', 'ROE', 'ROA', 'EPS', 'RSI', 'MACD', 'KD', 'MA', 'ETF', 'IPO', 'CEO', 'CFO', 'CTO', 'USD', 'TWD', 'VS'];
  const filteredUsMatches = usMatches.filter(symbol => !excludeWords.includes(symbol));
  
  const detectedSymbols = [...filteredUsMatches, ...twMatches.map(s => `${s}.TW`)];
  
  // 限制最多獲取 3 支股票的數據（避免過多 API 請求）
  return detectedSymbols.slice(0, 3);
}

/**
 * 獲取股票即時數據
 */
export async function fetchStockData(symbol: string, ctx: any): Promise<StockDataResult> {
  try {
    // 判斷是台股還是美股
    const isTWStock = symbol.endsWith('.TW');
    
    let stockData;
    
    if (isTWStock) {
      // 台股使用 TWSE API
      const stockNo = convertSymbolToTWSE(symbol);
      
      // 檢查緩存
      const cacheParams = { symbol, range: '1d' };
      const cached = await getCacheWithMetadata('twse_stock_data', cacheParams);
      
      if (cached && cached.expiresAt > new Date()) {
        return { symbol, data: cached.data, fromCache: true };
      }
      
      const twseData = await getTWSEStockHistory(stockNo, 1);
      
      if (!twseData || twseData.length === 0) {
        throw new Error('無法獲取台股數據');
      }
      
      stockData = convertTWSEToYahooFormat(stockNo, twseData);
      
      if (!stockData) {
        throw new Error('無法轉換台股數據');
      }
      
      // 緩存數據（30 分鐘）
      await setCache('twse_stock_data', cacheParams, stockData, 30 * 60 * 1000);
    } else {
      // 美股使用 TwelveData API（與 routers.ts 中的 getStockData 保持一致）
      const cacheParams = { symbol, region: 'US', range: '1d', interval: '1d' };
      
      // 檢查緩存
      const cached = await getCacheWithMetadata('twelvedata_stock_data', cacheParams);
      
      if (cached && cached.expiresAt > new Date()) {
        return { symbol, data: cached.data, fromCache: true };
      }
      
      // 使用 TwelveData API 獲取股票數據
      const { getTwelveDataQuote, getTwelveDataTimeSeries } = await import('./twelvedata');
      
      // 獲取即時報價
      const quote = await getTwelveDataQuote(symbol);
      if (!quote) {
        throw new Error(`無法獲取股票 ${symbol} 的即時報價`);
      }
      
      // 獲取歷史數據（1 天）
      const timeSeries = await getTwelveDataTimeSeries(symbol, '1day', 1);
      if (!timeSeries || !timeSeries.values || timeSeries.values.length === 0) {
        throw new Error(`無法獲取股票 ${symbol} 的歷史數據`);
      }
      
      // 轉換為 Yahoo Finance 格式（保持前端相容）
      stockData = {
        chart: {
          result: [
            {
              meta: {
                symbol: quote.symbol,
                longName: quote.name,
                regularMarketPrice: parseFloat(quote.close),
                previousClose: parseFloat(quote.previous_close),
                currency: 'USD',
              },
              timestamp: timeSeries.values.map((item) => new Date(item.datetime).getTime() / 1000),
              indicators: {
                quote: [
                  {
                    open: timeSeries.values.map((item) => parseFloat(item.open)),
                    high: timeSeries.values.map((item) => parseFloat(item.high)),
                    low: timeSeries.values.map((item) => parseFloat(item.low)),
                    close: timeSeries.values.map((item) => parseFloat(item.close)),
                    volume: timeSeries.values.map((item) => parseInt(item.volume)),
                  },
                ],
              },
            },
          ],
        },
      };
      
      // 緩存數據（30 分鐘）
      await setCache('twelvedata_stock_data', cacheParams, stockData, 30 * 60 * 1000);
    }
    
    return { symbol, data: stockData, fromCache: false };
  } catch (error: any) {
    console.error(`[AI Chat] Failed to fetch stock data for ${symbol}:`, error);
    return { symbol, data: null, error: error.message };
  }
}

/**
 * 構建股票數據上下文字符串
 */
export function buildStockContext(stockDataResults: StockDataResult[]): string {
  const stockInfos = stockDataResults
    .filter(r => r.data)
    .map(r => {
      const quote = r.data.chart?.result?.[0]?.meta;
      const currentPrice = quote?.regularMarketPrice;
      const previousClose = quote?.previousClose;
      const change = currentPrice && previousClose ? currentPrice - previousClose : null;
      const changePercent = change && previousClose ? (change / previousClose) * 100 : null;
      const currency = quote?.currency || 'USD';
      
      return `\n【${r.symbol}】\n- 當前價格: ${currentPrice ? `${currency} ${currentPrice.toFixed(2)}` : '無數據'}\n- 漲跌: ${change ? `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercent?.toFixed(2)}%)` : '無數據'}\n- 前收盤價: ${previousClose ? `${currency} ${previousClose.toFixed(2)}` : '無數據'}\n- 數據時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;
    })
    .join('\n');
  
  if (stockInfos) {
    return `\n\n【即時股票數據】${stockInfos}\n\n請根據以上即時數據提供分析建議。`;
  }
  
  return '';
}

/**
 * 提取股票資訊用於對比分析
 */
export function extractStockInfo(result: StockDataResult): StockDataResult {
  if (!result.data || result.error) {
    return result;
  }
  
  const quote = result.data.chart?.result?.[0]?.meta;
  const currentPrice = quote?.regularMarketPrice;
  const previousClose = quote?.previousClose;
  const change = currentPrice && previousClose ? currentPrice - previousClose : null;
  const changePercent = change && previousClose ? (change / previousClose) * 100 : null;
  
  return {
    ...result,
    companyName: quote?.longName || quote?.shortName || result.symbol,
    price: currentPrice,
    change: change || undefined,
    changePercent: changePercent || undefined,
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
    marketCap: quote?.marketCap ? formatMarketCap(quote.marketCap) : undefined,
    peRatio: quote?.trailingPE,
    dividendYield: quote?.dividendYield ? quote.dividendYield * 100 : undefined,
    avgVolume: quote?.averageDailyVolume10Day ? formatVolume(quote.averageDailyVolume10Day) : undefined,
  };
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(2)}`;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toString();
}

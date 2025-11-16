/**
 * Alpha Vantage API 整合模組
 * 
 * 提供美股即時報價、歷史價格和公司資訊查詢功能
 * 免費版限制：每分鐘 5 次請求，每天 500 次請求
 */

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Alpha Vantage API 回應介面
 */
interface AlphaVantageQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface AlphaVantageTimeSeries {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

interface AlphaVantageCompanyOverview {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  DividendYield: string;
  '52WeekHigh': string;
  '52WeekLow': string;
}

/**
 * 調用 Alpha Vantage API
 */
async function callAlphaVantageAPI(params: Record<string, string>): Promise<any> {
  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  url.searchParams.append('apikey', ALPHA_VANTAGE_API_KEY);
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  
  console.log(`[Alpha Vantage] Calling API: ${params.function} for ${params.symbol || 'N/A'}`);
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 檢查 API 錯誤
    if (data['Error Message']) {
      throw new Error(`API Error: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      // API 速率限制
      throw new Error(`Rate limit exceeded: ${data['Note']}`);
    }
    
    if (data['Information']) {
      // API 資訊提示（通常是速率限制）
      throw new Error(`API Information: ${data['Information']}`);
    }
    
    return data;
  } catch (error: any) {
    console.error(`[Alpha Vantage] API call failed:`, error.message);
    throw error;
  }
}

/**
 * 獲取股票即時報價
 */
export async function getAlphaVantageQuote(symbol: string): Promise<AlphaVantageQuote> {
  const data = await callAlphaVantageAPI({
    function: 'GLOBAL_QUOTE',
    symbol,
  });
  
  if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
    throw new Error('無法獲取股票報價');
  }
  
  return data as AlphaVantageQuote;
}

/**
 * 獲取股票歷史價格（每日）
 * @param symbol 股票代碼
 * @param outputsize 'compact' (最近 100 天) 或 'full' (20+ 年完整數據)
 */
export async function getAlphaVantageTimeSeries(
  symbol: string,
  outputsize: 'compact' | 'full' = 'compact'
): Promise<AlphaVantageTimeSeries> {
  const data = await callAlphaVantageAPI({
    function: 'TIME_SERIES_DAILY',
    symbol,
    outputsize,
  });
  
  if (!data['Time Series (Daily)']) {
    throw new Error('無法獲取歷史價格數據');
  }
  
  return data as AlphaVantageTimeSeries;
}

/**
 * 獲取公司基本資訊
 */
export async function getAlphaVantageCompanyOverview(symbol: string): Promise<AlphaVantageCompanyOverview> {
  const data = await callAlphaVantageAPI({
    function: 'COMPANY_OVERVIEW',
    symbol,
  });
  
  if (!data.Symbol) {
    throw new Error('無法獲取公司資訊');
  }
  
  return data as AlphaVantageCompanyOverview;
}

/**
 * 將 Alpha Vantage 數據轉換為 Yahoo Finance 格式
 */
export async function convertAlphaVantageToYahooFormat(symbol: string, range: string = '1mo') {
  console.log(`[Alpha Vantage] Converting data for ${symbol}, range: ${range}`);
  
  try {
    // 並行獲取報價、歷史數據和公司資訊
    const [quoteData, timeSeriesData, companyData] = await Promise.all([
      getAlphaVantageQuote(symbol),
      getAlphaVantageTimeSeries(symbol, 'compact'),
      getAlphaVantageCompanyOverview(symbol).catch(() => null), // 公司資訊可選
    ]);
    
    const quote = quoteData['Global Quote'];
    const timeSeries = timeSeriesData['Time Series (Daily)'];
    
    // 轉換歷史數據
    const timestamps: number[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    const volumes: number[] = [];
    
    // 獲取日期範圍
    const endDate = new Date();
    const startDate = new Date();
    
    // 根據 range 計算開始日期
    const rangeToDays: Record<string, number> = {
      '1d': 1,
      '5d': 5,
      '1mo': 30,
      '3mo': 90,
      '6mo': 180,
      '1y': 365,
      '2y': 730,
      '5y': 1825,
      'max': 7300,
    };
    
    const days = rangeToDays[range] || 30;
    startDate.setDate(startDate.getDate() - days);
    
    // 過濾並排序日期
    const sortedDates = Object.keys(timeSeries)
      .filter(date => {
        const dateObj = new Date(date);
        return dateObj >= startDate && dateObj <= endDate;
      })
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    // 轉換數據
    for (const date of sortedDates) {
      const dayData = timeSeries[date];
      const timestamp = Math.floor(new Date(date).getTime() / 1000);
      
      timestamps.push(timestamp);
      opens.push(parseFloat(dayData['1. open']));
      highs.push(parseFloat(dayData['2. high']));
      lows.push(parseFloat(dayData['3. low']));
      closes.push(parseFloat(dayData['4. close']));
      volumes.push(parseInt(dayData['5. volume']));
    }
    
    // 計算當前價格和變化
    const currentPrice = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    
    // 計算 52 週高低點
    const fiftyTwoWeekHigh = companyData?.['52WeekHigh'] 
      ? parseFloat(companyData['52WeekHigh']) 
      : Math.max(...highs);
    const fiftyTwoWeekLow = companyData?.['52WeekLow'] 
      ? parseFloat(companyData['52WeekLow']) 
      : Math.min(...lows);
    
    // 構建 Yahoo Finance 格式的回應
    const result = {
      chart: {
        result: [
          {
            meta: {
              currency: companyData?.Currency || 'USD',
              symbol: symbol,
              exchangeName: companyData?.Exchange || 'NASDAQ',
              fullExchangeName: companyData?.Exchange || 'NASDAQ',
              instrumentType: 'EQUITY',
              firstTradeDate: timestamps[0],
              regularMarketTime: Math.floor(new Date(quote['07. latest trading day']).getTime() / 1000),
              hasPrePostMarketData: false,
              gmtoffset: -18000,
              timezone: 'EST',
              exchangeTimezoneName: 'America/New_York',
              regularMarketPrice: currentPrice,
              chartPreviousClose: previousClose,
              previousClose: previousClose,
              scale: 3,
              priceHint: 2,
              currentTradingPeriod: {
                pre: {
                  timezone: 'EST',
                  start: Math.floor(new Date().setHours(4, 0, 0, 0) / 1000),
                  end: Math.floor(new Date().setHours(9, 30, 0, 0) / 1000),
                  gmtoffset: -18000,
                },
                regular: {
                  timezone: 'EST',
                  start: Math.floor(new Date().setHours(9, 30, 0, 0) / 1000),
                  end: Math.floor(new Date().setHours(16, 0, 0, 0) / 1000),
                  gmtoffset: -18000,
                },
                post: {
                  timezone: 'EST',
                  start: Math.floor(new Date().setHours(16, 0, 0, 0) / 1000),
                  end: Math.floor(new Date().setHours(20, 0, 0, 0) / 1000),
                  gmtoffset: -18000,
                },
              },
              dataGranularity: '1d',
              range: range,
              validRanges: ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'],
              // 添加公司資訊
              longName: companyData?.Name || symbol,
              shortName: companyData?.Name || symbol,
              regularMarketDayHigh: parseFloat(quote['03. high']),
              regularMarketDayLow: parseFloat(quote['04. low']),
              regularMarketVolume: parseInt(quote['06. volume']),
              regularMarketChange: change,
              regularMarketChangePercent: changePercent,
              fiftyTwoWeekHigh,
              fiftyTwoWeekLow,
              fiftyTwoWeekRange: `${fiftyTwoWeekLow.toFixed(2)} - ${fiftyTwoWeekHigh.toFixed(2)}`,
              marketCap: companyData?.MarketCapitalization ? parseInt(companyData.MarketCapitalization) : undefined,
              trailingPE: companyData?.PERatio ? parseFloat(companyData.PERatio) : undefined,
              dividendYield: companyData?.DividendYield ? parseFloat(companyData.DividendYield) : undefined,
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
            },
          },
        ],
        error: null,
      },
    };
    
    console.log(`[Alpha Vantage] Successfully converted data for ${symbol}`);
    return result;
  } catch (error: any) {
    console.error(`[Alpha Vantage] Error converting data:`, error.message);
    throw new Error(`無法獲取股票數據：${error.message}`);
  }
}

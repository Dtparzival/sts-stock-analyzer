/**
 * 台灣證券交易所 (TWSE) OpenAPI 整合模組
 * 用於獲取台股的每日收盤行情和歷史數據
 */

interface TWSEStockDayResponse {
  stat: string;
  date: string;
  title: string;
  fields: string[];
  data: string[][];
  notes: string[];
}

/**
 * 獲取台股每日收盤行情
 * @param stockNo 股票代碼（不含 .TW 後綴，例如：2330）
 * @param date 查詢日期（格式：YYYYMMDD，例如：20250101）
 */
export async function getTWSEStockDay(stockNo: string, date: string): Promise<TWSEStockDayResponse | null> {
  try {
    const url = new URL("https://www.twse.com.tw/exchangeReport/STOCK_DAY");
    url.searchParams.append("response", "json");
    url.searchParams.append("date", date);
    url.searchParams.append("stockNo", stockNo);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[TWSE] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (data.stat !== "OK") {
      console.error(`[TWSE] API error:`, data.stat);
      return null;
    }

    return data as TWSEStockDayResponse;
  } catch (error) {
    console.error(`[TWSE] Failed to fetch stock day for ${stockNo}:`, error);
    return null;
  }
}

/**
 * 獲取台股多個月份的歷史數據
 * @param stockNo 股票代碼（不含 .TW 後綴）
 * @param months 要獲取的月份數（1-12）
 */
export async function getTWSEStockHistory(stockNo: string, months: number = 1): Promise<TWSEStockDayResponse[]> {
  const results: TWSEStockDayResponse[] = [];
  const now = new Date();
  
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}01`;
    
    const data = await getTWSEStockDay(stockNo, dateStr);
    if (data && data.data && data.data.length > 0) {
      results.push(data);
    }
    
    // 避免請求過快，加入延遲
    if (i < months - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * 將 TWSE 數據轉換為 Yahoo Finance 格式
 */
export function convertTWSEToYahooFormat(stockNo: string, twseData: TWSEStockDayResponse[]) {
  // TWSE 數據欄位：日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數
  // fields: ["日期", "成交股數", "成交金額", "開盤價", "最高價", "最低價", "收盤價", "漲跌價差", "成交筆數"]
  
  const allData: any[] = [];
  
  // 合併所有月份的數據
  for (const monthData of twseData) {
    for (const row of monthData.data) {
      allData.push(row);
    }
  }
  
  // 按日期排序（從舊到新）
  allData.sort((a, b) => {
    const dateA = parseTWSEDate(a[0]);
    const dateB = parseTWSEDate(b[0]);
    return dateA.getTime() - dateB.getTime();
  });
  
  if (allData.length === 0) {
    return null;
  }
  
  // 獲取最新的數據作為當前價格
  const latestData = allData[allData.length - 1];
  const previousData = allData.length > 1 ? allData[allData.length - 2] : latestData;
  
  const currentPrice = parseFloat(latestData[6].replace(/,/g, ''));
  const previousClose = parseFloat(previousData[6].replace(/,/g, ''));
  const change = parseFloat(latestData[7].replace(/,/g, ''));
  const changePercent = (change / previousClose) * 100;
  
  const open = parseFloat(latestData[3].replace(/,/g, ''));
  const high = parseFloat(latestData[4].replace(/,/g, ''));
  const low = parseFloat(latestData[5].replace(/,/g, ''));
  const volume = parseInt(latestData[1].replace(/,/g, ''));
  
  // 計算 52 週高低（如果有足夠數據）
  let fiftyTwoWeekHigh = high;
  let fiftyTwoWeekLow = low;
  
  if (allData.length > 1) {
    for (const row of allData) {
      const rowHigh = parseFloat(row[4].replace(/,/g, ''));
      const rowLow = parseFloat(row[5].replace(/,/g, ''));
      fiftyTwoWeekHigh = Math.max(fiftyTwoWeekHigh, rowHigh);
      fiftyTwoWeekLow = Math.min(fiftyTwoWeekLow, rowLow);
    }
  }
  
  // 構建 Yahoo Finance 格式的返回數據
  const timestamps: number[] = [];
  const opens: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];
  
  for (const row of allData) {
    const date = parseTWSEDate(row[0]);
    timestamps.push(Math.floor(date.getTime() / 1000));
    opens.push(parseFloat(row[3].replace(/,/g, '')));
    highs.push(parseFloat(row[4].replace(/,/g, '')));
    lows.push(parseFloat(row[5].replace(/,/g, '')));
    closes.push(parseFloat(row[6].replace(/,/g, '')));
    volumes.push(parseInt(row[1].replace(/,/g, '')));
  }
  
  return {
    chart: {
      result: [
        {
          meta: {
            currency: "TWD",
            symbol: `${stockNo}.TW`,
            exchangeName: "TAI",
            fullExchangeName: "Taiwan Stock Exchange",
            instrumentType: "EQUITY",
            firstTradeDate: null,
            regularMarketTime: timestamps[timestamps.length - 1],
            hasPrePostMarketData: false,
            gmtoffset: 28800,
            timezone: "CST",
            exchangeTimezoneName: "Asia/Taipei",
            regularMarketPrice: currentPrice,
            fiftyTwoWeekHigh: fiftyTwoWeekHigh,
            fiftyTwoWeekLow: fiftyTwoWeekLow,
            regularMarketDayHigh: high,
            regularMarketDayLow: low,
            regularMarketVolume: volume,
            longName: `${stockNo}.TW`,
            shortName: `${stockNo}.TW`,
            chartPreviousClose: previousClose,
            previousClose: previousClose,
            scale: 3,
            priceHint: 2,
            currentTradingPeriod: null,
            tradingPeriods: null,
            dataGranularity: "1d",
            range: "1mo",
            validRanges: ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"],
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
}

/**
 * 解析 TWSE 日期格式（民國年/月/日）為 JavaScript Date
 */
function parseTWSEDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  const year = parseInt(parts[0]) + 1911; // 民國年轉西元年
  const month = parseInt(parts[1]) - 1; // JavaScript 月份從 0 開始
  const day = parseInt(parts[2]);
  return new Date(year, month, day);
}

/**
 * 將股票代碼從 Yahoo Finance 格式轉換為 TWSE 格式
 * @param symbol 股票代碼（例如：2330.TW）
 * @returns TWSE 格式的股票代碼（例如：2330）
 */
export function convertSymbolToTWSE(symbol: string): string {
  return symbol.replace('.TW', '').replace('.TWO', '');
}

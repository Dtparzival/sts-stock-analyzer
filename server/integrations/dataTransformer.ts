/**
 * 統一資料轉換層
 * 將不同資料來源（TWSE、TPEx、FinMind）的資料格式統一轉換為標準格式
 */

/**
 * 輔助函數：解析價格（轉換為以分為單位的整數）
 * 例如：100.50 元 → 10050
 */
export function parsePrice(price: string | number): number {
  if (price === null || price === undefined || price === '') {
    return 0;
  }
  const numPrice = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : price;
  return Math.round(numPrice * 100);
}

/**
 * 輔助函數：解析百分比（轉換為以萬分之一為單位的整數）
 * 例如：1.5% → 150
 */
export function parsePercent(percent: string | number): number {
  if (percent === null || percent === undefined || percent === '') {
    return 0;
  }
  const numPercent = typeof percent === 'string' ? parseFloat(percent.replace(/%/g, '')) : percent;
  return Math.round(numPercent * 10000);
}

/**
 * 輔助函數：解析日期
 * 處理民國年格式（例如：112/01/01）和西元年格式
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }
  
  // 處理民國年格式（例如：112/01/01）
  if (dateStr.includes('/') && dateStr.split('/')[0].length <= 3) {
    const [year, month, day] = dateStr.split('/');
    return new Date(parseInt(year) + 1911, parseInt(month) - 1, parseInt(day));
  }
  
  // 處理西元年格式
  return new Date(dateStr);
}

/**
 * 輔助函數：提取公司簡稱
 * 移除「股份有限公司」等後綴，提升顯示友善度
 */
export function extractShortName(fullName: string): string {
  if (!fullName) {
    return '';
  }
  return fullName.replace(/股份有限公司|有限公司|公司/g, '').trim();
}

/**
 * 轉換 TWSE 股票基本資料格式
 */
export function transformTwseStock(rawData: any) {
  return {
    symbol: rawData.Code || '',
    name: rawData.Name || '',
    shortName: extractShortName(rawData.Name || ''),
    market: '上市' as const,
    industry: rawData.Industry || null,
    type: (rawData.Type === 'ETF' ? 'ETF' : '股票') as 'ETF' | '股票',
    isActive: true,
  };
}

/**
 * 轉換 TPEx 股票基本資料格式
 * TPEx API 回傳的是陣列格式：[代號, 名稱, 產業, ...]
 */
export function transformTpexStock(rawData: any) {
  return {
    symbol: rawData[0] || '',
    name: rawData[1] || '',
    shortName: extractShortName(rawData[1] || ''),
    market: '上櫃' as const,
    industry: rawData[2] || null,
    type: '股票' as const,
    isActive: true,
  };
}

/**
 * 轉換歷史價格格式
 */
export function transformHistoricalPrice(rawData: any, source: 'TWSE' | 'TPEx') {
  if (source === 'TWSE') {
    return {
      date: parseDate(rawData.Date),
      open: parsePrice(rawData.Open),
      high: parsePrice(rawData.High),
      low: parsePrice(rawData.Low),
      close: parsePrice(rawData.Close),
      volume: parseInt(rawData.Volume || '0'),
      amount: parsePrice(rawData.Amount),
      change: parsePrice(rawData.Change),
      changePercent: parsePercent(rawData.ChangePercent),
    };
  } else {
    // TPEx 格式：[日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌, 漲跌幅]
    return {
      date: parseDate(rawData[0]),
      open: parsePrice(rawData[4]),
      high: parsePrice(rawData[5]),
      low: parsePrice(rawData[6]),
      close: parsePrice(rawData[2]),
      volume: parseInt(rawData[7] || '0'),
      amount: parsePrice(rawData[8]),
      change: parsePrice(rawData[3]),
      changePercent: parsePercent(rawData[9]),
    };
  }
}

/**
 * 轉換 FinMind 財務報表格式
 */
export function transformFinancialStatement(rawData: any) {
  return {
    symbol: rawData.stock_id || '',
    year: parseInt(rawData.year || '0'),
    quarter: parseInt(rawData.quarter || '0'),
    revenue: Math.round((parseFloat(rawData.revenue || '0') || 0) / 1000), // 轉換為千元
    netIncome: Math.round((parseFloat(rawData.net_income || '0') || 0) / 1000), // 轉換為千元
  };
}

/**
 * 轉換 FinMind 股利資訊格式
 */
export function transformDividend(rawData: any) {
  return {
    symbol: rawData.stock_id || '',
    year: parseInt(rawData.year || '0'),
    dividend: parsePrice(rawData.cash_dividend || '0'),
    yieldRate: parsePercent(rawData.dividend_yield || '0'),
  };
}

/**
 * 轉換 FinMind 基本面指標格式
 */
export function transformFundamentals(rawData: any) {
  return {
    symbol: rawData.stock_id || '',
    year: parseInt(rawData.date?.split('-')[0] || '0'),
    quarter: Math.ceil(parseInt(rawData.date?.split('-')[1] || '1') / 3),
    eps: parsePrice(rawData.EPS || '0'),
    pe: parsePercent(rawData.PER || '0'),
    pb: parsePercent(rawData.PBR || '0'),
    roe: parsePercent(rawData.ROE || '0'),
  };
}

/**
 * 計算技術指標：移動平均線 (MA)
 */
export function calculateMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null;
  }
  
  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return Math.round(sum / period);
}

/**
 * 計算技術指標：RSI (相對強弱指標)
 */
export function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) {
    return null;
  }
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) {
    return 1000000; // RSI = 100 (以萬分之一為單位)
  }
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return Math.round(rsi * 10000); // 轉換為萬分之一為單位
}

/**
 * 資料驗證：檢查股票資料是否完整
 */
export function validateStockData(data: any): boolean {
  return !!(data.symbol && data.name && data.market);
}

/**
 * 資料驗證：檢查價格資料是否完整
 */
export function validatePriceData(data: any): boolean {
  return !!(
    data.date &&
    data.open !== undefined &&
    data.high !== undefined &&
    data.low !== undefined &&
    data.close !== undefined
  );
}

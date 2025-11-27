/**
 * 基準指數數據獲取模組
 * 支援 S&P 500, NASDAQ, DOW 等主要指數
 */

import { callDataApi } from './_core/dataApi';
import { withRateLimit } from './apiQueue';
import { getCache, setCache } from './dbStockDataCache';

// 基準指數代碼映射
export const BENCHMARK_INDICES = {
  'SPX': { symbol: '^GSPC', name: 'S&P 500' },
  'NASDAQ': { symbol: '^IXIC', name: 'NASDAQ Composite' },
  'DOW': { symbol: '^DJI', name: 'Dow Jones Industrial Average' },
} as const;

export type BenchmarkIndexType = keyof typeof BENCHMARK_INDICES;

/**
 * 獲取基準指數歷史數據
 */
export async function getBenchmarkIndexHistory(
  indexType: BenchmarkIndexType,
  range: string = '1y'
): Promise<any> {
  const indexInfo = BENCHMARK_INDICES[indexType];
  const symbol = indexInfo.symbol;
  
  // 檢查緩存
  const cached = await getCache('getBenchmarkIndexHistory', { symbol, range });
  
  if (cached) {
    console.log(`[Benchmark] Using cached data for ${symbol} (${range})`);
    return {
      ...cached,
      _metadata: {
        lastUpdated: new Date(),
        isFromCache: true,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 分鐘
      }
    };
  }
  
  try {
    // 調用 Yahoo Finance API 獲取指數數據
    const result: any = await withRateLimit(async () => {
      return await callDataApi('YahooFinance/get_stock_chart', {
        query: {
          symbol,
          region: 'US',
          interval: '1d',
          range,
          includeAdjustedClose: 'true',
        },
      });
    });
    
    if (!result || !result.chart || !result.chart.result || result.chart.result.length === 0) {
      throw new Error(`無法獲取 ${indexInfo.name} 數據`);
    }
    
    const chartData = result.chart.result[0];
    
    // 轉換為標準格式
    const formattedData = {
      symbol: indexInfo.symbol,
      name: indexInfo.name,
      timestamps: chartData.timestamp || [],
      prices: chartData.indicators?.quote?.[0]?.close || [],
      meta: {
        currency: chartData.meta?.currency || 'USD',
        regularMarketPrice: chartData.meta?.regularMarketPrice,
        previousClose: chartData.meta?.previousClose,
      }
    };
    
    // 儲存到緩存（30 分鐘有效期）
    await setCache('getBenchmarkIndexHistory', { symbol, range }, formattedData, 30 * 60 * 1000);
    
    return {
      ...formattedData,
      _metadata: {
        lastUpdated: new Date(),
        isFromCache: false,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }
    };
  } catch (error: any) {
    console.error(`[Benchmark] Error fetching ${indexInfo.name}:`, error);
    
    // API 失敗時無緩存可用，直接拋出錯誤
    
    throw new Error(`無法獲取 ${indexInfo.name} 數據：${error.message}`);
  }
}

/**
 * 計算投資組合相對基準指數的表現
 */
export function calculateBenchmarkComparison(
  portfolioHistory: { date: Date; value: number }[],
  benchmarkHistory: { timestamp: number; price: number }[]
) {
  if (portfolioHistory.length === 0 || benchmarkHistory.length === 0) {
    return {
      portfolioReturn: 0,
      benchmarkReturn: 0,
      alpha: 0,
      beta: 0,
    };
  }
  
  // 計算投資組合報酬率
  const portfolioStartValue = portfolioHistory[0].value;
  const portfolioEndValue = portfolioHistory[portfolioHistory.length - 1].value;
  const portfolioReturn = ((portfolioEndValue - portfolioStartValue) / portfolioStartValue) * 100;
  
  // 計算基準指數報酬率
  const benchmarkStartPrice = benchmarkHistory[0].price;
  const benchmarkEndPrice = benchmarkHistory[benchmarkHistory.length - 1].price;
  const benchmarkReturn = ((benchmarkEndPrice - benchmarkStartPrice) / benchmarkStartPrice) * 100;
  
  // 計算 Alpha（超額報酬）
  const alpha = portfolioReturn - benchmarkReturn;
  
  // 簡化的 Beta 計算（實際應用中需要更複雜的統計計算）
  // 這裡使用報酬率比值作為簡化的 Beta
  const beta = benchmarkReturn !== 0 ? portfolioReturn / benchmarkReturn : 1;
  
  return {
    portfolioReturn: parseFloat(portfolioReturn.toFixed(2)),
    benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
    alpha: parseFloat(alpha.toFixed(2)),
    beta: parseFloat(beta.toFixed(2)),
  };
}

/**
 * 將基準指數數據格式化為圖表可用的格式
 */
export function formatBenchmarkForChart(
  benchmarkData: { timestamps: number[]; prices: number[] },
  portfolioStartValue: number
) {
  if (!benchmarkData.timestamps || !benchmarkData.prices || benchmarkData.timestamps.length === 0) {
    return [];
  }
  
  // 將基準指數價格標準化為與投資組合相同的起始值
  const benchmarkStartPrice = benchmarkData.prices[0];
  
  return benchmarkData.timestamps.map((timestamp, index) => {
    const price = benchmarkData.prices[index];
    const normalizedValue = (price / benchmarkStartPrice) * portfolioStartValue;
    
    return {
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      value: normalizedValue,
    };
  });
}

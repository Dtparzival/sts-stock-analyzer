import * as db from './db';
import { callDataApi } from './_core/dataApi';
import { getMarketFromSymbol } from '../shared/markets';
import { getTWSEStockHistory, convertSymbolToTWSE } from './twse';

/**
 * 準確度評估標準：
 * - 買入建議：分析後 N 天股價上漲 >= 3% 視為準確
 * - 賣出建議：分析後 N 天股價下跌 >= 3% 視為準確
 * - 持有建議：分析後 N 天股價變化在 ±3% 範圍內視為準確
 */
const ACCURACY_THRESHOLD = 0.03; // 3%

export interface AccuracyRecord {
  id: number;
  symbol: string;
  analysisDate: Date;
  recommendation: string | null;
  priceAtAnalysis: number | null;
  priceAfter7Days: number | null;
  priceAfter30Days: number | null;
  priceAfter90Days: number | null;
  isAccurate7Days: boolean | null;
  isAccurate30Days: boolean | null;
  isAccurate90Days: boolean | null;
}

export interface AccuracyStats {
  overall: {
    total: number;
    accurate7Days: number;
    accurate30Days: number;
    accurate90Days: number;
    accuracyRate7Days: number;
    accuracyRate30Days: number;
    accuracyRate90Days: number;
  };
  byRecommendation: {
    [key: string]: {
      total: number;
      accurate7Days: number;
      accurate30Days: number;
      accurate90Days: number;
      accuracyRate7Days: number;
      accuracyRate30Days: number;
      accuracyRate90Days: number;
    };
  };
  bySymbol: {
    [key: string]: {
      total: number;
      accurate7Days: number;
      accurate30Days: number;
      accurate90Days: number;
      accuracyRate7Days: number;
      accuracyRate30Days: number;
      accuracyRate90Days: number;
    };
  };
  records: AccuracyRecord[];
}

/**
 * 獲取指定日期後 N 天的股價
 */
async function getStockPriceAfterDays(
  symbol: string,
  startDate: Date,
  days: number
): Promise<number | null> {
  try {
    const market = getMarketFromSymbol(symbol);
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + days);
    
    // 計算查詢範圍（多查幾天以確保能獲取到數據）
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 10);
    
    if (market === 'TW') {
      // 台股使用 TWSE API
      const stockNo = convertSymbolToTWSE(symbol);
      const months = Math.ceil((days + 10) / 30);
      const twseResponses = await getTWSEStockHistory(stockNo, months);
      
      if (!twseResponses || twseResponses.length === 0) return null;
      
      // 將 TWSE 數據展開為平面陣列
      const allData: Array<{ date: Date; close: number }> = [];
      for (const response of twseResponses) {
        if (!response.data || response.data.length === 0) continue;
        
        for (const row of response.data) {
          // TWSE 數據格式：["日期", "成交股數", "成交金額", "開盤價", "最高價", "最低價", "收盤價", ...]
          const dateStr = row[0]; // 例："113/01/02"
          const closeStr = row[6]; // 收盤價
          
          if (!dateStr || !closeStr) continue;
          
          // 轉換日期格式（民國年/月/日 -> 西元年）
          const [year, month, day] = dateStr.split('/');
          const westernYear = parseInt(year) + 1911;
          const date = new Date(westernYear, parseInt(month) - 1, parseInt(day));
          
          // 移除千分位逗號並轉換為數字
          const close = parseFloat(closeStr.replace(/,/g, ''));
          
          if (!isNaN(close)) {
            allData.push({ date, close });
          }
        }
      }
      
      if (allData.length === 0) return null;
      
      // 找到最接近目標日期的數據
      const targetTimestamp = targetDate.getTime();
      let closestData = allData[0];
      let minDiff = Math.abs(allData[0].date.getTime() - targetTimestamp);
      
      for (const item of allData) {
        const diff = Math.abs(item.date.getTime() - targetTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closestData = item;
        }
      }
      
      return closestData.close;
    } else {
      // 美股使用 Yahoo Finance API
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);
      
      const response: any = await callDataApi('yahoo_finance', {
        symbol,
        range: 'custom',
        period1: startTimestamp,
        period2: endTimestamp,
        interval: '1d',
      } as any);
      
      if (!response?.chart?.result?.[0]) return null;
      
      const result = response.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      
      if (timestamps.length === 0 || closes.length === 0) return null;
      
      // 找到最接近目標日期的數據
      const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
      let closestIndex = 0;
      let minDiff = Math.abs(timestamps[0] - targetTimestamp);
      
      for (let i = 1; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] - targetTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
      
      return closes[closestIndex];
    }
  } catch (error) {
    console.error(`獲取 ${symbol} 在 ${days} 天後的股價失敗:`, error);
    return null;
  }
}

/**
 * 判斷分析建議是否準確
 */
function isRecommendationAccurate(
  recommendation: string | null,
  priceAtAnalysis: number,
  priceAfter: number
): boolean {
  if (!recommendation || !priceAtAnalysis || !priceAfter) return false;
  
  const priceChange = (priceAfter - priceAtAnalysis) / priceAtAnalysis;
  
  if (recommendation === '買入') {
    // 買入建議：股價上漲 >= 3% 視為準確
    return priceChange >= ACCURACY_THRESHOLD;
  } else if (recommendation === '賣出') {
    // 賣出建議：股價下跌 >= 3% 視為準確
    return priceChange <= -ACCURACY_THRESHOLD;
  } else if (recommendation === '持有') {
    // 持有建議：股價變化在 ±3% 範圍內視為準確
    return Math.abs(priceChange) <= ACCURACY_THRESHOLD;
  }
  
  return false;
}

/**
 * 計算 AI 分析準確度統計
 */
export async function calculateAccuracyStats(): Promise<AccuracyStats> {
  // 獲取所有歷史分析記錄
  const allHistory = await db.getAllAnalysisHistory();
  
  const records: AccuracyRecord[] = [];
  
  // 處理每條歷史記錄
  for (const history of allHistory) {
    if (!history.recommendation || !history.priceAtAnalysis) {
      continue; // 跳過沒有建議或價格的記錄
    }
    
    const priceAtAnalysis = history.priceAtAnalysis / 100; // 轉換為實際價格
    const analysisDate = new Date(history.createdAt);
    
    // 獲取 7 天、30 天、90 天後的股價
    const priceAfter7Days = await getStockPriceAfterDays(history.symbol, analysisDate, 7);
    const priceAfter30Days = await getStockPriceAfterDays(history.symbol, analysisDate, 30);
    const priceAfter90Days = await getStockPriceAfterDays(history.symbol, analysisDate, 90);
    
    // 判斷準確性
    const isAccurate7Days = priceAfter7Days
      ? isRecommendationAccurate(history.recommendation, priceAtAnalysis, priceAfter7Days)
      : null;
    const isAccurate30Days = priceAfter30Days
      ? isRecommendationAccurate(history.recommendation, priceAtAnalysis, priceAfter30Days)
      : null;
    const isAccurate90Days = priceAfter90Days
      ? isRecommendationAccurate(history.recommendation, priceAtAnalysis, priceAfter90Days)
      : null;
    
    records.push({
      id: history.id,
      symbol: history.symbol,
      analysisDate,
      recommendation: history.recommendation,
      priceAtAnalysis,
      priceAfter7Days,
      priceAfter30Days,
      priceAfter90Days,
      isAccurate7Days,
      isAccurate30Days,
      isAccurate90Days,
    });
  }
  
  // 計算整體統計
  const overall = {
    total: records.length,
    accurate7Days: records.filter(r => r.isAccurate7Days === true).length,
    accurate30Days: records.filter(r => r.isAccurate30Days === true).length,
    accurate90Days: records.filter(r => r.isAccurate90Days === true).length,
    accuracyRate7Days: 0,
    accuracyRate30Days: 0,
    accuracyRate90Days: 0,
  };
  
  const total7Days = records.filter(r => r.isAccurate7Days !== null).length;
  const total30Days = records.filter(r => r.isAccurate30Days !== null).length;
  const total90Days = records.filter(r => r.isAccurate90Days !== null).length;
  
  overall.accuracyRate7Days = total7Days > 0 ? overall.accurate7Days / total7Days : 0;
  overall.accuracyRate30Days = total30Days > 0 ? overall.accurate30Days / total30Days : 0;
  overall.accuracyRate90Days = total90Days > 0 ? overall.accurate90Days / total90Days : 0;
  
  // 按建議類型統計
  const byRecommendation: AccuracyStats['byRecommendation'] = {};
  const recommendations = ['買入', '持有', '賣出'];
  
  for (const rec of recommendations) {
    const recRecords = records.filter(r => r.recommendation === rec);
    const recTotal7Days = recRecords.filter(r => r.isAccurate7Days !== null).length;
    const recTotal30Days = recRecords.filter(r => r.isAccurate30Days !== null).length;
    const recTotal90Days = recRecords.filter(r => r.isAccurate90Days !== null).length;
    
    const accurate7Days = recRecords.filter(r => r.isAccurate7Days === true).length;
    const accurate30Days = recRecords.filter(r => r.isAccurate30Days === true).length;
    const accurate90Days = recRecords.filter(r => r.isAccurate90Days === true).length;
    
    byRecommendation[rec] = {
      total: recRecords.length,
      accurate7Days,
      accurate30Days,
      accurate90Days,
      accuracyRate7Days: recTotal7Days > 0 ? accurate7Days / recTotal7Days : 0,
      accuracyRate30Days: recTotal30Days > 0 ? accurate30Days / recTotal30Days : 0,
      accuracyRate90Days: recTotal90Days > 0 ? accurate90Days / recTotal90Days : 0,
    };
  }
  
  // 按股票統計
  const bySymbol: AccuracyStats['bySymbol'] = {};
  const symbolSet = new Set(records.map(r => r.symbol));
  const symbols = Array.from(symbolSet);
  
  for (const symbol of symbols) {
    const symRecords = records.filter(r => r.symbol === symbol);
    const symTotal7Days = symRecords.filter(r => r.isAccurate7Days !== null).length;
    const symTotal30Days = symRecords.filter(r => r.isAccurate30Days !== null).length;
    const symTotal90Days = symRecords.filter(r => r.isAccurate90Days !== null).length;
    
    const accurate7Days = symRecords.filter(r => r.isAccurate7Days === true).length;
    const accurate30Days = symRecords.filter(r => r.isAccurate30Days === true).length;
    const accurate90Days = symRecords.filter(r => r.isAccurate90Days === true).length;
    
    bySymbol[symbol] = {
      total: symRecords.length,
      accurate7Days,
      accurate30Days,
      accurate90Days,
      accuracyRate7Days: symTotal7Days > 0 ? accurate7Days / symTotal7Days : 0,
      accuracyRate30Days: symTotal30Days > 0 ? accurate30Days / symTotal30Days : 0,
      accuracyRate90Days: symTotal90Days > 0 ? accurate90Days / symTotal90Days : 0,
    };
  }
  
  return {
    overall,
    byRecommendation,
    bySymbol,
    records,
  };
}

/**
 * 時間趨勢數據點
 */
export interface TrendDataPoint {
  month: string; // 格式：YYYY-MM
  total: number;
  accurate: number;
  accuracyRate: number;
}

/**
 * 準確度時間趨勢統計
 */
export interface AccuracyTrend {
  overall: TrendDataPoint[];
  byRecommendation: {
    買入: TrendDataPoint[];
    持有: TrendDataPoint[];
    賣出: TrendDataPoint[];
  };
}

/**
 * 計算準確度時間趨勢
 * @param timeRange 評估時間範圍（7、30、90 天）
 */
export async function calculateAccuracyTrend(timeRange: 7 | 30 | 90): Promise<AccuracyTrend> {
  // 獲取所有歷史分析記錄
  const allHistory = await db.getAllAnalysisHistory();
  
  // 按月份分組
  const monthlyData: Map<string, AccuracyRecord[]> = new Map();
  
  for (const history of allHistory) {
    if (!history.recommendation || !history.priceAtAnalysis) {
      continue;
    }
    
    const priceAtAnalysis = history.priceAtAnalysis / 100;
    const analysisDate = new Date(history.createdAt);
    const monthKey = `${analysisDate.getFullYear()}-${String(analysisDate.getMonth() + 1).padStart(2, '0')}`;
    
    // 獲取對應時間範圍後的股價
    let priceAfter: number | null = null;
    let isAccurate: boolean | null = null;
    
    if (timeRange === 7) {
      priceAfter = await getStockPriceAfterDays(history.symbol, analysisDate, 7);
      isAccurate = priceAfter
        ? isRecommendationAccurate(history.recommendation, priceAtAnalysis, priceAfter)
        : null;
    } else if (timeRange === 30) {
      priceAfter = await getStockPriceAfterDays(history.symbol, analysisDate, 30);
      isAccurate = priceAfter
        ? isRecommendationAccurate(history.recommendation, priceAtAnalysis, priceAfter)
        : null;
    } else if (timeRange === 90) {
      priceAfter = await getStockPriceAfterDays(history.symbol, analysisDate, 90);
      isAccurate = priceAfter
        ? isRecommendationAccurate(history.recommendation, priceAtAnalysis, priceAfter)
        : null;
    }
    
    const record: AccuracyRecord = {
      id: history.id,
      symbol: history.symbol,
      analysisDate,
      recommendation: history.recommendation,
      priceAtAnalysis,
      priceAfter7Days: timeRange === 7 ? priceAfter : null,
      priceAfter30Days: timeRange === 30 ? priceAfter : null,
      priceAfter90Days: timeRange === 90 ? priceAfter : null,
      isAccurate7Days: timeRange === 7 ? isAccurate : null,
      isAccurate30Days: timeRange === 30 ? isAccurate : null,
      isAccurate90Days: timeRange === 90 ? isAccurate : null,
    };
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, []);
    }
    monthlyData.get(monthKey)!.push(record);
  }
  
  // 計算整體趨勢
  const overallTrend: TrendDataPoint[] = [];
  const sortedMonths = Array.from(monthlyData.keys()).sort();
  
  for (const month of sortedMonths) {
    const records = monthlyData.get(month)!;
    const validRecords = records.filter(r => {
      if (timeRange === 7) return r.isAccurate7Days !== null;
      if (timeRange === 30) return r.isAccurate30Days !== null;
      return r.isAccurate90Days !== null;
    });
    
    const accurateRecords = validRecords.filter(r => {
      if (timeRange === 7) return r.isAccurate7Days === true;
      if (timeRange === 30) return r.isAccurate30Days === true;
      return r.isAccurate90Days === true;
    });
    
    overallTrend.push({
      month,
      total: validRecords.length,
      accurate: accurateRecords.length,
      accuracyRate: validRecords.length > 0 ? accurateRecords.length / validRecords.length : 0,
    });
  }
  
  // 計算按建議類型的趨勢
  const byRecommendation: AccuracyTrend['byRecommendation'] = {
    買入: [],
    持有: [],
    賣出: [],
  };
  
  for (const month of sortedMonths) {
    const records = monthlyData.get(month)!;
    
    for (const recType of ['買入', '持有', '賣出'] as const) {
      const typeRecords = records.filter(r => r.recommendation === recType);
      const validRecords = typeRecords.filter(r => {
        if (timeRange === 7) return r.isAccurate7Days !== null;
        if (timeRange === 30) return r.isAccurate30Days !== null;
        return r.isAccurate90Days !== null;
      });
      
      const accurateRecords = validRecords.filter(r => {
        if (timeRange === 7) return r.isAccurate7Days === true;
        if (timeRange === 30) return r.isAccurate30Days === true;
        return r.isAccurate90Days === true;
      });
      
      byRecommendation[recType].push({
        month,
        total: validRecords.length,
        accurate: accurateRecords.length,
        accuracyRate: validRecords.length > 0 ? accurateRecords.length / validRecords.length : 0,
      });
    }
  }
  
  return {
    overall: overallTrend,
    byRecommendation,
  };
}

/**
 * 個股分析案例
 */
export interface AnalysisCase {
  id: number;
  date: Date;
  recommendation: string;
  priceAtAnalysis: number;
  priceAfter30Days: number | null;
  priceChange: number | null; // 價格變化百分比
  isAccurate: boolean | null;
  profit: number | null; // 假設投資 $10000 的獲利/虧損
}

/**
 * 個股深度分析報告
 */
export interface StockAnalysisReport {
  symbol: string;
  totalAnalyses: number;
  recommendationCounts: {
    買入: number;
    持有: number;
    賣出: number;
  };
  accuracyRates: {
    overall: number;
    買入: number;
    持有: number;
    賣出: number;
  };
  bestCase: AnalysisCase | null; // 最佳預測案例（準確且獲利最高）
  worstCase: AnalysisCase | null; // 最差預測案例（不準確且損失最大）
  recentCases: AnalysisCase[]; // 最近 10 次分析
}

/**
 * 生成個股深度分析報告
 * @param symbol 股票代號
 */
export async function generateStockAnalysisReport(symbol: string): Promise<StockAnalysisReport> {
  // 獲取該股票的所有歷史分析記錄
  const history = await db.getAnalysisHistory(symbol, 'investment_analysis', 1000);
  
  if (history.length === 0) {
    return {
      symbol,
      totalAnalyses: 0,
      recommendationCounts: { 買入: 0, 持有: 0, 賣出: 0 },
      accuracyRates: { overall: 0, 買入: 0, 持有: 0, 賣出: 0 },
      bestCase: null,
      worstCase: null,
      recentCases: [],
    };
  }
  
  // 處理每條歷史記錄
  const cases: AnalysisCase[] = [];
  
  for (const h of history) {
    if (!h.recommendation || !h.priceAtAnalysis) continue;
    
    const priceAtAnalysis = h.priceAtAnalysis / 100;
    const analysisDate = new Date(h.createdAt);
    
    // 獲取 30 天後的股價
    const priceAfter30Days = await getStockPriceAfterDays(symbol, analysisDate, 30);
    
    let priceChange: number | null = null;
    let isAccurate: boolean | null = null;
    let profit: number | null = null;
    
    if (priceAfter30Days) {
      priceChange = (priceAfter30Days - priceAtAnalysis) / priceAtAnalysis;
      isAccurate = isRecommendationAccurate(h.recommendation, priceAtAnalysis, priceAfter30Days);
      
      // 計算假設投資 $10000 的獲利/虧損
      if (h.recommendation === '買入') {
        // 買入：獲利 = 價格變化 * 投資金額
        profit = priceChange * 10000;
      } else if (h.recommendation === '賣出') {
        // 賣出：獲利 = -價格變化 * 投資金額（做空）
        profit = -priceChange * 10000;
      } else {
        // 持有：不計算獲利
        profit = 0;
      }
    }
    
    cases.push({
      id: h.id,
      date: analysisDate,
      recommendation: h.recommendation,
      priceAtAnalysis,
      priceAfter30Days,
      priceChange,
      isAccurate,
      profit,
    });
  }
  
  // 計算建議次數統計
  const recommendationCounts = {
    買入: cases.filter(c => c.recommendation === '買入').length,
    持有: cases.filter(c => c.recommendation === '持有').length,
    賣出: cases.filter(c => c.recommendation === '賣出').length,
  };
  
  // 計算準確率統計
  const validCases = cases.filter(c => c.isAccurate !== null);
  const accurateCases = validCases.filter(c => c.isAccurate === true);
  
  const buyValidCases = cases.filter(c => c.recommendation === '買入' && c.isAccurate !== null);
  const buyAccurateCases = buyValidCases.filter(c => c.isAccurate === true);
  
  const holdValidCases = cases.filter(c => c.recommendation === '持有' && c.isAccurate !== null);
  const holdAccurateCases = holdValidCases.filter(c => c.isAccurate === true);
  
  const sellValidCases = cases.filter(c => c.recommendation === '賣出' && c.isAccurate !== null);
  const sellAccurateCases = sellValidCases.filter(c => c.isAccurate === true);
  
  const accuracyRates = {
    overall: validCases.length > 0 ? accurateCases.length / validCases.length : 0,
    買入: buyValidCases.length > 0 ? buyAccurateCases.length / buyValidCases.length : 0,
    持有: holdValidCases.length > 0 ? holdAccurateCases.length / holdValidCases.length : 0,
    賣出: sellValidCases.length > 0 ? sellAccurateCases.length / sellValidCases.length : 0,
  };
  
  // 找出最佳預測案例（準確且獲利最高）
  const accurateAndProfitableCases = cases.filter(c => c.isAccurate === true && c.profit !== null && c.profit > 0);
  const bestCase = accurateAndProfitableCases.length > 0
    ? accurateAndProfitableCases.reduce((best, current) => 
        (current.profit! > best.profit! ? current : best)
      )
    : null;
  
  // 找出最差預測案例（不準確且損失最大）
  const inaccurateAndLosingCases = cases.filter(c => c.isAccurate === false && c.profit !== null && c.profit < 0);
  const worstCase = inaccurateAndLosingCases.length > 0
    ? inaccurateAndLosingCases.reduce((worst, current) => 
        (current.profit! < worst.profit! ? current : worst)
      )
    : null;
  
  // 最近 10 次分析
  const recentCases = cases.slice(0, 10);
  
  return {
    symbol,
    totalAnalyses: cases.length,
    recommendationCounts,
    accuracyRates,
    bestCase,
    worstCase,
    recentCases,
  };
}

/**
 * 低準確率股票警告
 */
export interface LowAccuracyWarning {
  symbol: string;
  totalAnalyses: number;
  accuracyRate: number;
  recommendation: string; // 最近一次建議
}

/**
 * 檢查需要提醒的低準確率股票
 * @param threshold 準確率閾值（預設 0.5，即 50%）
 * @param timeRange 評估時間範圍（7、30、90 天）
 */
export async function checkLowAccuracyStocks(
  threshold: number = 0.5,
  timeRange: 7 | 30 | 90 = 30
): Promise<LowAccuracyWarning[]> {
  const stats = await calculateAccuracyStats();
  const warnings: LowAccuracyWarning[] = [];
  
  for (const [symbol, symbolStats] of Object.entries(stats.bySymbol)) {
    // 根據時間範圍選擇準確率
    let accuracyRate = 0;
    if (timeRange === 7) {
      accuracyRate = symbolStats.accuracyRate7Days;
    } else if (timeRange === 30) {
      accuracyRate = symbolStats.accuracyRate30Days;
    } else {
      accuracyRate = symbolStats.accuracyRate90Days;
    }
    
    // 如果準確率低於閾值且至少有 3 次分析記錄
    if (accuracyRate < threshold && symbolStats.total >= 3) {
      // 獲取最近一次分析建議
      const history = await db.getAnalysisHistory(symbol, 'investment_analysis', 1);
      const latestRecommendation = history.length > 0 ? history[0].recommendation : null;
      
      warnings.push({
        symbol,
        totalAnalyses: symbolStats.total,
        accuracyRate,
        recommendation: latestRecommendation || '未知',
      });
    }
  }
  
  // 按準確率從低到高排序
  warnings.sort((a, b) => a.accuracyRate - b.accuracyRate);
  
  return warnings;
}

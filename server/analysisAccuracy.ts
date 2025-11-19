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

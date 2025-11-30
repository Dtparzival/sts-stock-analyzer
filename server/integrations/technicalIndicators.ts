/**
 * 技術指標計算模組
 * 提供 MA、RSI、MACD、KD 等技術指標的計算函數
 * 所有價格和指標值使用整數儲存（以分或萬分之一為單位）
 */

/**
 * 價格資料介面
 */
export interface PriceData {
  date: Date;
  open: number; // 開盤價（以分為單位）
  high: number; // 最高價
  low: number; // 最低價
  close: number; // 收盤價
  volume: number; // 成交量
}

/**
 * 技術指標結果介面
 */
export interface TechnicalIndicators {
  date: Date;
  ma5?: number; // 5 日均線（以分為單位）
  ma10?: number; // 10 日均線
  ma20?: number; // 20 日均線
  ma60?: number; // 60 日均線
  rsi14?: number; // 14 日 RSI（以萬分之一為單位）
  macd?: number; // MACD 值（以分為單位）
  macdSignal?: number; // MACD 信號線
  macdHistogram?: number; // MACD 柱狀圖
  kValue?: number; // KD 指標 K 值（以萬分之一為單位）
  dValue?: number; // KD 指標 D 值
}

/**
 * 計算簡單移動平均線（SMA）
 * @param prices 價格陣列（收盤價）
 * @param period 週期
 * @returns 移動平均值（以分為單位）
 */
export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null;
  }

  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return Math.round(sum / period);
}

/**
 * 計算多個週期的移動平均線
 * @param priceData 價格資料陣列
 * @returns 包含 MA5、MA10、MA20、MA60 的陣列
 */
export function calculateMovingAverages(priceData: PriceData[]): TechnicalIndicators[] {
  const result: TechnicalIndicators[] = [];

  for (let i = 0; i < priceData.length; i++) {
    const closePrices = priceData.slice(0, i + 1).map((d) => d.close);

    result.push({
      date: priceData[i].date,
      ma5: calculateSMA(closePrices, 5),
      ma10: calculateSMA(closePrices, 10),
      ma20: calculateSMA(closePrices, 20),
      ma60: calculateSMA(closePrices, 60),
    });
  }

  return result;
}

/**
 * 計算 RSI（相對強弱指標）
 * @param priceData 價格資料陣列
 * @param period 週期（預設 14）
 * @returns RSI 值（以萬分之一為單位，例如 70.5 存為 705000）
 */
export function calculateRSI(priceData: PriceData[], period = 14): TechnicalIndicators[] {
  const result: TechnicalIndicators[] = [];

  // 需要至少 period + 1 個資料點才能計算 RSI
  if (priceData.length <= period) {
    return result;
  }

  // 計算價格變化
  const changes: number[] = [];
  for (let i = 1; i < priceData.length; i++) {
    changes.push(priceData[i].close - priceData[i - 1].close);
  }

  // 計算平均漲幅和平均跌幅
  let avgGain = 0;
  let avgLoss = 0;

  // 初始平均值（使用簡單平均）
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  // 計算 RSI
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];

    // 使用指數移動平均更新平均漲幅和平均跌幅
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    result.push({
      date: priceData[i + 1].date,
      rsi14: Math.round(rsi * 10000), // 轉換為萬分之一單位
    });
  }

  return result;
}

/**
 * 計算 EMA（指數移動平均線）
 * @param prices 價格陣列
 * @param period 週期
 * @returns EMA 值陣列
 */
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // 第一個 EMA 值使用 SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);

  // 後續 EMA 值使用公式：EMA = (Close - EMA(前一日)) × 乘數 + EMA(前一日)
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(currentEMA);
  }

  return ema;
}

/**
 * 計算 MACD（指數平滑異同移動平均線）
 * @param priceData 價格資料陣列
 * @param fastPeriod 快速 EMA 週期（預設 12）
 * @param slowPeriod 慢速 EMA 週期（預設 26）
 * @param signalPeriod 信號線週期（預設 9）
 * @returns MACD 指標陣列
 */
export function calculateMACD(
  priceData: PriceData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): TechnicalIndicators[] {
  const result: TechnicalIndicators[] = [];

  if (priceData.length < slowPeriod) {
    return result;
  }

  const closePrices = priceData.map((d) => d.close);

  // 計算快速和慢速 EMA
  const fastEMA = calculateEMA(closePrices, fastPeriod);
  const slowEMA = calculateEMA(closePrices, slowPeriod);

  // 計算 MACD 線（快速 EMA - 慢速 EMA）
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + (fastPeriod - slowPeriod)] - slowEMA[i]);
  }

  // 計算信號線（MACD 的 EMA）
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // 計算 MACD 柱狀圖（MACD 線 - 信號線）
  for (let i = 0; i < signalLine.length; i++) {
    const macdIndex = i + (signalPeriod - 1);
    const priceIndex = slowPeriod - 1 + macdIndex;
    const histogram = macdLine[macdIndex] - signalLine[i];

    if (priceIndex < priceData.length) {
      result.push({
        date: priceData[priceIndex].date,
        macd: Math.round(macdLine[macdIndex]),
        macdSignal: Math.round(signalLine[i]),
        macdHistogram: Math.round(histogram),
      });
    }
  }

  return result;
}

/**
 * 計算 KD 指標（隨機指標）
 * @param priceData 價格資料陣列
 * @param period K 值週期（預設 9）
 * @param kSmooth K 值平滑週期（預設 3）
 * @param dSmooth D 值平滑週期（預設 3）
 * @returns KD 指標陣列
 */
export function calculateKD(
  priceData: PriceData[],
  period = 9,
  kSmooth = 3,
  dSmooth = 3
): TechnicalIndicators[] {
  const result: TechnicalIndicators[] = [];

  if (priceData.length < period) {
    return result;
  }

  // 計算 RSV（未成熟隨機值）
  const rsv: number[] = [];
  for (let i = period - 1; i < priceData.length; i++) {
    const recentData = priceData.slice(i - period + 1, i + 1);
    const highest = Math.max(...recentData.map((d) => d.high));
    const lowest = Math.min(...recentData.map((d) => d.low));
    const close = priceData[i].close;

    const rsvValue = lowest === highest ? 50 : ((close - lowest) / (highest - lowest)) * 100;
    rsv.push(rsvValue);
  }

  // 計算 K 值（RSV 的 SMA）
  const kValues: number[] = [];
  for (let i = 0; i < rsv.length; i++) {
    if (i < kSmooth - 1) {
      // 初始 K 值使用 RSV
      kValues.push(rsv[i]);
    } else {
      // K 值 = (2/3) × 前一日 K 值 + (1/3) × 當日 RSV
      const prevK = kValues[kValues.length - 1];
      const currentK = (prevK * 2 + rsv[i]) / 3;
      kValues.push(currentK);
    }
  }

  // 計算 D 值（K 值的 SMA）
  const dValues: number[] = [];
  for (let i = 0; i < kValues.length; i++) {
    if (i < dSmooth - 1) {
      // 初始 D 值使用 K 值
      dValues.push(kValues[i]);
    } else {
      // D 值 = (2/3) × 前一日 D 值 + (1/3) × 當日 K 值
      const prevD = dValues[dValues.length - 1];
      const currentD = (prevD * 2 + kValues[i]) / 3;
      dValues.push(currentD);
    }
  }

  // 組合結果
  for (let i = 0; i < kValues.length; i++) {
    result.push({
      date: priceData[period - 1 + i].date,
      kValue: Math.round(kValues[i] * 10000), // 轉換為萬分之一單位
      dValue: Math.round(dValues[i] * 10000),
    });
  }

  return result;
}

/**
 * 計算所有技術指標
 * @param priceData 價格資料陣列
 * @returns 包含所有技術指標的陣列
 */
export function calculateAllIndicators(priceData: PriceData[]): TechnicalIndicators[] {
  if (priceData.length === 0) {
    return [];
  }

  // 計算各項指標
  const maData = calculateMovingAverages(priceData);
  const rsiData = calculateRSI(priceData);
  const macdData = calculateMACD(priceData);
  const kdData = calculateKD(priceData);

  // 合併所有指標到同一個陣列
  const result: TechnicalIndicators[] = [];

  for (let i = 0; i < priceData.length; i++) {
    const date = priceData[i].date;

    result.push({
      date,
      ma5: maData[i]?.ma5,
      ma10: maData[i]?.ma10,
      ma20: maData[i]?.ma20,
      ma60: maData[i]?.ma60,
      rsi14: rsiData.find((d) => d.date.getTime() === date.getTime())?.rsi14,
      macd: macdData.find((d) => d.date.getTime() === date.getTime())?.macd,
      macdSignal: macdData.find((d) => d.date.getTime() === date.getTime())?.macdSignal,
      macdHistogram: macdData.find((d) => d.date.getTime() === date.getTime())?.macdHistogram,
      kValue: kdData.find((d) => d.date.getTime() === date.getTime())?.kValue,
      dValue: kdData.find((d) => d.date.getTime() === date.getTime())?.dValue,
    });
  }

  return result;
}

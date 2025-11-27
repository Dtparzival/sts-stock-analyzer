/**
 * 匯率服務模組
 * 使用 ExchangeRate-API 獲取即時匯率數據
 */

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

// 匯率緩存（記憶體緩存，避免頻繁請求 API）
const rateCache: Map<string, ExchangeRateCache> = new Map();

// 緩存有效期：1 小時（3600000 毫秒）
const CACHE_DURATION = 3600000;

/**
 * 獲取 USD 到 TWD 的匯率
 * @returns USD 到 TWD 的匯率
 */
export async function getUSDToTWDRate(): Promise<number> {
  const cacheKey = 'USD_TWD';
  
  // 檢查緩存
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[ExchangeRate] Using cached rate:', cached.rate);
    return cached.rate;
  }
  
  try {
    // 使用 ExchangeRate-API 的免費 endpoint
    // 文檔：https://www.exchangerate-api.com/docs/free
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error('API returned error result');
    }
    
    const rate = data.rates.TWD;
    
    if (!rate || typeof rate !== 'number') {
      throw new Error('Invalid rate data received');
    }
    
    // 更新緩存
    rateCache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
    });
    
    console.log('[ExchangeRate] Fetched new rate:', rate);
    return rate;
    
  } catch (error) {
    console.error('[ExchangeRate] Failed to fetch rate:', error);
    
    // 如果有舊緩存，即使過期也使用
    if (cached) {
      console.log('[ExchangeRate] Using expired cache as fallback:', cached.rate);
      return cached.rate;
    }
    
    // 最後的備用方案：使用固定匯率
    const fallbackRate = 31.5;
    console.log('[ExchangeRate] Using fallback rate:', fallbackRate);
    return fallbackRate;
  }
}

/**
 * 獲取匯率更新時間
 * @returns 匯率最後更新的時間戳（毫秒）
 */
export function getExchangeRateUpdateTime(): number | null {
  const cached = rateCache.get('USD_TWD');
  return cached ? cached.timestamp : null;
}

/**
 * 清除匯率緩存（用於測試或強制刷新）
 */
export function clearExchangeRateCache(): void {
  rateCache.clear();
  console.log('[ExchangeRate] Cache cleared');
}

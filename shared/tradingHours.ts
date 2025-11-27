/**
 * 台股和美股交易時間判斷工具
 */

export type Market = 'US' | 'TW';

/**
 * 判斷當前是否在台股交易時間內
 * 台股交易時間：週一至週五 09:00-13:30 (台北時間 UTC+8)
 */
export function isTWMarketOpen(): boolean {
  const now = new Date();
  
  // 轉換為台北時間 (UTC+8)
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  
  // 檢查是否為週末
  const day = taipeiTime.getDay();
  if (day === 0 || day === 6) {
    return false; // 週末不交易
  }
  
  // 檢查時間是否在 09:00-13:30 之間
  const hours = taipeiTime.getHours();
  const minutes = taipeiTime.getMinutes();
  const currentTime = hours * 60 + minutes; // 轉換為分鐘
  
  const marketOpen = 9 * 60; // 09:00
  const marketClose = 13 * 60 + 30; // 13:30
  
  return currentTime >= marketOpen && currentTime <= marketClose;
}

/**
 * 判斷當前是否在美股交易時間內
 * 美股交易時間：週一至週五 09:30-16:00 (美東時間 EST/EDT)
 */
export function isUSMarketOpen(): boolean {
  const now = new Date();
  
  // 轉換為美東時間
  const usTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // 檢查是否為週末
  const day = usTime.getDay();
  if (day === 0 || day === 6) {
    return false; // 週末不交易
  }
  
  // 檢查時間是否在 09:30-16:00 之間
  const hours = usTime.getHours();
  const minutes = usTime.getMinutes();
  const currentTime = hours * 60 + minutes; // 轉換為分鐘
  
  const marketOpen = 9 * 60 + 30; // 09:30
  const marketClose = 16 * 60; // 16:00
  
  return currentTime >= marketOpen && currentTime <= marketClose;
}

/**
 * 根據市場判斷是否在交易時間內
 */
export function isMarketOpen(market: Market): boolean {
  return market === 'TW' ? isTWMarketOpen() : isUSMarketOpen();
}

/**
 * 獲取下次市場開盤時間的文字描述
 */
export function getNextMarketOpenTime(market: Market): string {
  if (market === 'TW') {
    return '台股交易時間：週一至週五 09:00-13:30 (台北時間)';
  } else {
    return '美股交易時間：週一至週五 09:30-16:00 (美東時間)';
  }
}

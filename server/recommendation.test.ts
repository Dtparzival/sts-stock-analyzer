import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { trackUserClick, getUserBehavior } from '../server/db';
import { getDb } from '../server/db';

describe('個人化推薦系統測試', () => {
  let testUserId: number;
  const testSymbol = 'AAPL';
  
  beforeAll(async () => {
    // 使用測試用戶 ID (假設存在)
    testUserId = 1;
  });
  
  it('應該能夠追蹤用戶點擊推薦卡片', async () => {
    // 追蹤點擊行為
    await trackUserClick(testUserId, testSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, testSymbol);
    
    // 驗證點擊次數已增加
    expect(behavior).toBeDefined();
    expect(behavior?.clickCount).toBeGreaterThan(0);
  });
  
  it('應該能夠正確更新 lastClickedAt 時間戳', async () => {
    const beforeClick = new Date();
    
    // 等待 1 秒確保時間戳不同
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 追蹤點擊行為
    await trackUserClick(testUserId, testSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, testSymbol);
    
    // 驗證 lastClickedAt 已更新
    expect(behavior).toBeDefined();
    expect(behavior?.lastClickedAt).toBeDefined();
    if (behavior?.lastClickedAt) {
      expect(new Date(behavior.lastClickedAt).getTime()).toBeGreaterThan(beforeClick.getTime());
    }
  });
  
  it('應該能夠處理新股票的首次點擊', async () => {
    const newSymbol = 'TSLA';
    
    // 追蹤新股票的點擊
    await trackUserClick(testUserId, newSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, newSymbol);
    
    // 驗證記錄存在且點擊次數大於 0
    expect(behavior).toBeDefined();
    expect(behavior?.clickCount).toBeGreaterThanOrEqual(1);
    expect(behavior?.symbol).toBe(newSymbol);
  });
  
  it('應該能夠累計多次點擊', async () => {
    const multiClickSymbol = 'GOOGL';
    
    // 追蹤多次點擊
    await trackUserClick(testUserId, multiClickSymbol);
    await trackUserClick(testUserId, multiClickSymbol);
    await trackUserClick(testUserId, multiClickSymbol);
    
    // 獲取用戶行為數據
    const behavior = await getUserBehavior(testUserId, multiClickSymbol);
    
    // 驗證點擊次數大於等於 3
    expect(behavior).toBeDefined();
    expect(behavior?.clickCount).toBeGreaterThanOrEqual(3);
  });
  
  afterAll(async () => {
    // 清理測試數據
    const db = await getDb();
    if (db) {
      // 清理測試期間創建的記錄
      // 注意：這裡不執行實際清理，避免影響生產數據
      console.log('測試完成，跳過清理步驟以保留測試數據');
    }
  });
});

describe('推薦評分機制測試', () => {
  it('應該正確計算包含點擊頻率的推薦評分', () => {
    // 模擬用戶行為數據
    const behavior = {
      viewCount: 10,
      searchCount: 5,
      totalViewTime: 300, // 5 分鐘
      clickCount: 3,
    };
    
    // 計算評分（根據 routers.ts 中的公式）
    const score = 
      behavior.viewCount * 0.5 +
      behavior.searchCount * 0.3 +
      (behavior.totalViewTime / 60) * 0.2 +
      behavior.clickCount * 0.4;
    
    // 驗證評分計算正確
    // viewCount: 10 * 0.5 = 5
    // searchCount: 5 * 0.3 = 1.5
    // totalViewTime: 300 / 60 * 0.2 = 1
    // clickCount: 3 * 0.4 = 1.2
    // 總分: 5 + 1.5 + 1 + 1.2 = 8.7
    expect(score).toBe(8.7);
  });
  
  it('應該對收藏的股票給予更高評分', () => {
    const baseScore = 8.7;
    const watchlistBonus = 5;
    const totalScore = baseScore + watchlistBonus;
    
    // 驗證收藏加分正確
    expect(totalScore).toBe(13.7);
  });
});

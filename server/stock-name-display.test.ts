import { describe, it, expect } from 'vitest';

/**
 * 股票名稱顯示邏輯測試
 * 
 * 測試「為您推薦」區塊中股票卡片的名稱顯示邏輯：
 * 1. 載入中：顯示骨架屏
 * 2. 有名稱：顯示股票名稱
 * 3. 無名稱：顯示股票代碼作為後備
 */

describe('股票名稱顯示邏輯', () => {
  describe('顯示狀態判斷', () => {
    it('應該在載入中時返回 "loading" 狀態', () => {
      const isLoading = true;
      const displayName = null;
      const displaySymbol = 'AAPL';
      
      const state = getDisplayState(isLoading, displayName, displaySymbol);
      
      expect(state).toBe('loading');
    });
    
    it('應該在有名稱時返回 "hasName" 狀態', () => {
      const isLoading = false;
      const displayName = 'Apple Inc.';
      const displaySymbol = 'AAPL';
      
      const state = getDisplayState(isLoading, displayName, displaySymbol);
      
      expect(state).toBe('hasName');
    });
    
    it('應該在無名稱時返回 "fallback" 狀態', () => {
      const isLoading = false;
      const displayName = null;
      const displaySymbol = 'AAPL';
      
      const state = getDisplayState(isLoading, displayName, displaySymbol);
      
      expect(state).toBe('fallback');
    });
  });
  
  describe('名稱內容生成', () => {
    it('應該在載入中時返回 null（顯示骨架屏）', () => {
      const isLoading = true;
      const displayName = null;
      const displaySymbol = 'AAPL';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBeNull();
    });
    
    it('應該在有名稱時返回股票名稱', () => {
      const isLoading = false;
      const displayName = 'Apple Inc.';
      const displaySymbol = 'AAPL';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBe('Apple Inc.');
    });
    
    it('應該在無名稱時返回股票代碼', () => {
      const isLoading = false;
      const displayName = null;
      const displaySymbol = 'AAPL';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBe('AAPL');
    });
    
    it('應該在空字串名稱時返回股票代碼', () => {
      const isLoading = false;
      const displayName = '';
      const displaySymbol = 'AAPL';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBe('AAPL');
    });
  });
  
  describe('台股名稱處理', () => {
    it('應該正確顯示台股名稱', () => {
      const isLoading = false;
      const displayName = '台積電';
      const displaySymbol = '2330';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBe('台積電');
    });
    
    it('應該在台股無名稱時返回股票代碼', () => {
      const isLoading = false;
      const displayName = null;
      const displaySymbol = '2330';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBe('2330');
    });
  });
  
  describe('邊界情況', () => {
    it('應該處理 undefined 名稱', () => {
      const isLoading = false;
      const displayName = undefined;
      const displaySymbol = 'AAPL';
      
      const content = getDisplayContent(isLoading, displayName as any, displaySymbol);
      
      expect(content).toBe('AAPL');
    });
    
    it('應該處理只包含空格的名稱', () => {
      const isLoading = false;
      const displayName = '   ';
      const displaySymbol = 'AAPL';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBe('AAPL');
    });
    
    it('應該處理超長名稱（應由 CSS line-clamp 處理截斷）', () => {
      const isLoading = false;
      const displayName = 'A Very Long Company Name That Should Be Truncated By CSS Line Clamp Property';
      const displaySymbol = 'AAPL';
      
      const content = getDisplayContent(isLoading, displayName, displaySymbol);
      
      expect(content).toBe(displayName);
      expect(content.length).toBeGreaterThan(50);
    });
  });
});

/**
 * 輔助函數：判斷顯示狀態
 */
function getDisplayState(
  isLoading: boolean,
  displayName: string | null | undefined,
  displaySymbol: string
): 'loading' | 'hasName' | 'fallback' {
  if (isLoading) {
    return 'loading';
  }
  
  if (displayName && displayName.trim()) {
    return 'hasName';
  }
  
  return 'fallback';
}

/**
 * 輔助函數：獲取顯示內容
 */
function getDisplayContent(
  isLoading: boolean,
  displayName: string | null | undefined,
  displaySymbol: string
): string | null {
  if (isLoading) {
    return null; // 顯示骨架屏
  }
  
  if (displayName && displayName.trim()) {
    return displayName;
  }
  
  return displaySymbol; // 後備方案
}

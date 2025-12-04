import { useState, useEffect, useCallback } from 'react';

export interface SearchHistoryItem {
  id: string;
  symbol: string;
  name: string;
  market: 'tw' | 'us';
  timestamp: number;
}

const STORAGE_KEY = 'stock_search_history';
const MAX_HISTORY_ITEMS = 10;

// 預設熱門搜尋清單
export const POPULAR_SEARCHES: SearchHistoryItem[] = [
  { id: 'pop-1', symbol: 'AAPL', name: 'Apple Inc.', market: 'us', timestamp: 0 },
  { id: 'pop-2', symbol: 'MSFT', name: 'Microsoft Corporation', market: 'us', timestamp: 0 },
  { id: 'pop-3', symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'us', timestamp: 0 },
  { id: 'pop-4', symbol: 'TSLA', name: 'Tesla, Inc.', market: 'us', timestamp: 0 },
  { id: 'pop-5', symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'us', timestamp: 0 },
  { id: 'pop-6', symbol: '2330', name: '台積電', market: 'tw', timestamp: 0 },
  { id: 'pop-7', symbol: '2317', name: '鴻海', market: 'tw', timestamp: 0 },
  { id: 'pop-8', symbol: '2454', name: '聯發科', market: 'tw', timestamp: 0 },
];

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 載入搜尋歷史
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  // 儲存搜尋歷史
  const saveHistory = useCallback((items: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setHistory(items);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, []);

  // 新增搜尋記錄
  const addSearchItem = useCallback((item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: SearchHistoryItem = {
      ...item,
      id: `${item.market}-${item.symbol}-${Date.now()}`,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // 移除重複項目（相同 symbol 和 market）
      const filtered = prev.filter(
        h => !(h.symbol === newItem.symbol && h.market === newItem.market)
      );
      
      // 新增到最前面，並限制數量
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      
      // 儲存到 localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
      
      return updated;
    });
  }, []);

  // 刪除單筆記錄
  const removeSearchItem = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // 清除所有記錄
  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  return {
    history,
    addSearchItem,
    removeSearchItem,
    clearHistory,
    popularSearches: POPULAR_SEARCHES,
  };
}

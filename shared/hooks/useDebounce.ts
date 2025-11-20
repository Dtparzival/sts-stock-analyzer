import { useEffect, useState } from 'react';

/**
 * useDebounce Hook
 * 延遲更新值，避免頻繁觸發操作
 * 
 * @param value 要防抖的值
 * @param delay 延遲時間（毫秒），默認 300ms
 * @returns 防抖後的值
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 設定定時器，延遲更新值
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函數：當 value 或 delay 變化時，清除上一個定時器
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

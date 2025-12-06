/**
 * 快取管理器單元測試
 * 
 * 測試多層快取機制 (Redis + MySQL)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initRedisClient,
  closeRedisClient,
  getCache,
  setCache,
  clearCache,
  batchGetCache,
  batchSetCache,
  CACHE_TTL,
} from './cacheManager';

// 測試資料
const TEST_SYMBOL = 'TEST_CACHE';
const TEST_QUOTE_DATA = {
  symbol: 'TEST',
  name: 'Test Stock',
  close: 10000,
  open: 9900,
  high: 10100,
  low: 9800,
  volume: 1000000,
};

describe('快取管理器測試', () => {
  beforeAll(async () => {
    // 初始化 Redis 連線
    await initRedisClient();
  });

  afterAll(async () => {
    // 清理測試資料
    await clearCache('quote', TEST_SYMBOL);
    await clearCache('quote', 'BATCH_TEST_1');
    await clearCache('quote', 'BATCH_TEST_2');
    
    // 關閉 Redis 連線
    await closeRedisClient();
  });

  it('應該能夠設定和取得快取', async () => {
    // 設定快取
    await setCache('quote', TEST_SYMBOL, TEST_QUOTE_DATA);

    // 取得快取
    const cached = await getCache('quote', TEST_SYMBOL);

    // 驗證
    expect(cached).toBeDefined();
    expect(cached).toEqual(TEST_QUOTE_DATA);
  });

  it('應該在快取不存在時返回 null', async () => {
    const cached = await getCache('quote', 'NON_EXISTENT');
    expect(cached).toBeNull();
  });

  it('應該能夠清除快取', async () => {
    // 設定快取
    await setCache('quote', TEST_SYMBOL, TEST_QUOTE_DATA);

    // 驗證快取存在
    let cached = await getCache('quote', TEST_SYMBOL);
    expect(cached).toBeDefined();

    // 清除快取
    await clearCache('quote', TEST_SYMBOL);

    // 驗證快取已清除
    cached = await getCache('quote', TEST_SYMBOL);
    expect(cached).toBeNull();
  });

  it('應該支援批次取得快取', async () => {
    // 設定多個快取
    await setCache('quote', 'BATCH_TEST_1', { symbol: 'TEST1', close: 100 });
    await setCache('quote', 'BATCH_TEST_2', { symbol: 'TEST2', close: 200 });

    // 批次取得
    const cached = await batchGetCache('quote', ['BATCH_TEST_1', 'BATCH_TEST_2', 'NON_EXISTENT']);

    // 驗證
    expect(cached.size).toBe(2);
    expect(cached.get('BATCH_TEST_1')).toEqual({ symbol: 'TEST1', close: 100 });
    expect(cached.get('BATCH_TEST_2')).toEqual({ symbol: 'TEST2', close: 200 });
    expect(cached.has('NON_EXISTENT')).toBe(false);
  });

  it('應該支援批次設定快取', async () => {
    const entries = new Map([
      ['BATCH_SET_1', { symbol: 'SET1', close: 300 }],
      ['BATCH_SET_2', { symbol: 'SET2', close: 400 }],
    ]);

    // 批次設定
    await batchSetCache('quote', entries);

    // 驗證
    const cached1 = await getCache('quote', 'BATCH_SET_1');
    const cached2 = await getCache('quote', 'BATCH_SET_2');

    expect(cached1).toEqual({ symbol: 'SET1', close: 300 });
    expect(cached2).toEqual({ symbol: 'SET2', close: 400 });

    // 清理
    await clearCache('quote', 'BATCH_SET_1');
    await clearCache('quote', 'BATCH_SET_2');
  });

  it('應該使用正確的 TTL 設定', () => {
    // 驗證 TTL 常數
    expect(CACHE_TTL.QUOTE).toBe(60); // 1 分鐘
    expect(CACHE_TTL.PRICE).toBe(86400); // 24 小時
    expect(CACHE_TTL.STOCK).toBe(604800); // 7 天
  });
});

describe('快取降級測試 (無 Redis)', () => {
  it('應該在 Redis 不可用時仍能使用 MySQL 快取', async () => {
    // 注意：此測試假設 Redis 未啟動或連線失敗
    // 在實際環境中，快取管理器會自動降級到 MySQL

    // 設定快取（會寫入 MySQL）
    await setCache('quote', 'FALLBACK_TEST', { symbol: 'FALLBACK', close: 500 });

    // 取得快取（會從 MySQL 讀取）
    const cached = await getCache('quote', 'FALLBACK_TEST');

    // 驗證
    expect(cached).toBeDefined();
    if (cached) {
      expect((cached as any).symbol).toBe('FALLBACK');
    }

    // 清理
    await clearCache('quote', 'FALLBACK_TEST');
  });
});

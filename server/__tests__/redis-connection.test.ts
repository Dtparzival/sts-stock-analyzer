import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  getRedisClient, 
  getCachedData, 
  setCachedData, 
  deleteCachedData,
  closeRedis 
} from '../redis';

describe('Redis 連線驗證測試', () => {
  beforeAll(async () => {
    // 確保 Redis 客戶端已初始化
    const client = getRedisClient();
    if (client) {
      // 等待連線建立
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  afterAll(async () => {
    // 清理測試資料
    await deleteCachedData('test:redis:connection');
    await closeRedis();
  });

  it('應該成功建立 Redis 連線', () => {
    const client = getRedisClient();
    expect(client).not.toBeNull();
  });

  it('應該能夠設定快取資料', async () => {
    const testData = { message: 'Hello Redis', timestamp: Date.now() };
    const success = await setCachedData('test:redis:connection', testData, 60);
    
    expect(success).toBe(true);
  });

  it('應該能夠讀取快取資料', async () => {
    const testData = { message: 'Hello Redis', timestamp: Date.now() };
    
    // 先設定快取
    await setCachedData('test:redis:connection', testData, 60);
    
    // 讀取快取
    const cachedData = await getCachedData<typeof testData>('test:redis:connection');
    
    expect(cachedData).not.toBeNull();
    expect(cachedData?.message).toBe('Hello Redis');
  });

  it('應該能夠刪除快取資料', async () => {
    const testData = { message: 'Hello Redis', timestamp: Date.now() };
    
    // 先設定快取
    await setCachedData('test:redis:connection', testData, 60);
    
    // 刪除快取
    const success = await deleteCachedData('test:redis:connection');
    expect(success).toBe(true);
    
    // 確認已刪除
    const cachedData = await getCachedData('test:redis:connection');
    expect(cachedData).toBeNull();
  });

  it('應該能夠處理不存在的快取鍵', async () => {
    const cachedData = await getCachedData('test:redis:nonexistent');
    expect(cachedData).toBeNull();
  });
});

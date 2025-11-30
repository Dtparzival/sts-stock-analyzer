import { describe, it, expect } from 'vitest';
import { getRedisClient } from './redis';

describe('Redis 連線測試', () => {
  it('應該能夠成功連線到 Redis 並執行基本操作', async () => {
    const redis = getRedisClient();
    
    if (!redis) {
      console.log('⚠️  REDIS_URL 未設定，跳過測試');
      return;
    }

    try {
      // 測試基本操作
      await redis.set('test_connection_key', 'test_value', 'EX', 10);
      const value = await redis.get('test_connection_key');
      
      expect(value).toBe('test_value');
      console.log('✅ Redis 連線成功，Set/Get 操作正常');
      
      await redis.del('test_connection_key');
      console.log('✅ Delete 操作正常');
    } catch (error) {
      console.error('❌ Redis 連線失敗:', error);
      throw error;
    }
  }, 15000);

  it('應該能夠設定和讀取 JSON 快取資料', async () => {
    const redis = getRedisClient();
    
    if (!redis) {
      console.log('⚠️  REDIS_URL 未設定，跳過測試');
      return;
    }

    try {
      const testData = { 
        userId: 1, 
        recommendations: ['AAPL', 'GOOGL', 'MSFT'],
        timestamp: new Date().toISOString()
      };
      
      // 設定快取
      await redis.set('test_json_cache', JSON.stringify(testData), 'EX', 300);
      console.log('✅ 成功設定 JSON 快取');
      
      // 讀取快取
      const cached = await redis.get('test_json_cache');
      expect(cached).not.toBeNull();
      
      const parsedData = JSON.parse(cached!);
      expect(parsedData.userId).toBe(1);
      expect(parsedData.recommendations).toHaveLength(3);
      console.log('✅ 成功讀取並解析 JSON 快取');
      
      // 清理
      await redis.del('test_json_cache');
      console.log('✅ 成功清理測試資料');
    } catch (error) {
      console.error('❌ JSON 快取操作失敗:', error);
      throw error;
    }
  }, 15000);

  it('應該能夠正確處理快取過期', async () => {
    const redis = getRedisClient();
    
    if (!redis) {
      console.log('⚠️  REDIS_URL 未設定，跳過測試');
      return;
    }

    try {
      // 設定 1 秒過期的快取
      await redis.set('test_expiry_key', 'expiring_value', 'EX', 1);
      console.log('✅ 設定 1 秒過期的快取');
      
      // 立即讀取應該存在
      const value1 = await redis.get('test_expiry_key');
      expect(value1).toBe('expiring_value');
      console.log('✅ 立即讀取快取成功');
      
      // 等待 2 秒後應該過期
      await new Promise(resolve => setTimeout(resolve, 2000));
      const value2 = await redis.get('test_expiry_key');
      expect(value2).toBeNull();
      console.log('✅ 快取正確過期');
    } catch (error) {
      console.error('❌ 快取過期測試失敗:', error);
      throw error;
    }
  }, 20000);
});

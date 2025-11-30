import { describe, it, expect } from 'vitest';
import Redis from 'ioredis';

const REDIS_URL = 'redis://default:ymbsV39OR6MHwa8AlquZJNYmCin8WDOs@redis-17180.c16.us-east-1-3.ec2.cloud.redislabs.com:17180';

describe('Redis 連線測試', () => {
  it('應該能夠成功連線到 Redis', async () => {
    const redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
    });

    try {
      // 測試基本操作
      await redis.set('test_key', 'test_value', 'EX', 10);
      const value = await redis.get('test_key');
      
      expect(value).toBe('test_value');
      
      await redis.del('test_key');
      redis.disconnect();
    } catch (error) {
      redis.disconnect();
      throw error;
    }
  }, 15000);

  it('應該能夠設定和讀取快取資料', async () => {
    const redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
    });

    try {
      const testData = { userId: 1, recommendations: ['AAPL', 'GOOGL', 'MSFT'] };
      
      // 設定快取
      await redis.set('test_recommendations', JSON.stringify(testData), 'EX', 300);
      
      // 讀取快取
      const cached = await redis.get('test_recommendations');
      expect(cached).not.toBeNull();
      
      const parsedData = JSON.parse(cached!);
      expect(parsedData.userId).toBe(1);
      expect(parsedData.recommendations).toHaveLength(3);
      
      // 清理
      await redis.del('test_recommendations');
      redis.disconnect();
    } catch (error) {
      redis.disconnect();
      throw error;
    }
  }, 15000);
});

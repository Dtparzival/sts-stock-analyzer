import Redis from 'ioredis';

// 測試不同的 Redis URL 格式
const url1 = 'redis://default:ymbsV39OR6MHwa8AlquZJNYmCin8WDOs@redis-17180.c16.us-east-1-3.ec2.cloud.redislabs.com:17180';

console.log('Testing Redis connection with URL format 1...');
const redis1 = new Redis(url1, {
  enableReadyCheck: false,
  lazyConnect: true
});

try {
  await redis1.connect();
  await redis1.set('test', 'value');
  const val = await redis1.get('test');
  console.log('✅ Connection successful! Value:', val);
  await redis1.del('test');
  redis1.disconnect();
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  redis1.disconnect();
}

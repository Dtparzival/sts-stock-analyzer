# Redis 快取配置說明

## 概述

本專案使用 Redis 作為快取層，用於優化推薦系統效能和減少資料庫查詢次數。Redis 快取機制支援**自動降級**，在本地開發環境無 Redis 時，系統會自動切換為無快取模式，不影響功能正常運作。

## 環境變數配置

### 生產環境

在生產環境中，需要配置 `REDIS_URL` 環境變數以啟用 Redis 快取：

```bash
REDIS_URL=redis://username:password@host:port/database
```

**範例**：

```bash
# Redis Cloud (推薦)
REDIS_URL=redis://default:your_password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345

# 本地 Redis
REDIS_URL=redis://localhost:6379

# Redis with TLS
REDIS_URL=rediss://default:your_password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

### 本地開發環境

本地開發環境**不需要**配置 `REDIS_URL`，系統會自動降級為無快取模式：

```bash
# 本地開發環境不需要配置 REDIS_URL
# 系統會自動降級為無快取模式
```

## 快取機制

### 快取內容

1. **推薦結果快取**
   - 快取鍵：`recommendation:user:{userId}`
   - TTL：5 分鐘（300 秒）
   - 用途：減少推薦演算法計算次數

2. **用戶行為快取**
   - 快取鍵模式：`recommendation:user:{userId}*`
   - 用途：當用戶行為更新時，批次刪除相關快取

### 快取失效策略

1. **時間過期（TTL）**
   - 推薦結果快取：5 分鐘後自動過期
   - 確保推薦結果不會過於陳舊

2. **主動失效**
   - 當用戶行為更新時（查看、搜尋、點擊、收藏），自動清除推薦快取
   - 確保推薦結果即時反映用戶最新行為

### 快取降級機制

當 Redis 不可用時（本地開發環境或 Redis 連線失敗），系統會自動降級：

1. **自動偵測**：系統啟動時檢查 `REDIS_URL` 環境變數
2. **降級模式**：如果 Redis 不可用，所有快取操作返回 `null` 或 `false`
3. **功能正常**：推薦系統直接從資料庫查詢，不影響功能運作
4. **效能影響**：無快取模式下，推薦系統回應時間可能增加 200-500ms

## 快取 API

### 取得快取資料

```typescript
import { getCachedData } from './redis';

const data = await getCachedData<YourDataType>('cache:key');
if (data) {
  console.log('快取命中:', data);
} else {
  console.log('快取未命中，需要從資料庫查詢');
}
```

### 設定快取資料

```typescript
import { setCachedData } from './redis';

const success = await setCachedData('cache:key', yourData, 300); // TTL 300 秒
if (success) {
  console.log('快取設定成功');
} else {
  console.log('快取設定失敗（Redis 不可用）');
}
```

### 刪除快取資料

```typescript
import { deleteCachedData, deleteCachedDataByPattern } from './redis';

// 刪除單一快取
await deleteCachedData('cache:key');

// 批次刪除快取（萬用字元）
const deletedCount = await deleteCachedDataByPattern('user:123:*');
console.log(`刪除了 ${deletedCount} 個快取`);
```

### 檢查快取是否存在

```typescript
import { hasCachedData } from './redis';

const exists = await hasCachedData('cache:key');
if (exists) {
  console.log('快取存在');
}
```

## 推薦系統快取整合

推薦系統已整合 Redis 快取，使用流程如下：

1. **查詢推薦**：
   ```typescript
   // 1. 嘗試從 Redis 快取獲取推薦結果
   const cacheKey = getRecommendationCacheKey(userId);
   const cachedRecommendations = await getCachedData(cacheKey);
   
   if (cachedRecommendations) {
     return cachedRecommendations; // 快取命中，直接返回
   }
   
   // 2. 快取未命中，從資料庫計算推薦結果
   const recommendations = await getPersonalizedRecommendations(userId, limit);
   
   // 3. 儲存到 Redis 快取（TTL 5 分鐘）
   await setCachedData(cacheKey, recommendations, 300);
   
   return recommendations;
   ```

2. **行為更新時清除快取**：
   ```typescript
   // 當用戶行為更新時（查看、搜尋、點擊、收藏）
   const cachePattern = getUserBehaviorCachePattern(userId);
   await deleteCachedDataByPattern(cachePattern);
   ```

## 效能指標

### 有 Redis 快取

- **首次查詢**：500-800ms（需要計算推薦評分）
- **快取命中**：50-100ms（直接從 Redis 讀取）
- **快取命中率**：預期 > 80%

### 無 Redis 快取（降級模式）

- **每次查詢**：500-800ms（每次都需要計算推薦評分）
- **快取命中率**：0%（無快取）

## 監控與除錯

### 檢查 Redis 連線狀態

```bash
# 在應用程式啟動時，檢查日誌
[Redis] Connected successfully  # Redis 連線成功
[Redis] REDIS_URL not configured, caching will be disabled  # Redis 未配置，降級模式
```

### 檢查快取命中率

```bash
# 在推薦 API 日誌中，檢查快取命中情況
[Recommendation] Cache hit for user 123  # 快取命中
[Recommendation] Cache miss for user 123, calculating...  # 快取未命中
```

### Redis 連線錯誤處理

系統已內建錯誤處理機制：

1. **連線失敗**：自動重試 3 次，延遲 50-2000ms
2. **連線錯誤**：記錄錯誤日誌，返回 `null`，不影響功能
3. **連線關閉**：記錄日誌，下次查詢時自動重連

## 部署建議

### 開發環境

- **不需要 Redis**：本地開發時不需要安裝 Redis
- **功能完整**：所有功能正常運作，僅效能稍慢

### 生產環境

- **強烈建議使用 Redis**：提升推薦系統效能 5-10 倍
- **推薦服務**：
  - [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)（免費方案：30MB）
  - [Upstash](https://upstash.com/)（免費方案：10,000 請求/天）
  - [AWS ElastiCache](https://aws.amazon.com/elasticache/)
  - 自建 Redis 伺服器

### Redis 配置建議

```bash
# Redis Cloud 配置範例
REDIS_URL=rediss://default:your_password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345

# 記憶體配置
maxmemory 256mb
maxmemory-policy allkeys-lru  # 記憶體滿時，刪除最少使用的鍵

# 持久化配置（可選）
save 900 1  # 900 秒內至少 1 個鍵變更時，儲存快照
save 300 10  # 300 秒內至少 10 個鍵變更時，儲存快照
```

## 常見問題

### Q1: 本地開發時需要安裝 Redis 嗎？

**A**: 不需要。系統會自動降級為無快取模式，所有功能正常運作。

### Q2: 如何確認 Redis 是否正常運作？

**A**: 檢查應用程式啟動日誌，如果看到 `[Redis] Connected successfully`，表示 Redis 連線成功。

### Q3: Redis 連線失敗會影響功能嗎？

**A**: 不會。系統會自動降級為無快取模式，所有功能正常運作，僅效能稍慢。

### Q4: 如何清除所有快取？

**A**: 可以使用 Redis CLI 或管理工具執行 `FLUSHDB` 命令，或重啟 Redis 伺服器。

### Q5: 快取資料會佔用多少記憶體？

**A**: 每個用戶的推薦結果快取約 1-2KB，假設 1000 個活躍用戶，總記憶體使用約 1-2MB。

## 技術細節

### Redis 連線配置

```typescript
new Redis(redisUrl, {
  maxRetriesPerRequest: 3,  // 最多重試 3 次
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);  // 延遲 50-2000ms
    return delay;
  },
  reconnectOnError: (err) => {
    // 只在特定錯誤時重連
    return err.message.includes('READONLY');
  },
});
```

### 快取鍵命名規範

- **推薦結果**：`recommendation:user:{userId}`
- **用戶行為**：`recommendation:user:{userId}*`
- **股票數據**：`stock:data:{symbol}:{range}`
- **公司名稱**：`company:name:{symbol}`

### 快取過期時間（TTL）

- **推薦結果**：300 秒（5 分鐘）
- **股票數據**：3600 秒（1 小時）
- **公司名稱**：86400 秒（24 小時）

## 總結

Redis 快取機制為推薦系統提供了顯著的效能提升，同時支援自動降級，確保在無 Redis 環境下功能正常運作。在生產環境中，強烈建議配置 `REDIS_URL` 以獲得最佳效能。

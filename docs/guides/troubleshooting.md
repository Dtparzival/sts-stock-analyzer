# 台股資料整合系統 - 常見問題排查手冊

**版本：** 1.0  
**最後更新：** 2024-12-01  
**作者：** Manus AI

---

## 概述

本文件提供台股資料整合系統的常見問題排查指南，幫助開發人員和系統管理員快速定位並解決問題。

---

## 目錄

1. [API 回應問題](#api-回應問題)
2. [資料庫連線問題](#資料庫連線問題)
3. [Redis 快取問題](#redis-快取問題)
4. [效能問題](#效能問題)
5. [資料同步問題](#資料同步問題)
6. [測試問題](#測試問題)

---

## API 回應問題

### 問題 1：API 回應時間過長

**症狀：**
- API 回應時間超過 3 秒
- 監控日誌顯示 "Very slow query"

**可能原因：**
1. 資料庫查詢未使用索引
2. 一次性載入過多資料
3. Redis 快取未命中
4. 資料庫連線池耗盡

**排查步驟：**

1. **檢查監控日誌：**
   ```bash
   # 查看最近的慢查詢日誌
   grep "Slow query" /var/log/app.log | tail -20
   ```

2. **檢查資料庫查詢計劃：**
   ```sql
   EXPLAIN SELECT * FROM twStockPrices WHERE symbol = '2330' ORDER BY date DESC;
   ```

3. **檢查 Redis 快取命中率：**
   ```typescript
   const stats = await trpc.apiMonitor.getPerformanceReport.useQuery();
   console.log(`快取命中率: ${stats.cacheHitRate}%`);
   ```

**解決方案：**

1. **使用分頁查詢：**
   ```typescript
   // ❌ 不推薦
   const allPrices = await trpc.twStock.getHistorical.useQuery({
     symbol: "2330",
     startDate: "2020-01-01",
     endDate: "2024-12-01"
   });

   // ✅ 推薦
   const { data } = await trpc.twStock.getHistoricalPaginated.useQuery({
     symbol: "2330",
     page: 1,
     pageSize: 50
   });
   ```

2. **新增資料庫索引：**
   ```sql
   CREATE INDEX idx_symbol_date ON twStockPrices(symbol, date);
   ```

3. **檢查 Redis 連線狀態：**
   ```typescript
   import { getRedisClient } from './server/redis';
   const redis = getRedisClient();
   if (!redis) {
     console.error("Redis 連線失敗");
   }
   ```

---

### 問題 2：API 返回錯誤

**症狀：**
- API 返回 500 Internal Server Error
- 監控日誌顯示 "Error in query"

**可能原因：**
1. 資料庫連線失敗
2. 參數驗證失敗
3. 資料格式錯誤

**排查步驟：**

1. **檢查錯誤日誌：**
   ```bash
   grep "Error in" /var/log/app.log | tail -20
   ```

2. **檢查資料庫連線：**
   ```typescript
   import { getDb } from './server/db';
   const db = await getDb();
   if (!db) {
     console.error("資料庫連線失敗");
   }
   ```

3. **檢查參數格式：**
   ```typescript
   // 確認參數符合 schema 定義
   const result = await trpc.twStock.getHistoricalPaginated.useQuery({
     symbol: "2330",
     page: 1,
     pageSize: 50 // 必須在 1-100 之間
   });
   ```

**解決方案：**

1. **檢查環境變數：**
   ```bash
   echo $DATABASE_URL
   echo $REDIS_URL
   ```

2. **重啟服務：**
   ```bash
   pnpm restart
   ```

3. **檢查參數驗證：**
   ```typescript
   // 前端參數驗證
   const pageSize = Math.min(Math.max(userInput, 1), 100);
   ```

---

### 問題 3：API 返回空資料

**症狀：**
- API 成功返回，但 `data` 為空陣列
- `pagination.total` 為 0

**可能原因：**
1. 股票代號不存在
2. 日期範圍內無資料
3. 資料尚未同步

**排查步驟：**

1. **檢查股票代號是否存在：**
   ```typescript
   const stock = await trpc.twStock.getDetail.useQuery({ symbol: "2330" });
   if (!stock) {
     console.error("股票代號不存在");
   }
   ```

2. **檢查資料庫中的資料：**
   ```sql
   SELECT COUNT(*) FROM twStockPrices WHERE symbol = '2330';
   ```

3. **檢查資料同步狀態：**
   ```sql
   SELECT * FROM twDataSyncStatus WHERE dataType = 'prices' ORDER BY lastSyncAt DESC LIMIT 1;
   ```

**解決方案：**

1. **確認股票代號正確：**
   ```typescript
   // 使用搜尋 API 確認股票代號
   const results = await trpc.twStock.search.useQuery({ keyword: "台積電" });
   console.log(results[0].symbol); // "2330"
   ```

2. **觸發資料同步：**
   ```bash
   # 手動觸發資料同步（假設有同步腳本）
   node scripts/sync-stock-data.js --symbol=2330
   ```

---

## 資料庫連線問題

### 問題 4：資料庫連線失敗

**症狀：**
- 應用程式啟動時報錯 "Database connection failed"
- API 返回 "database not available"

**可能原因：**
1. 資料庫服務未啟動
2. 連線字串錯誤
3. 網路問題
4. 資料庫連線數超過上限

**排查步驟：**

1. **檢查資料庫服務狀態：**
   ```bash
   # MySQL/TiDB
   systemctl status mysql
   ```

2. **測試資料庫連線：**
   ```bash
   mysql -h <host> -u <user> -p<password> -D <database>
   ```

3. **檢查連線字串：**
   ```bash
   echo $DATABASE_URL
   # 格式應為：mysql://user:password@host:port/database
   ```

4. **檢查連線數：**
   ```sql
   SHOW STATUS LIKE 'Threads_connected';
   SHOW VARIABLES LIKE 'max_connections';
   ```

**解決方案：**

1. **重啟資料庫服務：**
   ```bash
   systemctl restart mysql
   ```

2. **更新連線字串：**
   ```bash
   export DATABASE_URL="mysql://user:password@host:port/database"
   ```

3. **增加連線池大小：**
   ```typescript
   // server/db.ts
   const db = drizzle(process.env.DATABASE_URL, {
     pool: {
       max: 20, // 增加最大連線數
       min: 5
     }
   });
   ```

---

## Redis 快取問題

### 問題 5：Redis 連線失敗

**症狀：**
- 應用程式日誌顯示 "Redis connection failed"
- 快取功能無法使用

**可能原因：**
1. Redis 服務未啟動
2. Redis URL 錯誤
3. 網路問題

**排查步驟：**

1. **檢查 Redis 服務狀態：**
   ```bash
   systemctl status redis
   ```

2. **測試 Redis 連線：**
   ```bash
   redis-cli ping
   # 應返回 PONG
   ```

3. **檢查 Redis URL：**
   ```bash
   echo $REDIS_URL
   # 格式應為：redis://host:port
   ```

**解決方案：**

1. **重啟 Redis 服務：**
   ```bash
   systemctl restart redis
   ```

2. **更新 Redis URL：**
   ```bash
   export REDIS_URL="redis://localhost:6379"
   ```

---

### 問題 6：快取未生效

**症狀：**
- 重複查詢相同資料，但回應時間未減少
- 快取命中率低於預期

**可能原因：**
1. 快取鍵生成邏輯錯誤
2. TTL 設定過短
3. Redis 記憶體不足

**排查步驟：**

1. **檢查快取鍵：**
   ```bash
   redis-cli keys "tw:stock:*"
   ```

2. **檢查 TTL：**
   ```bash
   redis-cli ttl "tw:stock:info:2330"
   ```

3. **檢查 Redis 記憶體使用：**
   ```bash
   redis-cli info memory
   ```

**解決方案：**

1. **檢查快取鍵生成邏輯：**
   ```typescript
   // server/utils/twStockCache.ts
   console.log(CacheKey.stockInfo("2330"));
   // 應輸出：tw:stock:info:2330
   ```

2. **調整 TTL：**
   ```typescript
   // 增加 TTL
   export const CacheTTL = {
     STOCK_INFO: 48 * 60 * 60, // 從 24 小時增加到 48 小時
   };
   ```

3. **清理過期快取：**
   ```bash
   redis-cli flushdb
   ```

---

## 效能問題

### 問題 7：系統整體效能下降

**症狀：**
- 所有 API 回應時間增加
- 系統負載過高

**可能原因：**
1. 資料庫查詢未優化
2. 快取命中率低
3. 伺服器資源不足

**排查步驟：**

1. **檢查效能報告：**
   ```typescript
   const report = await trpc.apiMonitor.getPerformanceReport.useQuery();
   console.log(report);
   ```

2. **檢查系統資源：**
   ```bash
   top
   free -h
   df -h
   ```

3. **檢查資料庫慢查詢：**
   ```sql
   SHOW FULL PROCESSLIST;
   ```

**解決方案：**

1. **優化資料庫查詢：**
   - 新增索引
   - 使用分頁查詢
   - 避免 `SELECT *`

2. **實作快取預熱：**
   ```typescript
   // 預載入熱門股票資料
   const popularStocks = ["2330", "2317", "2454"];
   for (const symbol of popularStocks) {
     await trpc.twStock.getDetail.useQuery({ symbol });
   }
   ```

3. **擴充伺服器資源：**
   - 增加 CPU 核心數
   - 增加記憶體
   - 使用 SSD 硬碟

---

## 資料同步問題

### 問題 8：資料同步失敗

**症狀：**
- 資料庫中無最新資料
- `twDataSyncStatus` 表中狀態為 `failed`

**可能原因：**
1. 外部 API 連線失敗
2. 資料格式錯誤
3. 資料庫寫入失敗

**排查步驟：**

1. **檢查同步狀態：**
   ```sql
   SELECT * FROM twDataSyncStatus ORDER BY lastSyncAt DESC LIMIT 10;
   ```

2. **檢查錯誤日誌：**
   ```sql
   SELECT * FROM twDataSyncErrors ORDER BY createdAt DESC LIMIT 10;
   ```

3. **測試外部 API：**
   ```bash
   curl -X GET "https://api.twse.com.tw/v3/..." 
   ```

**解決方案：**

1. **重試同步：**
   ```bash
   node scripts/sync-stock-data.js --retry-failed
   ```

2. **檢查 API 金鑰：**
   ```bash
   echo $TWSE_API_KEY
   ```

3. **手動修正資料：**
   ```sql
   -- 刪除錯誤資料
   DELETE FROM twStockPrices WHERE symbol = '2330' AND date = '2024-12-01';
   -- 重新插入正確資料
   INSERT INTO twStockPrices (...) VALUES (...);
   ```

---

## 測試問題

### 問題 9：單元測試失敗

**症狀：**
- `pnpm test` 執行失敗
- 部分測試案例不通過

**可能原因：**
1. 測試環境未正確設定
2. 測試資料不一致
3. 測試案例邏輯錯誤

**排查步驟：**

1. **執行單一測試檔案：**
   ```bash
   pnpm vitest run tests/api/twStockPagination.test.ts
   ```

2. **檢查測試設定：**
   ```typescript
   // tests/setup.ts
   console.log(process.env.NODE_ENV); // 應為 'test'
   ```

3. **檢查測試資料：**
   ```typescript
   // 確認測試資料存在
   const stock = await trpc.twStock.getDetail.useQuery({ symbol: "2330" });
   expect(stock).toBeDefined();
   ```

**解決方案：**

1. **重新安裝依賴：**
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. **清除測試快取：**
   ```bash
   pnpm vitest run --clearCache
   ```

3. **更新測試案例：**
   ```typescript
   // 修正測試邏輯
   it('應該限制每頁最多 100 筆資料', async () => {
     await expect(
       caller.twStock.getHistoricalPaginated({
         symbol: '2330',
         page: 1,
         pageSize: 150, // 超過限制
       })
     ).rejects.toThrow(); // 應該拋出錯誤
   });
   ```

---

## 總結

本文件提供了台股資料整合系統的常見問題排查指南，涵蓋 API 回應問題、資料庫連線問題、Redis 快取問題、效能問題、資料同步問題和測試問題。

**排查流程：**

1. **識別問題：** 查看錯誤訊息和監控日誌
2. **定位原因：** 逐步排查可能的原因
3. **驗證解決方案：** 測試修復後的功能
4. **記錄問題：** 更新文件和知識庫

如遇到本文件未涵蓋的問題，請聯繫系統管理員或查閱相關技術文件。

---

**版本歷史：**

- **1.0** (2024-12-01): 初始版本

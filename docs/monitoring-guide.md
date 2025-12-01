# 台股資料整合系統 - 效能監控指南

**版本：** 1.0  
**最後更新：** 2024-12-01  
**作者：** Manus AI

---

## 概述

本文件說明台股資料整合系統的效能監控機制，包含監控指標、警告門檻、監控工具使用方式，以及效能優化建議。

---

## 目錄

1. [監控架構](#監控架構)
2. [效能指標](#效能指標)
3. [監控中介層](#監控中介層)
4. [效能監控 API](#效能監控-api)
5. [警告門檻](#警告門檻)
6. [監控最佳實踐](#監控最佳實踐)
7. [效能優化建議](#效能優化建議)

---

## 監控架構

系統採用三層監控架構：

1. **應用層監控：** tRPC 中介層記錄每個 API 的回應時間
2. **快取層監控：** Redis 快取命中率和效能監控
3. **資料庫層監控：** 資料庫查詢效能和連線狀態監控

```
┌─────────────────────────────────────────┐
│         應用層監控                        │
│   (tRPC Monitoring Middleware)          │
│   - API 回應時間                         │
│   - 慢查詢警告                           │
│   - 錯誤率統計                           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         快取層監控                        │
│   (Redis Performance Monitor)           │
│   - 快取命中率                           │
│   - 快取過期時間                         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         資料庫層監控                      │
│   (Database Query Monitor)              │
│   - 查詢執行時間                         │
│   - 慢查詢日誌                           │
└─────────────────────────────────────────┘
```

---

## 效能指標

### 1. API 回應時間

**定義：** 從接收請求到返回回應的總時間（毫秒）

**分類：**

| 分類 | 回應時間 | 狀態 | 說明 |
|------|---------|------|------|
| 正常 | < 1000ms | `success` | 正常回應 |
| 慢查詢 | 1000-3000ms | `slow` | 需要關注 |
| 非常慢 | > 3000ms | `very_slow` | 需要立即優化 |
| 錯誤 | - | `error` | 請求失敗 |

### 2. 效能統計指標

每個 API 端點會記錄以下統計指標：

| 指標名稱 | 說明 |
|---------|------|
| `count` | 總請求次數 |
| `avgDuration` | 平均回應時間（毫秒） |
| `minDuration` | 最小回應時間（毫秒） |
| `maxDuration` | 最大回應時間（毫秒） |
| `slowCount` | 慢查詢次數（> 1秒） |
| `verySlowCount` | 非常慢查詢次數（> 3秒） |
| `errorCount` | 錯誤次數 |

### 3. 快取效能指標

| 指標名稱 | 說明 |
|---------|------|
| 快取命中率 | 快取命中次數 / 總請求次數 |
| 快取過期率 | 快取過期次數 / 總請求次數 |
| 快取寫入延遲 | 寫入 Redis 的平均時間 |

---

## 監控中介層

### 實作位置

`server/_core/trpc.ts`

### 核心功能

監控中介層會自動記錄每個 API 的回應時間，並在超過門檻值時發出警告。

### 使用方式

**1. 使用帶監控的 procedure：**

```typescript
import { monitoredPublicProcedure, monitoredProtectedProcedure } from './_core/trpc';

// 公開 API（帶監控）
export const myPublicAPI = monitoredPublicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    // API 邏輯
  });

// 需認證的 API（帶監控）
export const myProtectedAPI = monitoredProtectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    // API 邏輯（可存取 ctx.user）
  });
```

**2. 監控日誌範例：**

```
[API Monitor] query.twStock.getHistoricalPaginated - 245ms
[API Monitor] query.twStock.getDetail - 120ms
[API Monitor] ❗ Slow query detected: query.twStock.getIndicators - 1520ms
[API Monitor] ❌ Very slow query: query.twStock.getFundamentals - 3850ms
[API Monitor] ❌ Error in query.twStock.search after 500ms: [Error details]
```

---

## 效能監控 API

### 1. 取得效能統計資料

**用途：** 查看所有 API 的效能統計

**使用範例：**

```typescript
const stats = await trpc.apiMonitor.getPerformanceStats.useQuery();

stats.forEach(api => {
  console.log(`${api.path}: 平均 ${api.avgDuration}ms, 慢查詢 ${api.slowCount} 次`);
});
```

### 2. 取得效能報告

**用途：** 取得系統整體效能概況

**使用範例：**

```typescript
const report = await trpc.apiMonitor.getPerformanceReport.useQuery();

console.log(`總請求數: ${report.totalRequests}`);
console.log(`平均回應時間: ${report.avgDuration}ms`);
console.log(`慢查詢數量: ${report.slowRequests}`);
console.log(`錯誤數量: ${report.errorRequests}`);

// 最慢的 5 個 API
report.slowestAPIs.forEach((api, index) => {
  console.log(`${index + 1}. ${api.path} - 平均 ${api.avgDuration}ms`);
});
```

### 3. 取得最慢的 API

**用途：** 識別需要優化的 API

**使用範例：**

```typescript
const slowestAPIs = await trpc.apiMonitor.getSlowestAPIs.useQuery({ limit: 10 });

slowestAPIs.forEach(api => {
  if (api.avgDuration > 1000) {
    console.warn(`⚠️ ${api.path} 需要優化！平均回應時間: ${api.avgDuration}ms`);
  }
});
```

### 4. 取得錯誤率最高的 API

**用途：** 識別不穩定的 API

**使用範例：**

```typescript
const errorAPIs = await trpc.apiMonitor.getHighestErrorAPIs.useQuery({ limit: 10 });

errorAPIs.forEach(api => {
  const errorRate = (api.errorCount / api.count) * 100;
  console.error(`❌ ${api.path} 錯誤率: ${errorRate.toFixed(2)}%`);
});
```

---

## 警告門檻

### 回應時間警告

| 門檻 | 動作 | 日誌等級 |
|------|------|---------|
| > 1000ms | 記錄警告日誌 | `console.warn` |
| > 3000ms | 記錄錯誤日誌 | `console.error` |

### 錯誤率警告

| 錯誤率 | 動作 |
|--------|------|
| > 1% | 需要關注 |
| > 5% | 需要立即處理 |
| > 10% | 嚴重問題，需緊急修復 |

### 快取命中率警告

| 快取命中率 | 動作 |
|-----------|------|
| < 50% | 檢查快取策略 |
| < 30% | 需要優化快取邏輯 |

---

## 監控最佳實踐

### 1. 定期檢查效能報告

建議每日檢查一次效能報告，識別潛在的效能問題。

**範例腳本：**

```typescript
// 每日效能檢查腳本
async function dailyPerformanceCheck() {
  const report = await trpc.apiMonitor.getPerformanceReport.useQuery();
  
  // 檢查慢查詢
  if (report.slowRequests > 100) {
    console.warn(`⚠️ 慢查詢數量過多: ${report.slowRequests}`);
  }
  
  // 檢查錯誤率
  const errorRate = (report.errorRequests / report.totalRequests) * 100;
  if (errorRate > 1) {
    console.error(`❌ 錯誤率過高: ${errorRate.toFixed(2)}%`);
  }
  
  // 檢查最慢的 API
  const slowestAPIs = await trpc.apiMonitor.getSlowestAPIs.useQuery({ limit: 5 });
  slowestAPIs.forEach(api => {
    if (api.avgDuration > 1000) {
      console.warn(`⚠️ ${api.path} 需要優化，平均回應時間: ${api.avgDuration}ms`);
    }
  });
}
```

### 2. 設定自動化警報

當效能指標超過門檻值時，自動發送通知給系統管理員。

**範例：**

```typescript
async function performanceAlert() {
  const report = await trpc.apiMonitor.getPerformanceReport.useQuery();
  
  if (report.verySlowRequests > 10) {
    // 發送警報（例如：Email、Slack、簡訊）
    await sendAlert({
      title: "效能警告：非常慢查詢過多",
      message: `系統中有 ${report.verySlowRequests} 個非常慢的查詢（> 3秒）`,
      severity: "high"
    });
  }
}
```

### 3. 記錄歷史效能資料

將效能指標定期儲存到資料庫，以便進行長期趨勢分析。

**範例：**

```typescript
async function savePerformanceMetrics() {
  const report = await trpc.apiMonitor.getPerformanceReport.useQuery();
  
  await db.insert(performanceMetrics).values({
    timestamp: new Date(),
    totalRequests: report.totalRequests,
    avgDuration: report.avgDuration,
    slowRequests: report.slowRequests,
    errorRequests: report.errorRequests
  });
}

// 每小時執行一次
setInterval(savePerformanceMetrics, 60 * 60 * 1000);
```

### 4. 效能基準測試

定期執行效能基準測試，確保系統效能不會退化。

**範例：**

```typescript
async function performanceBenchmark() {
  const iterations = 100;
  const results: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await trpc.twStock.getDetail.useQuery({ symbol: "2330" });
    results.push(Date.now() - start);
  }
  
  const avgDuration = results.reduce((a, b) => a + b, 0) / iterations;
  console.log(`基準測試結果: 平均回應時間 ${avgDuration.toFixed(2)}ms`);
  
  if (avgDuration > 200) {
    console.warn("⚠️ 效能退化，需要優化！");
  }
}
```

---

## 效能優化建議

### 1. 資料庫查詢優化

**問題：** 資料庫查詢慢

**解決方案：**

- 新增適當的索引（`symbol`, `date`, `year`, `quarter`）
- 使用分頁查詢避免一次性載入大量資料
- 優化 SQL 查詢語句（避免 `SELECT *`）

**範例：**

```typescript
// ❌ 不推薦：一次性載入所有資料
const allPrices = await db.select().from(twStockPrices).where(eq(twStockPrices.symbol, symbol));

// ✅ 推薦：使用分頁查詢
const prices = await db
  .select()
  .from(twStockPrices)
  .where(eq(twStockPrices.symbol, symbol))
  .orderBy(desc(twStockPrices.date))
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

### 2. 快取策略優化

**問題：** 快取命中率低

**解決方案：**

- 調整 TTL（Time To Live）策略
- 實作快取預熱機制（預載入熱門股票資料）
- 使用快取分層（記憶體快取 + Redis 快取）

**範例：**

```typescript
// 快取預熱：預載入熱門股票資料
async function warmupCache() {
  const popularStocks = ["2330", "2317", "2454", "2412", "2308"];
  
  for (const symbol of popularStocks) {
    await trpc.twStock.getDetail.useQuery({ symbol });
    await trpc.twStock.getHistoricalPaginated.useQuery({ symbol, page: 1, pageSize: 30 });
  }
  
  console.log("快取預熱完成");
}
```

### 3. API 回應優化

**問題：** API 回應時間過長

**解決方案：**

- 減少不必要的資料欄位
- 使用資料壓縮（gzip）
- 實作 API 回應快取

**範例：**

```typescript
// ❌ 不推薦：返回所有欄位
const stock = await db.select().from(twStocks).where(eq(twStocks.symbol, symbol));

// ✅ 推薦：只返回需要的欄位
const stock = await db
  .select({
    symbol: twStocks.symbol,
    name: twStocks.name,
    shortName: twStocks.shortName,
    market: twStocks.market
  })
  .from(twStocks)
  .where(eq(twStocks.symbol, symbol));
```

### 4. 並行處理優化

**問題：** 多個 API 請求串行執行

**解決方案：**

- 使用 `Promise.all` 並行執行多個獨立請求
- 避免不必要的等待時間

**範例：**

```typescript
// ❌ 不推薦：串行執行
const stock = await trpc.twStock.getDetail.useQuery({ symbol: "2330" });
const prices = await trpc.twStock.getHistoricalPaginated.useQuery({ symbol: "2330", page: 1, pageSize: 30 });
const indicators = await trpc.twStock.getIndicatorsPaginated.useQuery({ symbol: "2330", page: 1, pageSize: 30 });

// ✅ 推薦：並行執行
const [stock, prices, indicators] = await Promise.all([
  trpc.twStock.getDetail.useQuery({ symbol: "2330" }),
  trpc.twStock.getHistoricalPaginated.useQuery({ symbol: "2330", page: 1, pageSize: 30 }),
  trpc.twStock.getIndicatorsPaginated.useQuery({ symbol: "2330", page: 1, pageSize: 30 })
]);
```

---

## 總結

本文件提供了台股資料整合系統的完整效能監控指南，涵蓋監控架構、效能指標、監控工具使用方式和效能優化建議。遵循本指南中的建議，可以有效提升系統效能並降低故障率。

**關鍵要點：**

1. 使用監控中介層自動記錄 API 回應時間
2. 定期檢查效能報告，識別潛在問題
3. 設定自動化警報，及時發現異常
4. 遵循效能優化建議，持續改善系統效能

如有任何問題或建議，請聯繫系統管理員。

---

**版本歷史：**

- **1.0** (2024-12-01): 初始版本

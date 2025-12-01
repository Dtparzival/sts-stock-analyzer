# 台股資料整合 API 使用指南

**版本：** 3.0  
**最後更新：** 2024-12-01  
**作者：** Manus AI

---

## 概述

本文件提供台股資料整合系統的 API 使用指南，涵蓋所有可用的 tRPC API 端點、參數說明、回應格式、錯誤處理和最佳實踐。

---

## 目錄

1. [API 基礎](#api-基礎)
2. [台股資料查詢 API](#台股資料查詢-api)
3. [分頁查詢 API](#分頁查詢-api)
4. [效能監控 API](#效能監控-api)
5. [快取機制](#快取機制)
6. [錯誤處理](#錯誤處理)
7. [最佳實踐](#最佳實踐)

---

## API 基礎

### 通訊協定

所有 API 使用 **tRPC** 協定，透過 HTTP POST 請求與伺服器通訊。

**基礎 URL：** `/api/trpc`

### 認證機制

部分 API 需要使用者認證，請確保已登入並攜帶有效的 session cookie。

### 回應格式

所有 API 回應均為 JSON 格式，並使用 **SuperJSON** 進行序列化，支援 `Date`、`BigInt` 等特殊型別。

---

## 台股資料查詢 API

### 1. 搜尋台股

**端點：** `twStock.search`

**類型：** Query

**描述：** 根據關鍵字搜尋台股，支援股票代號、公司名稱、公司簡稱模糊搜尋。

**參數：**

| 參數名稱 | 型別 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| `keyword` | string | 是 | - | 搜尋關鍵字（股票代號、公司名稱或簡稱） |
| `limit` | number | 否 | 20 | 返回結果數量上限 |

**回應範例：**

```typescript
[
  {
    id: 1,
    symbol: "2330",
    name: "台灣積體電路製造股份有限公司",
    shortName: "台積電",
    market: "上市",
    industry: "半導體業",
    type: "股票",
    isActive: true,
    createdAt: Date,
    updatedAt: Date
  },
  // ...
]
```

**使用範例：**

```typescript
const results = await trpc.twStock.search.useQuery({
  keyword: "台積電",
  limit: 10
});
```

---

### 2. 取得台股詳情

**端點：** `twStock.getDetail`

**類型：** Query

**描述：** 取得指定股票代號的詳細資料。

**參數：**

| 參數名稱 | 型別 | 必填 | 說明 |
|---------|------|------|------|
| `symbol` | string | 是 | 股票代號（例如：2330） |

**回應範例：**

```typescript
{
  id: 1,
  symbol: "2330",
  name: "台灣積體電路製造股份有限公司",
  shortName: "台積電",
  market: "上市",
  industry: "半導體業",
  type: "股票",
  listedDate: Date,
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

**快取：** 此 API 使用 Redis 快取，TTL 為 24 小時。

---

### 3. 取得歷史價格

**端點：** `twStock.getHistorical`

**類型：** Query

**描述：** 取得指定股票代號在特定日期範圍內的歷史價格資料。

**參數：**

| 參數名稱 | 型別 | 必填 | 說明 |
|---------|------|------|------|
| `symbol` | string | 是 | 股票代號 |
| `startDate` | string | 是 | 開始日期（ISO 8601 格式，例如：2024-01-01） |
| `endDate` | string | 是 | 結束日期（ISO 8601 格式） |

**回應範例：**

```typescript
[
  {
    id: 1,
    symbol: "2330",
    date: Date,
    open: "580.00",
    high: "585.00",
    low: "578.00",
    close: "583.00",
    volume: 25000,
    amount: "14575000000.00",
    change: "3.00",
    changePercent: "0.52",
    createdAt: Date
  },
  // ...
]
```

**快取：** 此 API 使用 Redis 快取，TTL 為 6 小時。

---

### 4. 取得技術指標

**端點：** `twStock.getIndicators`

**類型：** Query

**描述：** 取得指定股票代號在特定日期範圍內的技術指標資料（MA、RSI、MACD、KD 等）。

**參數：**

| 參數名稱 | 型別 | 必填 | 說明 |
|---------|------|------|------|
| `symbol` | string | 是 | 股票代號 |
| `startDate` | string | 是 | 開始日期 |
| `endDate` | string | 是 | 結束日期 |

**回應範例：**

```typescript
[
  {
    id: 1,
    symbol: "2330",
    date: Date,
    ma5: "582.40",
    ma10: "580.15",
    ma20: "575.80",
    ma60: "570.25",
    rsi14: "65.50",
    macd: "2.3500",
    macdSignal: "1.8500",
    macdHistogram: "0.5000",
    kValue: "75.20",
    dValue: "72.50",
    createdAt: Date,
    updatedAt: Date
  },
  // ...
]
```

**快取：** 此 API 使用 Redis 快取，TTL 為 6 小時。

---

### 5. 取得基本面資料

**端點：** `twStock.getFundamentals`

**類型：** Query

**描述：** 取得指定股票代號的基本面資料（EPS、本益比、殖利率等）。

**參數：**

| 參數名稱 | 型別 | 必填 | 說明 |
|---------|------|------|------|
| `symbol` | string | 是 | 股票代號 |
| `year` | number | 否 | 年度（例如：2024） |
| `quarter` | number | 否 | 季度（1-4） |

**回應範例：**

```typescript
[
  {
    id: 1,
    symbol: "2330",
    year: 2024,
    quarter: 3,
    eps: "9.50",
    pe: "18.50",
    pb: "5.20",
    roe: "28.50",
    dividend: "11.00",
    yieldRate: "1.89",
    revenue: "759000000.00",
    netIncome: "325000000.00",
    createdAt: Date,
    updatedAt: Date
  },
  // ...
]
```

**快取：** 此 API 使用 Redis 快取，TTL 為 24 小時。

---

## 分頁查詢 API

### 1. 歷史價格分頁查詢

**端點：** `twStock.getHistoricalPaginated`

**類型：** Query

**描述：** 以分頁方式取得歷史價格資料，適合大量資料查詢。

**參數：**

| 參數名稱 | 型別 | 必填 | 預設值 | 限制 | 說明 |
|---------|------|------|--------|------|------|
| `symbol` | string | 是 | - | - | 股票代號 |
| `page` | number | 否 | 1 | ≥ 1 | 頁碼 |
| `pageSize` | number | 否 | 30 | 1-100 | 每頁筆數 |

**回應結構：**

```typescript
{
  data: TwStockPrice[],  // 當前頁的資料
  pagination: {
    page: number,        // 當前頁碼
    pageSize: number,    // 每頁筆數
    total: number,       // 總筆數
    totalPages: number   // 總頁數
  }
}
```

**回應範例：**

```typescript
{
  data: [
    {
      id: 1,
      symbol: "2330",
      date: Date,
      open: "580.00",
      high: "585.00",
      low: "578.00",
      close: "583.00",
      volume: 25000,
      amount: "14575000000.00",
      change: "3.00",
      changePercent: "0.52",
      createdAt: Date
    },
    // ... 最多 30 筆（依 pageSize 而定）
  ],
  pagination: {
    page: 1,
    pageSize: 30,
    total: 1250,
    totalPages: 42
  }
}
```

**使用範例：**

```typescript
const { data, pagination } = await trpc.twStock.getHistoricalPaginated.useQuery({
  symbol: "2330",
  page: 1,
  pageSize: 50
});

console.log(`共 ${pagination.total} 筆資料，目前在第 ${pagination.page}/${pagination.totalPages} 頁`);
```

**快取：** 此 API 使用 Redis 快取，TTL 為 6 小時。

---

### 2. 技術指標分頁查詢

**端點：** `twStock.getIndicatorsPaginated`

**類型：** Query

**描述：** 以分頁方式取得技術指標資料。

**參數：** 與 `getHistoricalPaginated` 相同

**回應結構：** 與 `getHistoricalPaginated` 相同

**快取：** 此 API 使用 Redis 快取，TTL 為 6 小時。

---

### 3. 基本面資料分頁查詢

**端點：** `twStock.getFundamentalsPaginated`

**類型：** Query

**描述：** 以分頁方式取得基本面資料。

**參數：**

| 參數名稱 | 型別 | 必填 | 預設值 | 限制 | 說明 |
|---------|------|------|--------|------|------|
| `symbol` | string | 是 | - | - | 股票代號 |
| `page` | number | 否 | 1 | ≥ 1 | 頁碼 |
| `pageSize` | number | 否 | 20 | 1-100 | 每頁筆數 |

**回應結構：** 與 `getHistoricalPaginated` 相同

**快取：** 此 API 使用 Redis 快取，TTL 為 24 小時。

---

## 效能監控 API

### 1. 取得效能統計資料

**端點：** `apiMonitor.getPerformanceStats`

**類型：** Query

**描述：** 取得所有 API 的效能統計資料，包含平均回應時間、最小/最大回應時間、慢查詢數量等。

**參數：** 無

**回應範例：**

```typescript
[
  {
    path: "twStock.getHistoricalPaginated",
    count: 150,
    avgDuration: 245,
    minDuration: 120,
    maxDuration: 850,
    slowCount: 5,
    verySlowCount: 1,
    errorCount: 0
  },
  // ...
]
```

---

### 2. 取得效能報告

**端點：** `apiMonitor.getPerformanceReport`

**類型：** Query

**描述：** 取得完整的效能報告，包含總請求數、平均回應時間、慢查詢統計、最慢的 API 列表等。

**參數：** 無

**回應範例：**

```typescript
{
  totalRequests: 1250,
  avgDuration: 320,
  slowRequests: 45,
  verySlowRequests: 8,
  errorRequests: 3,
  slowestAPIs: [
    {
      path: "twStock.getIndicators",
      count: 80,
      avgDuration: 1250,
      minDuration: 800,
      maxDuration: 2500,
      slowCount: 25,
      verySlowCount: 5,
      errorCount: 0
    },
    // ... 最多 5 個
  ],
  highestErrorAPIs: [
    {
      path: "twStock.search",
      count: 200,
      avgDuration: 150,
      minDuration: 80,
      maxDuration: 500,
      slowCount: 0,
      verySlowCount: 0,
      errorCount: 3
    },
    // ... 最多 5 個
  ]
}
```

---

### 3. 取得最慢的 API

**端點：** `apiMonitor.getSlowestAPIs`

**類型：** Query

**描述：** 取得平均回應時間最慢的 API 列表。

**參數：**

| 參數名稱 | 型別 | 必填 | 預設值 | 限制 | 說明 |
|---------|------|------|--------|------|------|
| `limit` | number | 否 | 10 | 1-50 | 返回數量 |

**回應範例：** 同 `getPerformanceStats`

---

### 4. 取得錯誤率最高的 API

**端點：** `apiMonitor.getHighestErrorAPIs`

**類型：** Query

**描述：** 取得錯誤率最高的 API 列表。

**參數：** 與 `getSlowestAPIs` 相同

**回應範例：** 同 `getPerformanceStats`

---

### 5. 清除效能指標

**端點：** `apiMonitor.clearPerformanceMetrics`

**類型：** Mutation

**描述：** 清除所有效能指標記錄（僅供測試使用）。

**參數：** 無

**回應範例：**

```typescript
{
  success: true
}
```

---

## 快取機制

### Redis 快取策略

系統使用 Redis 作為快取層，以減少資料庫查詢次數並提升回應速度。

**快取鍵格式：**

- 股票基本資料：`tw:stock:info:{symbol}`
- 歷史價格：`tw:stock:prices:{symbol}:{startDate}:{endDate}`
- 歷史價格（分頁）：`tw:stock:prices:paginated:{symbol}:{page}:{pageSize}`
- 技術指標：`tw:stock:indicators:{symbol}:{date}`
- 技術指標（分頁）：`tw:stock:indicators:paginated:{symbol}:{page}:{pageSize}`
- 基本面資料：`tw:stock:fundamentals:{symbol}:{year}:{quarter}`
- 基本面資料（分頁）：`tw:stock:fundamentals:paginated:{symbol}:{page}:{pageSize}`

**TTL（Time To Live）策略：**

| 資料類型 | TTL | 說明 |
|---------|-----|------|
| 股票基本資料 | 24 小時 | 基本資料變動頻率低 |
| 歷史價格 | 6 小時 | 每日收盤後更新 |
| 技術指標 | 6 小時 | 依賴歷史價格計算 |
| 基本面資料 | 24 小時 | 每季更新 |

### 快取失效策略

- **自動失效：** 快取到期後自動失效
- **手動失效：** 資料更新時主動清除相關快取

---

## 錯誤處理

### 錯誤碼

| 錯誤碼 | 說明 | 處理建議 |
|--------|------|---------|
| `UNAUTHORIZED` | 未授權 | 請先登入 |
| `FORBIDDEN` | 權限不足 | 確認使用者角色 |
| `BAD_REQUEST` | 請求參數錯誤 | 檢查參數格式與範圍 |
| `NOT_FOUND` | 資源不存在 | 確認股票代號是否正確 |
| `INTERNAL_SERVER_ERROR` | 伺服器內部錯誤 | 聯繫系統管理員 |

### 錯誤回應範例

```typescript
{
  error: {
    code: "BAD_REQUEST",
    message: "Too big: expected number to be <=100",
    data: {
      path: ["pageSize"],
      code: "too_big"
    }
  }
}
```

### 錯誤處理最佳實踐

1. **參數驗證：** 在前端進行基本的參數驗證，避免無效請求
2. **錯誤提示：** 根據錯誤碼提供使用者友善的錯誤訊息
3. **重試機制：** 對於暫時性錯誤（如網路問題），實作重試機制
4. **日誌記錄：** 記錄錯誤日誌以便後續分析

---

## 最佳實踐

### 1. 使用分頁查詢

對於大量資料查詢，優先使用分頁 API（`getHistoricalPaginated`、`getIndicatorsPaginated`、`getFundamentalsPaginated`），避免一次性載入過多資料。

**範例：**

```typescript
// ❌ 不推薦：一次性載入所有資料
const allPrices = await trpc.twStock.getHistorical.useQuery({
  symbol: "2330",
  startDate: "2020-01-01",
  endDate: "2024-12-01"
});

// ✅ 推薦：使用分頁查詢
const { data, pagination } = await trpc.twStock.getHistoricalPaginated.useQuery({
  symbol: "2330",
  page: 1,
  pageSize: 50
});
```

### 2. 善用快取

系統已實作 Redis 快取，重複查詢相同資料時會自動使用快取，無需額外處理。

### 3. 監控 API 效能

定期查詢效能報告，識別慢查詢並進行優化。

**範例：**

```typescript
const report = await trpc.apiMonitor.getPerformanceReport.useQuery();

if (report.slowRequests > 100) {
  console.warn("慢查詢數量過多，需要優化！");
}
```

### 4. 錯誤處理

使用 try-catch 捕獲錯誤，並根據錯誤類型提供適當的處理。

**範例：**

```typescript
try {
  const stock = await trpc.twStock.getDetail.useQuery({ symbol: "2330" });
} catch (error) {
  if (error.code === "NOT_FOUND") {
    console.error("股票代號不存在");
  } else {
    console.error("系統錯誤，請稍後再試");
  }
}
```

### 5. 參數驗證

在前端進行基本的參數驗證，避免無效請求。

**範例：**

```typescript
const pageSize = Math.min(Math.max(userInput, 1), 100); // 限制在 1-100 之間

const { data } = await trpc.twStock.getHistoricalPaginated.useQuery({
  symbol: "2330",
  page: 1,
  pageSize
});
```

---

## 總結

本文件提供了台股資料整合系統的完整 API 使用指南，涵蓋所有可用的端點、參數說明、回應格式和最佳實踐。遵循本指南中的建議，可以有效提升系統效能並降低錯誤率。

如有任何問題或建議，請聯繫系統管理員。

---

**版本歷史：**

- **3.0** (2024-12-01): 新增分頁查詢 API 和效能監控 API
- **2.0** (2024-11-30): 新增技術指標和基本面資料 API
- **1.0** (2024-11-01): 初始版本

# STS 系統規格與實作比對分析報告

**文件版本**: v1.0  
**分析日期**: 2024-12-19  
**分析目的**: 比對 STS_System_Design_Specification.md 規格文件與現有實作的差異

---

## 一、資料庫 Schema 比對

### 1.1 使用者資料表 (users)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| id | INT, PK, AUTO_INCREMENT | ✅ 相符 | ✅ |
| openId | VARCHAR(64), NOT NULL, UNIQUE | ✅ 相符 | ✅ |
| name | TEXT, NULLABLE | ✅ 相符 | ✅ |
| email | VARCHAR(320), NULLABLE | ✅ 相符 | ✅ |
| loginMethod | VARCHAR(64), NULLABLE | ✅ 相符 | ✅ |
| role | ENUM('user', 'admin'), DEFAULT 'user' | ✅ 相符 | ✅ |
| createdAt | TIMESTAMP, DEFAULT CURRENT_TIMESTAMP | ✅ 相符 | ✅ |
| updatedAt | TIMESTAMP, ON UPDATE | ✅ 相符 | ✅ |
| lastSignedIn | TIMESTAMP | ✅ 相符 | ✅ |

**結論**: 使用者資料表完全符合規格

---

### 1.2 台股基本資料表 (twStocks)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| id | INT, PK, AUTO_INCREMENT | ✅ 相符 | ✅ |
| symbol | VARCHAR(10), NOT NULL, UNIQUE | ✅ 相符 | ✅ |
| name | VARCHAR(100), NOT NULL | ✅ 相符 | ✅ |
| shortName | VARCHAR(50), NULLABLE | ✅ 相符 | ✅ |
| market | ENUM('TWSE', 'TPEx'), NOT NULL | ✅ 相符 | ✅ |
| industry | VARCHAR(50), NULLABLE | ✅ 相符 | ✅ |
| type | - | VARCHAR(20), DEFAULT 'STOCK' | ⚠️ 額外欄位 |
| isActive | BOOLEAN, DEFAULT TRUE | ✅ 相符 | ✅ |
| listedDate | DATE, NULLABLE | ✅ 相符 | ✅ |
| createdAt | TIMESTAMP | ✅ 相符 | ✅ |
| updatedAt | TIMESTAMP | ✅ 相符 | ✅ |

**差異說明**:
- 現有實作多了 `type` 欄位，用於區分股票類型（STOCK/ETF/WARRANT），這是合理的擴展

---

### 1.3 台股歷史價格表 (twStockPrices)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| 整個資料表 | 需要實作 | ❌ 未實作 | ⚠️ 設計變更 |

**差異說明**:
- 規格文件要求建立 `twStockPrices` 資料表儲存歷史價格
- 現有實作改為**即時呼叫 TWSE API**，不儲存歷史價格於資料庫
- 這是一個**設計決策變更**，優點是減少資料庫儲存空間，缺點是每次查詢都需要呼叫外部 API

---

### 1.4 台股同步狀態表 (twDataSyncStatus)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| id | INT, PK, AUTO_INCREMENT | ✅ 相符 | ✅ |
| dataType | VARCHAR(50), NOT NULL | ✅ 相符 | ✅ |
| source | VARCHAR(50), NOT NULL | ✅ 相符 | ✅ |
| lastSyncAt | TIMESTAMP, NOT NULL | ✅ 相符 | ✅ |
| status | ENUM('success', 'partial', 'failed') | ✅ 相符 | ✅ |
| recordCount | INT, DEFAULT 0 | ✅ 相符 | ✅ |
| errorMessage | TEXT, NULLABLE | ✅ 相符 | ✅ |
| createdAt | TIMESTAMP | ✅ 相符 | ✅ |
| updatedAt | TIMESTAMP | ✅ 相符 | ✅ |

**結論**: 台股同步狀態表完全符合規格

---

### 1.5 台股同步錯誤表 (twDataSyncErrors)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| id | INT, PK, AUTO_INCREMENT | ✅ 相符 | ✅ |
| dataType | VARCHAR(50), NOT NULL | ✅ 相符 | ✅ |
| symbol | VARCHAR(10), NULLABLE | ✅ 相符 | ✅ |
| errorType | VARCHAR(50), NOT NULL | ✅ 相符 | ✅ |
| errorMessage | TEXT, NOT NULL | ✅ 相符 | ✅ |
| errorStack | TEXT, NULLABLE | ✅ 相符 | ✅ |
| retryCount | INT, DEFAULT 0 | ✅ 相符 | ✅ |
| resolved | BOOLEAN, DEFAULT FALSE | ✅ 相符 | ✅ |
| syncedAt | TIMESTAMP, NOT NULL | ✅ 相符 | ✅ |
| createdAt | TIMESTAMP | ✅ 相符 | ✅ |

**結論**: 台股同步錯誤表完全符合規格

---

### 1.6 美股基本資料表 (usStocks)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| id | INT, PK, AUTO_INCREMENT | ✅ 相符 | ✅ |
| symbol | VARCHAR(20), NOT NULL, UNIQUE | ✅ 相符 | ✅ |
| name | VARCHAR(200), NOT NULL | ✅ 相符 | ✅ |
| shortName | VARCHAR(100), NULLABLE | ✅ 相符 | ✅ |
| exchange | VARCHAR(20), NULLABLE | ✅ 相符 | ✅ |
| currency | VARCHAR(10), DEFAULT 'USD' | VARCHAR(10), NULLABLE | ⚠️ 缺少 DEFAULT |
| country | VARCHAR(50), NULLABLE | ✅ 相符 | ✅ |
| sector | VARCHAR(100), NULLABLE | ✅ 相符 | ✅ |
| industry | VARCHAR(100), NULLABLE | ✅ 相符 | ✅ |
| type | - | VARCHAR(20), DEFAULT 'Common Stock' | ⚠️ 額外欄位 |
| isActive | BOOLEAN, DEFAULT TRUE | ✅ 相符 | ✅ |
| createdAt | TIMESTAMP | ✅ 相符 | ✅ |
| updatedAt | TIMESTAMP | ✅ 相符 | ✅ |

**差異說明**:
- `currency` 欄位缺少 DEFAULT 'USD' 設定
- 現有實作多了 `type` 欄位，用於區分股票類型

---

### 1.7 美股歷史價格表 (usStockPrices)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| 整個資料表 | 需要實作 | ❌ 未實作 | ⚠️ 設計變更 |

**差異說明**:
- 規格文件要求建立 `usStockPrices` 資料表儲存歷史價格
- 現有實作改為**即時呼叫 TwelveData API**，不儲存歷史價格於資料庫
- 與台股相同的設計決策變更

---

### 1.8 美股同步狀態表 (usDataSyncStatus)

**結論**: 完全符合規格

---

### 1.9 美股同步錯誤表 (usDataSyncErrors)

**結論**: 完全符合規格

---

### 1.10 快取資料表 (stockDataCache)

| 欄位 | 規格文件 | 現有實作 | 狀態 |
|------|---------|---------|------|
| id | INT, PK | ✅ 相符 | ✅ |
| symbol | VARCHAR(20), NOT NULL, UNIQUE | VARCHAR(20), NOT NULL | ⚠️ 非 UNIQUE |
| cacheKey | - | VARCHAR(200), NOT NULL, UNIQUE | ⚠️ 額外欄位 |
| market | - | VARCHAR(10), NOT NULL | ⚠️ 額外欄位 |
| dataType | VARCHAR(50), NOT NULL | ✅ 相符 | ✅ |
| data | TEXT, NOT NULL | ✅ 相符 | ✅ |
| expiresAt | TIMESTAMP, NOT NULL | ✅ 相符 | ✅ |
| createdAt | TIMESTAMP | ✅ 相符 | ✅ |
| updatedAt | TIMESTAMP | ✅ 相符 | ✅ |

**差異說明**:
- 現有實作使用 `cacheKey` 作為唯一識別，而非 `symbol`
- 新增 `market` 欄位區分台股/美股
- 這是合理的設計改進，支援更靈活的快取策略

---

### 1.11 額外資料表

現有實作包含規格文件未定義的額外資料表：

| 資料表 | 用途 | 狀態 |
|-------|------|------|
| userSearchBehavior | 使用者搜尋行為追蹤 | ⚠️ 額外功能 |

**說明**: 這是為了支援個人化搜尋排序功能而新增的資料表

---

## 二、API 路由比對

### 2.1 認證 API (auth.*)

| API | 規格文件 | 現有實作 | 狀態 |
|-----|---------|---------|------|
| auth.me | Query, Public | ✅ 相符 | ✅ |
| auth.logout | Mutation, Public | ✅ 相符 | ✅ |

**結論**: 認證 API 完全符合規格

---

### 2.2 台股 API (twStock.*)

| API | 規格文件 | 現有實作 | 狀態 |
|-----|---------|---------|------|
| twStock.search | Query, Public | ✅ 相符 | ✅ |
| twStock.getDetail | Query, Public | ✅ 相符 | ✅ |
| twStock.getHistorical | Query, Public | ✅ 相符 (即時 API) | ✅ |
| twStock.getLatestPrice | Query, Public | ✅ 相符 (即時 API) | ✅ |
| twStock.getBatchLatestPrices | Query, Public | ✅ 相符 (即時 API) | ✅ |
| twStock.getSyncStatus | Query, Public | ✅ 相符 | ✅ |
| twStock.triggerSync | Mutation, Protected (Admin) | ✅ 相符 | ✅ |
| twStock.getRecentPrices | - | ✅ 已實作 | ⚠️ 額外 API |
| twStock.getActiveStocks | - | ✅ 已實作 | ⚠️ 額外 API |
| twStock.getStatistics | - | ✅ 已實作 | ⚠️ 額外 API |

**差異說明**:
- 現有實作多了 `getRecentPrices`、`getActiveStocks`、`getStatistics` 等 API
- 這些是合理的功能擴展

---

### 2.3 美股 API (usStock.*)

| API | 規格文件 | 現有實作 | 狀態 |
|-----|---------|---------|------|
| usStock.search | Query, Public | ✅ 相符 | ✅ |
| usStock.getDetail | Query, Public | ✅ 相符 | ✅ |
| usStock.getHistorical | Query, Public | ✅ 相符 (即時 API) | ✅ |
| usStock.getLatestPrice | Query, Public | ✅ 相符 (即時 API) | ✅ |
| usStock.getCacheStatus | Query, Public | ✅ 相符 | ✅ |
| usStock.clearCache | Mutation, Protected (Admin) | ✅ 相符 | ✅ |
| usStock.getSyncStatus | Query, Public | ✅ 相符 | ✅ |
| usStock.getSyncErrors | Query, Protected (Admin) | Query, Public | ⚠️ 權限差異 |
| usStock.getStatistics | Query, Public | ✅ 相符 | ✅ |

**差異說明**:
- `getSyncErrors` 在規格中要求 Admin 權限，但現有實作為 Public

---

### 2.4 系統 API (system.*)

| API | 規格文件 | 現有實作 | 狀態 |
|-----|---------|---------|------|
| system.notifyOwner | Mutation, Protected | ✅ 相符 | ✅ |

**結論**: 系統 API 符合規格

---

### 2.5 額外 API

現有實作包含規格文件未定義的額外 API：

| Router | API | 用途 |
|--------|-----|------|
| search | unified | 統一搜尋（台美股） |
| stock | getStockData | 通用股票數據查詢 |
| exchangeRate | getUSDToTWD | 匯率查詢 |
| syncMonitor | getTwSyncStatus | 台股同步監控 |
| syncMonitor | getUsSyncStatus | 美股同步監控 |
| syncMonitor | getOverallHealth | 整體健康狀態 |
| syncMonitor | getSyncErrors | 同步錯誤查詢 |

---

## 三、設計決策差異總結

### 3.1 重大設計變更

1. **價格資料儲存策略變更**
   - 規格：建立 `twStockPrices` 和 `usStockPrices` 資料表儲存歷史價格
   - 實作：改為即時呼叫 TWSE/TwelveData API，不儲存歷史價格
   - 影響：減少資料庫儲存空間，但增加 API 呼叫次數

2. **快取策略優化**
   - 規格：使用 `symbol` + `dataType` 作為快取鍵
   - 實作：使用 `cacheKey` 作為唯一識別，支援更靈活的快取策略

### 3.2 功能擴展

1. 新增 `userSearchBehavior` 資料表支援個人化搜尋
2. 新增 `search.unified` API 支援台美股統一搜尋
3. 新增 `syncMonitor` Router 提供完整的同步監控功能
4. 新增 `exchangeRate` Router 提供匯率查詢功能

### 3.3 待修正項目

1. `usStocks.currency` 欄位應加上 DEFAULT 'USD'
2. `usStock.getSyncErrors` API 權限應改為 Protected (Admin only)

---

## 四、建議行動

### 4.1 需要修正的項目

| 優先級 | 項目 | 說明 |
|-------|------|------|
| 中 | usStocks.currency DEFAULT | 加上 DEFAULT 'USD' |
| 低 | usStock.getSyncErrors 權限 | 改為 protectedProcedure 並檢查 admin 角色 |

### 4.2 建議保留的設計變更

| 項目 | 原因 |
|------|------|
| 即時 API 取代價格資料表 | 減少儲存空間，資料更即時 |
| cacheKey 快取策略 | 更靈活的快取管理 |
| 額外功能擴展 | 提升使用者體驗 |

---

**分析結論**: 現有實作大致符合規格文件要求，主要差異為設計決策的優化變更，這些變更是合理的技術選擇。建議將上述分析結果更新至規格文件，以保持文件與實作的一致性。

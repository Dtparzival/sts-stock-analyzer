# STS 台美股投資分析平台 - 系統設計規格文件

**專案名稱**: STS (Stock Trading System) - 台美股投資分析平台  
**文件版本**: v1.0  
**文件類型**: System Design Specification (SD)  
**交付日期**: 2024年12月  
**作者**: Manus AI

---

## 一、文件概述

### 1.1 文件目的

本文件為 STS 台美股投資分析平台的系統設計規格文件（System Design Specification），旨在提供完整的技術架構設計、資料庫設計、API 設計、以及系統實作細節。本文件基於『投資分析平台資料庫系統文件 v5.0 精簡整合版』的需求與架構設計，結合 Manus Web App Template (tRPC + Manus Auth + Database) 的技術棧，提供可執行的技術規格。

本文件的主要讀者為系統開發人員、架構師、以及專案管理人員，用於指導系統的開發、測試、部署與維護工作。

### 1.2 專案背景

STS 平台是一個整合台股與美股市場資料的投資分析系統，提供股票基本資料查詢、歷史價格分析、技術指標計算等功能。系統採用雙資料源策略：台股使用 **FinMind API**，美股使用 **TwelveData API**，並針對不同股票類型實施差異化同步策略，確保資料的一致性、完整性與可靠性。

系統的核心設計理念為**精簡化 + 雙市場 + 混合同步**，專注於核心資料的穩定性與可靠性，同時為未來的進階功能（如技術分析、基本面分析、投資組合管理等）預留擴展空間。

### 1.3 系統目標

本系統的核心目標包括：

1. **建立精簡的雙市場資料庫架構**，涵蓋台股與美股的基本資料與歷史價格資料
2. **整合雙資料源**，實作穩定的 API 整合層，處理資料轉換、驗證與錯誤處理
3. **實作差異化同步機制**：
   - 台股：定期批次同步（全部股票，約 2,000 支）
   - 美股（S&P 500 + 主要 ETF）：定期批次同步（重要股票，約 532 支）
   - 美股（其他）：即時查詢 + 快取（靈活查詢）
4. **提供統一的 tRPC API 介面**，支援前端應用的各種查詢需求
5. **建立資料驗證和品質檢查工具**，確保資料的準確性與可靠性
6. **實作使用者認證與授權機制**，基於 Manus OAuth 提供安全的使用者管理

### 1.4 文件範圍

本文件涵蓋以下內容：

- **系統架構設計**：整體架構、技術棧選擇、部署架構
- **資料庫設計**：資料表設計、索引設計、資料關聯、儲存空間估算
- **API 設計**：tRPC API 介面設計、端點定義、請求/回應格式
- **資料同步機制**：台股與美股的同步策略、排程設計、錯誤處理
- **前端架構設計**：頁面結構、路由設計、狀態管理、UI/UX 設計原則
- **效能與成本分析**：查詢效能、API 成本、儲存空間優化
- **安全性設計**：認證授權、資料加密、API 安全
- **監控與維護**：監控指標、日誌管理、備份策略

本文件不涵蓋以下內容：

- 詳細的程式碼實作（請參考原始碼）
- 前端 UI 設計稿（將在 UI/UX 設計文件中提供）
- 部署與運維手冊（將在運維文件中提供）

---

## 二、系統架構設計

### 2.1 整體架構

STS 平台採用**前後端分離**的架構設計，基於 **tRPC** 實現端到端型別安全的 API 通訊。系統整體架構如下：

```
┌─────────────────────────────────────────────────────────────┐
│                         使用者層                              │
│                    (Web Browser / Mobile)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         前端層                                │
│                  React 19 + Tailwind 4                       │
│              tRPC Client + React Query                       │
│                    Wouter (Routing)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ tRPC (Type-safe RPC)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         後端層                                │
│                   Express 4 + tRPC 11                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API 介面層 (routers.ts)                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │   │
│  │  │ Auth API │  │ TW Stock │  │ US Stock │         │   │
│  │  │          │  │   API    │  │   API    │         │   │
│  │  └──────────┘  └──────────┘  └──────────┘         │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            業務邏輯層 (db.ts, db_us.ts)              │   │
│  │  - 資料查詢與操作                                     │   │
│  │  - 資料驗證與轉換                                     │   │
│  │  - 快取管理                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          資料同步層 (jobs/syncTwStockData.ts,        │   │
│  │          jobs/syncUsStockDataScheduled.ts)           │   │
│  │  - 定期批次同步 (台股 + 美股重要股票)                 │   │
│  │  - 即時查詢 + 快取 (美股其他股票)                     │   │
│  │  - 排程管理 (node-cron)                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        API 整合層 (integrations/finmind.ts,          │   │
│  │        integrations/twelvedata.ts)                   │   │
│  │  - FinMind API 整合 (台股)                           │   │
│  │  - TwelveData API 整合 (美股)                        │   │
│  │  - 資料轉換與驗證                                     │   │
│  │  - 錯誤處理與重試                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
         ┌────────────────────┴────────────────────┐
         │                                          │
         ↓                                          ↓
┌──────────────────┐                      ┌──────────────────┐
│   資料儲存層      │                      │   外部 API 層     │
│                  │                      │                  │
│  ┌────────────┐  │                      │  ┌────────────┐  │
│  │   MySQL    │  │                      │  │  FinMind   │  │
│  │   / TiDB   │  │                      │  │    API     │  │
│  └────────────┘  │                      │  └────────────┘  │
│                  │                      │                  │
│  ┌────────────┐  │                      │  ┌────────────┐  │
│  │   Redis    │  │                      │  │ TwelveData │  │
│  │  (Cache)   │  │                      │  │    API     │  │
│  └────────────┘  │                      │  └────────────┘  │
└──────────────────┘                      └──────────────────┘
```

### 2.2 技術棧選擇

系統採用現代化的技術棧，確保開發效率、型別安全、以及系統效能。

#### 前端技術棧

| 技術 | 版本 | 用途 | 選擇理由 |
|-----|------|------|---------|
| **React** | 19.x | UI 框架 | 成熟的生態系統、優秀的效能、豐富的社群資源 |
| **TypeScript** | 5.x | 程式語言 | 型別安全、提升程式碼品質、減少執行時錯誤 |
| **Tailwind CSS** | 4.x | CSS 框架 | Utility-first、快速開發、一致的設計語言 |
| **tRPC Client** | 11.x | API 通訊 | 端到端型別安全、自動型別推導、減少樣板程式碼 |
| **React Query** | 5.x | 狀態管理 | 強大的快取機制、自動重新取得、樂觀更新 |
| **Wouter** | 3.x | 路由管理 | 輕量級、簡潔的 API、支援 SSR |
| **shadcn/ui** | Latest | UI 元件庫 | 可客製化、無依賴、基於 Radix UI |
| **Vite** | 5.x | 建置工具 | 快速的 HMR、優秀的開發體驗 |

#### 後端技術棧

| 技術 | 版本 | 用途 | 選擇理由 |
|-----|------|------|---------|
| **Node.js** | 22.x | 執行環境 | 非同步 I/O、豐富的生態系統、與前端共用語言 |
| **TypeScript** | 5.x | 程式語言 | 型別安全、提升程式碼品質 |
| **Express** | 4.x | Web 框架 | 成熟穩定、中介軟體生態豐富 |
| **tRPC** | 11.x | API 框架 | 端到端型別安全、減少 API 定義成本 |
| **Drizzle ORM** | Latest | ORM 框架 | 輕量級、型別安全、效能優秀 |
| **node-cron** | 3.x | 排程管理 | 簡潔的 API、支援 cron 語法 |
| **Zod** | 3.x | 資料驗證 | 型別安全的 schema 驗證、與 TypeScript 整合 |
| **SuperJSON** | 2.x | 資料序列化 | 支援 Date、Map、Set 等複雜型別 |

#### 資料庫與快取

| 技術 | 版本 | 用途 | 選擇理由 |
|-----|------|------|---------|
| **MySQL** | 8.0+ | 主要資料庫 | 成熟穩定、ACID 保證、豐富的索引支援 |
| **TiDB** | 7.x | 分散式資料庫 | 相容 MySQL、水平擴展、高可用性 |
| **Redis** | 6.0+ | 快取層 | 高效能、支援多種資料結構、持久化選項 |

#### 外部 API

| API | 版本 | 用途 | 選擇理由 |
|-----|------|------|---------|
| **FinMind API** | Latest | 台股資料來源 | 免費、資料完整、更新及時 |
| **TwelveData API** | Latest | 美股資料來源 | 資料品質高、支援多種時間區間、免費額度充足 |

### 2.3 部署架構

系統採用容器化部署，支援水平擴展與高可用性。

```
┌─────────────────────────────────────────────────────────────┐
│                         Load Balancer                        │
│                        (Nginx / Caddy)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
         ┌────────────────────┴────────────────────┐
         │                                          │
         ↓                                          ↓
┌──────────────────┐                      ┌──────────────────┐
│   Web Server 1   │                      │   Web Server 2   │
│                  │                      │                  │
│  Express + tRPC  │                      │  Express + tRPC  │
│                  │                      │                  │
│  Static Assets   │                      │  Static Assets   │
│  (React SPA)     │                      │  (React SPA)     │
└──────────────────┘                      └──────────────────┘
         │                                          │
         └────────────────────┬────────────────────┘
                              │
                              │
         ┌────────────────────┴────────────────────┐
         │                                          │
         ↓                                          ↓
┌──────────────────┐                      ┌──────────────────┐
│   MySQL Master   │◄────Replication────► │   MySQL Slave    │
│                  │                      │   (Read Replica) │
└──────────────────┘                      └──────────────────┘
         │
         │
         ↓
┌──────────────────┐
│   Redis Cluster  │
│   (Cache Layer)  │
└──────────────────┘
```

**部署特性**：

- **負載平衡**：使用 Nginx 或 Caddy 進行負載平衡，支援多個 Web Server 實例
- **水平擴展**：Web Server 無狀態設計，可根據負載動態擴展
- **資料庫讀寫分離**：Master 處理寫入，Slave 處理讀取，提升查詢效能
- **快取層**：Redis Cluster 提供高效能快取，降低資料庫負載
- **容器化**：所有服務使用 Docker 容器化，便於部署與管理

### 2.4 資料流設計

#### 台股資料流

```
定期同步 (每交易日凌晨 02:00)
    │
    ↓
┌─────────────────┐
│  FinMind API    │
│  TaiwanStockInfo│
│  TaiwanStockPrice│
└─────────────────┘
    │
    │ HTTP Request
    ↓
┌─────────────────┐
│  API 整合層      │
│  - 資料轉換      │
│  - 資料驗證      │
│  - 錯誤處理      │
└─────────────────┘
    │
    │ Transformed Data
    ↓
┌─────────────────┐
│  資料庫操作層    │
│  - Batch Upsert │
│  - 同步狀態記錄  │
│  - 錯誤記錄      │
└─────────────────┘
    │
    │ SQL Insert/Update
    ↓
┌─────────────────┐
│  MySQL Database │
│  - twStocks     │
│  - twStockPrices│
└─────────────────┘
    │
    │ tRPC Query
    ↓
┌─────────────────┐
│  前端應用        │
│  - 股票搜尋      │
│  - 價格查詢      │
│  - 圖表顯示      │
└─────────────────┘
```

#### 美股資料流（定期同步）

```
定期同步 (每交易日凌晨 06:00)
S&P 500 + 主要 ETF (~532 支)
    │
    ↓
┌─────────────────┐
│ TwelveData API  │
│  - Quote        │
│  - Time Series  │
└─────────────────┘
    │
    │ HTTP Request (每次間隔 8 秒)
    ↓
┌─────────────────┐
│  API 整合層      │
│  - 資料轉換      │
│  - 價格單位轉換  │
│  - 錯誤處理      │
└─────────────────┘
    │
    │ Transformed Data
    ↓
┌─────────────────┐
│  資料庫操作層    │
│  - Batch Upsert │
│  - 同步狀態記錄  │
│  - 錯誤記錄      │
└─────────────────┘
    │
    │ SQL Insert/Update
    ↓
┌─────────────────┐
│  MySQL Database │
│  - usStocks     │
│  - usStockPrices│
└─────────────────┘
    │
    │ tRPC Query
    ↓
┌─────────────────┐
│  前端應用        │
│  - 股票搜尋      │
│  - 價格查詢      │
│  - 圖表顯示      │
└─────────────────┘
```

#### 美股資料流（即時查詢）

```
使用者請求
    │
    ↓
┌─────────────────┐
│  前端應用        │
│  tRPC Query     │
└─────────────────┘
    │
    │ tRPC Request
    ↓
┌─────────────────┐
│  tRPC Router    │
│  usStock.getDetail│
└─────────────────┘
    │
    │ Check Cache
    ↓
┌─────────────────┐
│  Redis Cache    │
│  TTL: 30 分鐘   │
└─────────────────┘
    │
    │ Cache Miss
    ↓
┌─────────────────┐
│  MySQL Cache    │
│  stockDataCache │
│  TTL: 1-24 小時 │
└─────────────────┘
    │
    │ Cache Miss
    ↓
┌─────────────────┐
│ TwelveData API  │
│  Real-time Quote│
└─────────────────┘
    │
    │ API Response
    ↓
┌─────────────────┐
│  快取寫入        │
│  - Redis        │
│  - MySQL        │
└─────────────────┘
    │
    │ Return Data
    ↓
┌─────────────────┐
│  前端應用        │
│  顯示股票資訊    │
└─────────────────┘
```

---

## 三、資料庫設計

### 3.1 資料庫架構概述

STS 平台包含 **8 個核心資料表** 與 **1 個快取資料表**，分為台股（4 個）、美股（4 個）、使用者（1 個）三大類別。所有價格欄位使用 **INT** 型別儲存（台股以分為單位、美股以美分為單位），避免浮點數精度問題，並在應用層進行格式轉換。

**資料表清單**：

| 類別 | 資料表名稱 | 用途 | 記錄數估算 |
|-----|-----------|------|-----------|
| 使用者 | users | 使用者基本資料與認證資訊 | ~1,000 |
| 台股 | twStocks | 台股基本資料 | ~2,000 |
| 台股 | twStockPrices | 台股歷史價格 | ~2,500,000 (5年) |
| 台股 | twDataSyncStatus | 台股同步狀態記錄 | ~100 |
| 台股 | twDataSyncErrors | 台股同步錯誤記錄 | ~1,000 |
| 美股 | usStocks | 美股基本資料 | ~5,252 |
| 美股 | usStockPrices | 美股歷史價格 | ~333,000 (5年) |
| 美股 | usDataSyncStatus | 美股同步狀態記錄 | ~100 |
| 美股 | usDataSyncErrors | 美股同步錯誤記錄 | ~1,000 |
| 快取 | stockDataCache | 美股即時查詢快取 | ~5,000 |

### 3.2 使用者資料表設計

#### users - 使用者資料表

此表儲存使用者的基本資訊與認證資料，基於 Manus OAuth 進行使用者管理。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| openId | VARCHAR(64) | Manus OAuth 識別碼 | NOT NULL, UNIQUE | 唯一識別使用者 |
| name | TEXT | 使用者名稱 | NULLABLE | 顯示名稱 |
| email | VARCHAR(320) | 電子郵件 | NULLABLE | 聯絡信箱 |
| loginMethod | VARCHAR(64) | 登入方式 | NULLABLE | 例如: google, github |
| role | ENUM('user', 'admin') | 使用者角色 | NOT NULL, DEFAULT 'user' | 權限控制 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 註冊時間 |
| updatedAt | TIMESTAMP | 更新時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 最後更新時間 |
| lastSignedIn | TIMESTAMP | 最後登入時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 追蹤活躍度 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 唯一索引：`UNIQUE INDEX idx_openId (openId)`
- 一般索引：`INDEX idx_role (role)`

**資料來源**：Manus OAuth API

### 3.3 台股資料表設計

#### twStocks - 台股基本資料表

此表儲存台股的基本資訊，包含股票代號、名稱、市場類型、產業分類等靜態資料。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| symbol | VARCHAR(10) | 股票代號 | NOT NULL, UNIQUE | 例如: 2330 |
| name | VARCHAR(100) | 股票名稱 | NOT NULL | 完整公司名稱 |
| shortName | VARCHAR(50) | 股票簡稱 | NULLABLE | 例如: 台積電 |
| market | ENUM('TWSE', 'TPEx') | 市場類型 | NOT NULL | 上市/上櫃 |
| industry | VARCHAR(50) | 產業分類 | NULLABLE | 依證交所分類 |
| isActive | BOOLEAN | 是否活躍 | NOT NULL, DEFAULT TRUE | 標記下市股票 |
| listedDate | DATE | 上市日期 | NULLABLE | 首次掛牌日期 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |
| updatedAt | TIMESTAMP | 更新時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 最後更新時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 唯一索引：`UNIQUE INDEX idx_symbol (symbol)`
- 一般索引：`INDEX idx_market (market)`
- 一般索引：`INDEX idx_industry (industry)`
- 一般索引：`INDEX idx_isActive (isActive)`
- 複合索引：`INDEX idx_market_isActive (market, isActive)`

**資料來源**：FinMind API - `TaiwanStockInfo` 端點

#### twStockPrices - 台股歷史價格表

此表儲存台股的每日交易資料，包含開高低收價格、成交量、成交金額等資訊。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| symbol | VARCHAR(10) | 股票代號 | NOT NULL | 關聯 twStocks |
| date | DATE | 交易日期 | NOT NULL | 格式: YYYY-MM-DD |
| open | INT | 開盤價 | NOT NULL | 以分為單位，例如: 12345 = 123.45 元 |
| high | INT | 最高價 | NOT NULL | 以分為單位 |
| low | INT | 最低價 | NOT NULL | 以分為單位 |
| close | INT | 收盤價 | NOT NULL | 以分為單位 |
| volume | BIGINT | 成交量 | NOT NULL | 單位: 股 |
| amount | BIGINT | 成交金額 | NOT NULL | 單位: 元 |
| change | INT | 漲跌 | NOT NULL | 以分為單位 |
| changePercent | INT | 漲跌幅 | NOT NULL | 以基點為單位(萬分之一)，例如: 325 = 3.25% |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 唯一索引：`UNIQUE INDEX idx_symbol_date (symbol, date)`
- 一般索引：`INDEX idx_date (date)`
- 一般索引：`INDEX idx_symbol (symbol)`

**資料來源**：FinMind API - `TaiwanStockPrice` 端點

**價格儲存格式說明**：
- 所有價格欄位（open, high, low, close, change）以**分**為單位儲存
  - 例如：股價 123.45 元儲存為 12345
- 漲跌幅以**基點**（萬分之一）為單位儲存
  - 例如：漲幅 3.25% 儲存為 325
- 此設計避免浮點數精度問題，確保財務計算的準確性
- 前端顯示時需除以 100（價格）或 10000（漲跌幅）進行格式轉換

#### twDataSyncStatus - 台股資料同步狀態表

此表記錄台股各類資料的同步狀態，用於監控資料更新情況與排程執行結果。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| dataType | VARCHAR(50) | 資料類型 | NOT NULL | stocks / prices |
| source | VARCHAR(50) | 資料來源 | NOT NULL | finmind |
| lastSyncAt | TIMESTAMP | 最後同步時間 | NOT NULL | UTC 時區 |
| status | ENUM('success', 'partial', 'failed') | 狀態 | NOT NULL | 同步結果 |
| recordCount | INT | 記錄數 | NOT NULL, DEFAULT 0 | 本次同步筆數 |
| errorMessage | TEXT | 錯誤訊息 | NULLABLE | 失敗時記錄 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |
| updatedAt | TIMESTAMP | 更新時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 最後更新時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 複合索引：`INDEX idx_dataType_source (dataType, source)`
- 一般索引：`INDEX idx_lastSyncAt (lastSyncAt)`

#### twDataSyncErrors - 台股資料同步錯誤記錄表

此表詳細記錄台股同步過程中發生的錯誤，包含錯誤類型、錯誤訊息、堆疊追蹤等資訊。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| dataType | VARCHAR(50) | 資料類型 | NOT NULL | stocks / prices |
| symbol | VARCHAR(10) | 股票代號 | NULLABLE | 可為空（系統級錯誤） |
| errorType | VARCHAR(50) | 錯誤類型 | NOT NULL | API / Network / Parse |
| errorMessage | TEXT | 錯誤訊息 | NOT NULL | 錯誤描述 |
| errorStack | TEXT | 錯誤堆疊 | NULLABLE | 完整堆疊追蹤 |
| retryCount | INT | 重試次數 | NOT NULL, DEFAULT 0 | 重試次數 |
| resolved | BOOLEAN | 是否已解決 | NOT NULL, DEFAULT FALSE | 錯誤狀態 |
| syncedAt | TIMESTAMP | 同步時間 | NOT NULL | 錯誤發生時間 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 一般索引：`INDEX idx_symbol (symbol)`
- 一般索引：`INDEX idx_resolved (resolved)`
- 複合索引：`INDEX idx_dataType_resolved (dataType, resolved)`

### 3.4 美股資料表設計

#### usStocks - 美股基本資料表

此表儲存美股的基本資訊，包含股票代號、公司名稱、交易所等靜態資料。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| symbol | VARCHAR(20) | 股票代號 | NOT NULL, UNIQUE | 例如: AAPL |
| name | VARCHAR(200) | 公司全名 | NOT NULL | 完整公司名稱 |
| shortName | VARCHAR(100) | 公司簡稱 | NULLABLE | 常用簡稱 |
| exchange | VARCHAR(20) | 交易所 | NULLABLE | 例如: NASDAQ, NYSE |
| currency | VARCHAR(10) | 幣別 | NOT NULL, DEFAULT 'USD' | 例如: USD |
| country | VARCHAR(50) | 國家 | NULLABLE | 例如: United States |
| sector | VARCHAR(100) | 產業類別 | NULLABLE | 例如: Technology |
| industry | VARCHAR(100) | 產業細分 | NULLABLE | 例如: Consumer Electronics |
| isActive | BOOLEAN | 是否活躍 | NOT NULL, DEFAULT TRUE | 標記下市股票 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |
| updatedAt | TIMESTAMP | 更新時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 最後更新時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 唯一索引：`UNIQUE INDEX idx_symbol (symbol)`
- 一般索引：`INDEX idx_exchange (exchange)`
- 一般索引：`INDEX idx_sector (sector)`
- 一般索引：`INDEX idx_isActive (isActive)`
- 複合索引：`INDEX idx_exchange_isActive (exchange, isActive)`

**資料來源**：TwelveData API - `quote` 端點

#### usStockPrices - 美股歷史價格表

此表儲存美股的每日交易資料，包含開高低收價格、成交量等資訊。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| symbol | VARCHAR(20) | 股票代號 | NOT NULL | 關聯 usStocks |
| date | DATE | 交易日期 | NOT NULL | 格式: YYYY-MM-DD |
| open | INT | 開盤價 | NOT NULL | 以美分為單位，例如: 15025 = $150.25 |
| high | INT | 最高價 | NOT NULL | 以美分為單位 |
| low | INT | 最低價 | NOT NULL | 以美分為單位 |
| close | INT | 收盤價 | NOT NULL | 以美分為單位 |
| volume | BIGINT | 成交量 | NOT NULL | 單位: 股 |
| change | INT | 漲跌 | NOT NULL | 以美分為單位 |
| changePercent | INT | 漲跌幅 | NOT NULL | 以基點為單位（萬分之一） |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 唯一索引：`UNIQUE INDEX idx_symbol_date (symbol, date)`
- 一般索引：`INDEX idx_date (date)`
- 一般索引：`INDEX idx_symbol (symbol)`

**資料來源**：TwelveData API - `time_series` 端點

**價格儲存格式說明**：
- 所有價格欄位以**美分**為單位儲存
  - 例如：股價 $150.25 儲存為 15025
- 前端顯示時需除以 100 進行格式轉換

#### usDataSyncStatus - 美股資料同步狀態表

此表記錄美股各類資料的同步狀態，包含定期同步與快取管理。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| dataType | VARCHAR(50) | 資料類型 | NOT NULL | stocks / prices / cache |
| source | VARCHAR(50) | 資料來源 | NOT NULL | twelvedata |
| lastSyncAt | TIMESTAMP | 最後同步時間 | NOT NULL | UTC 時區 |
| status | ENUM('success', 'partial', 'failed') | 狀態 | NOT NULL | 同步結果 |
| recordCount | INT | 記錄數 | NOT NULL, DEFAULT 0 | 本次同步筆數 |
| errorMessage | TEXT | 錯誤訊息 | NULLABLE | 失敗時記錄 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |
| updatedAt | TIMESTAMP | 更新時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 最後更新時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 複合索引：`INDEX idx_dataType_source (dataType, source)`
- 一般索引：`INDEX idx_lastSyncAt (lastSyncAt)`

#### usDataSyncErrors - 美股資料同步錯誤記錄表

此表詳細記錄美股同步過程中發生的錯誤。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| dataType | VARCHAR(50) | 資料類型 | NOT NULL | stocks / prices / cache |
| symbol | VARCHAR(20) | 股票代號 | NULLABLE | 可為空（系統級錯誤） |
| errorType | VARCHAR(50) | 錯誤類型 | NOT NULL | API / Network / Parse |
| errorMessage | TEXT | 錯誤訊息 | NOT NULL | 錯誤描述 |
| errorStack | TEXT | 錯誤堆疊 | NULLABLE | 完整堆疊追蹤 |
| retryCount | INT | 重試次數 | NOT NULL, DEFAULT 0 | 重試次數 |
| resolved | BOOLEAN | 是否已解決 | NOT NULL, DEFAULT FALSE | 錯誤狀態 |
| syncedAt | TIMESTAMP | 同步時間 | NOT NULL | 錯誤發生時間 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 一般索引：`INDEX idx_symbol (symbol)`
- 一般索引：`INDEX idx_resolved (resolved)`
- 複合索引：`INDEX idx_dataType_resolved (dataType, resolved)`

### 3.5 快取資料表設計

#### stockDataCache - 美股即時查詢快取表

此表用於快取美股即時查詢的結果，減少對外部 API 的呼叫次數。

| 欄位名稱 | 型別 | 說明 | 約束 | 備註 |
|---------|------|------|------|------|
| id | INT | 主鍵 | PK, AUTO_INCREMENT | 自動遞增 |
| symbol | VARCHAR(20) | 股票代號 | NOT NULL, UNIQUE | 例如: AAPL |
| dataType | VARCHAR(50) | 資料類型 | NOT NULL | quote / timeseries / company |
| data | TEXT | 快取資料 | NOT NULL | JSON 格式 |
| expiresAt | TIMESTAMP | 過期時間 | NOT NULL | 快取過期時間 |
| createdAt | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 記錄建立時間 |
| updatedAt | TIMESTAMP | 更新時間 | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 最後更新時間 |

**索引設計**：
- 主鍵索引：`PRIMARY KEY (id)`
- 唯一索引：`UNIQUE INDEX idx_symbol_dataType (symbol, dataType)`
- 一般索引：`INDEX idx_expiresAt (expiresAt)`

**快取策略**：
- **quote（即時報價）**：快取時間 1 小時
- **timeseries（歷史數據）**：快取時間 1 小時
- **company（公司資訊）**：快取時間 24 小時

### 3.6 資料表關聯圖

```
┌─────────────────┐
│     users       │
│  (使用者資料)    │
└─────────────────┘
        │
        │ (無直接關聯，透過應用層控制存取權限)
        │
        ↓
┌─────────────────────────────────────────────────────────────┐
│                         台股資料                              │
│                                                               │
│  ┌─────────────┐                                             │
│  │  twStocks   │                                             │
│  │ (基本資料)   │                                             │
│  └─────────────┘                                             │
│        │                                                      │
│        │ symbol (1:N)                                        │
│        ↓                                                      │
│  ┌─────────────┐                                             │
│  │twStockPrices│                                             │
│  │ (歷史價格)   │                                             │
│  └─────────────┘                                             │
│                                                               │
│  ┌─────────────────┐      ┌──────────────────┐             │
│  │twDataSyncStatus │      │twDataSyncErrors  │             │
│  │  (同步狀態)      │      │  (錯誤記錄)       │             │
│  └─────────────────┘      └──────────────────┘             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         美股資料                              │
│                                                               │
│  ┌─────────────┐                                             │
│  │  usStocks   │                                             │
│  │ (基本資料)   │                                             │
│  └─────────────┘                                             │
│        │                                                      │
│        │ symbol (1:N)                                        │
│        ↓                                                      │
│  ┌─────────────┐                                             │
│  │usStockPrices│                                             │
│  │ (歷史價格)   │                                             │
│  └─────────────┘                                             │
│                                                               │
│  ┌─────────────────┐      ┌──────────────────┐             │
│  │usDataSyncStatus │      │usDataSyncErrors  │             │
│  │  (同步狀態)      │      │  (錯誤記錄)       │             │
│  └─────────────────┘      └──────────────────┘             │
│                                                               │
│  ┌─────────────────┐                                         │
│  │stockDataCache   │                                         │
│  │  (快取資料)      │                                         │
│  └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

**關聯說明**：
- 台股與美股資料完全獨立，無跨市場關聯
- 透過 `symbol` 欄位進行關聯
- 未使用外鍵約束以提升寫入效能，由應用層確保資料一致性
- 使用者資料與股票資料無直接關聯，透過應用層控制存取權限

### 3.7 儲存空間估算

#### 台股（2,000 檔股票，5 年歷史）

| 資料表 | 單筆大小 | 記錄數 | 總容量 |
|-------|---------|--------|--------|
| twStocks | ~300 bytes | 2,000 | ~0.6 MB |
| twStockPrices | ~100 bytes | 2,000 × 250 × 5 | ~250 MB |
| twDataSyncStatus | ~200 bytes | ~100 | ~0.02 MB |
| twDataSyncErrors | ~500 bytes | ~1,000 | ~0.5 MB |
| **小計** | - | - | **~251 MB** |

#### 美股（252 檔定期同步 + 5,000 檔快取，5 年歷史）

| 資料表 | 單筆大小 | 記錄數 | 總容量 |
|-------|---------|--------|--------|
| usStocks | ~400 bytes | 5,252 | ~2.1 MB |
| usStockPrices | ~120 bytes | 252 × 250 × 5 + 5,000 × 30 | ~195 MB |
| usDataSyncStatus | ~200 bytes | ~100 | ~0.02 MB |
| usDataSyncErrors | ~500 bytes | ~1,000 | ~0.5 MB |
| stockDataCache | ~2 KB | ~5,000 | ~10 MB |
| **小計** | - | - | **~207.6 MB** |

#### 使用者資料（1,000 使用者）

| 資料表 | 單筆大小 | 記錄數 | 總容量 |
|-------|---------|--------|--------|
| users | ~300 bytes | 1,000 | ~0.3 MB |

#### 總計

| 類別 | 容量 |
|-----|------|
| 使用者資料 | ~0.3 MB |
| 台股資料 | ~251 MB |
| 美股資料 | ~207.6 MB |
| 索引（約 30%） | ~137.7 MB |
| **總計** | **~596.6 MB (約 0.6 GB)** |

**說明**：
- 每年約 250 個交易日
- 美股定期同步僅 252 支股票（S&P 500 成分股 ~220 支 + 主要 ETF 32 支），大幅降低儲存需求
- 其餘美股採用快取策略，僅保留最近 30 天資料
- 相較於全量同步方案（~2.2 GB），儲存空間優化 **74%**

---

## 四、API 設計

### 4.1 API 架構設計

STS 平台採用 **tRPC** 作為 API 框架，提供端到端型別安全的 API 通訊。所有 API 端點均透過 tRPC Router 定義，並自動生成 TypeScript 型別定義。

**API 架構特性**：

- **端到端型別安全**：前後端共用型別定義，減少型別錯誤
- **自動型別推導**：無需手動定義 API 型別，由 tRPC 自動推導
- **統一錯誤處理**：透過 tRPC Error 提供一致的錯誤處理機制
- **請求驗證**：使用 Zod Schema 進行請求參數驗證
- **中介軟體支援**：支援認證、授權、日誌等中介軟體

**API 路由結構**：

```
/api/trpc/
├── auth.*                    # 認證相關 API
│   ├── me                    # 取得當前使用者資訊
│   └── logout                # 登出
├── twStock.*                 # 台股相關 API
│   ├── search                # 搜尋股票
│   ├── getDetail             # 取得股票詳情
│   ├── getHistorical         # 取得歷史價格
│   ├── getLatestPrice        # 取得最新價格
│   ├── getBatchLatestPrices  # 批次取得最新價格
│   ├── getSyncStatus         # 取得同步狀態
│   └── triggerSync           # 手動觸發同步
├── usStock.*                 # 美股相關 API
│   ├── search                # 搜尋股票
│   ├── getDetail             # 取得股票詳情（含即時報價）
│   ├── getHistorical         # 取得歷史價格
│   ├── getLatestPrice        # 取得最新價格
│   ├── getCacheStatus        # 取得快取狀態
│   ├── clearCache            # 清除快取
│   ├── getSyncStatus         # 取得同步狀態
│   ├── getSyncErrors         # 取得同步錯誤
│   └── getStatistics         # 取得統計資訊
└── system.*                  # 系統相關 API
    └── notifyOwner           # 通知系統管理員
```

### 4.2 認證 API

#### auth.me - 取得當前使用者資訊

**類型**：Query  
**權限**：Public（未登入時返回 null）

**請求參數**：無

**回應格式**：

```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
} | null
```

**使用範例**：

```typescript
const { data: user, isLoading } = trpc.auth.me.useQuery();

if (isLoading) return <div>Loading...</div>;
if (!user) return <div>Please login</div>;

return <div>Welcome, {user.name}</div>;
```

#### auth.logout - 登出

**類型**：Mutation  
**權限**：Public

**請求參數**：無

**回應格式**：

```typescript
{
  success: boolean;
}
```

**使用範例**：

```typescript
const logoutMutation = trpc.auth.logout.useMutation({
  onSuccess: () => {
    window.location.href = '/';
  }
});

<button onClick={() => logoutMutation.mutate()}>
  Logout
</button>
```

### 4.3 台股 API

#### twStock.search - 搜尋股票

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  query: string;      // 搜尋關鍵字（股票代號或名稱）
  limit?: number;     // 返回數量限制（預設 20）
  market?: 'TWSE' | 'TPEx' | 'all';  // 市場類型（預設 all）
  activeOnly?: boolean;  // 僅顯示活躍股票（預設 true）
}
```

**回應格式**：

```typescript
{
  stocks: Array<{
    id: number;
    symbol: string;
    name: string;
    shortName: string | null;
    market: 'TWSE' | 'TPEx';
    industry: string | null;
    isActive: boolean;
  }>;
  total: number;
}
```

**使用範例**：

```typescript
const { data, isLoading } = trpc.twStock.search.useQuery({
  query: '台積電',
  limit: 10,
  market: 'TWSE'
});
```

#### twStock.getDetail - 取得股票詳情

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbol: string;  // 股票代號（例如: 2330）
}
```

**回應格式**：

```typescript
{
  stock: {
    id: number;
    symbol: string;
    name: string;
    shortName: string | null;
    market: 'TWSE' | 'TPEx';
    industry: string | null;
    isActive: boolean;
    listedDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  latestPrice: {
    date: Date;
    open: number;      // 已轉換為元（除以 100）
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
    change: number;
    changePercent: number;  // 已轉換為百分比（除以 10000）
  } | null;
}
```

**使用範例**：

```typescript
const { data, isLoading } = trpc.twStock.getDetail.useQuery({
  symbol: '2330'
});

if (data) {
  console.log(`${data.stock.name} 最新價格: ${data.latestPrice?.close}`);
}
```

#### twStock.getHistorical - 取得歷史價格

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbol: string;      // 股票代號
  startDate: string;   // 開始日期（YYYY-MM-DD）
  endDate: string;     // 結束日期（YYYY-MM-DD）
  limit?: number;      // 返回數量限制（預設 100）
}
```

**回應格式**：

```typescript
{
  prices: Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
    change: number;
    changePercent: number;
  }>;
  total: number;
}
```

**使用範例**：

```typescript
const { data } = trpc.twStock.getHistorical.useQuery({
  symbol: '2330',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  limit: 250
});
```

#### twStock.getLatestPrice - 取得最新價格

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbol: string;  // 股票代號
}
```

**回應格式**：

```typescript
{
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  change: number;
  changePercent: number;
} | null
```

#### twStock.getBatchLatestPrices - 批次取得最新價格

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbols: string[];  // 股票代號陣列（最多 50 個）
}
```

**回應格式**：

```typescript
{
  prices: Record<string, {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
    change: number;
    changePercent: number;
  } | null>;
}
```

**使用範例**：

```typescript
const { data } = trpc.twStock.getBatchLatestPrices.useQuery({
  symbols: ['2330', '2317', '2454']
});

// data.prices['2330'] -> 台積電最新價格
// data.prices['2317'] -> 鴻海最新價格
```

#### twStock.getSyncStatus - 取得同步狀態

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  dataType?: 'stocks' | 'prices' | 'all';  // 資料類型（預設 all）
}
```

**回應格式**：

```typescript
{
  syncStatus: Array<{
    id: number;
    dataType: string;
    source: string;
    lastSyncAt: Date;
    status: 'success' | 'partial' | 'failed';
    recordCount: number;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}
```

#### twStock.triggerSync - 手動觸發同步

**類型**：Mutation  
**權限**：Protected (Admin only)

**請求參數**：

```typescript
{
  dataType: 'stocks' | 'prices';  // 資料類型
  symbol?: string;                // 特定股票代號（可選）
}
```

**回應格式**：

```typescript
{
  success: boolean;
  message: string;
  recordCount: number;
}
```

### 4.4 美股 API

#### usStock.search - 搜尋股票

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  query: string;      // 搜尋關鍵字（股票代號或名稱）
  limit?: number;     // 返回數量限制（預設 20）
  exchange?: string;  // 交易所（例如: NASDAQ, NYSE）
  sector?: string;    // 產業類別
  activeOnly?: boolean;  // 僅顯示活躍股票（預設 true）
}
```

**回應格式**：

```typescript
{
  stocks: Array<{
    id: number;
    symbol: string;
    name: string;
    shortName: string | null;
    exchange: string | null;
    currency: string;
    country: string | null;
    sector: string | null;
    industry: string | null;
    isActive: boolean;
  }>;
  total: number;
}
```

#### usStock.getDetail - 取得股票詳情（含即時報價）

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbol: string;  // 股票代號（例如: AAPL）
}
```

**回應格式**：

```typescript
{
  stock: {
    id: number;
    symbol: string;
    name: string;
    shortName: string | null;
    exchange: string | null;
    currency: string;
    country: string | null;
    sector: string | null;
    industry: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  latestPrice: {
    date: Date;
    open: number;      // 已轉換為美元（除以 100）
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;  // 已轉換為百分比（除以 10000）
  } | null;
  realtimeQuote?: {    // 即時報價（來自 TwelveData API）
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    volume: number;
    previousClose: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
  };
}
```

**使用範例**：

```typescript
const { data, isLoading } = trpc.usStock.getDetail.useQuery({
  symbol: 'AAPL'
});

if (data) {
  // 優先使用即時報價
  const price = data.realtimeQuote?.price || data.latestPrice?.close;
  console.log(`Apple 最新價格: $${price}`);
}
```

#### usStock.getHistorical - 取得歷史價格

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbol: string;      // 股票代號
  startDate: string;   // 開始日期（YYYY-MM-DD）
  endDate: string;     // 結束日期（YYYY-MM-DD）
  interval?: '1day' | '1week' | '1month';  // 時間區間（預設 1day）
  limit?: number;      // 返回數量限制（預設 100）
}
```

**回應格式**：

```typescript
{
  prices: Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
  }>;
  total: number;
  source: 'database' | 'api';  // 資料來源
}
```

**說明**：
- 對於定期同步的股票（S&P 500 + 主要 ETF），資料來自資料庫（`source: 'database'`）
- 對於其他股票，資料來自 TwelveData API 並快取（`source: 'api'`）

#### usStock.getLatestPrice - 取得最新價格

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbol: string;  // 股票代號
}
```

**回應格式**：

```typescript
{
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  source: 'database' | 'api';
} | null
```

#### usStock.getCacheStatus - 取得快取狀態

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  symbol: string;  // 股票代號
}
```

**回應格式**：

```typescript
{
  cached: boolean;
  expiresAt: Date | null;
  dataType: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
```

#### usStock.clearCache - 清除快取

**類型**：Mutation  
**權限**：Protected (Admin only)

**請求參數**：

```typescript
{
  symbol?: string;  // 股票代號（可選，不提供則清除所有快取）
}
```

**回應格式**：

```typescript
{
  success: boolean;
  message: string;
  clearedCount: number;
}
```

#### usStock.getSyncStatus - 取得同步狀態

**類型**：Query  
**權限**：Public

**請求參數**：

```typescript
{
  dataType?: 'stocks' | 'prices' | 'cache' | 'all';  // 資料類型（預設 all）
}
```

**回應格式**：

```typescript
{
  syncStatus: Array<{
    id: number;
    dataType: string;
    source: string;
    lastSyncAt: Date;
    status: 'success' | 'partial' | 'failed';
    recordCount: number;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}
```

#### usStock.getSyncErrors - 取得同步錯誤

**類型**：Query  
**權限**：Protected (Admin only)

**請求參數**：

```typescript
{
  resolved?: boolean;  // 是否已解決（可選）
  limit?: number;      // 返回數量限制（預設 50）
}
```

**回應格式**：

```typescript
{
  errors: Array<{
    id: number;
    dataType: string;
    symbol: string | null;
    errorType: string;
    errorMessage: string;
    errorStack: string | null;
    retryCount: number;
    resolved: boolean;
    syncedAt: Date;
    createdAt: Date;
  }>;
  total: number;
}
```

#### usStock.getStatistics - 取得統計資訊

**類型**：Query  
**權限**：Public

**請求參數**：無

**回應格式**：

```typescript
{
  totalStocks: number;
  activeStocks: number;
  scheduledSyncStocks: number;  // 定期同步股票數量
  cachedStocks: number;
  lastSyncAt: Date | null;
  syncStatus: 'success' | 'partial' | 'failed' | 'unknown';
}
```

### 4.5 系統 API

#### system.notifyOwner - 通知系統管理員

**類型**：Mutation  
**權限**：Protected

**請求參數**：

```typescript
{
  title: string;    // 通知標題
  content: string;  // 通知內容
}
```

**回應格式**：

```typescript
{
  success: boolean;
}
```

**使用範例**：

```typescript
const notifyMutation = trpc.system.notifyOwner.useMutation();

notifyMutation.mutate({
  title: '資料同步失敗',
  content: '台股價格同步失敗，請檢查 API 連線狀態。'
});
```

### 4.6 錯誤處理

tRPC 提供統一的錯誤處理機制，所有錯誤均透過 `TRPCError` 拋出。

**錯誤類型**：

| 錯誤代碼 | HTTP 狀態碼 | 說明 | 使用時機 |
|---------|-----------|------|---------|
| BAD_REQUEST | 400 | 請求參數錯誤 | 參數驗證失敗 |
| UNAUTHORIZED | 401 | 未授權 | 未登入 |
| FORBIDDEN | 403 | 禁止存取 | 權限不足 |
| NOT_FOUND | 404 | 資源不存在 | 查詢不到資料 |
| TIMEOUT | 408 | 請求逾時 | API 呼叫逾時 |
| CONFLICT | 409 | 資源衝突 | 資料重複 |
| INTERNAL_SERVER_ERROR | 500 | 伺服器錯誤 | 未預期的錯誤 |

**錯誤處理範例**：

```typescript
// 後端
import { TRPCError } from '@trpc/server';

export const getStockDetail = publicProcedure
  .input(z.object({ symbol: z.string() }))
  .query(async ({ input }) => {
    const stock = await getStockBySymbol(input.symbol);
    
    if (!stock) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Stock ${input.symbol} not found`
      });
    }
    
    return stock;
  });

// 前端
const { data, error, isLoading } = trpc.twStock.getDetail.useQuery({
  symbol: '2330'
});

if (error) {
  if (error.data?.code === 'NOT_FOUND') {
    return <div>股票不存在</div>;
  }
  return <div>發生錯誤: {error.message}</div>;
}
```

---

## 五、資料同步機制

### 5.1 同步策略概述

STS 平台採用**混合同步策略**，根據股票重要性與 API 特性選擇最佳同步方式：

| 市場 | 同步範圍 | 同步策略 | 排程時間 | 資料時效 |
|-----|---------|---------|---------|---------|
| **台股** | 全部股票 (~2,000 支) | 定期批次同步 | 凌晨 02:00 | T+1 |
| **美股（重要）** | S&P 500 + 主要 ETF (~532 支) | 定期批次同步 | 凌晨 06:00 | 最近 30 天 |
| **美股（其他）** | 非重要股票 | 即時查詢 + 快取 | 無排程 | 即時 |

**設計理念**：

1. **台股全量同步**：台股股票數量有限（~2,000 支），且 FinMind API 免費額度充足，採用全量同步確保資料完整性
2. **美股差異化同步**：美股股票數量龐大（>10,000 支），採用差異化策略平衡效能與成本
   - **重要股票定期同步**：S&P 500 成分股與主要 ETF 查詢頻率高，定期同步提升查詢速度與資料完整性
   - **其他股票即時查詢**：非重要股票採用即時查詢 + 快取策略，降低儲存成本與 API 呼叫次數
3. **錯峰執行**：台股與美股排程時間錯開（02:00 vs 06:00），分散系統負載

### 5.2 台股定期同步

**檔案位置**：`server/jobs/syncTwStockData.ts`

#### 排程時間表

| 資料類型 | 執行時間 | 頻率 | 資料時效 | 說明 |
|---------|---------|------|---------|------|
| 股票基本資料 | 每週日 02:00 | 每週 | 即時 | 更新股票清單與基本資訊 |
| 歷史價格資料 | 每交易日 02:00 | 每日 | T+1 | 同步前一交易日收盤價格 |

#### 同步流程

**股票基本資料同步**：

```
1. 排程觸發（每週日 02:00）
   ↓
2. 呼叫 FinMind API - TaiwanStockInfo
   ↓
3. 資料轉換與驗證
   - 欄位對應
   - 資料型別轉換
   - 必填欄位檢查
   ↓
4. 批次寫入資料庫（Batch Upsert）
   - 使用 ON DUPLICATE KEY UPDATE
   - 更新 updatedAt 時間戳
   ↓
5. 記錄同步狀態
   - 寫入 twDataSyncStatus
   - 成功/部分成功/失敗
   ↓
6. 錯誤處理
   - 記錄錯誤到 twDataSyncErrors
   - 發送通知給系統管理員
```

**歷史價格資料同步**：

```
1. 排程觸發（每交易日 02:00）
   ↓
2. 判斷前一日是否為交易日
   - 檢查台灣交易日曆
   - 排除週末與國定假日
   ↓
3. 取得所有活躍股票清單
   ↓
4. 批次呼叫 FinMind API - TaiwanStockPrice
   - 每批次 100 支股票
   - 請求間隔 1 秒
   ↓
5. 資料轉換與驗證
   - 價格單位轉換（元 → 分）
   - 漲跌幅計算（百分比 → 基點）
   - 資料完整性檢查
   ↓
6. 批次寫入資料庫（Batch Upsert）
   ↓
7. 記錄同步狀態與錯誤
   ↓
8. 發送同步完成通知
```

#### 交易日判斷邏輯

```typescript
/**
 * 判斷是否為台灣交易日
 * @param date 日期
 * @returns 是否為交易日
 */
function isTradingDay(date: Date): boolean {
  const day = date.getDay();
  
  // 排除週末
  if (day === 0 || day === 6) {
    return false;
  }
  
  // 排除國定假日（需維護假日清單）
  const holidays = [
    '2024-01-01', // 元旦
    '2024-02-10', // 農曆春節
    '2024-02-11',
    '2024-02-12',
    '2024-02-13',
    '2024-02-14',
    '2024-02-28', // 和平紀念日
    '2024-04-04', // 兒童節
    '2024-04-05', // 清明節
    '2024-06-10', // 端午節
    '2024-09-17', // 中秋節
    '2024-10-10', // 國慶日
    // ... 其他假日
  ];
  
  const dateStr = date.toISOString().split('T')[0];
  return !holidays.includes(dateStr);
}

/**
 * 取得前一個交易日
 * @param date 基準日期
 * @returns 前一個交易日
 */
function getPreviousTradingDay(date: Date): Date {
  let previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  
  while (!isTradingDay(previousDay)) {
    previousDay.setDate(previousDay.getDate() - 1);
  }
  
  return previousDay;
}
```

#### 錯誤處理機制

**指數退避重試策略**：

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms`);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // 最後一次重試失敗，記錄錯誤
        await insertTwDataSyncError({
          dataType: 'prices',
          symbol: symbol,
          errorType: 'API',
          errorMessage: error.message,
          errorStack: error.stack,
          retryCount: i + 1,
        });
        throw error;
      }
    }
  }
  throw new Error('Unreachable');
}
```

**錯誤分類與處理**：

| 錯誤類型 | 說明 | 處理方式 |
|---------|------|---------|
| API | API 回傳錯誤或限流 | 指數退避重試，記錄錯誤 |
| Network | 網路連線問題 | 重試 3 次，記錄錯誤 |
| Parse | 資料解析錯誤 | 記錄錯誤並跳過該筆資料 |
| Database | 資料庫寫入錯誤 | 記錄錯誤並通知管理員 |
| Validation | 資料驗證失敗 | 記錄錯誤並跳過該筆資料 |

### 5.3 美股定期同步

**檔案位置**：
- `server/jobs/syncUsStockDataScheduled.ts`（同步邏輯）
- `server/config/usStockLists.ts`（股票清單配置）

#### 定期同步範圍

**S&P 500 成分股（~500 支）**：

標普500指數是美股最具代表性的指數，涵蓋美國市場約 80% 的市值。由於成分股數量龐大，系統目前實作了約 220 支代表性成分股，未來將逐步擴展至完整 500 支。

**主要 ETF（32 支）**：

| 類別 | 數量 | 代表 ETF |
|-----|------|---------|
| 市場指數 | 7 | SPY、VOO、IVV、QQQ、DIA、VTI、IWM |
| 科技產業 | 4 | XLK、VGT、SOXX、ARKK |
| 金融產業 | 2 | XLF、VFH |
| 醫療保健 | 2 | XLV、VHT |
| 能源產業 | 2 | XLE、VDE |
| 消費產業 | 2 | XLY、XLP |
| 工業產業 | 1 | XLI |
| 房地產 | 2 | VNQ、XLRE |
| 債券 | 3 | AGG、BND、TLT |
| 國際市場 | 3 | VEA、VWO、EFA |
| 商品 | 3 | GLD、SLV、USO |

#### 排程時間表

| 資料類型 | 執行時間 | 頻率 | 資料範圍 | 說明 |
|---------|---------|------|---------|------|
| 股票基本資料 | 每週日 06:00 | 每週 | S&P 500 + 32 ETF | 更新公司名稱、交易所等 |
| 歷史價格資料 | 每交易日 06:00 | 每日 | 最近 30 天 | 同步最近一個月價格 |

#### 同步流程

**股票基本資料同步**：

```
1. 排程觸發（每週日 06:00）
   ↓
2. 讀取股票清單配置
   - S&P 500 成分股清單
   - 主要 ETF 清單
   ↓
3. 逐一呼叫 TwelveData API - Quote
   - 請求間隔 8 秒（避免限流）
   - 總計約 67 分鐘
   ↓
4. 資料轉換與驗證
   - 欄位對應
   - 資料型別轉換
   - 必填欄位檢查
   ↓
5. 批次寫入資料庫（Batch Upsert）
   ↓
6. 記錄同步狀態與錯誤
   ↓
7. 發送同步完成通知
```

**歷史價格資料同步**：

```
1. 排程觸發（每交易日 06:00）
   ↓
2. 判斷前一日是否為美股交易日
   - 檢查美國交易日曆
   - 排除週末與聯邦假日
   ↓
3. 讀取股票清單配置
   ↓
4. 逐一呼叫 TwelveData API - Time Series
   - 參數: interval=1day, outputsize=30
   - 請求間隔 8 秒
   ↓
5. 資料轉換與驗證
   - 價格單位轉換（美元 → 美分）
   - 漲跌幅計算
   - 資料完整性檢查
   ↓
6. 批次寫入資料庫（Batch Upsert）
   - 僅保留最近 30 天資料
   - 刪除超過 30 天的舊資料
   ↓
7. 記錄同步狀態與錯誤
   ↓
8. 發送同步完成通知
```

#### 美股交易日判斷邏輯

```typescript
/**
 * 判斷是否為美股交易日
 * @param date 日期（UTC）
 * @returns 是否為交易日
 */
function isUsMarketTradingDay(date: Date): boolean {
  // 轉換為美東時間（ET）
  const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = etDate.getDay();
  
  // 排除週末
  if (day === 0 || day === 6) {
    return false;
  }
  
  // 排除聯邦假日
  const holidays = [
    '2024-01-01', // New Year's Day
    '2024-01-15', // Martin Luther King Jr. Day
    '2024-02-19', // Presidents' Day
    '2024-03-29', // Good Friday
    '2024-05-27', // Memorial Day
    '2024-06-19', // Juneteenth
    '2024-07-04', // Independence Day
    '2024-09-02', // Labor Day
    '2024-11-28', // Thanksgiving Day
    '2024-12-25', // Christmas Day
    // ... 其他假日
  ];
  
  const dateStr = etDate.toISOString().split('T')[0];
  return !holidays.includes(dateStr);
}

/**
 * 取得前一個美股交易日
 * @param date 基準日期（UTC）
 * @returns 前一個交易日（UTC）
 */
function getPreviousUsMarketTradingDay(date: Date): Date {
  let previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  
  while (!isUsMarketTradingDay(previousDay)) {
    previousDay.setDate(previousDay.getDate() - 1);
  }
  
  return previousDay;
}
```

#### API 限流控制

TwelveData 免費版限制為 **8 requests/minute**，系統採用以下策略避免限流：

```typescript
/**
 * API 請求限流控制
 */
class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private requestInterval = 8000; // 8 秒間隔
  
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const fn = this.requestQueue.shift();
      if (fn) {
        await fn();
        await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      }
    }
    
    this.isProcessing = false;
  }
}

const rateLimiter = new RateLimiter();

// 使用範例
const quote = await rateLimiter.enqueue(() => 
  getTwelveDataQuote('AAPL')
);
```

**限流控制特性**：

- 每次請求間隔 8 秒，確保不超過 8 requests/minute
- 252 支股票 × 2 次請求（基本資料 + 價格）= 約 67 分鐘
- 支援請求佇列，避免並發請求
- 錯誤重試不影響限流控制

### 5.4 美股即時查詢

**檔案位置**：`server/jobs/syncUsStockData.ts`

#### 快取架構

美股即時查詢採用**多層快取架構**，降低 API 呼叫次數與查詢延遲：

```
使用者請求
    ↓
┌─────────────────┐
│  L1: Redis      │  TTL: 30 分鐘
│  (AI 推薦結果)   │
└─────────────────┘
    ↓ (未命中)
┌─────────────────┐
│  L2: MySQL      │  TTL: 1-24 小時
│  (stockDataCache)│
│  - Quote: 1 小時 │
│  - Company: 24 小時│
└─────────────────┘
    ↓ (未命中)
┌─────────────────┐
│  TwelveData API │
│  (即時查詢)      │
└─────────────────┘
    ↓
寫入快取並返回
```

#### 快取策略

| 快取層級 | 儲存位置 | 快取時間 | 用途 |
|---------|---------|---------|------|
| L1 快取 | Redis | 30 分鐘 | AI 推薦結果 |
| L2 快取 | MySQL `stockDataCache` | 24 小時 | 公司名稱 |
| L2 快取 | MySQL `stockDataCache` | 1 小時 | 股價數據 |

#### 查詢流程

```typescript
/**
 * 取得美股股票詳情（含即時報價）
 */
async function getUsStockDetail(symbol: string) {
  // 1. 檢查資料庫是否有該股票基本資料
  let stock = await getUsStockBySymbol(symbol);
  
  // 2. 檢查 L2 快取（MySQL）
  const cache = await getStockDataCache(symbol, 'quote');
  
  if (cache && cache.expiresAt > new Date()) {
    // 快取命中，直接返回
    return {
      stock: stock || JSON.parse(cache.data).stock,
      latestPrice: null,
      realtimeQuote: JSON.parse(cache.data).quote
    };
  }
  
  // 3. 快取未命中，呼叫 TwelveData API
  try {
    const quote = await getTwelveDataQuote(symbol);
    
    // 4. 更新或建立股票基本資料
    if (!stock) {
      stock = await upsertUsStock({
        symbol: quote.symbol,
        name: quote.name,
        exchange: quote.exchange,
        currency: quote.currency,
        // ... 其他欄位
      });
    }
    
    // 5. 寫入 L2 快取
    await upsertStockDataCache({
      symbol: symbol,
      dataType: 'quote',
      data: JSON.stringify({ stock, quote }),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 小時
    });
    
    // 6. 返回結果
    return {
      stock,
      latestPrice: null,
      realtimeQuote: {
        price: quote.close,
        change: quote.change,
        changePercent: quote.percent_change,
        high: quote.high,
        low: quote.low,
        volume: quote.volume,
        previousClose: quote.previous_close,
        fiftyTwoWeekHigh: quote.fifty_two_week.high,
        fiftyTwoWeekLow: quote.fifty_two_week.low,
      }
    };
  } catch (error) {
    // 7. API 呼叫失敗，記錄錯誤
    await insertUsDataSyncError({
      dataType: 'cache',
      symbol: symbol,
      errorType: 'API',
      errorMessage: error.message,
      errorStack: error.stack,
      retryCount: 0,
    });
    
    throw error;
  }
}
```

#### 快取清理機制

系統定期清理過期快取，避免資料庫膨脹：

```typescript
/**
 * 清理過期快取
 * 每日凌晨 04:00 執行
 */
cron.schedule('0 4 * * *', async () => {
  console.log('[Scheduler] Starting cache cleanup...');
  
  try {
    const db = await getDb();
    if (!db) return;
    
    // 刪除過期快取
    const result = await db
      .delete(stockDataCache)
      .where(lt(stockDataCache.expiresAt, new Date()));
    
    console.log(`[Scheduler] Cache cleanup completed: ${result.rowsAffected} records deleted`);
  } catch (error) {
    console.error('[Scheduler] Cache cleanup failed:', error);
  }
}, {
  timezone: 'Asia/Taipei'
});
```

### 5.5 排程管理

**檔案位置**：`server/_core/index.ts`

#### 排程啟動架構

所有排程在伺服器啟動時自動啟動：

```typescript
import { startAllSchedules } from '../jobs/syncTwStockData';
import { startUsStockSchedules } from '../jobs/syncUsStockData';
import { startUsScheduledSyncs } from '../jobs/syncUsStockDataScheduled';

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
  
  // 啟動台股資料同步排程
  startAllSchedules();
  
  // 啟動美股資料同步排程（即時查詢模式）
  startUsStockSchedules();
  
  // 啟動美股定期同步排程（S&P 500 + 主要 ETF）
  startUsScheduledSyncs();
});
```

#### 排程確認訊息

伺服器啟動時會顯示以下確認訊息：

```
[Scheduler] Stock info sync scheduled: Every Sunday 02:00
[Scheduler] Stock price sync scheduled: Every trading day 02:00 (T+1 mode)
[Scheduler] All schedules started (v3.0 - Off-peak hours)
[Scheduler] US stock info sync scheduled: Every Sunday 06:00 (Taipei Time)
[Scheduler] US stock price sync scheduled: Every trading day 06:00 (Taipei Time)
[Scheduler] All US scheduled syncs started (S&P 500 + Major ETFs)
```

#### 排程時間總覽

| 任務 | 執行時間 | 頻率 | 資料時效 | 狀態 |
|-----|---------|------|---------|------|
| 台股股票基本資料同步 | 每週日 02:00 | 每週 | 即時 | ✅ 已實作 |
| 台股歷史價格同步 | 每交易日 02:00 | 每日 | T+1 | ✅ 已實作 |
| 美股股票基本資料同步（定期） | 每週日 06:00 | 每週 | S&P 500 + 32 ETF | ✅ 已實作 |
| 美股歷史價格同步（定期） | 每交易日 06:00 | 每日 | 最近 30 天 | ✅ 已實作 |
| 美股即時查詢（其他） | 用戶請求時 | 即時 | 快取 1 小時 | ✅ 已實作 |
| 快取清理 | 每日 04:00 | 每日 | - | ✅ 已實作 |

---

## 六、前端架構設計

### 6.1 前端架構概述

STS 平台前端採用 **React 19 + Tailwind CSS 4 + tRPC Client** 的現代化技術棧，提供流暢的使用者體驗與高效的開發流程。

**前端架構特性**：

- **元件化設計**：基於 shadcn/ui 元件庫，提供一致的 UI 風格
- **型別安全**：透過 tRPC 自動推導 API 型別，減少型別錯誤
- **狀態管理**：使用 React Query 管理伺服器狀態，支援快取與樂觀更新
- **路由管理**：使用 Wouter 輕量級路由，支援動態路由與巢狀路由
- **響應式設計**：基於 Tailwind CSS，支援多種螢幕尺寸
- **主題系統**：支援明暗主題切換，基於 CSS 變數

### 6.2 頁面結構設計

根據 STS 平台的定位（投資分析工具），系統採用 **Dashboard Layout** 作為主要佈局，提供一致的側邊欄導航與內容區域。

#### 頁面架構

```
/
├── /                          # 首頁（Dashboard）
├── /tw-stocks                 # 台股市場
│   ├── /tw-stocks/search      # 台股搜尋
│   ├── /tw-stocks/:symbol     # 台股詳情
│   └── /tw-stocks/watchlist   # 台股自選股
├── /us-stocks                 # 美股市場
│   ├── /us-stocks/search      # 美股搜尋
│   ├── /us-stocks/:symbol     # 美股詳情
│   └── /us-stocks/watchlist   # 美股自選股
├── /portfolio                 # 投資組合
├── /analysis                  # 分析工具
│   ├── /analysis/technical    # 技術分析
│   └── /analysis/fundamental  # 基本面分析
├── /settings                  # 設定
│   ├── /settings/profile      # 個人資料
│   └── /settings/preferences  # 偏好設定
└── /admin                     # 管理後台（僅管理員）
    ├── /admin/sync-status     # 同步狀態
    ├── /admin/sync-errors     # 同步錯誤
    └── /admin/users           # 使用者管理
```

#### Dashboard Layout 結構

```tsx
<DashboardLayout>
  {/* 側邊欄 */}
  <Sidebar>
    <Logo />
    <Navigation>
      <NavItem icon={<Home />} href="/">首頁</NavItem>
      <NavItem icon={<TrendingUp />} href="/tw-stocks">台股市場</NavItem>
      <NavItem icon={<DollarSign />} href="/us-stocks">美股市場</NavItem>
      <NavItem icon={<PieChart />} href="/portfolio">投資組合</NavItem>
      <NavItem icon={<BarChart />} href="/analysis">分析工具</NavItem>
      <NavItem icon={<Settings />} href="/settings">設定</NavItem>
      {user?.role === 'admin' && (
        <NavItem icon={<Shield />} href="/admin">管理後台</NavItem>
      )}
    </Navigation>
    <UserProfile />
  </Sidebar>
  
  {/* 內容區域 */}
  <MainContent>
    <Header>
      <Breadcrumbs />
      <SearchBar />
      <ThemeToggle />
    </Header>
    <Content>
      {children}
    </Content>
  </MainContent>
</DashboardLayout>
```

### 6.3 核心頁面設計

#### 首頁（Dashboard）

**路由**：`/`  
**元件**：`client/src/pages/Home.tsx`

**功能**：
- 顯示市場概況（台股加權指數、美股三大指數）
- 顯示自選股列表與即時報價
- 顯示投資組合總覽
- 顯示最近查詢的股票

**UI 結構**：

```tsx
<div className="container py-6">
  {/* 市場概況 */}
  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <MarketIndexCard market="台股加權" value={18000} change={+120} />
    <MarketIndexCard market="S&P 500" value={4500} change={+25} />
    <MarketIndexCard market="Nasdaq" value={14000} change={+80} />
    <MarketIndexCard market="Dow Jones" value={35000} change={+150} />
  </section>
  
  {/* 自選股列表 */}
  <section className="mb-6">
    <Card>
      <CardHeader>
        <CardTitle>自選股</CardTitle>
      </CardHeader>
      <CardContent>
        <WatchlistTable />
      </CardContent>
    </Card>
  </section>
  
  {/* 投資組合總覽 */}
  <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle>投資組合</CardTitle>
      </CardHeader>
      <CardContent>
        <PortfolioSummary />
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>最近查詢</CardTitle>
      </CardHeader>
      <CardContent>
        <RecentStocksList />
      </CardContent>
    </Card>
  </section>
</div>
```

#### 台股搜尋頁面

**路由**：`/tw-stocks/search`  
**元件**：`client/src/pages/TwStocks/Search.tsx`

**功能**：
- 搜尋台股股票（支援股票代號、名稱、產業）
- 篩選條件（市場類型、產業分類）
- 排序功能（漲跌幅、成交量）
- 加入自選股

**UI 結構**：

```tsx
<div className="container py-6">
  {/* 搜尋與篩選 */}
  <div className="flex flex-col md:flex-row gap-4 mb-6">
    <Input
      placeholder="搜尋股票代號或名稱"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="flex-1"
    />
    
    <Select value={market} onValueChange={setMarket}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="市場類型" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部</SelectItem>
        <SelectItem value="TWSE">上市</SelectItem>
        <SelectItem value="TPEx">上櫃</SelectItem>
      </SelectContent>
    </Select>
    
    <Select value={industry} onValueChange={setIndustry}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="產業分類" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部</SelectItem>
        <SelectItem value="半導體">半導體</SelectItem>
        <SelectItem value="電子零組件">電子零組件</SelectItem>
        {/* ... 其他產業 */}
      </SelectContent>
    </Select>
  </div>
  
  {/* 搜尋結果 */}
  <Card>
    <CardContent className="p-0">
      <StockTable
        stocks={searchResults}
        onRowClick={(stock) => navigate(`/tw-stocks/${stock.symbol}`)}
      />
    </CardContent>
  </Card>
</div>
```

#### 台股詳情頁面

**路由**：`/tw-stocks/:symbol`  
**元件**：`client/src/pages/TwStocks/Detail.tsx`

**功能**：
- 顯示股票基本資料
- 顯示即時報價（最新價格、漲跌幅）
- 顯示歷史價格走勢圖
- 顯示技術指標（MA5、MA10、MA20）
- 加入自選股 / 投資組合

**UI 結構**：

```tsx
<div className="container py-6">
  {/* 股票標題與操作 */}
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-3xl font-bold">{stock.name}</h1>
      <p className="text-muted-foreground">{stock.symbol} · {stock.market}</p>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleAddToWatchlist}>
        <Star className="mr-2 h-4 w-4" />
        加入自選股
      </Button>
      <Button onClick={handleAddToPortfolio}>
        <Plus className="mr-2 h-4 w-4" />
        加入投資組合
      </Button>
    </div>
  </div>
  
  {/* 即時報價 */}
  <Card className="mb-6">
    <CardContent className="pt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">最新價格</p>
          <p className="text-2xl font-bold">{latestPrice?.close}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">漲跌</p>
          <p className={cn(
            "text-2xl font-bold",
            latestPrice?.change > 0 ? "text-green-600" : "text-red-600"
          )}>
            {latestPrice?.change > 0 ? '+' : ''}{latestPrice?.change}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">漲跌幅</p>
          <p className={cn(
            "text-2xl font-bold",
            latestPrice?.changePercent > 0 ? "text-green-600" : "text-red-600"
          )}>
            {latestPrice?.changePercent > 0 ? '+' : ''}{latestPrice?.changePercent}%
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">成交量</p>
          <p className="text-2xl font-bold">{formatVolume(latestPrice?.volume)}</p>
        </div>
      </div>
    </CardContent>
  </Card>
  
  {/* 價格走勢圖 */}
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>價格走勢</CardTitle>
    </CardHeader>
    <CardContent>
      <StockChart data={historicalPrices} />
    </CardContent>
  </Card>
  
  {/* 基本資料 */}
  <Card>
    <CardHeader>
      <CardTitle>基本資料</CardTitle>
    </CardHeader>
    <CardContent>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-muted-foreground">產業分類</dt>
          <dd className="font-medium">{stock.industry}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">上市日期</dt>
          <dd className="font-medium">{formatDate(stock.listedDate)}</dd>
        </div>
        {/* ... 其他基本資料 */}
      </dl>
    </CardContent>
  </Card>
</div>
```

#### 美股搜尋頁面

**路由**：`/us-stocks/search`  
**元件**：`client/src/pages/UsStocks/Search.tsx`

**功能**：與台股搜尋頁面類似，但增加以下特性：
- 標記定期同步股票（S&P 500 + 主要 ETF）
- 顯示交易所（NASDAQ、NYSE）
- 顯示產業類別（Technology、Healthcare 等）

**UI 差異**：

```tsx
{/* 搜尋結果表格增加標記 */}
<Table>
  <TableBody>
    {stocks.map((stock) => (
      <TableRow key={stock.id}>
        <TableCell>
          {stock.symbol}
          {isScheduledSyncStock(stock.symbol) && (
            <Badge variant="secondary" className="ml-2">
              定期同步
            </Badge>
          )}
        </TableCell>
        <TableCell>{stock.name}</TableCell>
        <TableCell>{stock.exchange}</TableCell>
        <TableCell>{stock.sector}</TableCell>
        {/* ... 其他欄位 */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 美股詳情頁面

**路由**：`/us-stocks/:symbol`  
**元件**：`client/src/pages/UsStocks/Detail.tsx`

**功能**：與台股詳情頁面類似，但增加以下特性：
- 顯示即時報價（來自 TwelveData API）
- 顯示 52 週高低點
- 顯示資料來源（資料庫 / API）

**UI 差異**：

```tsx
{/* 即時報價區域增加資料來源標記 */}
<Card className="mb-6">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>即時報價</CardTitle>
      <Badge variant={source === 'database' ? 'default' : 'outline'}>
        {source === 'database' ? '資料庫' : '即時 API'}
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    {/* ... 報價資訊 */}
  </CardContent>
</Card>

{/* 增加 52 週高低點 */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <p className="text-sm text-muted-foreground">52 週高點</p>
    <p className="text-xl font-bold">${realtimeQuote?.fiftyTwoWeekHigh}</p>
  </div>
  <div>
    <p className="text-sm text-muted-foreground">52 週低點</p>
    <p className="text-xl font-bold">${realtimeQuote?.fiftyTwoWeekLow}</p>
  </div>
</div>
```

#### 管理後台 - 同步狀態頁面

**路由**：`/admin/sync-status`  
**元件**：`client/src/pages/Admin/SyncStatus.tsx`  
**權限**：Admin only

**功能**：
- 顯示台股與美股的同步狀態
- 顯示最後同步時間
- 顯示同步成功率
- 手動觸發同步

**UI 結構**：

```tsx
<div className="container py-6">
  <h1 className="text-3xl font-bold mb-6">資料同步狀態</h1>
  
  {/* 台股同步狀態 */}
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>台股同步狀態</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>資料類型</TableHead>
            <TableHead>最後同步時間</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead>記錄數</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {twSyncStatus.map((status) => (
            <TableRow key={status.id}>
              <TableCell>{status.dataType}</TableCell>
              <TableCell>{formatDateTime(status.lastSyncAt)}</TableCell>
              <TableCell>
                <Badge variant={
                  status.status === 'success' ? 'default' :
                  status.status === 'partial' ? 'warning' : 'destructive'
                }>
                  {status.status}
                </Badge>
              </TableCell>
              <TableCell>{status.recordCount}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTriggerSync('tw', status.dataType)}
                >
                  手動同步
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
  
  {/* 美股同步狀態 */}
  <Card>
    <CardHeader>
      <CardTitle>美股同步狀態</CardTitle>
    </CardHeader>
    <CardContent>
      {/* 類似台股同步狀態表格 */}
    </CardContent>
  </Card>
</div>
```

### 6.4 狀態管理

#### tRPC + React Query

STS 平台使用 **tRPC + React Query** 進行狀態管理，提供以下優勢：

- **自動快取**：查詢結果自動快取，減少不必要的 API 呼叫
- **背景更新**：支援背景重新取得資料，確保資料新鮮度
- **樂觀更新**：支援樂觀更新，提升使用者體驗
- **錯誤處理**：統一的錯誤處理機制
- **載入狀態**：自動管理載入狀態

**使用範例**：

```typescript
// 查詢股票詳情
const { data: stockDetail, isLoading, error } = trpc.twStock.getDetail.useQuery({
  symbol: '2330'
}, {
  // 快取時間 5 分鐘
  staleTime: 5 * 60 * 1000,
  // 快取資料視為新鮮資料的時間
  cacheTime: 10 * 60 * 1000,
});

// 加入自選股（樂觀更新）
const utils = trpc.useUtils();
const addToWatchlistMutation = trpc.watchlist.add.useMutation({
  onMutate: async (newStock) => {
    // 取消進行中的查詢
    await utils.watchlist.list.cancel();
    
    // 快照當前資料
    const previousWatchlist = utils.watchlist.list.getData();
    
    // 樂觀更新
    utils.watchlist.list.setData(undefined, (old) => [
      ...(old || []),
      newStock
    ]);
    
    return { previousWatchlist };
  },
  onError: (err, newStock, context) => {
    // 錯誤時回滾
    utils.watchlist.list.setData(undefined, context?.previousWatchlist);
  },
  onSettled: () => {
    // 重新取得資料
    utils.watchlist.list.invalidate();
  },
});
```

#### 本地狀態管理

對於不需要與伺服器同步的本地狀態（如 UI 狀態、表單狀態），使用 **React Hooks**：

```typescript
// 搜尋狀態
const [searchQuery, setSearchQuery] = useState('');
const [market, setMarket] = useState<'all' | 'TWSE' | 'TPEx'>('all');
const [industry, setIndustry] = useState<string>('all');

// 篩選邏輯
const filteredStocks = useMemo(() => {
  return stocks.filter((stock) => {
    const matchQuery = stock.symbol.includes(searchQuery) || 
                       stock.name.includes(searchQuery);
    const matchMarket = market === 'all' || stock.market === market;
    const matchIndustry = industry === 'all' || stock.industry === industry;
    
    return matchQuery && matchMarket && matchIndustry;
  });
}, [stocks, searchQuery, market, industry]);
```

### 6.5 UI/UX 設計原則

#### 設計風格

STS 平台採用**專業、簡潔、數據驅動**的設計風格，符合金融投資工具的定位。

**色彩系統**：

- **主色調**：藍色系（專業、信賴）
- **輔助色**：綠色（上漲）、紅色（下跌）
- **背景色**：淺灰色（明亮模式）、深灰色（暗黑模式）
- **文字色**：深灰色（明亮模式）、淺灰色（暗黑模式）

**字體系統**：

- **標題**：Inter（現代、清晰）
- **內文**：Inter（一致性）
- **數字**：Tabular Nums（對齊）

**間距系統**：

- **基準單位**：4px
- **常用間距**：8px、12px、16px、24px、32px、48px

#### 響應式設計

STS 平台支援多種螢幕尺寸，採用 **Mobile First** 設計策略。

**斷點設計**：

| 斷點 | 寬度 | 裝置 |
|-----|------|------|
| sm | 640px | 手機（橫向） |
| md | 768px | 平板 |
| lg | 1024px | 筆電 |
| xl | 1280px | 桌機 |
| 2xl | 1536px | 大螢幕 |

**響應式範例**：

```tsx
{/* 手機：單欄，平板：雙欄，桌機：四欄 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <MarketIndexCard />
  <MarketIndexCard />
  <MarketIndexCard />
  <MarketIndexCard />
</div>

{/* 手機：隱藏側邊欄，桌機：顯示側邊欄 */}
<div className="flex">
  <Sidebar className="hidden lg:block" />
  <MainContent className="flex-1" />
</div>
```

#### 載入狀態

系統提供多種載入狀態指示，提升使用者體驗。

**骨架屏（Skeleton）**：

```tsx
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
) : (
  <StockTable stocks={stocks} />
)}
```

**載入指示器（Spinner）**：

```tsx
{isLoading && (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
)}
```

#### 錯誤處理

系統提供友善的錯誤訊息與錯誤邊界。

**錯誤訊息**：

```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>發生錯誤</AlertTitle>
    <AlertDescription>
      {error.message || '無法載入資料，請稍後再試。'}
    </AlertDescription>
  </Alert>
)}
```

**錯誤邊界**：

```tsx
<ErrorBoundary
  fallback={
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-2xl font-bold mb-2">發生錯誤</h2>
      <p className="text-muted-foreground mb-4">
        系統發生未預期的錯誤，請重新整理頁面。
      </p>
      <Button onClick={() => window.location.reload()}>
        重新整理
      </Button>
    </div>
  }
>
  <App />
</ErrorBoundary>
```

---

## 七、安全性設計

### 7.1 認證與授權

#### Manus OAuth 整合

STS 平台基於 **Manus OAuth** 提供使用者認證，確保安全的使用者管理。

**認證流程**：

```
1. 使用者點擊「登入」按鈕
   ↓
2. 重導向至 Manus OAuth 登入頁面
   URL: {VITE_OAUTH_PORTAL_URL}?app_id={VITE_APP_ID}&redirect_uri={CALLBACK_URL}
   ↓
3. 使用者完成 OAuth 登入（Google / GitHub / Email）
   ↓
4. OAuth 伺服器重導向至回調端點
   URL: /api/oauth/callback?code={AUTH_CODE}
   ↓
5. 後端驗證 AUTH_CODE 並取得使用者資訊
   ↓
6. 建立 Session Cookie（JWT）
   ↓
7. 重導向至首頁
```

**Session Cookie 設計**：

| 屬性 | 值 | 說明 |
|-----|---|------|
| Name | `manus_session` | Cookie 名稱 |
| Value | JWT Token | 加密的使用者資訊 |
| HttpOnly | true | 防止 XSS 攻擊 |
| Secure | true | 僅 HTTPS 傳輸 |
| SameSite | Lax | 防止 CSRF 攻擊 |
| Max-Age | 7 天 | Cookie 有效期 |

**JWT Payload**：

```typescript
{
  openId: string;      // Manus OAuth 識別碼
  name: string;        // 使用者名稱
  email: string;       // 電子郵件
  role: 'user' | 'admin';  // 使用者角色
  iat: number;         // 簽發時間
  exp: number;         // 過期時間
}
```

#### 權限控制

系
統採用**角色基礎存取控制（RBAC）**，定義兩種使用者角色：

| 角色 | 權限 | 說明 |
|-----|------|------|
| **user** | 基本功能存取 | 可查詢股票資料、管理自選股、管理投資組合 |
| **admin** | 完整功能存取 | 除 user 權限外，可存取管理後台、手動觸發同步、查看錯誤記錄 |

**權限檢查實作**：

```typescript
// tRPC 中介軟體 - 保護的程序
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// tRPC 中介軟體 - 管理員程序
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource'
    });
  }
  
  return next({ ctx });
});

// 使用範例
export const appRouter = router({
  // 公開 API
  twStock: router({
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        // 任何人都可以搜尋股票
        return searchTwStocks(input.query);
      }),
  }),
  
  // 需要登入的 API
  watchlist: router({
    add: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // 僅登入使用者可以加入自選股
        return addToWatchlist(ctx.user.id, input.symbol);
      }),
  }),
  
  // 需要管理員權限的 API
  admin: router({
    triggerSync: adminProcedure
      .input(z.object({ dataType: z.enum(['stocks', 'prices']) }))
      .mutation(async ({ input }) => {
        // 僅管理員可以手動觸發同步
        return triggerSync(input.dataType);
      }),
  }),
});
```

### 7.2 資料安全

#### 敏感資料加密

系統對敏感資料進行加密儲存，確保資料安全。

**加密範圍**：

- **使用者密碼**：不儲存密碼（使用 OAuth）
- **API Token**：儲存於環境變數，不寫入資料庫
- **Session Cookie**：使用 JWT 加密，包含簽章驗證

**JWT 簽章驗證**：

```typescript
import jwt from 'jsonwebtoken';

// 簽發 JWT
function signJWT(payload: any): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

// 驗證 JWT
function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256']
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

#### SQL 注入防護

系統使用 **Drizzle ORM** 進行資料庫操作，自動防止 SQL 注入攻擊。

**安全的查詢範例**：

```typescript
// ✅ 安全：使用參數化查詢
const stock = await db
  .select()
  .from(twStocks)
  .where(eq(twStocks.symbol, userInput))
  .limit(1);

// ❌ 不安全：字串拼接（Drizzle 不允許）
// const stock = await db.execute(`SELECT * FROM twStocks WHERE symbol = '${userInput}'`);
```

#### XSS 防護

前端使用 **React** 框架，自動對使用者輸入進行轉義，防止 XSS 攻擊。

**安全的渲染範例**：

```tsx
// ✅ 安全：React 自動轉義
<div>{userInput}</div>

// ❌ 不安全：使用 dangerouslySetInnerHTML
// <div dangerouslySetInnerHTML={{ __html: userInput }} />
```

對於需要渲染 HTML 的場景（如 Markdown），使用 **DOMPurify** 進行清理：

```typescript
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'title']
});
```

#### CSRF 防護

系統使用 **SameSite Cookie** 屬性防止 CSRF 攻擊。

**Cookie 設定**：

```typescript
res.cookie('manus_session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',  // 防止 CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 天
});
```

### 7.3 API 安全

#### 速率限制

系統實作 **API 速率限制**，防止濫用與 DDoS 攻擊。

**速率限制策略**：

| API 類型 | 限制 | 時間窗口 | 說明 |
|---------|------|---------|------|
| 公開 API | 100 requests | 15 分鐘 | 未登入使用者 |
| 認證 API | 1000 requests | 15 分鐘 | 已登入使用者 |
| 管理 API | 100 requests | 15 分鐘 | 管理員 |

**實作範例**：

```typescript
import rateLimit from 'express-rate-limit';

// 公開 API 速率限制
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分鐘
  max: 100,  // 最多 100 次請求
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 認證 API 速率限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.user?.id || req.ip,  // 基於使用者 ID
});

app.use('/api/trpc', publicLimiter);
```

#### CORS 設定

系統設定 **CORS（跨來源資源共享）**，限制允許的來源。

**CORS 設定**：

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://sts.manus.space']  // 生產環境僅允許特定域名
    : ['http://localhost:3000'],   // 開發環境允許本地
  credentials: true,  // 允許攜帶 Cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

#### 請求驗證

所有 API 請求使用 **Zod Schema** 進行參數驗證。

**驗證範例**：

```typescript
import { z } from 'zod';

// 定義驗證 Schema
const searchStockSchema = z.object({
  query: z.string().min(1).max(50),
  limit: z.number().int().min(1).max(100).optional(),
  market: z.enum(['all', 'TWSE', 'TPEx']).optional(),
});

// 使用 Schema 驗證
export const searchStock = publicProcedure
  .input(searchStockSchema)
  .query(async ({ input }) => {
    // input 已通過驗證，型別安全
    return searchTwStocks(input);
  });
```

### 7.4 日誌與監控

#### 日誌記錄

系統記錄關鍵操作與錯誤，用於安全審計與問題追蹤。

**日誌級別**：

| 級別 | 用途 | 範例 |
|-----|------|------|
| **ERROR** | 系統錯誤 | API 呼叫失敗、資料庫錯誤 |
| **WARN** | 警告訊息 | API 限流、快取未命中 |
| **INFO** | 一般資訊 | 使用者登入、資料同步完成 |
| **DEBUG** | 除錯資訊 | 請求參數、回應資料 |

**日誌格式**：

```typescript
interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  context?: {
    userId?: number;
    ip?: string;
    endpoint?: string;
    error?: Error;
  };
}
```

**日誌實作**：

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 開發環境額外輸出到 console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// 使用範例
logger.info('User logged in', {
  userId: user.id,
  ip: req.ip,
});

logger.error('API call failed', {
  endpoint: '/api/trpc/twStock.search',
  error: error,
});
```

#### 安全事件監控

系統監控以下安全事件，並在偵測到異常時發送通知：

- **多次登入失敗**：可能的暴力破解攻擊
- **異常 API 呼叫量**：可能的 DDoS 攻擊
- **權限錯誤**：可能的權限提升攻擊
- **SQL 注入嘗試**：可能的 SQL 注入攻擊

**監控實作**：

```typescript
// 監控多次登入失敗
const loginAttempts = new Map<string, number>();

function trackLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  
  const attempts = (loginAttempts.get(ip) || 0) + 1;
  loginAttempts.set(ip, attempts);
  
  if (attempts >= 5) {
    logger.warn('Multiple login failures detected', {
      ip: ip,
      attempts: attempts,
    });
    
    // 發送通知給管理員
    notifyOwner({
      title: '安全警告：多次登入失敗',
      content: `IP ${ip} 在短時間內登入失敗 ${attempts} 次，可能遭受暴力破解攻擊。`,
    });
  }
}
```

---

## 八、效能與成本分析

### 8.1 查詢效能

#### v5.0 混合同步架構效能

系統採用混合同步架構後，查詢效能大幅提升：

| 場景 | v4.0（純即時查詢） | v5.0（混合同步） | 提升幅度 |
|-----|------------------|----------------|---------|
| 重要股票首次查詢 | 2-5 秒 | 50-100 ms | **90%** |
| 重要股票快取命中 | 50-100 ms | 50-100 ms | 0% |
| 其他股票首次查詢 | 2-5 秒 | 2-5 秒 | 0% |
| 其他股票快取命中 | 50-100 ms | 50-100 ms | 0% |

**效能提升原因**：

1. **重要股票定期同步**：S&P 500 成分股與主要 ETF 的資料預先同步至資料庫，查詢時直接從資料庫讀取，避免 API 呼叫延遲
2. **資料庫索引優化**：針對高頻查詢欄位建立索引，提升查詢速度
3. **快取機制**：多層快取架構降低資料庫負載

#### 資料庫查詢優化

**索引優化**：

```sql
-- 台股股票查詢（symbol）
CREATE UNIQUE INDEX idx_symbol ON twStocks(symbol);

-- 台股價格查詢（symbol + date）
CREATE UNIQUE INDEX idx_symbol_date ON twStockPrices(symbol, date);

-- 美股股票查詢（symbol）
CREATE UNIQUE INDEX idx_symbol ON usStocks(symbol);

-- 美股價格查詢（symbol + date）
CREATE UNIQUE INDEX idx_symbol_date ON usStockPrices(symbol, date);

-- 複合索引（市場 + 活躍狀態）
CREATE INDEX idx_market_isActive ON twStocks(market, isActive);
CREATE INDEX idx_exchange_isActive ON usStocks(exchange, isActive);
```

**查詢優化範例**：

```typescript
// ❌ 不佳：N+1 查詢問題
const stocks = await getStocks();
for (const stock of stocks) {
  const latestPrice = await getLatestPrice(stock.symbol);
  stock.latestPrice = latestPrice;
}

// ✅ 優化：批次查詢
const stocks = await getStocks();
const symbols = stocks.map(s => s.symbol);
const prices = await getBatchLatestPrices(symbols);
stocks.forEach(stock => {
  stock.latestPrice = prices[stock.symbol];
});
```

### 8.2 API 成本分析

#### TwelveData API 成本

**免費方案限制**：
- 8 requests/minute
- 800 requests/day
- 無歷史資料存取限制

**v5.0 每日 API 呼叫估算**：

| 項目 | 呼叫次數 | 說明 |
|-----|---------|------|
| 定期同步（基本資料） | 252 次/週 | 每週日執行，約 36 次/日 |
| 定期同步（歷史價格） | 252 次/日 | 每交易日執行 |
| 即時查詢（其他股票） | 100-200 次/日 | 依使用者查詢量而定 |
| **總計** | **388-488 次/日** | 低於免費額度 800 次/日 |

**成本分析**：

- 免費方案足以支撐目前使用量
- 若使用者增加，可考慮升級至 **Basic Plan**（$9.99/月，8000 requests/day）

#### FinMind API 成本

**免費方案限制**：
- 無明確限流（建議 1 request/second）
- 無每日請求限制

**v5.0 每日 API 呼叫估算**：

| 項目 | 呼叫次數 | 說明 |
|-----|---------|------|
| 定期同步（基本資料） | 1 次/週 | 每週日執行，約 0.14 次/日 |
| 定期同步（歷史價格） | 20 次/日 | 每交易日執行，批次查詢 |
| **總計** | **20.14 次/日** | 遠低於限流 |

**成本分析**：

- 免費方案完全足夠
- 無需升級付費方案

#### 總成本估算

| 項目 | 月成本 | 說明 |
|-----|--------|------|
| TwelveData API | $0 | 免費方案 |
| FinMind API | $0 | 免費方案 |
| 資料庫（TiDB Serverless） | $0-25 | 依使用量計費 |
| Redis（Upstash） | $0 | 免費方案 |
| 伺服器（Manus Hosting） | $0 | 平台提供 |
| **總計** | **$0-25/月** | 極低成本 |

### 8.3 儲存空間優化

#### v5.0 儲存空間估算

| 類別 | 容量 | 說明 |
|-----|------|------|
| 使用者資料 | ~0.3 MB | 1,000 使用者 |
| 台股資料 | ~251 MB | 2,000 支股票，5 年歷史 |
| 美股資料 | ~207.6 MB | 252 支定期同步 + 5,000 支快取 |
| 索引（約 30%） | ~137.7 MB | 資料庫索引 |
| **總計** | **~596.6 MB (0.6 GB)** | 極低儲存需求 |

**優化策略**：

1. **差異化同步**：僅定期同步重要股票，降低儲存需求 **74%**
2. **歷史資料限制**：美股定期同步僅保留最近 30 天，降低儲存需求
3. **快取清理**：定期清理過期快取，避免資料庫膨脹
4. **價格單位轉換**：使用 INT 儲存價格，避免浮點數精度問題，同時降低儲存空間

#### 儲存空間成長預測

| 時間 | 儲存空間 | 說明 |
|-----|---------|------|
| 1 年 | ~0.6 GB | 初始狀態 |
| 2 年 | ~0.8 GB | 新增 1 年歷史資料 |
| 3 年 | ~1.0 GB | 新增 2 年歷史資料 |
| 5 年 | ~1.4 GB | 新增 4 年歷史資料 |

**說明**：
- 儲存空間成長速度緩慢，5 年後僅約 1.4 GB
- TiDB Serverless 免費額度為 5 GB，足以支撐長期使用

### 8.4 效能監控指標

系統監控以下效能指標，確保系統穩定運行：

| 指標 | 目標值 | 監控方式 |
|-----|--------|---------|
| **API 回應時間** | P95 < 200ms | Application Performance Monitoring (APM) |
| **資料庫查詢時間** | P95 < 100ms | 資料庫慢查詢日誌 |
| **快取命中率** | > 80% | Redis 監控 |
| **API 成功率** | > 99% | 錯誤日誌統計 |
| **同步成功率** | > 95% | 同步狀態記錄 |
| **伺服器 CPU 使用率** | < 70% | 系統監控 |
| **伺服器記憶體使用率** | < 80% | 系統監控 |

---

## 九、監控與維護

### 9.1 監控指標

#### 系統監控

**伺服器監控**：

| 指標 | 說明 | 告警閾值 |
|-----|------|---------|
| CPU 使用率 | 伺服器 CPU 使用率 | > 80% |
| 記憶體使用率 | 伺服器記憶體使用率 | > 85% |
| 磁碟使用率 | 伺服器磁碟使用率 | > 90% |
| 網路流量 | 伺服器網路流量 | > 100 Mbps |

**資料庫監控**：

| 指標 | 說明 | 告警閾值 |
|-----|------|---------|
| 連線數 | 資料庫連線數 | > 80% 最大連線數 |
| 查詢時間 | 資料庫查詢時間 | P95 > 500ms |
| 慢查詢數 | 慢查詢數量 | > 10 次/分鐘 |
| 儲存空間 | 資料庫儲存空間 | > 80% 配額 |

**快取監控**：

| 指標 | 說明 | 告警閾值 |
|-----|------|---------|
| 快取命中率 | Redis 快取命中率 | < 70% |
| 記憶體使用率 | Redis 記憶體使用率 | > 85% |
| 連線數 | Redis 連線數 | > 80% 最大連線數 |

#### 業務監控

**資料同步監控**：

| 指標 | 說明 | 告警閾值 |
|-----|------|---------|
| 同步成功率 | 資料同步成功率 | < 95% |
| 同步延遲 | 資料同步延遲時間 | > 1 小時 |
| 錯誤數量 | 同步錯誤數量 | > 10 次/小時 |

**API 監控**：

| 指標 | 說明 | 告警閾值 |
|-----|------|---------|
| API 回應時間 | API 回應時間 | P95 > 500ms |
| API 成功率 | API 成功率 | < 99% |
| API 呼叫量 | API 呼叫量 | > 1000 次/分鐘 |

**使用者監控**：

| 指標 | 說明 | 告警閾值 |
|-----|------|---------|
| 活躍使用者數 | 每日活躍使用者數 | - |
| 新增使用者數 | 每日新增使用者數 | - |
| 使用者留存率 | 使用者留存率 | < 50% |

### 9.2 日誌管理

#### 日誌分類

| 日誌類型 | 檔案位置 | 保留期限 | 說明 |
|---------|---------|---------|------|
| 應用程式日誌 | `logs/app.log` | 30 天 | 應用程式運行日誌 |
| 錯誤日誌 | `logs/error.log` | 90 天 | 錯誤與異常日誌 |
| 存取日誌 | `logs/access.log` | 30 天 | HTTP 請求日誌 |
| 同步日誌 | `logs/sync.log` | 30 天 | 資料同步日誌 |
| 安全日誌 | `logs/security.log` | 180 天 | 安全事件日誌 |

#### 日誌輪轉

系統使用 **winston-daily-rotate-file** 進行日誌輪轉，避免日誌檔案過大。

```typescript
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  transports: [
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',  // 單檔最大 20MB
      maxFiles: '30d',  // 保留 30 天
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '90d',  // 錯誤日誌保留 90 天
    }),
  ],
});
```

### 9.3 備份策略

#### 資料庫備份

**備份頻率**：

| 備份類型 | 頻率 | 保留期限 | 說明 |
|---------|------|---------|------|
| 完整備份 | 每日 | 30 天 | 完整資料庫備份 |
| 增量備份 | 每小時 | 7 天 | 增量資料變更 |
| 快照備份 | 每週 | 90 天 | 資料庫快照 |

**備份實作**：

```bash
#!/bin/bash
# 資料庫備份腳本

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="sts_production"

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 執行備份
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 刪除 30 天前的備份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**備份驗證**：

- 每週執行一次備份還原測試，確保備份可用
- 監控備份檔案大小，偵測異常

#### 設定檔備份

**備份範圍**：

- 環境變數檔案（`.env`）
- 資料庫 Schema（`drizzle/schema.ts`）
- 股票清單配置（`server/config/usStockLists.ts`）

**備份方式**：

- 使用 Git 版本控制
- 敏感資料（如 API Token）使用加密儲存

### 9.4 維護計劃

#### 每日維護

- 檢查系統監控指標
- 檢查錯誤日誌
- 檢查資料同步狀態
- 檢查資料庫備份狀態

#### 每週維護

- 檢視同步錯誤記錄，處理未解決的錯誤
- 檢視 API 使用量，評估是否需要升級方案
- 清理過期快取
- 執行備份還原測試

#### 每月維護

- 更新 S&P 500 成分股清單
- 檢視使用者回饋，優化功能
- 檢視效能指標，優化慢查詢
- 更新系統文件

#### 每季維護

- 評估同步策略，調整股票清單
- 資料庫效能優化（索引重建、統計資訊更新）
- 安全性審計
- 系統升級（框架、套件更新）

---

## 十、部署與運維

### 10.1 部署流程

#### 開發環境

**環境需求**：

- Node.js 22.x
- MySQL 8.0+ 或 TiDB
- Redis 6.0+
- pnpm 9.x

**啟動步驟**：

```bash
# 1. 安裝依賴
pnpm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env 填入必要的環境變數

# 3. 初始化資料庫
pnpm db:push

# 4. 啟動開發伺服器
pnpm dev

# 5. 開啟瀏覽器
# http://localhost:3000
```

#### 生產環境

**部署架構**：

```
GitHub Repository
    ↓ (git push)
Manus Platform
    ↓ (auto build)
Docker Container
    ↓ (auto deploy)
Production Server
```

**部署步驟**：

```bash
# 1. 建立 Checkpoint
# 在 Manus 平台執行 webdev_save_checkpoint

# 2. 發佈至生產環境
# 在 Manus 管理介面點擊「Publish」按鈕

# 3. 驗證部署
# 檢查生產環境是否正常運行
curl https://sts.manus.space/api/health

# 4. 監控部署狀態
# 檢查日誌與監控指標
```

### 10.2 環境變數管理

#### 必要環境變數

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| `DATABASE_URL` | 資料庫連線字串 | `mysql://user:pass@host:3306/db` |
| `REDIS_URL` | Redis 連線字串 | `redis://host:6379` |
| `JWT_SECRET` | JWT 簽章金鑰 | `your-secret-key` |
| `FINMIND_TOKEN` | FinMind API Token | `your-finmind-token` |
| `TWELVEDATA_TOKEN` | TwelveData API Token | `your-twelvedata-token` |
| `TWELVEDATA_BASE_URL` | TwelveData API 基礎 URL | `https://api.twelvedata.com` |
| `VITE_APP_ID` | Manus OAuth App ID | `your-app-id` |
| `OAUTH_SERVER_URL` | Manus OAuth 伺服器 URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth 登入頁面 URL | `https://login.manus.im` |
| `OWNER_OPEN_ID` | 系統管理員 Open ID | `your-open-id` |
| `OWNER_NAME` | 系統管理員名稱 | `Admin` |

#### 環境變數安全

- **開發環境**：使用 `.env` 檔案，不提交至版本控制
- **生產環境**：使用 Manus 平台的 Secrets 管理功能
- **敏感資料**：使用加密儲存，不以明文記錄

### 10.3 健康檢查

系統提供健康檢查端點，用於監控系統狀態。

**健康檢查端點**：

```typescript
// GET /api/health
app.get('/api/health', async (req, res) => {
  try {
    // 檢查資料庫連線
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    // 檢查 Redis 連線
    const redis = await getRedis();
    if (!redis) {
      throw new Error('Redis connection failed');
    }
    
    // 檢查最後同步時間
    const twSyncStatus = await getLatestTwDataSyncStatus('prices');
    const usSyncStatus = await getLatestUsDataSyncStatus('prices');
    
    const now = new Date();
    const twLastSync = twSyncStatus?.lastSyncAt;
    const usLastSync = usSyncStatus?.lastSyncAt;
    
    const twSyncDelay = twLastSync ? (now.getTime() - twLastSync.getTime()) / 1000 / 60 / 60 : 999;
    const usSyncDelay = usLastSync ? (now.getTime() - usLastSync.getTime()) / 1000 / 60 / 60 : 999;
    
    res.json({
      status: 'healthy',
      timestamp: now.toISOString(),
      services: {
        database: 'ok',
        redis: 'ok',
      },
      sync: {
        tw: {
          status: twSyncStatus?.status || 'unknown',
          lastSyncAt: twLastSync?.toISOString() || null,
          delayHours: twSyncDelay,
        },
        us: {
          status: usSyncStatus?.status || 'unknown',
          lastSyncAt: usLastSync?.toISOString() || null,
          delayHours: usSyncDelay,
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

**健康檢查回應範例**：

```json
{
  "status": "healthy",
  "timestamp": "2024-12-07T10:30:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  },
  "sync": {
    "tw": {
      "status": "success",
      "lastSyncAt": "2024-12-07T02:00:00.000Z",
      "delayHours": 8.5
    },
    "us": {
      "status": "success",
      "lastSyncAt": "2024-12-07T06:00:00.000Z",
      "delayHours": 4.5
    }
  }
}
```

### 10.4 故障排除

#### 常見問題

**問題 1：資料同步失敗**

**症狀**：
- 同步狀態顯示 `failed`
- 錯誤日誌記錄 API 呼叫失敗

**排查步驟**：
1. 檢查 API Token 是否有效
2. 檢查網路連線是否正常
3. 檢查 API 限流狀態
4. 檢查錯誤記錄表 (`twDataSyncErrors` / `usDataSyncErrors`)

**解決方案**：
- 更新 API Token
- 調整請求間隔，避免限流
- 手動執行同步腳本補充資料

**問題 2：資料庫連線失敗**

**症狀**：
- 健康檢查端點返回 `unhealthy`
- 應用程式無法啟動

**排查步驟**：
1. 檢查 `DATABASE_URL` 環境變數是否正確
2. 檢查資料庫伺服器是否運行
3. 檢查網路連線是否正常
4. 檢查資料庫連線數是否達到上限

**解決方案**：
- 修正 `DATABASE_URL`
- 重啟資料庫伺服器
- 增加資料庫連線數上限

**問題 3：快取失效**

**症狀**：
- 快取命中率低於 70%
- API 回應時間增加

**排查步驟**：
1. 檢查 Redis 伺服器是否運行
2. 檢查 Redis 記憶體使用率
3. 檢查快取過期時間設定

**解決方案**：
- 重啟 Redis 伺服器
- 增加 Redis 記憶體配額
- 調整快取過期時間

---

## 十一、未來擴展

### 11.1 短期目標（1-3 個月）

#### 功能擴展

- **自選股管理**：使用者可建立多個自選股清單，支援排序與分組
- **價格提醒**：使用者可設定價格提醒，當股票達到目標價格時發送通知
- **投資組合管理**：使用者可記錄買賣交易，追蹤投資績效
- **技術指標計算**：實作常用技術指標（MA、EMA、MACD、RSI、KD 等）

#### 資料擴展

- **補充完整 S&P 500 成分股**：從目前約 220 支擴展至完整 500 支
- **新增更多 ETF**：擴展至 100+ 支熱門 ETF
- **新增財報資料**：整合公司財報資料（營收、EPS、本益比等）

#### 效能優化

- **實作 CDN**：使用 CDN 加速靜態資源載入
- **實作伺服器端渲染（SSR）**：提升首屏載入速度與 SEO
- **資料庫查詢優化**：針對慢查詢進行優化

### 11.2 中期目標（3-6 個月）

#### 進階功能

- **基本面分析**：提供財報分析、估值分析、產業比較等功能
- **AI 選股助手**：基於 LLM 提供選股建議與市場分析
- **回測系統**：支援投資策略回測，評估歷史績效
- **社群功能**：使用者可分享投資組合、交流投資心得

#### 資料擴展

- **新增港股市場**：整合港股資料，支援港股查詢
- **新增加密貨幣**：整合加密貨幣資料，支援比特幣、以太坊等主流幣種
- **新增外匯資料**：整合外匯資料，支援主要貨幣對

#### 架構優化

- **微服務架構**：將同步服務、API 服務、前端服務拆分為獨立微服務
- **訊息佇列**：使用訊息佇列（如 RabbitMQ）處理非同步任務
- **分散式快取**：使用 Redis Cluster 提升快取可用性

### 11.3 長期目標（6-12 個月）

#### 平台化

- **開放 API**：提供 RESTful API 與 GraphQL API，供第三方應用整合
- **行動應用**：開發 iOS 與 Android 應用
- **付費訂閱**：提供進階功能訂閱服務（如即時報價、進階技術指標等）

#### 資料科學

- **機器學習模型**：訓練股價預測模型，提供 AI 預測功能
- **情緒分析**：分析新聞與社群媒體情緒，提供市場情緒指標
- **異常偵測**：偵測異常交易行為，提供風險預警

#### 國際化

- **多語言支援**：支援英文、簡體中文、日文等多種語言
- **多市場支援**：擴展至日本、韓國、歐洲等市場
- **多幣別支援**：支援多種貨幣顯示與換算

---

## 十二、總結

### 12.1 專案成果

STS 台美股投資分析平台成功建立了**穩固的資料基礎**與**高效的同步機制**，為後續的進階功能預留了充足的擴展空間。系統採用**混合同步架構**，在維持系統靈活性的同時，大幅提升了重要股票的查詢效能與資料完整性。

**核心成就**：

- ✅ 建立精簡的雙市場資料庫架構（台股 + 美股）
- ✅ 整合雙資料源（FinMind API + TwelveData API）
- ✅ 實作差異化同步機制（定期同步 + 即時查詢）
- ✅ 提供統一的 tRPC API 介面
- ✅ 實作使用者認證與授權機制
- ✅ 建立完整的監控與維護機制

**效能提升**：

- 重要股票查詢速度提升 **90%**（從 2-5 秒降至 50-100 ms）
- 資料庫儲存空間優化 **74%**（從 ~2.2 GB 降至 ~0.6 GB）
- API 呼叫成本控制在合理範圍（月增 30.8%，但用戶體驗大幅提升）

### 12.2 技術亮點

- **端到端型別安全**：基於 tRPC 實現前後端型別安全，減少開發錯誤
- **混合同步架構**：根據股票重要性選擇最佳同步方式，平衡效能與成本
- **多層快取機制**：Redis + MySQL 雙層快取，降低 API 呼叫次數與查詢延遲
- **價格精度保證**：使用 INT 儲存價格，避免浮點數精度問題
- **指數退避重試**：智慧重試機制，提升資料同步成功率
- **錯峰執行**：台股與美股排程時間錯開，分散系統負載

### 12.3 後續發展

STS 平台已建立堅實的技術基礎，未來將持續優化與擴展功能，朝向**專業投資分析平台**的目標邁進。短期將專注於前端介面開發與核心功能完善，中期將擴展進階分析功能與資料範圍，長期將朝向平台化與國際化發展。

---

## 附錄

### 附錄 A：資料庫 Schema 定義

完整的資料庫 Schema 定義位於專案檔案 `drizzle/schema.ts`，包含所有資料表的欄位定義、型別、索引設定等。

### 附錄 B：API 端點清單

完整的 API 端點清單與參數定義位於專案檔案 `server/routers.ts`，包含所有 tRPC 端點的輸入驗證、權限控制、業務邏輯等。

### 附錄 C：環境變數清單

完整的環境變數清單與說明位於專案檔案 `server/_core/env.ts`，包含所有必要與選用的環境變數定義。

### 附錄 D：參考資料

**技術文件**：

- [tRPC 官方文件](https://trpc.io/)
- [Drizzle ORM 官方文件](https://orm.drizzle.team/)
- [React 官方文件](https://react.dev/)
- [Tailwind CSS 官方文件](https://tailwindcss.com/)
- [shadcn/ui 元件庫](https://ui.shadcn.com/)

**API 文件**：

- [FinMind API 文件](https://finmind.github.io/)
- [TwelveData API 文件](https://twelvedata.com/docs)

**市場資訊**：

- [S&P 500 官方網站](https://www.spglobal.com/spdji/en/indices/equity/sp-500/)
- [台灣證券交易所](https://www.twse.com.tw/)
- [證券櫃檯買賣中心](https://www.tpex.org.tw/)

---

**文件版本**: v1.0  
**最後更新**: 2024年12月7日  
**作者**: Manus AI  
**專案**: STS 台美股投資分析平台

---

**變更記錄**：

| 版本 | 日期 | 變更內容 | 作者 |
|-----|------|---------|------|
| v1.0 | 2024-12-07 | 初始版本，完整系統設計規格 | Manus AI |

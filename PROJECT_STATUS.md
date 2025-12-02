# 美股投資分析平台 - 專案狀態報告

**更新時間**: 2024-12-03  
**專案版本**: v5.0 雙市場版  
**專案路徑**: `/home/ubuntu/us-stock-analyzer`

---

## 📊 專案概述

本專案是一個支援台股與美股的投資分析平台，提供即時報價、歷史價格查詢、技術分析、AI 投資建議等功能。

### 核心功能

- ✅ **雙市場支援**: 台股（FinMind API）+ 美股（TwelveData API）
- ✅ **即時報價**: 美股即時報價查詢（含快取機制）
- ✅ **歷史資料**: 台股與美股歷史價格資料
- ✅ **資料同步**: 自動化排程同步機制
- ✅ **AI 分析**: 整合 LLM 提供投資建議
- ✅ **使用者認證**: Manus OAuth 整合

---

## 🗄️ 資料庫架構

### 台股資料表（已完成）

| 表格名稱 | 說明 | 記錄數 |
|---------|------|--------|
| `twStocks` | 台股基本資料 | 2,725 筆 |
| `twStockPrices` | 台股歷史價格 | 1,308 筆 |
| `twDataSyncStatus` | 台股同步狀態 | - |
| `twDataSyncErrors` | 台股同步錯誤記錄 | - |

### 美股資料表（已建立）

| 表格名稱 | 說明 | 狀態 |
|---------|------|------|
| `usStocks` | 美股基本資料 | ✅ 已建立 |
| `usStockPrices` | 美股歷史價格 | ✅ 已建立 |
| `usDataSyncStatus` | 美股同步狀態 | ✅ 已建立 |
| `usDataSyncErrors` | 美股同步錯誤記錄 | ✅ 已建立 |
| `stockDataCache` | 雙市場快取資料 | ✅ 已建立 |

---

## 🔌 API 整合狀態

### 台股 API（FinMind）

- **狀態**: ✅ 正常運作
- **資料來源**: FinMind API
- **同步模式**: T+1 批次同步
- **排程設定**:
  - 股票基本資料: 每週日 02:00
  - 歷史價格: 每交易日 02:00

### 美股 API（TwelveData）

- **狀態**: ⚠️ 需要設定 API 憑證
- **資料來源**: TwelveData API
- **查詢模式**: 即時查詢 + 快取
- **速率限制**: 免費版每分鐘 8 次請求
- **必要環境變數**:
  - `TWELVEDATA_BASE_URL`: https://api.twelvedata.com/
  - `TWELVEDATA_TOKEN`: [需要設定]

---

## 🛠️ 技術架構

### 後端技術棧

- **框架**: Express 4 + tRPC 11
- **資料庫**: MySQL (TiDB Cloud)
- **ORM**: Drizzle ORM
- **認證**: Manus OAuth
- **排程**: node-cron
- **快取**: Redis + MySQL

### 前端技術棧

- **框架**: React 19
- **樣式**: Tailwind CSS 4
- **UI 元件**: shadcn/ui
- **路由**: wouter
- **狀態管理**: tRPC React Query

---

## 📁 專案結構

```
us-stock-analyzer/
├── client/                    # 前端程式碼
│   ├── src/
│   │   ├── pages/            # 頁面元件
│   │   │   ├── Home.tsx      # 首頁
│   │   │   ├── StockSearch.tsx  # 股票搜尋頁
│   │   │   └── StockDetail.tsx  # 股票詳情頁
│   │   ├── components/       # UI 元件
│   │   ├── lib/trpc.ts       # tRPC 客戶端
│   │   └── App.tsx           # 路由設定
│   └── public/               # 靜態資源
├── server/                    # 後端程式碼
│   ├── routers.ts            # tRPC 路由定義
│   ├── db.ts                 # 台股資料庫操作
│   ├── db_us.ts              # 美股資料庫操作
│   ├── integrations/         # 外部 API 整合
│   │   ├── finmind.ts        # FinMind API
│   │   └── twelvedata.ts     # TwelveData API
│   └── jobs/                 # 排程任務
│       ├── syncTwStockData.ts  # 台股同步
│       └── syncUsStockData.ts  # 美股同步
├── drizzle/                   # 資料庫 Schema
│   └── schema.ts             # 資料表定義
└── scripts/                   # 工具腳本
    ├── initTwStockData.mjs   # 台股初始化
    ├── initUsStockData.mjs   # 美股初始化
    └── validateData.mjs      # 資料驗證
```

---

## 🚀 已實作的 tRPC API

### 台股 API (`twStock`)

| API 端點 | 說明 | 狀態 |
|---------|------|------|
| `search` | 搜尋股票 | ✅ |
| `getDetail` | 股票詳情 | ✅ |
| `getHistorical` | 歷史價格 | ✅ |
| `getLatestPrice` | 最新價格 | ✅ |
| `getBatchLatestPrices` | 批次價格 | ✅ |
| `getSyncStatus` | 同步狀態 | ✅ |
| `triggerSync` | 手動同步 | ✅ |

### 美股 API (`usStock`)

| API 端點 | 說明 | 狀態 |
|---------|------|------|
| `search` | 搜尋股票 | ✅ |
| `getDetail` | 股票詳情（含即時報價） | ✅ |
| `getHistorical` | 歷史價格 | ✅ |
| `getLatestPrice` | 最新價格 | ✅ |
| `getCacheStatus` | 快取狀態 | ✅ |
| `clearCache` | 清除快取 | ✅ |
| `getSyncStatus` | 同步狀態 | ✅ |
| `getSyncErrors` | 同步錯誤 | ✅ |
| `getStatistics` | 統計資訊 | ✅ |

---

## ⚙️ 環境變數設定

### 系統自動注入

以下環境變數由 Manus 平台自動注入，無需手動設定：

- `DATABASE_URL`: MySQL 連線字串
- `JWT_SECRET`: Session 簽章密鑰
- `VITE_APP_ID`: OAuth 應用程式 ID
- `OAUTH_SERVER_URL`: OAuth 伺服器 URL
- `OWNER_OPEN_ID`, `OWNER_NAME`: 擁有者資訊

### 需要手動設定

以下環境變數需要透過管理介面 **Settings → Secrets** 設定：

#### TwelveData API（美股資料）

```
TWELVEDATA_BASE_URL=https://api.twelvedata.com/
TWELVEDATA_TOKEN=your_api_token_here
```

**取得方式**: 前往 [TwelveData](https://twelvedata.com/) 註冊並取得 API Token

#### FinMind API（台股資料）

```
FINMIND_TOKEN=your_finmind_token_here
```

**取得方式**: 前往 [FinMind](https://finmindtrade.com/) 註冊並取得 Token

---

## 📝 初始化步驟

### 1. 台股資料初始化（已完成）

```bash
cd /home/ubuntu/us-stock-analyzer
pnpm exec tsx scripts/initTwStockData.mjs
```

**結果**: 已載入 2,725 筆台股基本資料 + 1,308 筆歷史價格

### 2. 美股資料初始化（待執行）

```bash
cd /home/ubuntu/us-stock-analyzer
pnpm exec tsx scripts/initUsStockData.mjs --days=7
```

**預計載入**:
- 12 支熱門美股（AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA, NFLX, AMD, INTC, SPY, QQQ）
- 最近 7 天的歷史價格資料

**執行時間**: 約 5-10 分鐘（每支股票間隔 8 秒）

**注意事項**:
- TwelveData 免費版限制: 每分鐘 8 次請求
- 如遇到 API 額度限制，請等待 1-2 分鐘後重試

---

## 🔍 資料驗證

### 檢查台股資料

```bash
pnpm exec tsx scripts/validateData.mjs
```

### 檢查美股資料

```sql
-- 透過管理介面 Database 面板執行
SELECT COUNT(*) FROM usStocks;
SELECT COUNT(*) FROM usStockPrices;
```

---

## 🐛 已知問題與解決方案

### 1. TwelveData API 404 錯誤

**問題**: URL 結尾斜線導致 API 請求失敗  
**解決**: ✅ 已修正（移除 BASE_URL 結尾斜線）

### 2. API 速率限制超過

**問題**: 免費版每分鐘只能請求 8 次  
**解決**: ✅ 已調整請求間隔為 8 秒

### 3. 資料庫表格不存在

**問題**: 遷移檔案執行失敗  
**解決**: ✅ 已手動執行 SQL 建立表格

---

## 📊 前端頁面狀態

### 已實作頁面

| 頁面 | 路徑 | 狀態 | 說明 |
|-----|------|------|------|
| 首頁 | `/` | ✅ | 包含搜尋、AI 推薦、熱門股票 |
| 股票搜尋 | `/search` | ✅ | 雙市場搜尋介面 |
| 股票詳情 | `/stock/:market/:symbol` | ✅ | 含 AI 分析功能 |

### 待開發頁面

- [ ] 技術分析頁面（圖表視覺化）
- [ ] 個人投資組合管理
- [ ] 資料同步管理後台

---

## 🎯 下一步計劃

### 短期目標（本週）

1. ✅ 完成美股資料初始化
2. ⚠️ 驗證 TwelveData API 連線
3. ⚠️ 測試前端頁面功能
4. ⚠️ 建立首個檢查點

### 中期目標（本月）

1. 整合圖表庫（Chart.js 或 Recharts）
2. 實作技術指標計算
3. 優化快取機制（Redis 整合）
4. 建立管理後台

### 長期目標（1-2 個月）

- 基本面分析功能
- 跨市場比較
- 投資組合績效追蹤
- 財務報表分析

---

## 📞 技術支援

### 常見問題

**Q: API 額度用完怎麼辦？**  
A: TwelveData 免費版每分鐘限制 8 次請求，等待 1-2 分鐘後額度會自動重置。

**Q: 如何更新 API Token？**  
A: 前往管理介面 Settings → Secrets，更新對應的環境變數。

**Q: 資料同步失敗怎麼辦？**  
A: 檢查 `twDataSyncErrors` 或 `usDataSyncErrors` 表格，查看錯誤詳情。

### 相關連結

- [TwelveData API 文件](https://twelvedata.com/docs)
- [FinMind API 文件](https://finmindtrade.com/analysis/#/data/api)
- [Drizzle ORM 文件](https://orm.drizzle.team/)
- [tRPC 文件](https://trpc.io/)

---

**專案維護者**: Manus AI Agent  
**最後更新**: 2024-12-03 18:30 UTC+8

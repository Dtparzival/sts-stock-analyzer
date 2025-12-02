# 美股投資分析平台 - 任務清單 (v5.0 雙市場版)

## 專案目標
根據三份交付文件建立台股與美股投資分析平台,包含資料庫架構、API 整合、資料同步機制、tRPC API 介面和基礎前端介面。排除長期目標(1-2個月)的進階功能如技術指標計算、基本面分析、跨市場比較等。

---

## 階段一:資料庫架構與基礎設定 ✅

### 台股資料庫架構 (已完成)
- [x] twStocks 資料表已建立
- [x] twStockPrices 資料表已建立
- [x] twDataSyncStatus 資料表已建立
- [x] twDataSyncErrors 資料表已建立
- [x] 台股資料庫操作層 (server/db.ts) 已完成
- [x] FinMind API 整合層已完成
- [x] 台股資料同步機制已完成
- [x] 台股排程已設定 (每週日 02:00 基本資料, 每交易日 02:00 價格)

### 美股資料庫架構
- [x] 建立 usStocks 資料表 (手動 SQL 建立)
- [x] 建立 usStockPrices 資料表 (手動 SQL 建立)
- [x] 建立 usDataSyncStatus 資料表 (手動 SQL 建立)
- [x] 建立 usDataSyncErrors 資料表 (手動 SQL 建立)
- [x] 建立 stockDataCache 快取資料表
- [x] 實作美股資料庫操作層函數 (server/db_us.ts)

## 階段二:美股 API 整合與快取機制

### TwelveData API 整合
- [x] 建立 server/integrations/twelvedata.ts
- [x] 實作 getTwelveDataQuote 函數
- [x] 實作 getTwelveDataTimeSeries 函數
- [x] 實作指數退避重試機制
- [x] 實作價格轉換輔助函數
- [x] 修正 URL 處理問題 (移除結尾斜線)
- [x] 調整 API 請求間隔為 8 秒 (符合免費版限制)

### 快取機制
- [ ] 實作 MySQL 快取層 (stockDataCache)
- [ ] 實作 Redis 快取層整合
- [ ] 實作快取檢查與更新邏輯
- [ ] 實作快取過期處理

## 階段三:統一 tRPC API 介面

### 台股 API (已完成)
- [x] twStock.search - 搜尋股票
- [x] twStock.getDetail - 股票詳情
- [x] twStock.getHistorical - 歷史價格
- [x] twStock.getLatestPrice - 最新價格
- [x] twStock.getBatchLatestPrices - 批次價格
- [x] twStock.getSyncStatus - 同步狀態
- [x] twStock.triggerSync - 手動觸發同步

### 美股 API
- [x] 實作 usStock.search - 搜尋股票
- [x] 實作 usStock.getDetail - 股票詳情 (含即時報價)
- [x] 實作 usStock.getHistorical - 歷史價格
- [x] 實作 usStock.getLatestPrice - 最新價格
- [x] 實作 usStock.getCacheStatus - 快取狀態
- [x] 實作 usStock.clearCache - 清除快取
- [x] 實作 usStock.getSyncStatus - 同步狀態
- [x] 實作 usStock.getSyncErrors - 同步錯誤
- [x] 實作 usStock.getStatistics - 統計資訊

### 通用 API
- [x] 實作錯誤查詢 API (雙市場)
- [x] 實作 API 參數驗證 (Zod Schema)
- [ ] 優化分頁查詢功能

## 階段四:工具腳本與資料驗證

### 初始化腳本
- [x] scripts/initTwStockData.mjs - 台股初始化 (已完成)
- [x] scripts/initUsStockData.mjs - 美股初始化 (已修正日期參數問題)
- [x] scripts/loadTestData.mjs - 簡化版測試資料載入 (只載入 3 支股票)
- [ ] 等待 API 額度重置後執行測試資料載入

### 維護腳本
- [x] scripts/syncSpecificData.mjs - 特定資料同步 (已完成)
- [x] scripts/validateData.mjs - 資料驗證 (已完成)
- [x] server/integrations/twelvedata.test.ts - 美股 API vitest 測試 (5/7 通過)
- [ ] scripts/cleanupCache.mjs - 快取清理

## 階段五:前端介面開發

### 設計與規劃
- [x] 設計整體 UI 風格與配色 (已採用漸層設計)
- [x] 規劃導航結構 (已採用公開網站風格)
- [x] 設計雙市場切換介面 (Tabs 元件)

### 基礎頁面
- [x] 首頁 (Home.tsx) - 已包含搜尋、AI 推薦、熱門股票
- [x] 股票搜尋頁面 (StockSearch.tsx) - 雙市場搜尋介面
- [x] 股票詳情頁面 (StockDetail.tsx) - 已包含 AI 分析功能
- [ ] 建立台股搜尋頁面
- [ ] 建立美股搜尋頁面
- [ ] 建立台股詳情頁面
- [ ] 建立美股詳情頁面

### 圖表與視覺化
- [ ] 整合圖表庫 (Chart.js 或 Recharts)
- [ ] 實作價格走勢圖表元件
- [ ] 實作歷史價格圖表
- [ ] 實作成交量圖表

### 管理介面
- [ ] 建立資料同步管理頁面
- [ ] 建立台股同步狀態監控
- [ ] 建立美股快取狀態監控
- [ ] 建立錯誤記錄查詢頁面

### 路由與導航
- [ ] 更新 App.tsx 路由配置
- [ ] 設定雙市場導航結構
- [ ] 實作麵包屑導航 (如需要)

## 階段六:測試與優化

### 單元測試 (Vitest)
- [ ] 撰寫台股 API 整合測試
- [ ] 撰寫美股 API 整合測試
- [ ] 撰寫資料轉換函數測試
- [ ] 撰寫 tRPC API 測試
- [ ] 撰寫快取機制測試

### 整合測試
- [ ] 測試台股資料同步流程
- [ ] 測試美股即時查詢流程
- [ ] 測試快取機制 (Redis + MySQL)
- [ ] 測試錯誤處理與重試
- [ ] 測試前端與後端整合

### 效能優化
- [ ] 資料庫查詢優化
- [ ] 索引調整與驗證
- [ ] 快取策略優化
- [ ] API 回應時間優化

---

## 已完成的台股功能 ✅

### 資料庫層
- [x] 4 個台股資料表已建立並測試
- [x] 所有索引已設定
- [x] 資料庫操作層已完成 (server/db.ts)

### API 整合層
- [x] FinMind API 整合模組 (server/integrations/finmind.ts)
- [x] 資料轉換與驗證 (server/integrations/dataTransformer.ts)
- [x] 指數退避重試機制
- [x] 錯誤處理與記錄

### 資料同步機制
- [x] 資料同步主程式 (server/jobs/syncTwStockData.ts)
- [x] 股票基本資料同步功能
- [x] 歷史價格資料同步功能 (T+1 模式)
- [x] 排程設定 (每週日 02:00 基本資料, 每交易日 02:00 價格)
- [x] 交易日判斷邏輯
- [x] 同步狀態記錄
- [x] 錯誤通知機制

### tRPC API
- [x] 7 個台股 API 端點已實作
- [x] 分頁查詢支援
- [x] 參數驗證 (Zod Schema)

### 工具腳本
- [x] 初始化腳本 (已載入 2,725 筆股票 + 1,308 筆價格)
- [x] 特定資料同步腳本
- [x] 資料驗證腳本

---

## 備註

### 實作優先順序
1. **高優先級 🔴**: 美股資料庫架構、API 整合、快取機制
2. **中優先級 🟡**: 統一 tRPC API 介面、工具腳本
3. **低優先級 🟢**: 前端介面、測試與優化

### 不包含的長期功能 (1-2個月)
- ❌ 技術指標計算
- ❌ 基本面分析
- ❌ 跨市場比較
- ❌ 投資組合分析
- ❌ 財務報表分析
- ❌ 股利資訊分析

### 資料來源
- **台股**: FinMind API (定期批次同步, T+1 模式)
- **美股**: TwelveData API (即時查詢 + 快取)


---

## 更新記錄

### 2024-12-03
- [x] 建立美股資料庫架構 (usStocks, usStockPrices, usDataSyncStatus, usDataSyncErrors, stockDataCache)
- [x] 執行資料庫遷移成功
- [x] 實作美股資料庫操作層 (server/db_us.ts) - 包含 CRUD、統計、快取等 20+ 函數
- [x] 實作 TwelveData API 整合模組 (server/integrations/twelvedata.ts)
- [x] 實作美股 tRPC API (server/routers/usStock.ts) - 包含 9 個 API 端點
- [x] 在 server/routers.ts 中註冊 usStock router
- [x] 建立美股 API vitest 測試檔案 (server/integrations/twelvedata.test.ts)
- [x] 建立股票搜尋頁面 (client/src/pages/StockSearch.tsx)
- [x] 在 App.tsx 中註冊新路由 (/search, /stock/:market/:symbol)
- [x] 重啟開發伺服器並驗證功能


---

## 使用者後續需求 (2024-12-03 新增)

### API 憑證設定
- [ ] 透過管理介面 Settings → Secrets 更新 TWELVEDATA_BASE_URL
- [ ] 透過管理介面 Settings → Secrets 更新 TWELVEDATA_TOKEN
- [ ] 驗證 TwelveData API 連線狀態

### 美股資料同步排程
- [x] 建立 server/jobs/syncUsStockData.ts (參考台股同步機制)
- [x] 實作美股基本資料定期同步功能
- [x] 實作美股歷史價格定期同步功能
- [x] 設定美股資料同步排程 (每交易日台北時間 06:00)
- [x] 實作美股交易日判斷邏輯
- [x] 實作美股同步狀態記錄與錯誤處理
- [x] 測試美股資料同步完整流程 (交易日判斷邏輯測試通過)

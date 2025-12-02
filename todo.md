# 台股資料庫系統 TODO (v2 精簡版)

## 專案目標
根據「台股資料庫系統交付文件_v2」建置精簡版台股資料庫系統，專注於核心資料：股票基本資料與歷史價格。移除技術指標、財務報表、股利資訊等進階功能，統一使用 FinMind API 作為資料來源，排程時間調整為凌晨離峰時間。

---

## 資料庫架構
- [x] 建立 twStocks 資料表 (台股基本資料)
- [x] 建立 twStockPrices 資料表 (歷史價格)
- [x] 建立 twDataSyncStatus 資料表 (同步狀態)
- [x] 建立 twDataSyncErrors 資料表 (同步錯誤記錄)
- [ ] 移除不需要的資料表: twStockIndicators, twStockFundamentals, twStockFinancials, twStockDividends
- [x] 設定資料表索引

## API 整合層
- [x] 建立 server/integrations/finmind.ts - FinMind API 整合模組
- [x] 建立 server/integrations/dataTransformer.ts - 資料轉換與驗證
- [x] 實作指數退避重試機制
- [x] 實作錯誤處理與記錄

## 資料同步機制
- [x] 建立 server/jobs/syncTwStockData.ts - 資料同步主程式
- [x] 實作股票基本資料同步功能
- [x] 實作歷史價格資料同步功能 (T+1 模式)
- [x] 設定排程: 股票基本資料 (每週日凌晨 02:00)
- [x] 設定排程: 歷史價格資料 (每交易日凌晨 02:00)
- [x] 實作交易日判斷邏輯
- [x] 實作同步狀態記錄
- [x] 實作錯誤通知機制
- [x] 在 server/_core/index.ts 中啟動排程

## 資料庫操作層
- [x] 簡化 server/db.ts (移除技術指標、財務、股利相關函數)
- [x] 保留股票基本資料查詢函數
- [x] 保留歷史價格查詢函數
- [x] 保留資料寫入函數
- [x] 保留統計查詢函數

## tRPC API 介面
- [x] 實作 twStock.search - 搜尋股票
- [x] 實作 twStock.getDetail - 股票詳情
- [x] 實作 twStock.getHistorical - 歷史價格
- [x] 實作 twStock.getLatestPrice - 最新價格
- [x] 實作 twStock.getBatchLatestPrices - 批次價格
- [x] 實作 twStock.getSyncStatus - 獲取同步狀態
- [x] 實作 twStock.triggerSync - 手動觸發同步
- [x] 實作分頁查詢支援 (透過 limit 參數)

## 工具腳本
- [x] 建立 scripts/initTwStockData.mjs - 初始化腳本
- [x] 建立 scripts/syncSpecificData.mjs - 特定資料同步腳本
- [x] 建立 scripts/validateData.mjs - 資料驗證腳本

## 測試與驗證
- [x] 測試 FinMind API 整合
- [x] 測試資料轉換與驗證
- [x] 測試 tRPC API 介面
- [x] 建立單元測試檔案

## 文件更新
- [x] 更新交付文件排程時間為凌晨離峰時間
- [x] 調整文件版本號為 v3.0
- [x] 說明移除的功能項目

---

## 備註
本次實作專注於後端核心功能，不包含前端介面開發。
前端介面將在後續階段實作。

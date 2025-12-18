# 台美股批次任務檢查報告

## 檢查時間
2025-12-17 09:15 (UTC+8)

## 排程設定確認

### 台股排程 (server/jobs/syncTwStockData.ts)
- **股票基本資料同步**: 每週日凌晨 02:00 (Asia/Taipei)
  - Cron: `0 2 * * 0`
- **股票價格同步**: 每交易日凌晨 02:00 (週一至週五)
  - Cron: `0 2 * * 1-5`
  - T+1 模式: 同步前一交易日資料

### 美股排程 (server/jobs/syncUsStockDataScheduled.ts)
- **股票基本資料同步**: 每週日凌晨 06:00 (Asia/Taipei)
  - Cron: `0 0 6 * * 0`
- **股票價格同步**: 每交易日凌晨 06:00 (週一至週五)
  - Cron: `0 0 6 * * 1-5`
  - 同步最近 30 天資料

## 伺服器啟動確認
從伺服器日誌可以看到排程已成功啟動:
```
[Scheduler] US stock info sync scheduled: Every Sunday 06:00 (Taipei Time)
[Scheduler] US stock price sync scheduled: Every trading day 06:00 (Taipei Time)
[Scheduler] All US scheduled syncs started (S&P 500 + Major ETFs, 532 stocks)
```

## 資料庫表狀態
- `usDataSyncStatus` 表存在，有 20+ 筆記錄
- `twDataSyncStatus` 表不存在 (需要執行 db:push)

## 美股資料即時查詢測試
- AAPL 股票資料正常顯示
- 當前價格: $274.61
- 數據更新時間: 2025/12/17 下午02:15:27
- 緩存過期時間: 下午03:15
- 圖表顯示正常 (TradingView)

## 問題診斷

### 問題 1: 台股同步狀態表不存在
- 原因: schema 中定義了 `twDataSyncStatus` 表，但尚未執行 migration
- 影響: 台股同步任務無法記錄同步狀態

### 問題 2: 排程只在伺服器運行期間有效
- node-cron 排程是在記憶體中運行的
- 如果伺服器重啟或 sandbox 休眠，排程會中斷
- 排程任務只會在設定的時間點觸發 (凌晨 02:00/06:00)

### 問題 3: 資料庫同步記錄需要確認
- 需要查詢 usDataSyncStatus 表的實際內容確認最後同步時間

## 建議解決方案
1. 執行 `pnpm db:push` 建立缺失的資料表
2. 手動觸發一次同步任務測試
3. 確認 API 金鑰是否正確配置 (FINMIND_TOKEN, TWELVEDATA_TOKEN)

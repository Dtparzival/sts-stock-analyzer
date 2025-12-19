# 文件索引 (Documentation Index)

本目錄包含 STS 投資分析平台的所有技術文件與開發指南。

---

## 目錄結構

```
docs/
├── README.md           # 本文件 - 文件索引
├── design/             # 設計文件
├── guides/             # 開發與維運指南
└── reports/            # 測試與優化報告
```

---

## design/ - 設計文件

系統架構、UI/UX 設計與配色方案相關文件。

| 文件名稱 | 說明 |
|---------|------|
| `STS_System_Design_Specification.md` | 系統設計規格書，包含完整架構設計 |
| `投資分析平台設計系統文檔.md` | UI/UX 設計系統，包含元件規範 |
| `投資分析平台配色方案建議.md` | 配色方案 v3.0 完整說明 |
| `投資分析平台未來優化方向規劃.md` | 未來功能規劃與優化方向 |
| `優化說明_全站風格一致性與響應式設計.md` | 響應式設計與風格一致性說明 |

---

## guides/ - 開發與維運指南

開發人員與維運人員參考手冊。

| 文件名稱 | 說明 |
|---------|------|
| `api-guide.md` | API 使用指南，包含 tRPC 端點說明 |
| `monitoring-guide.md` | 監控與告警設定指南 |
| `troubleshooting.md` | 常見問題排解手冊 |
| `REDIS_SETUP.md` | Redis 快取設定指南 |
| `台股資料整合維運手冊.md` | 台股資料同步維運說明 |
| `投資分析平台資料庫系統文件_v5.0_精簡整合版.md` | 資料庫架構與操作說明 |

---

## reports/ - 測試與優化報告

開發過程中的測試報告與優化記錄。

| 文件名稱 | 說明 |
|---------|------|
| `OPTIMIZATION_REPORT.md` | 效能優化報告 |
| `VISUAL_OPTIMIZATION.md` | 視覺優化報告 |
| `STYLE_CONSISTENCY_FIXES.md` | 風格一致性修復記錄 |
| `TW_SYMBOL_FORMAT_ANALYSIS.md` | 台股代號格式分析 |
| `batch-analysis-optimization-test.md` | 批次分析優化測試 |
| `test-results-ai-optimization.md` | AI 優化測試結果 |
| `test-results.md` | 一般測試結果 |
| `test-findings.md` | 測試發現記錄 |
| `research_notes.md` | 研究筆記 |
| `台股資料整合優化_第二階段成果報告.md` | 台股資料整合第二階段報告 |
| `台股資料整合優化_第三階段成果報告.md` | 台股資料整合第三階段報告 |
| `實作總結.md` | 實作總結報告 |
| `版本更新說明_v4.0.md` | v4.0 版本更新說明 |
| `版本更新說明_v5.1.md` | v5.1 版本更新說明 |

---

## 快速導覽

### 新手入門
1. 閱讀 `design/STS_System_Design_Specification.md` 了解系統架構
2. 參考 `guides/api-guide.md` 了解 API 使用方式
3. 查看 `guides/troubleshooting.md` 解決常見問題

### 維運人員
1. 參考 `guides/monitoring-guide.md` 設定監控
2. 閱讀 `guides/台股資料整合維運手冊.md` 了解資料同步機制
3. 查看 `guides/REDIS_SETUP.md` 設定快取

### 設計人員
1. 閱讀 `design/投資分析平台設計系統文檔.md` 了解設計規範
2. 參考 `design/投資分析平台配色方案建議.md` 使用正確配色

---

## 更新記錄

- **2025-12-19**: 建立文件索引，整合目錄結構說明

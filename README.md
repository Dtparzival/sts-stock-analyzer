# STS 美股投資分析平台

一個功能完整的台美股投資分析平台，提供即時報價、AI 智能分析、投資組合管理等功能。

## 功能特色

- **雙市場支援**：同時支援台股（TWSE/TPEx）與美股（S&P 500 + ETF）
- **即時報價**：透過 TwelveData API 與 TWSE 官方 API 取得即時股價
- **AI 智能分析**：整合 LLM 提供股票分析與投資建議
- **投資組合管理**：追蹤持股、計算損益、分析績效
- **智能搜尋**：支援股票代號與名稱模糊搜尋，個人化排序
- **響應式設計**：完美支援桌面、平板與手機裝置

## 技術棧

| 類別 | 技術 |
|------|------|
| 前端 | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| 後端 | Express 4, tRPC 11, Node.js 22 |
| 資料庫 | MySQL 8 (TiDB 相容), Drizzle ORM |
| 快取 | Redis (ioredis) |
| 建置 | Vite 7, esbuild |
| 測試 | Vitest |

## 快速開始

### 系統需求

- Node.js 18+
- pnpm 8+
- MySQL 8.0+
- Redis 6+ (可選)

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/Dtparzival/sts-stock-analyzer.git
cd sts-stock-analyzer

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
# 參考 docs/guides/DEVELOPER_SETUP.md 建立 .env 檔案

# 4. 執行資料庫遷移
pnpm db:push

# 5. 啟動開發伺服器
pnpm dev
```

開發伺服器啟動後，前往 http://localhost:3000 存取應用程式。

## 環境變數

專案需要以下環境變數：

```bash
# 必要
DATABASE_URL="mysql://user:pass@host:port/db"
JWT_SECRET="your-secret-key"
TWELVEDATA_TOKEN="your-api-key"

# 可選
REDIS_URL="redis://localhost:6379"
FINMIND_TOKEN="your-api-key"
```

完整環境變數說明請參考 [開發者設定指南](./docs/guides/DEVELOPER_SETUP.md)。

## 專案結構

```
├── client/          # 前端 React 應用
├── server/          # 後端 Express + tRPC
├── drizzle/         # 資料庫 Schema
├── shared/          # 共用程式碼
├── scripts/         # 維運腳本
├── tests/           # 測試檔案
└── docs/            # 技術文件
```

## 常用指令

```bash
pnpm dev              # 啟動開發伺服器
pnpm build            # 建置生產版本
pnpm test             # 執行測試
pnpm db:push          # 資料庫遷移
pnpm preload:tw-stock # 預載台股資料
```

## 文件

- [開發者設定指南](./docs/guides/DEVELOPER_SETUP.md)
- [API 使用指南](./docs/guides/api-guide.md)
- [系統設計規格](./docs/design/STS_System_Design_Specification.md)
- [資料庫文件](./docs/guides/投資分析平台資料庫系統文件_v5.0_精簡整合版.md)

## API 金鑰申請

| API | 用途 | 申請網址 |
|-----|------|---------|
| TwelveData | 美股資料 | https://twelvedata.com/ |
| FinMind | 台股資料 | https://finmindtrade.com/ |

## 授權

MIT License

## 貢獻

歡迎提交 Issue 與 Pull Request！

# STS 美股投資分析平台 - 開發者本機部署指南

本文件提供完整的開發環境設定指南，讓其他開發者能夠從 GitHub 倉庫 clone 專案後，在本機順利開發與部署系統。

---

## 目錄

1. [系統需求](#系統需求)
2. [專案架構概覽](#專案架構概覽)
3. [環境變數配置](#環境變數配置)
4. [本機開發設定步驟](#本機開發設定步驟)
5. [資料庫設定](#資料庫設定)
6. [Redis 快取設定](#redis-快取設定)
7. [API 金鑰申請](#api-金鑰申請)
8. [常用指令](#常用指令)
9. [測試執行](#測試執行)
10. [疑難排解](#疑難排解)

---

## 系統需求

在開始之前，請確保您的開發環境符合以下需求：

| 項目 | 最低版本 | 建議版本 | 說明 |
|------|---------|---------|------|
| Node.js | 18.x | 22.x | 執行環境 |
| pnpm | 8.x | 10.x | 套件管理器 |
| MySQL | 8.0 | 8.0+ | 主要資料庫 |
| Redis | 6.x | 7.x | 快取層（可選） |
| Git | 2.x | 最新版 | 版本控制 |

---

## 專案架構概覽

專案採用 **monorepo** 架構，前後端程式碼位於同一倉庫中：

```
us-stock-analyzer/
├── client/                 # 前端 React 應用
│   ├── public/            # 靜態資源
│   └── src/
│       ├── components/    # UI 元件
│       ├── contexts/      # React Context
│       ├── hooks/         # 自訂 Hooks
│       ├── lib/           # 工具函式
│       └── pages/         # 頁面元件
├── server/                 # 後端 Express + tRPC
│   ├── _core/             # 核心框架（勿修改）
│   ├── integrations/      # 外部 API 整合
│   ├── jobs/              # 排程任務
│   ├── routers/           # tRPC 路由
│   └── utils/             # 工具函式
├── drizzle/                # 資料庫 Schema 與遷移
│   ├── schema.ts          # 資料表定義
│   ├── meta/              # 遷移快照
│   └── migrations/        # SQL 遷移檔
├── shared/                 # 前後端共用程式碼
├── scripts/                # 維運腳本
├── tests/                  # 測試檔案
├── docs/                   # 技術文件
└── patches/                # 套件補丁
```

### 技術棧

本專案使用以下技術：

| 層級 | 技術 | 說明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript | 使用者介面 |
| 樣式 | Tailwind CSS 4 | 原子化 CSS |
| UI 元件 | shadcn/ui + Radix UI | 無障礙元件庫 |
| 後端框架 | Express 4 + tRPC 11 | API 伺服器 |
| 資料庫 ORM | Drizzle ORM | 類型安全的資料庫操作 |
| 資料庫 | MySQL 8 (TiDB 相容) | 關聯式資料庫 |
| 快取 | Redis (ioredis) | 高效能快取 |
| 建置工具 | Vite 7 + esbuild | 快速建置 |
| 測試框架 | Vitest | 單元與整合測試 |

---

## 環境變數配置

專案需要以下環境變數才能正常運作。請在專案根目錄建立 `.env` 檔案：

### 必要環境變數

```bash
# 資料庫連線
DATABASE_URL="mysql://username:password@host:port/database?ssl=true"

# JWT 簽章金鑰（可自行產生隨機字串）
JWT_SECRET="your-jwt-secret-key-at-least-32-characters"

# OAuth 設定（如使用 Manus OAuth）
VITE_APP_ID="your-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im/login"
OWNER_OPEN_ID="owner-open-id"

# 應用程式設定
VITE_APP_TITLE="STS 投資分析平台"
VITE_APP_LOGO="/logo.svg"
```

### API 金鑰（資料來源）

```bash
# TwelveData API（美股資料）
TWELVEDATA_BASE_URL="https://api.twelvedata.com"
TWELVEDATA_TOKEN="your-twelvedata-api-key"

# FinMind API（台股資料，可選）
FINMIND_TOKEN="your-finmind-api-key"

# Tiingo API（備用美股資料，可選）
TIINGO_API_TOKEN="your-tiingo-api-key"
```

### Redis 快取（可選但建議）

```bash
# Redis 連線字串
REDIS_URL="redis://username:password@host:port"
```

### LLM 整合（AI 功能）

```bash
# Manus 內建 API（用於 AI 分析功能）
BUILT_IN_FORGE_API_URL="https://api.manus.im"
BUILT_IN_FORGE_API_KEY="your-forge-api-key"
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-forge-api-key"
```

---

## 本機開發設定步驟

### 步驟 1：Clone 專案

```bash
# 從 GitHub 克隆專案
git clone https://github.com/Dtparzival/sts-stock-analyzer.git
cd sts-stock-analyzer
```

### 步驟 2：安裝依賴

```bash
# 使用 pnpm 安裝所有依賴
pnpm install
```

如果尚未安裝 pnpm，可透過以下方式安裝：

```bash
# 使用 npm 安裝 pnpm
npm install -g pnpm

# 或使用 corepack（Node.js 16.13+ 內建）
corepack enable
corepack prepare pnpm@latest --activate
```

### 步驟 3：設定環境變數

```bash
# 複製環境變數範本（如有提供）
cp .env.example .env

# 或手動建立 .env 檔案並填入必要變數
```

### 步驟 4：資料庫遷移

```bash
# 執行資料庫遷移
pnpm db:push
```

### 步驟 5：啟動開發伺服器

```bash
# 啟動開發伺服器（前後端同時啟動）
pnpm dev
```

開發伺服器啟動後，可透過 `http://localhost:3000` 存取應用程式。

---

## 資料庫設定

### 本機 MySQL 設定

如果使用本機 MySQL，請確保：

1. MySQL 8.0+ 已安裝並執行
2. 建立專案資料庫：

```sql
CREATE DATABASE sts_stock_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sts_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON sts_stock_analyzer.* TO 'sts_user'@'localhost';
FLUSH PRIVILEGES;
```

3. 更新 `.env` 中的 `DATABASE_URL`：

```bash
DATABASE_URL="mysql://sts_user:your_password@localhost:3306/sts_stock_analyzer"
```

### 雲端資料庫選項

專案也支援以下雲端資料庫服務：

| 服務 | 說明 | 連線字串格式 |
|------|------|-------------|
| TiDB Cloud | MySQL 相容的分散式資料庫 | `mysql://user:pass@host:4000/db?ssl=true` |
| PlanetScale | Serverless MySQL | `mysql://user:pass@host/db?ssl={"rejectUnauthorized":true}` |
| AWS RDS | 託管 MySQL | `mysql://user:pass@host:3306/db` |

---

## Redis 快取設定

Redis 用於快取股票報價、搜尋結果等資料，可顯著提升效能。

### 本機 Redis 設定

```bash
# macOS (使用 Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

本機 Redis 連線字串：

```bash
REDIS_URL="redis://localhost:6379"
```

### 雲端 Redis 選項

| 服務 | 說明 |
|------|------|
| Upstash | Serverless Redis，免費方案可用 |
| Redis Cloud | Redis Labs 託管服務 |
| AWS ElastiCache | AWS 託管 Redis |

### 無 Redis 運作

如果未設定 `REDIS_URL`，系統會自動降級為無快取模式，但效能會受影響。

---

## API 金鑰申請

### TwelveData API（美股資料）

1. 前往 [TwelveData](https://twelvedata.com/) 註冊帳號
2. 選擇適合的方案（免費方案有 API 呼叫限制）
3. 在 Dashboard 取得 API Key
4. 填入 `.env` 的 `TWELVEDATA_TOKEN`

**方案比較：**

| 方案 | 每分鐘請求數 | 每日請求數 | 費用 |
|------|------------|----------|------|
| Free | 8 | 800 | 免費 |
| Grow | 55 | 5,000 | $29/月 |
| Pro | 120 | 10,000 | $79/月 |

### FinMind API（台股資料）

1. 前往 [FinMind](https://finmindtrade.com/) 註冊帳號
2. 在個人設定中取得 API Token
3. 填入 `.env` 的 `FINMIND_TOKEN`

**注意：** 免費版有每日請求限制，建議升級付費方案或改用 TWSE/TPEx 官方 API（已整合於專案中）。

---

## 常用指令

### 開發指令

```bash
# 啟動開發伺服器
pnpm dev

# TypeScript 類型檢查
pnpm check

# 程式碼格式化
pnpm format

# 執行測試
pnpm test
```

### 資料庫指令

```bash
# 產生並執行資料庫遷移
pnpm db:push
```

### 資料同步指令

```bash
# 預載台股基本資料
pnpm preload:tw-stock

# 強制重新載入台股資料
pnpm preload:tw-stock:force

# 輕量載入（僅上市股票）
pnpm preload:tw-stock:light

# 同步台股基本面資料
pnpm sync:tw-fundamentals
```

### 建置指令

```bash
# 建置生產版本
pnpm build

# 啟動生產伺服器
pnpm start
```

---

## 測試執行

專案使用 Vitest 作為測試框架：

```bash
# 執行所有測試
pnpm test

# 執行測試並顯示 UI
pnpm test --ui

# 執行特定測試檔案
pnpm test server/__tests__/features/portfolio.test.ts

# 執行測試並產生覆蓋率報告
pnpm test --coverage
```

### 測試檔案結構

```
tests/
├── routers/           # tRPC 路由測試
├── scripts/           # 腳本測試
├── utils/             # 工具函式測試
└── setup.ts           # 測試設定

server/__tests__/
├── features/          # 功能測試
└── routers/           # API 測試
```

---

## 疑難排解

### 常見問題

#### 1. 資料庫連線失敗

**症狀：** `Error: connect ECONNREFUSED`

**解決方案：**
- 確認 MySQL 服務已啟動
- 檢查 `DATABASE_URL` 格式是否正確
- 確認防火牆未阻擋連線

#### 2. Redis 連線失敗

**症狀：** `Error: Redis connection to localhost:6379 failed`

**解決方案：**
- 確認 Redis 服務已啟動
- 檢查 `REDIS_URL` 格式是否正確
- 或移除 `REDIS_URL` 以無快取模式運作

#### 3. API 請求限制

**症狀：** `Error: Too many requests`

**解決方案：**
- 檢查 API 金鑰是否有效
- 確認未超過 API 呼叫限制
- 考慮升級 API 方案

#### 4. TypeScript 編譯錯誤

**症狀：** `Type error: ...`

**解決方案：**
```bash
# 清除快取並重新安裝
rm -rf node_modules
pnpm install

# 重新產生類型定義
pnpm check
```

#### 5. 套件版本衝突

**症狀：** `ERESOLVE unable to resolve dependency tree`

**解決方案：**
```bash
# 使用專案指定的 pnpm 版本
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install
```

---

## 相關文件

- [API 使用指南](./api-guide.md)
- [Redis 設定指南](./REDIS_SETUP.md)
- [監控指南](./monitoring-guide.md)
- [疑難排解手冊](./troubleshooting.md)
- [資料庫系統文件](./投資分析平台資料庫系統文件_v5.0_精簡整合版.md)
- [台股資料整合維運手冊](./台股資料整合維運手冊.md)

---

## 貢獻指南

1. Fork 專案
2. 建立功能分支：`git checkout -b feature/your-feature`
3. 提交變更：`git commit -m 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 建立 Pull Request

---

**文件版本：** v1.0  
**最後更新：** 2025-12-19  
**作者：** Manus AI

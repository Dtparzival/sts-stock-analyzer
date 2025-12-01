import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index, decimal } from "drizzle-orm/mysql-core";

/**
 * 核心用戶表
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 用戶收藏的股票
 */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  companyName: text("companyName"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
}));

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * 用戶的股票查詢歷史
 */
export const searchHistory = mysqlTable("searchHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  companyName: text("companyName"),
  shortName: text("shortName"), // 公司簡稱（例如：台積電）
  searchedAt: timestamp("searchedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  searchedAtIdx: index("searchedAt_idx").on(table.searchedAt),
}));

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

/**
 * AI 分析結果緩存
 */
export const analysisCache = mysqlTable("analysisCache", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  analysisType: varchar("analysisType", { length: 50 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  expiresAtIdx: index("expiresAt_idx").on(table.expiresAt),
}));

export type AnalysisCache = typeof analysisCache.$inferSelect;
export type InsertAnalysisCache = typeof analysisCache.$inferInsert;

/**
 * 用戶投資組合
 */
export const portfolio = mysqlTable("portfolio", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  companyName: text("companyName"),
  shares: int("shares").notNull(),
  purchasePrice: int("purchasePrice").notNull(), // 以分為單位存儲（美分）
  purchaseDate: timestamp("purchaseDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
}));

export type Portfolio = typeof portfolio.$inferSelect;
export type InsertPortfolio = typeof portfolio.$inferInsert;

/**
 * 投資組合歷史記錄
 * 記錄每日的投資組合總價值，用於生成績效曲線圖
 */
export const portfolioHistory = mysqlTable("portfolioHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  totalValue: int("totalValue").notNull(), // 當日投資組合總價值（以分為單位）
  totalCost: int("totalCost").notNull(), // 總成本（以分為單位）
  totalGainLoss: int("totalGainLoss").notNull(), // 總損益（以分為單位）
  gainLossPercent: int("gainLossPercent").notNull(), // 報酬率（以萬分之一為單位，例如 10000 = 100%）
  recordDate: timestamp("recordDate").notNull(), // 記錄日期
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  recordDateIdx: index("recordDate_idx").on(table.recordDate),
  userDateIdx: index("user_date_idx").on(table.userId, table.recordDate),
}));

export type PortfolioHistory = typeof portfolioHistory.$inferSelect;
export type InsertPortfolioHistory = typeof portfolioHistory.$inferInsert;

/**
 * 投資組合交易歷史
 * 記錄所有買入/賣出操作，用於圖表標註和交易統計
 */
export const portfolioTransactions = mysqlTable("portfolioTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  companyName: text("companyName"),
  transactionType: mysqlEnum("transactionType", ["buy", "sell"]).notNull(), // 交易類型：買入或賣出
  shares: int("shares").notNull(), // 交易數量
  price: int("price").notNull(), // 交易價格（以分為單位）
  totalAmount: int("totalAmount").notNull(), // 交易總金額（以分為單位）
  transactionDate: timestamp("transactionDate").notNull(), // 交易日期
  notes: text("notes"), // 備註
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
  transactionDateIdx: index("transactionDate_idx").on(table.transactionDate),
  userDateIdx: index("user_date_idx").on(table.userId, table.transactionDate),
}));

export type PortfolioTransaction = typeof portfolioTransactions.$inferSelect;
export type InsertPortfolioTransaction = typeof portfolioTransactions.$inferInsert;

/**
 * 股票數據緩存表
 * 用於持久化存儲 API 請求結果，減少對外部 API 的請求頻率
 */
export const stockDataCache = mysqlTable("stockDataCache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 255 }).notNull().unique(), // 緩存鍵（API endpoint + 參數的 hash）
  apiEndpoint: varchar("apiEndpoint", { length: 100 }).notNull(), // API 端點名稱
  data: text("data").notNull(), // JSON 格式的緩存數據
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // 過期時間
}, (table) => ({
  cacheKeyIdx: index("cacheKey_idx").on(table.cacheKey),
  expiresAtIdx: index("expiresAt_idx").on(table.expiresAt),
  apiEndpointIdx: index("apiEndpoint_idx").on(table.apiEndpoint),
}));

export type StockDataCache = typeof stockDataCache.$inferSelect;
export type InsertStockDataCache = typeof stockDataCache.$inferInsert;

/**
 * TWSE 股票列表緩存
 * 儲存台灣證券交易所的完整股票列表，減少 API 調用次數
 */
export const twseStockList = mysqlTable("twseStockList", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull().unique(), // 股票代碼（例如：2330）
  name: text("name").notNull(), // 公司全名（例如：台灣積體電路製造股份有限公司）
  shortName: text("shortName"), // 公司簡稱（例如：台積電）
  industry: varchar("industry", { length: 100 }), // 產業別
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // 最後更新時間
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  updatedAtIdx: index("updatedAt_idx").on(table.updatedAt),
}));

export type TwseStockList = typeof twseStockList.$inferSelect;
export type InsertTwseStockList = typeof twseStockList.$inferInsert;

/**
 * AI 分析歷史記錄
 * 保存每支股票的歷史 AI 分析結果，用於對比和評估準確度
 */
export const analysisHistory = mysqlTable("analysisHistory", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  analysisType: varchar("analysisType", { length: 50 }).notNull(),
  content: text("content").notNull(),
  recommendation: varchar("recommendation", { length: 20 }),
  priceAtAnalysis: int("priceAtAnalysis"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
  symbolTypeIdx: index("symbol_type_idx").on(table.symbol, table.analysisType),
}));

export type AnalysisHistory = typeof analysisHistory.$inferSelect;
export type InsertAnalysisHistory = typeof analysisHistory.$inferInsert;

/**
 * AI 投資顧問快速問題使用統計
 * 追蹤用戶點擊快速問題按鈕的頻率，用於智能動態調整按鈕內容
 */
export const questionStats = mysqlTable("questionStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  question: varchar("question", { length: 500 }).notNull(), // 快速問題內容
  clickCount: int("clickCount").default(1).notNull(), // 點擊次數
  lastClickedAt: timestamp("lastClickedAt").defaultNow().notNull(), // 最後點擊時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  lastClickedAtIdx: index("lastClickedAt_idx").on(table.lastClickedAt),
}));

// Note: We don't create a composite index on (userId, question) because it would be too large.
// Instead, we'll query by userId first and filter by question in application code.

export type QuestionStats = typeof questionStats.$inferSelect;
export type InsertQuestionStats = typeof questionStats.$inferInsert;

/**
 * 用戶行為數據追蹤表
 * 記錄用戶對股票的查看、搜尋和停留時間，用於智能推薦演算法
 */
export const userBehavior = mysqlTable("userBehavior", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  viewCount: int("viewCount").default(0).notNull(), // 查看次數
  searchCount: int("searchCount").default(0).notNull(), // 搜尋次數
  totalViewTime: int("totalViewTime").default(0).notNull(), // 總停留時間（秒）
  clickCount: int("clickCount").default(0).notNull(), // 點擊推薦卡片次數
  lastClickedAt: timestamp("lastClickedAt"), // 最後點擊時間
  lastViewedAt: timestamp("lastViewedAt").defaultNow().notNull(), // 最後查看時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
  userSymbolIdx: index("user_symbol_idx").on(table.userId, table.symbol),
  lastViewedAtIdx: index("lastViewedAt_idx").on(table.lastViewedAt),
}));

export type UserBehavior = typeof userBehavior.$inferSelect;
export type InsertUserBehavior = typeof userBehavior.$inferInsert;

/**
 * 台股基本資料表
 * 儲存台股的基本資訊，包含股票代號、名稱、市場類別、產業別等
 */
export const twStocks = mysqlTable("twStocks", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull().unique(), // 股票代號（例如：2330）
  name: text("name").notNull(), // 公司全名（例如：台灣積體電路製造股份有限公司）
  shortName: text("shortName"), // 公司簡稱（例如：台積電）
  market: mysqlEnum("market", ["上市", "上櫃", "興櫃"]).notNull(), // 市場類別
  industry: varchar("industry", { length: 100 }), // 產業別
  type: mysqlEnum("type", ["股票", "ETF"]).default("股票").notNull(), // 股票類型
  listedDate: timestamp("listedDate"), // 上市日期
  isActive: boolean("isActive").default(true).notNull(), // 是否活躍（下市則為 false）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  marketIdx: index("market_idx").on(table.market),
  industryIdx: index("industry_idx").on(table.industry),
}));

export type TwStock = typeof twStocks.$inferSelect;
export type InsertTwStock = typeof twStocks.$inferInsert;

/**
 * 台股歷史價格表
 * 儲存台股的每日歷史價格資料
 */
export const twStockPrices = mysqlTable("twStockPrices", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // 股票代號
  date: timestamp("date").notNull(), // 交易日期
  open: decimal("open", { precision: 10, scale: 2 }).notNull(), // 開盤價（例如 100.50 元）
  high: decimal("high", { precision: 10, scale: 2 }).notNull(), // 最高價
  low: decimal("low", { precision: 10, scale: 2 }).notNull(), // 最低價
  close: decimal("close", { precision: 10, scale: 2 }).notNull(), // 收盤價
  volume: int("volume").notNull(), // 成交量（張）
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(), // 成交金額（元）
  change: decimal("change", { precision: 10, scale: 2 }).notNull(), // 漲跌（元）
  changePercent: decimal("changePercent", { precision: 5, scale: 2 }).notNull(), // 漲跌幅（%，例如 1.50）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  dateIdx: index("date_idx").on(table.date),
  symbolDateIdx: index("symbol_date_idx").on(table.symbol, table.date),
}));

export type TwStockPrice = typeof twStockPrices.$inferSelect;
export type InsertTwStockPrice = typeof twStockPrices.$inferInsert;

/**
 * 台股技術指標表
 * 儲存台股的技術指標資料（MA、RSI、MACD、KD 等）
 */
export const twStockIndicators = mysqlTable("twStockIndicators", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // 股票代號
  date: timestamp("date").notNull(), // 計算日期
  ma5: decimal("ma5", { precision: 10, scale: 2 }), // 5 日均線
  ma10: decimal("ma10", { precision: 10, scale: 2 }), // 10 日均線
  ma20: decimal("ma20", { precision: 10, scale: 2 }), // 20 日均線
  ma60: decimal("ma60", { precision: 10, scale: 2 }), // 60 日均線
  rsi14: decimal("rsi14", { precision: 5, scale: 2 }), // 14 日 RSI（0-100）
  macd: decimal("macd", { precision: 10, scale: 4 }), // MACD 值
  macdSignal: decimal("macdSignal", { precision: 10, scale: 4 }), // MACD 信號線
  macdHistogram: decimal("macdHistogram", { precision: 10, scale: 4 }), // MACD 柱狀圖
  kValue: decimal("kValue", { precision: 5, scale: 2 }), // KD 指標 K 值（0-100）
  dValue: decimal("dValue", { precision: 5, scale: 2 }), // KD 指標 D 值（0-100）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  dateIdx: index("date_idx").on(table.date),
  symbolDateIdx: index("symbol_date_idx").on(table.symbol, table.date),
}));

export type TwStockIndicator = typeof twStockIndicators.$inferSelect;
export type InsertTwStockIndicator = typeof twStockIndicators.$inferInsert;

/**
 * 台股基本面資料表
 * 儲存台股的基本面資料（EPS、本益比、殖利率等）
 */
export const twStockFundamentals = mysqlTable("twStockFundamentals", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // 股票代號
  year: int("year").notNull(), // 年度
  quarter: int("quarter").notNull(), // 季度（1-4）
  eps: decimal("eps", { precision: 10, scale: 2 }), // 每股盈餘（元）
  pe: decimal("pe", { precision: 8, scale: 2 }), // 本益比
  pb: decimal("pb", { precision: 8, scale: 2 }), // 股價淨值比
  roe: decimal("roe", { precision: 5, scale: 2 }), // 股東權益報酬率（%）
  dividend: decimal("dividend", { precision: 10, scale: 2 }), // 股利（元）
  yieldRate: decimal("yieldRate", { precision: 5, scale: 2 }), // 殖利率（%）
  revenue: decimal("revenue", { precision: 15, scale: 2 }), // 營收（千元）
  netIncome: decimal("netIncome", { precision: 15, scale: 2 }), // 淨利（千元）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  yearQuarterIdx: index("year_quarter_idx").on(table.year, table.quarter),
  symbolYearQuarterIdx: index("symbol_year_quarter_idx").on(table.symbol, table.year, table.quarter),
}));

export type TwStockFundamental = typeof twStockFundamentals.$inferSelect;
export type InsertTwStockFundamental = typeof twStockFundamentals.$inferInsert;

/**
 * 資料同步狀態表
 * 記錄台股資料的同步狀態，用於監控和除錯
 */
export const twDataSyncStatus = mysqlTable("twDataSyncStatus", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型（stocks/prices/indicators/fundamentals）
  source: mysqlEnum("source", ["TWSE", "TPEx", "FinMind"]).notNull(), // 資料來源
  lastSyncAt: timestamp("lastSyncAt").notNull(), // 最後同步時間
  status: mysqlEnum("status", ["success", "failed", "in_progress"]).notNull(), // 同步狀態
  recordCount: int("recordCount").default(0).notNull(), // 同步記錄數
  errorMessage: text("errorMessage"), // 錯誤訊息
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dataTypeIdx: index("dataType_idx").on(table.dataType),
  sourceIdx: index("source_idx").on(table.source),
  lastSyncAtIdx: index("lastSyncAt_idx").on(table.lastSyncAt),
}));

export type TwDataSyncStatus = typeof twDataSyncStatus.$inferSelect;
export type InsertTwDataSyncStatus = typeof twDataSyncStatus.$inferInsert;

/**
 * 資料同步錯誤記錄表
 * 記錄台股資料同步過程中的錯誤詳情，用於除錯與分析
 */
export const twDataSyncErrors = mysqlTable("twDataSyncErrors", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型（stocks/prices/indicators/fundamentals）
  source: mysqlEnum("source", ["TWSE", "TPEx", "FinMind"]).notNull(), // 資料來源
  symbol: varchar("symbol", { length: 10 }), // 失敗的股票代號（如果適用）
  errorType: varchar("errorType", { length: 50 }).notNull(), // 錯誤類型（network/api/validation/database/unknown）
  errorMessage: text("errorMessage").notNull(), // 錯誤訊息
  errorStack: text("errorStack"), // 錯誤堆疊
  retryCount: int("retryCount").default(0).notNull(), // 重試次數
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  dataTypeIdx: index("dataType_idx").on(table.dataType),
  sourceIdx: index("source_idx").on(table.source),
  symbolIdx: index("symbol_idx").on(table.symbol),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

export type TwDataSyncError = typeof twDataSyncErrors.$inferSelect;
export type InsertTwDataSyncError = typeof twDataSyncErrors.$inferInsert;

/**
 * 台股財務報表表
 * 儲存台股的財務報表資料（資產負債表、損益表、現金流量表）
 */
export const twStockFinancials = mysqlTable("twStockFinancials", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // 股票代號
  year: int("year").notNull(), // 年度
  quarter: int("quarter").notNull(), // 季度（1-4）
  // 資產負債表
  totalAssets: decimal("totalAssets", { precision: 18, scale: 2 }), // 總資產（千元）
  totalLiabilities: decimal("totalLiabilities", { precision: 18, scale: 2 }), // 總負債（千元）
  totalEquity: decimal("totalEquity", { precision: 18, scale: 2 }), // 股東權益（千元）
  currentAssets: decimal("currentAssets", { precision: 18, scale: 2 }), // 流動資產（千元）
  currentLiabilities: decimal("currentLiabilities", { precision: 18, scale: 2 }), // 流動負債（千元）
  // 損益表
  revenue: decimal("revenue", { precision: 18, scale: 2 }), // 營業收入（千元）
  operatingIncome: decimal("operatingIncome", { precision: 18, scale: 2 }), // 營業利益（千元）
  netIncome: decimal("netIncome", { precision: 18, scale: 2 }), // 本期淨利（千元）
  grossProfit: decimal("grossProfit", { precision: 18, scale: 2 }), // 毛利（千元）
  operatingExpenses: decimal("operatingExpenses", { precision: 18, scale: 2 }), // 營業費用（千元）
  // 現金流量表
  operatingCashFlow: decimal("operatingCashFlow", { precision: 18, scale: 2 }), // 營業活動現金流（千元）
  investingCashFlow: decimal("investingCashFlow", { precision: 18, scale: 2 }), // 投資活動現金流（千元）
  financingCashFlow: decimal("financingCashFlow", { precision: 18, scale: 2 }), // 融資活動現金流（千元）
  freeCashFlow: decimal("freeCashFlow", { precision: 18, scale: 2 }), // 自由現金流（千元）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  yearQuarterIdx: index("year_quarter_idx").on(table.year, table.quarter),
  symbolYearQuarterIdx: index("symbol_year_quarter_idx").on(table.symbol, table.year, table.quarter),
}));

export type TwStockFinancial = typeof twStockFinancials.$inferSelect;
export type InsertTwStockFinancial = typeof twStockFinancials.$inferInsert;

/**
 * 台股股利資訊表
 * 儲存台股的股利發放資訊（現金股利、股票股利、除息日、殖利率）
 */
export const twStockDividends = mysqlTable("twStockDividends", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // 股票代號
  year: int("year").notNull(), // 年度
  cashDividend: decimal("cashDividend", { precision: 10, scale: 4 }), // 現金股利（元/股）
  stockDividend: decimal("stockDividend", { precision: 10, scale: 4 }), // 股票股利（元/股）
  totalDividend: decimal("totalDividend", { precision: 10, scale: 4 }), // 合計股利（元/股）
  exDividendDate: timestamp("exDividendDate"), // 除息日
  paymentDate: timestamp("paymentDate"), // 發放日
  yieldRate: decimal("yieldRate", { precision: 5, scale: 2 }), // 殖利率（%）
  payoutRatio: decimal("payoutRatio", { precision: 5, scale: 2 }), // 配息率（%）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  yearIdx: index("year_idx").on(table.year),
  symbolYearIdx: index("symbol_year_idx").on(table.symbol, table.year),
  exDividendDateIdx: index("exDividendDate_idx").on(table.exDividendDate),
}));

export type TwStockDividend = typeof twStockDividends.$inferSelect;
export type InsertTwStockDividend = typeof twStockDividends.$inferInsert;

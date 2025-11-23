import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

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

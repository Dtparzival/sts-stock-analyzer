import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index, date } from "drizzle-orm/mysql-core";

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
 * 台股基本資料表
 * 儲存台股的基本資訊，包含股票代號、名稱、市場類別、產業別等
 * 資料來源: FinMind API - TaiwanStockInfo 或 TWSE/TPEx 官方資料
 * 
 * 更新策略: 每週自動同步一次 (週日 02:00 UTC+8)
 */
export const twStocks = mysqlTable("twStocks", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull().unique(), // 股票代號
  name: varchar("name", { length: 100 }).notNull(), // 股票名稱
  shortName: varchar("shortName", { length: 50 }), // 股票簡稱
  market: mysqlEnum("market", ["TWSE", "TPEx"]).notNull(), // 市場類型: 上市/上櫃
  industry: varchar("industry", { length: 50 }), // 產業分類
  type: varchar("type", { length: 20 }).default("STOCK"), // 類型: STOCK/ETF/WARRANT 等
  isActive: boolean("isActive").default(true).notNull(), // 是否活躍
  listedDate: date("listedDate"), // 上市日期
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  marketIdx: index("market_idx").on(table.market),
  industryIdx: index("industry_idx").on(table.industry),
  isActiveIdx: index("isActive_idx").on(table.isActive),
}));

export type TwStock = typeof twStocks.$inferSelect;
export type InsertTwStock = typeof twStocks.$inferInsert;

/**
 * 台股資料同步狀態表
 * 記錄股票基本資料的同步狀態，用於監控資料更新情況
 */
export const twDataSyncStatus = mysqlTable("twDataSyncStatus", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型: stocks
  source: varchar("source", { length: 50 }).notNull(), // 資料來源: finmind / twse / tpex
  lastSyncAt: timestamp("lastSyncAt").notNull(), // 最後同步時間 (UTC)
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(), // 狀態
  recordCount: int("recordCount").default(0).notNull(), // 本次同步筆數
  errorMessage: text("errorMessage"), // 錯誤訊息
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dataTypeIdx: index("dataType_idx").on(table.dataType),
  lastSyncAtIdx: index("lastSyncAt_idx").on(table.lastSyncAt),
}));

export type TwDataSyncStatus = typeof twDataSyncStatus.$inferSelect;
export type InsertTwDataSyncStatus = typeof twDataSyncStatus.$inferInsert;

/**
 * 台股資料同步錯誤記錄表
 * 詳細記錄同步過程中發生的錯誤
 */
export const twDataSyncErrors = mysqlTable("twDataSyncErrors", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型: stocks
  symbol: varchar("symbol", { length: 10 }), // 股票代號 (可為空，系統級錯誤)
  errorType: varchar("errorType", { length: 50 }).notNull(), // 錯誤類型: API / Network / Parse / Database / Validation
  errorMessage: text("errorMessage").notNull(), // 錯誤訊息
  errorStack: text("errorStack"), // 錯誤堆疊
  retryCount: int("retryCount").default(0).notNull(), // 重試次數
  resolved: boolean("resolved").default(false).notNull(), // 是否已解決
  syncedAt: timestamp("syncedAt").notNull(), // 錯誤發生時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  dataTypeIdx: index("dataType_idx").on(table.dataType),
  symbolIdx: index("symbol_idx").on(table.symbol),
  syncedAtIdx: index("syncedAt_idx").on(table.syncedAt),
}));

export type TwDataSyncError = typeof twDataSyncErrors.$inferSelect;
export type InsertTwDataSyncError = typeof twDataSyncErrors.$inferInsert;

/**
 * 美股基本資料表
 * 儲存美股的基本資訊，包含股票代號、公司名稱、交易所、產業分類等
 * 資料來源: TwelveData API - Stocks List
 * 
 * 更新策略: 每週自動同步一次 (週日 03:00 UTC+8)
 */
export const usStocks = mysqlTable("usStocks", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(), // 股票代號 (例如: AAPL)
  name: varchar("name", { length: 200 }).notNull(), // 公司全名
  shortName: varchar("shortName", { length: 100 }), // 公司簡稱
  exchange: varchar("exchange", { length: 20 }), // 交易所 (例如: NASDAQ, NYSE)
  currency: varchar("currency", { length: 10 }).default("USD").notNull(), // 幣別 (例如: USD)
  country: varchar("country", { length: 50 }), // 國家 (例如: United States)
  sector: varchar("sector", { length: 100 }), // 產業類別 (例如: Technology)
  industry: varchar("industry", { length: 100 }), // 產業細分 (例如: Consumer Electronics)
  type: varchar("type", { length: 20 }).default("Common Stock"), // 類型: Common Stock/ETF/ADR 等
  isActive: boolean("isActive").default(true).notNull(), // 是否活躍
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolIdx: index("us_symbol_idx").on(table.symbol),
  exchangeIdx: index("us_exchange_idx").on(table.exchange),
  sectorIdx: index("us_sector_idx").on(table.sector),
  isActiveIdx: index("us_isActive_idx").on(table.isActive),
}));

export type UsStock = typeof usStocks.$inferSelect;
export type InsertUsStock = typeof usStocks.$inferInsert;

/**
 * 美股資料同步狀態表
 * 記錄美股基本資料的同步狀態
 */
export const usDataSyncStatus = mysqlTable("usDataSyncStatus", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型: stocks
  source: varchar("source", { length: 50 }).notNull(), // 資料來源: twelvedata
  lastSyncAt: timestamp("lastSyncAt").notNull(), // 最後同步時間 (UTC)
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(), // 狀態
  recordCount: int("recordCount").default(0).notNull(), // 本次同步筆數
  errorMessage: text("errorMessage"), // 錯誤訊息
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dataTypeIdx: index("us_dataType_idx").on(table.dataType),
  lastSyncAtIdx: index("us_lastSyncAt_idx").on(table.lastSyncAt),
}));

export type UsDataSyncStatus = typeof usDataSyncStatus.$inferSelect;
export type InsertUsDataSyncStatus = typeof usDataSyncStatus.$inferInsert;

/**
 * 美股資料同步錯誤記錄表
 * 詳細記錄美股同步過程中發生的錯誤
 */
export const usDataSyncErrors = mysqlTable("usDataSyncErrors", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型: stocks
  symbol: varchar("symbol", { length: 20 }), // 股票代號 (可為空，系統級錯誤)
  errorType: varchar("errorType", { length: 50 }).notNull(), // 錯誤類型: API / Network / Parse / Database / Validation
  errorMessage: text("errorMessage").notNull(), // 錯誤訊息
  errorStack: text("errorStack"), // 錯誤堆疊
  retryCount: int("retryCount").default(0).notNull(), // 重試次數
  resolved: boolean("resolved").default(false).notNull(), // 是否已解決
  syncedAt: timestamp("syncedAt").notNull(), // 錯誤發生時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  dataTypeIdx: index("us_dataType_idx").on(table.dataType),
  symbolIdx: index("us_symbol_idx").on(table.symbol),
  syncedAtIdx: index("us_syncedAt_idx").on(table.syncedAt),
}));

export type UsDataSyncError = typeof usDataSyncErrors.$inferSelect;
export type InsertUsDataSyncError = typeof usDataSyncErrors.$inferInsert;

/**
 * 股票資料快取表
 * 用於快取即時查詢的資料，減少 API 呼叫次數
 * 快取策略:
 * - 公司名稱: 24 小時
 * - 股價數據: 5 分鐘 (交易時段) / 1 小時 (非交易時段)
 */
export const stockDataCache = mysqlTable("stockDataCache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 200 }).notNull().unique(), // 快取鍵值 (例如: stock_data:AAPL:US:quote)
  market: varchar("market", { length: 10 }).notNull(), // 市場: TW / US
  symbol: varchar("symbol", { length: 20 }).notNull(), // 股票代號
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型: quote / timeseries / name
  data: text("data").notNull(), // 快取資料 (JSON 格式)
  expiresAt: timestamp("expiresAt").notNull(), // 過期時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cacheKeyIdx: index("cacheKey_idx").on(table.cacheKey),
  marketSymbolIdx: index("market_symbol_idx").on(table.market, table.symbol),
  expiresAtIdx: index("expiresAt_idx").on(table.expiresAt),
}));

export type StockDataCache = typeof stockDataCache.$inferSelect;
export type InsertStockDataCache = typeof stockDataCache.$inferInsert;

/**
 * 使用者搜尋行為追蹤表
 * 記錄使用者的搜尋行為,用於個人化搜尋排序與建議
 */
export const userSearchBehavior = mysqlTable("userSearchBehavior", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 使用者 ID
  market: varchar("market", { length: 10 }).notNull(), // 市場: TW / US
  symbol: varchar("symbol", { length: 20 }).notNull(), // 股票代號
  searchCount: int("searchCount").default(1).notNull(), // 搜尋次數
  lastSearchAt: timestamp("lastSearchAt").defaultNow().notNull(), // 最後搜尋時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  userMarketSymbolIdx: index("user_market_symbol_idx").on(table.userId, table.market, table.symbol),
  lastSearchAtIdx: index("lastSearchAt_idx").on(table.lastSearchAt),
}));

export type UserSearchBehavior = typeof userSearchBehavior.$inferSelect;
export type InsertUserSearchBehavior = typeof userSearchBehavior.$inferInsert;

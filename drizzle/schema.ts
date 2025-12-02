import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index, bigint, date } from "drizzle-orm/mysql-core";

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
 * 資料來源: FinMind API - TaiwanStockInfo
 */
export const twStocks = mysqlTable("twStocks", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull().unique(), // 股票代號
  name: varchar("name", { length: 100 }).notNull(), // 股票名稱
  shortName: varchar("shortName", { length: 50 }), // 股票簡稱
  market: mysqlEnum("market", ["TWSE", "TPEx"]).notNull(), // 市場類型: 上市/上櫃
  industry: varchar("industry", { length: 50 }), // 產業分類
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
 * 台股歷史價格表
 * 儲存台股的每日交易資料，包含開高低收價格、成交量、成交金額等
 * 資料來源: FinMind API - TaiwanStockPrice
 * 
 * 價格儲存格式:
 * - 所有價格欄位(open, high, low, close, change)以「分」為單位儲存 (INT)
 *   例如: 股價 123.45 元儲存為 12345
 * - 漲跌幅以「基點」(萬分之一)為單位儲存 (INT)
 *   例如: 漲幅 3.25% 儲存為 325
 */
export const twStockPrices = mysqlTable("twStockPrices", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // 股票代號
  date: date("date").notNull(), // 交易日期
  open: int("open").notNull(), // 開盤價 (以分為單位)
  high: int("high").notNull(), // 最高價 (以分為單位)
  low: int("low").notNull(), // 最低價 (以分為單位)
  close: int("close").notNull(), // 收盤價 (以分為單位)
  volume: bigint("volume", { mode: "number" }).notNull(), // 成交量 (股)
  amount: bigint("amount", { mode: "number" }).notNull(), // 成交金額 (元)
  change: int("change").notNull(), // 漲跌 (以分為單位)
  changePercent: int("changePercent").notNull(), // 漲跌幅 (以基點為單位, 萬分之一)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  symbolDateIdx: index("symbol_date_idx").on(table.symbol, table.date),
  dateIdx: index("date_idx").on(table.date),
  symbolIdx: index("symbol_idx").on(table.symbol),
}));

export type TwStockPrice = typeof twStockPrices.$inferSelect;
export type InsertTwStockPrice = typeof twStockPrices.$inferInsert;

/**
 * 資料同步狀態表
 * 記錄各類資料的同步狀態，用於監控資料更新情況與排程執行結果
 */
export const twDataSyncStatus = mysqlTable("twDataSyncStatus", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型: stocks / prices
  source: varchar("source", { length: 50 }).notNull(), // 資料來源: finmind
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
 * 資料同步錯誤記錄表
 * 詳細記錄同步過程中發生的錯誤，包含錯誤類型、錯誤訊息、堆疊追蹤等
 */
export const twDataSyncErrors = mysqlTable("twDataSyncErrors", {
  id: int("id").autoincrement().primaryKey(),
  dataType: varchar("dataType", { length: 50 }).notNull(), // 資料類型: stocks / prices
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

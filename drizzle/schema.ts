import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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
 * 搜尋歷史表
 * 記錄用戶搜尋過的股票
 */
export const searchHistory = mysqlTable("searchHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  shortName: text("shortName"),
  companyName: text("companyName"),
  searchedAt: timestamp("searchedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
}));

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;

/**
 * 收藏清單表
 * 記錄用戶收藏的股票
 */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: text("name"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
}));

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * 用戶互動表
 * 追蹤用戶對推薦卡片的互動行為
 */
export const userInteractions = mysqlTable("userInteractions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  interactionType: mysqlEnum("interactionType", ["click", "swipe_left", "swipe_right", "long_press", "favorite", "unfavorite"]).notNull(),
  context: varchar("context", { length: 50 }), // 例如：recommendation_card, watchlist_card
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  symbolIdx: index("symbol_idx").on(table.symbol),
  typeIdx: index("type_idx").on(table.interactionType),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

export type UserInteraction = typeof userInteractions.$inferSelect;
export type InsertUserInteraction = typeof userInteractions.$inferInsert;

/**
 * 推薦緩存表
 * 儲存個人化推薦結果，減少重複計算
 */
export const recommendationCache = mysqlTable("recommendationCache", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  market: mysqlEnum("market", ["US", "TW"]).notNull(),
  score: int("score").notNull(), // 推薦評分（0-100）
  expiresAt: timestamp("expiresAt").notNull(), // 過期時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  marketIdx: index("market_idx").on(table.market),
  expiresAtIdx: index("expiresAt_idx").on(table.expiresAt),
  scoreIdx: index("score_idx").on(table.score),
}));

export type RecommendationCache = typeof recommendationCache.$inferSelect;
export type InsertRecommendationCache = typeof recommendationCache.$inferInsert;

/**
 * Vitest 測試環境設定
 */

// 設定測試環境變數
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://test:test@localhost:3306/test';

// 可以在這裡設定全域的測試前置作業

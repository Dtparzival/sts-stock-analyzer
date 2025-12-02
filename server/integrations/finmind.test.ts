/**
 * FinMind API Token 驗證測試
 */

import { describe, it, expect } from 'vitest';
import axios from 'axios';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4';
const FINMIND_TOKEN = process.env.FINMIND_TOKEN || '';

describe('FinMind API Token Validation', () => {
  it('should successfully authenticate with provided token', async () => {
    // 使用輕量級的 API 端點測試 token 是否有效
    // 測試取得台積電 (2330) 的最近一筆資料
    const response = await axios.get(`${FINMIND_BASE_URL}/data`, {
      params: {
        dataset: 'TaiwanStockPrice',
        data_id: '2330',
        start_date: '2024-12-01',
        token: FINMIND_TOKEN,
      },
      timeout: 10000,
    });

    // 檢查回應狀態
    expect(response.status).toBe(200);
    
    // 檢查回應資料結構
    expect(response.data).toBeDefined();
    expect(response.data.msg).toBe('success');
    expect(Array.isArray(response.data.data)).toBe(true);
    
    console.log('✅ FinMind API Token 驗證成功');
    console.log(`取得 ${response.data.data.length} 筆資料`);
  }, 15000); // 15 秒超時
});

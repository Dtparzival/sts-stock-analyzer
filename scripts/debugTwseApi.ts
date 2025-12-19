/**
 * 詳細測試 TWSE API 回應
 */

import axios from 'axios';

async function debugTwseApi() {
  console.log('=== TWSE API 詳細測試 ===\n');
  
  const TWSE_BASE_URL = 'https://openapi.twse.com.tw/v1';
  
  // 測試 1: 台積電 (2330) 歷史價格
  console.log('1️⃣  測試台積電 (2330) 歷史價格 API');
  console.log('   URL: /v1/exchangeReport/STOCK_DAY');
  console.log('   參數: stockNo=2330, date=202411\n');
  
  try {
    const response = await axios.get(`${TWSE_BASE_URL}/exchangeReport/STOCK_DAY`, {
      params: {
        stockNo: '2330',
        date: '202411', // 2024 年 11 月
      },
      timeout: 10000,
    });
    
    console.log('   狀態碼:', response.status);
    console.log('   回應類型:', typeof response.data);
    console.log('   回應內容:', JSON.stringify(response.data).substring(0, 500));
    
    if (response.data && typeof response.data === 'object') {
      console.log('\n   回應欄位:');
      Object.keys(response.data).forEach(key => {
        const value = response.data[key];
        const valueType = Array.isArray(value) ? `array(${value.length})` : typeof value;
        console.log(`     - ${key}: ${valueType}`);
      });
      
      if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('\n   第一筆資料:', JSON.stringify(response.data.data[0]));
      }
    }
  } catch (error: any) {
    console.error('   ❌ 錯誤:', error.message);
    if (error.response) {
      console.error('   回應狀態:', error.response.status);
      console.error('   回應內容:', JSON.stringify(error.response.data).substring(0, 200));
    }
  }
  
  console.log('\n');
  
  // 測試 2: 當月資料
  const now = new Date();
  const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  console.log('2️⃣  測試當月資料');
  console.log(`   日期: ${currentMonth}\n`);
  
  try {
    const response = await axios.get(`${TWSE_BASE_URL}/exchangeReport/STOCK_DAY`, {
      params: {
        stockNo: '2330',
        date: currentMonth,
      },
      timeout: 10000,
    });
    
    console.log('   狀態碼:', response.status);
    console.log('   回應類型:', typeof response.data);
    
    if (response.data && response.data.data) {
      console.log(`   資料筆數: ${response.data.data.length}`);
    } else {
      console.log('   無資料');
    }
  } catch (error: any) {
    console.error('   ❌ 錯誤:', error.message);
  }
  
  console.log('\n');
  
  // 測試 3: 股票列表 API
  console.log('3️⃣  測試股票列表 API');
  console.log('   URL: /v1/exchangeReport/STOCK_DAY_ALL\n');
  
  try {
    const response = await axios.get(`${TWSE_BASE_URL}/exchangeReport/STOCK_DAY_ALL`, {
      timeout: 10000,
    });
    
    console.log('   狀態碼:', response.status);
    console.log('   回應類型:', Array.isArray(response.data) ? 'array' : typeof response.data);
    
    if (Array.isArray(response.data)) {
      console.log(`   股票數量: ${response.data.length}`);
      
      if (response.data.length > 0) {
        console.log('\n   第一筆資料:', JSON.stringify(response.data[0]));
        console.log('\n   資料欄位:');
        Object.keys(response.data[0]).forEach(key => {
          console.log(`     - ${key}: ${response.data[0][key]}`);
        });
      }
    }
  } catch (error: any) {
    console.error('   ❌ 錯誤:', error.message);
  }
}

debugTwseApi().then(() => {
  console.log('\n測試完成');
  process.exit(0);
}).catch(error => {
  console.error('測試失敗:', error);
  process.exit(1);
});

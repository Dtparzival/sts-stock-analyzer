#!/usr/bin/env python3
"""測試 Yahoo Finance API 功能"""

import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json

def test_stock_chart():
    """測試股票圖表數據"""
    client = ApiClient()
    
    print("=== 測試股票圖表數據 (AAPL) ===")
    
    try:
        response = client.call_api('YahooFinance/get_stock_chart', query={
            'symbol': 'AAPL',
            'region': 'US',
            'interval': '1d',
            'range': '5d',
            'includeAdjustedClose': True,
            'events': 'div,split'
        })
        
        if response and 'chart' in response and 'result' in response['chart']:
            result = response['chart']['result'][0]
            meta = result['meta']
            
            print(f"股票代碼: {meta['symbol']}")
            print(f"公司名稱: {meta.get('longName', 'N/A')}")
            print(f"交易所: {meta['exchangeName']}")
            print(f"當前價格: ${meta['regularMarketPrice']:.2f}")
            print(f"52週最高: ${meta['fiftyTwoWeekHigh']:.2f}")
            print(f"52週最低: ${meta['fiftyTwoWeekLow']:.2f}")
            print("✓ 股票圖表API測試成功\n")
            return True
        else:
            print("✗ 無法獲取數據\n")
            return False
            
    except Exception as e:
        print(f"✗ API錯誤: {str(e)}\n")
        return False

def test_stock_insights():
    """測試股票分析洞察"""
    client = ApiClient()
    
    print("=== 測試股票分析洞察 (AAPL) ===")
    
    try:
        response = client.call_api('YahooFinance/get_stock_insights', query={
            'symbol': 'AAPL'
        })
        
        if response:
            print(f"獲取到洞察數據: {len(response)} 個欄位")
            print("✓ 股票洞察API測試成功\n")
            return True
        else:
            print("✗ 無法獲取數據\n")
            return False
            
    except Exception as e:
        print(f"✗ API錯誤: {str(e)}\n")
        return False

def test_stock_holders():
    """測試股東資訊"""
    client = ApiClient()
    
    print("=== 測試股東資訊 (AAPL) ===")
    
    try:
        response = client.call_api('YahooFinance/get_stock_holders', query={
            'symbol': 'AAPL',
            'region': 'US',
            'lang': 'en-US'
        })
        
        if response and 'quoteSummary' in response:
            quote_summary = response['quoteSummary']
            if quote_summary and 'result' in quote_summary and quote_summary['result']:
                result = quote_summary['result'][0]
                
                institutional_holders = result.get('institutionalHolders', {})
                if institutional_holders and 'holders' in institutional_holders:
                    print(f"機構投資者數量: {len(institutional_holders['holders'])}")
                
                print("✓ 股東資訊API測試成功\n")
                return True
        
        print("✗ 無法獲取數據\n")
        return False
            
    except Exception as e:
        print(f"✗ API錯誤: {str(e)}\n")
        return False

if __name__ == "__main__":
    print("開始測試 Yahoo Finance API\n")
    print("=" * 50)
    
    results = []
    results.append(("股票圖表", test_stock_chart()))
    results.append(("股票洞察", test_stock_insights()))
    results.append(("股東資訊", test_stock_holders()))
    
    print("=" * 50)
    print("\n測試結果總結:")
    for name, success in results:
        status = "✓ 成功" if success else "✗ 失敗"
        print(f"{name}: {status}")
    
    all_success = all(result[1] for result in results)
    if all_success:
        print("\n所有API測試通過！可以開始開發網站。")
    else:
        print("\n部分API測試失敗，請檢查。")

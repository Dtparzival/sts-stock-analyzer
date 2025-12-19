#!/usr/bin/env python3
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json

client = ApiClient()

response = client.call_api('YahooFinance/get_stock_chart', query={
    'symbol': 'AAPL',
    'region': 'US',
    'interval': '1d',
    'range': '5d',
    'includeAdjustedClose': True,
})

print("Response structure:")
print(json.dumps(response, indent=2)[:2000])

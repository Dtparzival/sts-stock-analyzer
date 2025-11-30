/**
 * 台股資料整合測試頁面
 * 用於驗證 tRPC API 是否正常運作
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function TwStockTest() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');

  // 搜尋台股
  const searchQuery = trpc.twStock.search.useQuery(
    { keyword: searchKeyword },
    { enabled: searchKeyword.length > 0 }
  );

  // 獲取股票詳情
  const detailQuery = trpc.twStock.getDetail.useQuery(
    { symbol: selectedSymbol },
    { enabled: selectedSymbol.length > 0 }
  );

  // 獲取歷史價格（最近 30 天）
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const historicalQuery = trpc.twStock.getHistorical.useQuery(
    {
      symbol: selectedSymbol,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    { enabled: selectedSymbol.length > 0 }
  );

  // 獲取技術指標
  const indicatorsQuery = trpc.twStock.getIndicators.useQuery(
    {
      symbol: selectedSymbol,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    { enabled: selectedSymbol.length > 0 }
  );

  // 獲取基本面資料
  const fundamentalsQuery = trpc.twStock.getFundamentals.useQuery(
    { symbol: selectedSymbol },
    { enabled: selectedSymbol.length > 0 }
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">台股資料整合測試</h1>

      {/* 搜尋區域 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>股票搜尋</CardTitle>
          <CardDescription>輸入股票代號或名稱進行搜尋</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="例如：2330 或 台積電"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <Button
              onClick={() => searchQuery.refetch()}
              disabled={searchQuery.isLoading}
            >
              {searchQuery.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              搜尋
            </Button>
          </div>

          {/* 搜尋結果 */}
          {searchQuery.data && searchQuery.data.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                找到 {searchQuery.data.length} 筆結果：
              </p>
              {searchQuery.data.map((stock) => (
                <div
                  key={stock.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedSymbol(stock.symbol)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{stock.symbol}</span>
                      <span className="ml-2">{stock.name}</span>
                      {stock.shortName && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({stock.shortName})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stock.market} | {stock.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery.data && searchQuery.data.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">未找到相關股票</p>
          )}
        </CardContent>
      </Card>

      {/* 股票詳情 */}
      {selectedSymbol && (
        <div className="space-y-6">
          {/* 基本資料 */}
          <Card>
            <CardHeader>
              <CardTitle>基本資料 - {selectedSymbol}</CardTitle>
            </CardHeader>
            <CardContent>
              {detailQuery.isLoading && (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  載入中...
                </div>
              )}
              {detailQuery.data && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">股票代號</p>
                    <p className="font-semibold">{detailQuery.data.symbol}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">股票名稱</p>
                    <p className="font-semibold">{detailQuery.data.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">市場</p>
                    <p className="font-semibold">{detailQuery.data.market}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">產業</p>
                    <p className="font-semibold">{detailQuery.data.industry || '未分類'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">類型</p>
                    <p className="font-semibold">{detailQuery.data.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">狀態</p>
                    <p className="font-semibold">
                      {detailQuery.data.isActive ? '交易中' : '停止交易'}
                    </p>
                  </div>
                </div>
              )}
              {!detailQuery.data && !detailQuery.isLoading && (
                <p className="text-sm text-muted-foreground">無基本資料</p>
              )}
            </CardContent>
          </Card>

          {/* 歷史價格 */}
          <Card>
            <CardHeader>
              <CardTitle>歷史價格（最近 30 天）</CardTitle>
            </CardHeader>
            <CardContent>
              {historicalQuery.isLoading && (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  載入中...
                </div>
              )}
              {historicalQuery.data && historicalQuery.data.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    共 {historicalQuery.data.length} 筆資料
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-2">日期</th>
                          <th className="text-right p-2">開盤</th>
                          <th className="text-right p-2">最高</th>
                          <th className="text-right p-2">最低</th>
                          <th className="text-right p-2">收盤</th>
                          <th className="text-right p-2">成交量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalQuery.data.map((price, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">
                              {new Date(price.date).toLocaleDateString('zh-TW')}
                            </td>
                            <td className="text-right p-2">{(price.open / 100).toFixed(2)}</td>
                            <td className="text-right p-2">{(price.high / 100).toFixed(2)}</td>
                            <td className="text-right p-2">{(price.low / 100).toFixed(2)}</td>
                            <td className="text-right p-2">{(price.close / 100).toFixed(2)}</td>
                            <td className="text-right p-2">{price.volume.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {historicalQuery.data && historicalQuery.data.length === 0 && (
                <p className="text-sm text-muted-foreground">無歷史價格資料</p>
              )}
            </CardContent>
          </Card>

          {/* 技術指標 */}
          <Card>
            <CardHeader>
              <CardTitle>技術指標</CardTitle>
            </CardHeader>
            <CardContent>
              {indicatorsQuery.isLoading && (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  載入中...
                </div>
              )}
              {indicatorsQuery.data && indicatorsQuery.data.length > 0 && (
                <p className="text-sm">共 {indicatorsQuery.data.length} 筆技術指標資料</p>
              )}
              {indicatorsQuery.data && indicatorsQuery.data.length === 0 && (
                <p className="text-sm text-muted-foreground">無技術指標資料</p>
              )}
            </CardContent>
          </Card>

          {/* 基本面資料 */}
          <Card>
            <CardHeader>
              <CardTitle>基本面資料</CardTitle>
            </CardHeader>
            <CardContent>
              {fundamentalsQuery.isLoading && (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  載入中...
                </div>
              )}
              {fundamentalsQuery.data && fundamentalsQuery.data.length > 0 && (
                <p className="text-sm">共 {fundamentalsQuery.data.length} 筆基本面資料</p>
              )}
              {fundamentalsQuery.data && fundamentalsQuery.data.length === 0 && (
                <p className="text-sm text-muted-foreground">無基本面資料</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

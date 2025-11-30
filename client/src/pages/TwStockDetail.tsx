/**
 * 台股詳情頁面
 * 顯示台股的完整資訊，包含基本資料、歷史價格、技術指標、基本面資料等
 */

import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  BarChart3,
  LineChart,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function TwStockDetail() {
  const [, params] = useRoute('/tw-stocks/:symbol');
  const [, setLocation] = useLocation();
  const symbol = params?.symbol || '';

  const [activeTab, setActiveTab] = useState('overview');
  const [priceRange, setPriceRange] = useState('1M'); // 1M, 3M, 6M, 1Y

  // 計算日期範圍
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (priceRange) {
      case '1M':
        start.setMonth(start.getMonth() - 1);
        break;
      case '3M':
        start.setMonth(start.getMonth() - 3);
        break;
      case '6M':
        start.setMonth(start.getMonth() - 6);
        break;
      case '1Y':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [priceRange]);

  // 獲取股票詳情
  const detailQuery = trpc.twStock.getDetail.useQuery(
    { symbol },
    { enabled: !!symbol }
  );

  // 獲取歷史價格
  const historicalQuery = trpc.twStock.getHistorical.useQuery(
    { symbol, startDate, endDate },
    { enabled: !!symbol }
  );

  // 獲取技術指標
  const indicatorsQuery = trpc.twStock.getIndicators.useQuery(
    { symbol, startDate, endDate },
    { enabled: !!symbol }
  );

  // 獲取基本面資料
  const fundamentalsQuery = trpc.twStock.getFundamentals.useQuery(
    { symbol },
    { enabled: !!symbol }
  );

  // 準備圖表資料
  const chartData = useMemo(() => {
    if (!historicalQuery.data || !indicatorsQuery.data) return [];

    return historicalQuery.data.map((price) => {
      const indicator = indicatorsQuery.data.find(
        (ind) => new Date(ind.date).toDateString() === new Date(price.date).toDateString()
      );

      return {
        date: format(new Date(price.date), 'MM/dd'),
        收盤價: price.close / 100, // 轉換回原始價格
        MA5: indicator?.ma5 ? indicator.ma5 / 100 : null,
        MA10: indicator?.ma10 ? indicator.ma10 / 100 : null,
        MA20: indicator?.ma20 ? indicator.ma20 / 100 : null,
        成交量: price.volume,
      };
    });
  }, [historicalQuery.data, indicatorsQuery.data]);

  const handleBack = () => {
    setLocation('/tw-stocks');
  };

  if (!symbol) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <p className="text-center text-muted-foreground">無效的股票代號</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-7xl">
        {/* 返回按鈕 */}
        <Button variant="ghost" onClick={handleBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回台股列表
        </Button>

        {/* 股票標題 */}
        {detailQuery.isLoading ? (
          <div className="mb-8 space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
        ) : detailQuery.data ? (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{detailQuery.data.symbol}</h1>
              <Badge variant="outline">{detailQuery.data.market}</Badge>
              {detailQuery.data.isActive ? (
                <Badge variant="default">交易中</Badge>
              ) : (
                <Badge variant="secondary">已下市</Badge>
              )}
            </div>
            <p className="text-xl text-muted-foreground">{detailQuery.data.name}</p>
            {detailQuery.data.industry && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {detailQuery.data.industry}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8">
            <p className="text-destructive">找不到股票資料</p>
          </div>
        )}

        {/* 主要內容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="overview">概況</TabsTrigger>
            <TabsTrigger value="chart">價格走勢</TabsTrigger>
            <TabsTrigger value="indicators">技術指標</TabsTrigger>
            <TabsTrigger value="fundamentals">基本面</TabsTrigger>
          </TabsList>

          {/* 概況頁籤 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* 基本資料 */}
              <Card>
                <CardHeader>
                  <CardTitle>基本資料</CardTitle>
                </CardHeader>
                <CardContent>
                  {detailQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : detailQuery.data ? (
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">股票代號</dt>
                        <dd className="font-semibold">{detailQuery.data.symbol}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">公司名稱</dt>
                        <dd className="font-semibold">{detailQuery.data.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">市場別</dt>
                        <dd className="font-semibold">{detailQuery.data.market}</dd>
                      </div>
                      {detailQuery.data.industry && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">產業別</dt>
                          <dd className="font-semibold">{detailQuery.data.industry}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">狀態</dt>
                        <dd>
                          {detailQuery.data.isActive ? (
                            <Badge variant="default">交易中</Badge>
                          ) : (
                            <Badge variant="secondary">已下市</Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-muted-foreground">無資料</p>
                  )}
                </CardContent>
              </Card>

              {/* 最新價格 */}
              <Card>
                <CardHeader>
                  <CardTitle>最新價格</CardTitle>
                  <CardDescription>最近一個交易日的收盤資料</CardDescription>
                </CardHeader>
                <CardContent>
                  {historicalQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : historicalQuery.data && historicalQuery.data.length > 0 ? (
                    (() => {
                      const latestPrice = historicalQuery.data[historicalQuery.data.length - 1];
                      const isPositive = latestPrice.change >= 0;

                      return (
                        <div className="space-y-4">
                          <div>
                            <div className="text-4xl font-bold">
                              {(latestPrice.close / 100).toFixed(2)}
                            </div>
                            <div
                              className={`flex items-center gap-2 mt-2 ${
                                isPositive ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {isPositive ? (
                                <TrendingUp className="h-5 w-5" />
                              ) : (
                                <TrendingDown className="h-5 w-5" />
                              )}
                              <span className="text-lg font-semibold">
                                {isPositive ? '+' : ''}
                                {(latestPrice.change / 100).toFixed(2)} (
                                {(latestPrice.changePercent / 10000).toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                          <dl className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <dt className="text-muted-foreground">開盤</dt>
                              <dd className="font-semibold">
                                {(latestPrice.open / 100).toFixed(2)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">最高</dt>
                              <dd className="font-semibold">
                                {(latestPrice.high / 100).toFixed(2)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">最低</dt>
                              <dd className="font-semibold">
                                {(latestPrice.low / 100).toFixed(2)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">成交量</dt>
                              <dd className="font-semibold">{latestPrice.volume.toLocaleString()} 張</dd>
                            </div>
                          </dl>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            更新時間：{format(new Date(latestPrice.date), 'yyyy/MM/dd')}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-muted-foreground">無價格資料</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 價格走勢頁籤 */}
          <TabsContent value="chart" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>價格走勢圖</CardTitle>
                    <CardDescription>歷史價格與移動平均線</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {['1M', '3M', '6M', '1Y'].map((range) => (
                      <Button
                        key={range}
                        variant={priceRange === range ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriceRange(range)}
                      >
                        {range}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historicalQuery.isLoading || indicatorsQuery.isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsLineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="收盤價"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="MA5"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={1}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="MA10"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={1}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="MA20"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={1}
                        dot={false}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">無圖表資料</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 技術指標頁籤 */}
          <TabsContent value="indicators" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>技術指標</CardTitle>
                <CardDescription>MA、RSI、MACD、KD 等技術指標</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">技術指標圖表開發中...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    即將推出 RSI、MACD、KD 等技術指標圖表
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 基本面頁籤 */}
          <TabsContent value="fundamentals" className="space-y-6">
            {fundamentalsQuery.isLoading && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">載入基本面資料中...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {fundamentalsQuery.error && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <p className="text-destructive">載入基本面資料失敗</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {fundamentalsQuery.error.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {fundamentalsQuery.data && fundamentalsQuery.data.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>基本面資料</CardTitle>
                  <CardDescription>財務報表、股利、本益比等資訊</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <LineChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暫無基本面資料</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      此股票目前沒有可用的財務指標資料
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {fundamentalsQuery.data && fundamentalsQuery.data.length > 0 && (
              <>
                {/* 最新財務指標 */}
                <Card>
                  <CardHeader>
                    <CardTitle>最新財務指標</CardTitle>
                    <CardDescription>
                      資料期間：{fundamentalsQuery.data[0].year} Q{fundamentalsQuery.data[0].quarter}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* EPS (每股盈餘) */}
                      {fundamentalsQuery.data[0].eps !== null && (
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="text-sm text-muted-foreground mb-1">每股盈餘 (EPS)</div>
                          <div className="number-display-lg text-2xl font-semibold">
                            {fundamentalsQuery.data[0].eps.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">元</div>
                        </div>
                      )}

                      {/* PE Ratio (本益比) */}
                      {fundamentalsQuery.data[0].pe !== null && (
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="text-sm text-muted-foreground mb-1">本益比 (P/E)</div>
                          <div className="number-display-lg text-2xl font-semibold">
                            {fundamentalsQuery.data[0].pe.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">倍</div>
                        </div>
                      )}

                      {/* PB Ratio (股價淨值比) */}
                      {fundamentalsQuery.data[0].pb !== null && (
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="text-sm text-muted-foreground mb-1">股價淨值比 (P/B)</div>
                          <div className="number-display-lg text-2xl font-semibold">
                            {fundamentalsQuery.data[0].pb.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">倍</div>
                        </div>
                      )}

                      {/* Dividend Yield (殖利率) */}
                      {fundamentalsQuery.data[0].yieldRate !== null && (
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="text-sm text-muted-foreground mb-1">殖利率</div>
                          <div className="number-display-lg text-2xl font-semibold">
                            {fundamentalsQuery.data[0].yieldRate.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">年化</div>
                        </div>
                      )}

                      {/* ROE (股東權益報酬率) */}
                      {fundamentalsQuery.data[0].roe !== null && (
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="text-sm text-muted-foreground mb-1">股東權益報酬率 (ROE)</div>
                          <div className="number-display-lg text-2xl font-semibold">
                            {fundamentalsQuery.data[0].roe.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">年化</div>
                        </div>
                      )}

                      {/* Dividend (股利) */}
                      {fundamentalsQuery.data[0].dividend !== null && (
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="text-sm text-muted-foreground mb-1">股利</div>
                          <div className="number-display-lg text-2xl font-semibold">
                            {fundamentalsQuery.data[0].dividend.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">元</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 歷史財務指標趨勢 */}
                {fundamentalsQuery.data.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>歷史財務指標</CardTitle>
                      <CardDescription>
                        顯示最近 {fundamentalsQuery.data.length} 期的財務指標變化
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">日期</th>
                              <th className="text-right py-2 px-4">EPS</th>
                              <th className="text-right py-2 px-4">本益比</th>
                              <th className="text-right py-2 px-4">股價淨值比</th>
                              <th className="text-right py-2 px-4">殖利率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fundamentalsQuery.data.slice(0, 10).map((item, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="py-2 px-4">
                                  {item.year} Q{item.quarter}
                                </td>
                                <td className="text-right py-2 px-4 number-display-sm">
                                  {item.eps !== null ? item.eps.toFixed(2) : '-'}
                                </td>
                                <td className="text-right py-2 px-4 number-display-sm">
                                  {item.pe !== null ? item.pe.toFixed(2) : '-'}
                                </td>
                                <td className="text-right py-2 px-4 number-display-sm">
                                  {item.pb !== null ? item.pb.toFixed(2) : '-'}
                                </td>
                                <td className="text-right py-2 px-4 number-display-sm">
                                  {item.yieldRate !== null ? `${item.yieldRate.toFixed(2)}%` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

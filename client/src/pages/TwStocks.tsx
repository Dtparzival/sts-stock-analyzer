/**
 * 台股搜尋頁面
 * 提供台股搜尋、熱門股票、市場概況等功能
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, TrendingDown, Building2, ArrowRight } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function TwStocks() {
  const [, setLocation] = useLocation();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('search');

  // 搜尋台股
  const searchQuery = trpc.twStock.search.useQuery(
    { keyword: searchKeyword },
    { enabled: searchKeyword.length > 0 }
  );

  const handleStockClick = (symbol: string) => {
    setLocation(`/tw-stocks/${symbol}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      searchQuery.refetch();
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">台股市場</h1>
          <p className="text-muted-foreground">
            搜尋台灣上市櫃股票，查看即時報價、技術指標與基本面資料
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="search">搜尋</TabsTrigger>
            <TabsTrigger value="popular">熱門股票</TabsTrigger>
            <TabsTrigger value="market">市場概況</TabsTrigger>
          </TabsList>

          {/* 搜尋頁籤 */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>股票搜尋</CardTitle>
                <CardDescription>
                  輸入股票代號（如 2330）或名稱（如 台積電）進行搜尋
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜尋股票代號或名稱..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" disabled={searchQuery.isLoading || !searchKeyword.trim()}>
                    {searchQuery.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    搜尋
                  </Button>
                </form>

                {/* 搜尋結果 */}
                {searchQuery.data && searchQuery.data.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      找到 {searchQuery.data.length} 筆結果
                    </p>
                    <div className="grid gap-3">
                      {searchQuery.data.map((stock) => (
                        <Card
                          key={stock.id}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleStockClick(stock.symbol)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-lg">{stock.symbol}</span>
                                    <Badge variant="outline">{stock.market}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {stock.name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {stock.industry && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Building2 className="h-4 w-4" />
                                    {stock.industry}
                                  </div>
                                )}
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery.data && searchQuery.data.length === 0 && (
                  <div className="mt-6 text-center py-12">
                    <p className="text-muted-foreground">找不到符合的股票</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      請嘗試其他關鍵字或股票代號
                    </p>
                  </div>
                )}

                {searchQuery.isError && (
                  <div className="mt-6 text-center py-12">
                    <p className="text-destructive">搜尋失敗，請稍後再試</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 搜尋提示 */}
            {!searchKeyword && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">搜尋提示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Search className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">使用股票代號</p>
                      <p className="text-sm text-muted-foreground">
                        例如：2330、2317、2454
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Search className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">使用公司名稱</p>
                      <p className="text-sm text-muted-foreground">
                        例如：台積電、鴻海、聯發科
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 熱門股票頁籤 */}
          <TabsContent value="popular" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>熱門股票</CardTitle>
                <CardDescription>市場關注度最高的台股</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-muted-foreground">熱門股票功能開發中...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    即將推出成交量排行、漲跌幅排行等功能
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 市場概況頁籤 */}
          <TabsContent value="market" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>市場概況</CardTitle>
                <CardDescription>台股大盤與產業指數</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-muted-foreground">市場概況功能開發中...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    即將推出加權指數、櫃買指數、產業指數等資訊
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Search, TrendingUp, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * 雙市場股票搜尋頁面
 * 支援台股與美股的搜尋功能
 */
export default function StockSearch() {
  const [, navigate] = useLocation();
  const [market, setMarket] = useState<"TW" | "US">("US");
  const [keyword, setKeyword] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  // 台股搜尋
  const twSearchQuery = trpc.twStock.search.useQuery(
    { query: keyword, limit: 20 },
    { enabled: searchTriggered && market === "TW" && keyword.length > 0 }
  );

  // 美股搜尋
  const usSearchQuery = trpc.usStock.search.useQuery(
    { keyword, limit: 20 },
    { enabled: searchTriggered && market === "US" && keyword.length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim().length === 0) {
      toast.error("請輸入股票代號或名稱");
      return;
    }
    setSearchTriggered(true);
  };

  const handleStockClick = (symbol: string) => {
    navigate(`/stock/${market}/${symbol}`);
  };

  const isLoading = market === "TW" ? twSearchQuery.isLoading : usSearchQuery.isLoading;
  const searchResults = market === "TW" ? twSearchQuery.data?.data : usSearchQuery.data?.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            股票搜尋
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            搜尋台股與美股,查看即時報價與歷史數據
          </p>
        </div>

        {/* Market Tabs */}
        <Tabs value={market} onValueChange={(v) => setMarket(v as "TW" | "US")} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="US" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              美股市場
            </TabsTrigger>
            <TabsTrigger value="TW" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              台股市場
            </TabsTrigger>
          </TabsList>

          <TabsContent value="US" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>美股搜尋</CardTitle>
                <CardDescription>
                  輸入股票代號 (如 AAPL) 或公司名稱 (如 Apple) 進行搜尋
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                  <Input
                    type="text"
                    placeholder="輸入股票代號或名稱..."
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setSearchTriggered(false);
                    }}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading}>
                    <Search className="w-4 h-4 mr-2" />
                    搜尋
                  </Button>
                </form>

                {/* Search Results */}
                {isLoading && (
                  <div className="text-center py-8 text-slate-500">
                    搜尋中...
                  </div>
                )}

                {searchTriggered && !isLoading && searchResults && searchResults.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    找不到符合的股票
                  </div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((stock: any) => (
                      <Card
                        key={stock.symbol}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => handleStockClick(stock.symbol)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg">{stock.symbol}</span>
                                {stock.exchange && (
                                  <Badge variant="outline">{stock.exchange}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {stock.name || stock.shortName}
                              </p>
                              {stock.sector && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {stock.sector}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              查看詳情
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="TW" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>台股搜尋</CardTitle>
                <CardDescription>
                  輸入股票代號 (如 2330) 或公司名稱 (如 台積電) 進行搜尋
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                  <Input
                    type="text"
                    placeholder="輸入股票代號或名稱..."
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setSearchTriggered(false);
                    }}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading}>
                    <Search className="w-4 h-4 mr-2" />
                    搜尋
                  </Button>
                </form>

                {/* Search Results */}
                {isLoading && (
                  <div className="text-center py-8 text-slate-500">
                    搜尋中...
                  </div>
                )}

                {searchTriggered && !isLoading && searchResults && searchResults.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    找不到符合的股票
                  </div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((stock: any) => (
                      <Card
                        key={stock.symbol}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => handleStockClick(stock.symbol)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg">{stock.symbol}</span>
                                {stock.market && (
                                  <Badge variant="outline">{stock.market}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {stock.name}
                              </p>
                              {stock.industry && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {stock.industry}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              查看詳情
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">熱門股票</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setMarket("US");
                  setKeyword("AAPL");
                  setSearchTriggered(true);
                }}
              >
                AAPL - Apple
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setMarket("US");
                  setKeyword("MSFT");
                  setSearchTriggered(true);
                }}
              >
                MSFT - Microsoft
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setMarket("TW");
                  setKeyword("2330");
                  setSearchTriggered(true);
                }}
              >
                2330 - 台積電
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setMarket("TW");
                  setKeyword("2317");
                  setSearchTriggered(true);
                }}
              >
                2317 - 鴻海
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

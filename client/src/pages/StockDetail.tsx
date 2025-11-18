import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Star, StarOff, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import StockChart from "@/components/StockChart";
import { getMarketFromSymbol, cleanTWSymbol, getTWStockName, HOT_STOCKS, MARKETS } from "@shared/markets";
import { isMarketOpen } from "@shared/tradingHours";

export default function StockDetail() {
  const [, params] = useRoute("/stock/:symbol");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const symbol = params?.symbol?.toUpperCase() || "";

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [chartRange, setChartRange] = useState("1mo");
  const [chartInterval, setChartInterval] = useState("1d");

  const { data: stockData, isLoading: loadingStock, error: stockError, refetch: refetchStockData } = trpc.stock.getStockData.useQuery(
    { symbol, range: chartRange, interval: chartInterval },
    { 
      enabled: !!symbol,
      retry: 1, // 只重試一次
    }
  );

  // 處理 API 錯誤
  useEffect(() => {
    if (stockError) {
      if (stockError.message?.includes('資料服務暫時繁忙')) {
        toast.error('資料服務暫時繁忙，請稍後再試。第二次請求會使用緩存數據。', {
          duration: 5000,
        });
      } else {
        toast.error(`無法載入股票數據：${stockError.message}`);
      }
    }
  }, [stockError]);

  // 判斷是否在交易時間內
  const market = getMarketFromSymbol(symbol);
  const marketOpen = isMarketOpen(market);

  const { data: watchlistCheck, refetch: refetchWatchlistCheck } = trpc.watchlist.check.useQuery(
    { symbol },
    { 
      enabled: !!user && !!symbol,
      refetchOnMount: 'always', // 每次進入詳情頁時強制重新查詢
      refetchOnWindowFocus: false, // 禁用窗口聚焦時重新查詢
      staleTime: 0, // 立即過期
    }
  );

  // 當 symbol 改變時，強制重新查詢收藏狀態
  useEffect(() => {
    if (user && symbol && refetchWatchlistCheck) {
      refetchWatchlistCheck();
    }
  }, [symbol, user, refetchWatchlistCheck]);

  const utils = trpc.useUtils();
  const addToWatchlist = trpc.watchlist.add.useMutation({
    onMutate: async () => {
      // 樂觀更新：立即更新 UI
      await utils.watchlist.check.cancel({ symbol });
      const previousData = utils.watchlist.check.getData({ symbol });
      utils.watchlist.check.setData({ symbol }, { isInWatchlist: true });
      return { previousData };
    },
    onError: (error, variables, context) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        utils.watchlist.check.setData({ symbol }, context.previousData);
      }
      toast.error("添加到收藏失敗，請稍後再試");
    },
    onSuccess: () => {
      toast.success("已添加到收藏");
    },
    onSettled: () => {
      // 確保數據同步
      utils.watchlist.check.invalidate({ symbol });
      utils.watchlist.list.invalidate();
    },
  });

  const removeFromWatchlist = trpc.watchlist.remove.useMutation({
    onMutate: async () => {
      // 樂觀更新：立即更新 UI
      await utils.watchlist.check.cancel({ symbol });
      const previousData = utils.watchlist.check.getData({ symbol });
      utils.watchlist.check.setData({ symbol }, { isInWatchlist: false });
      return { previousData };
    },
    onError: (error, variables, context) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        utils.watchlist.check.setData({ symbol }, context.previousData);
      }
      toast.error("移除收藏失敗，請稍後再試");
    },
    onSuccess: () => {
      toast.success("已從收藏中移除");
    },
    onSettled: () => {
      // 確保數據同步
      utils.watchlist.check.invalidate({ symbol });
      utils.watchlist.list.invalidate();
    },
  });

  const getAIAnalysis = trpc.stock.getAIAnalysis.useMutation();
  const getTrendPrediction = trpc.stock.getTrendPrediction.useMutation();

  const [analysis, setAnalysis] = useState<string>("");
  const [prediction, setPrediction] = useState<string>("");

  // 格式化圖表數據
  const formatChartData = (data: any) => {
    if (!data?.chart?.result?.[0]) return [];
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];
    
    return timestamps.map((timestamp: number, index: number) => {
      const date = new Date(timestamp * 1000);
      const price = closes[index];
      
      // 根據時間範圍決定日期格式
      let dateStr = "";
      if (chartRange === "1d") {
        dateStr = date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
      } else if (chartRange === "5d") {
        dateStr = date.toLocaleDateString("zh-TW", { month: "short", day: "numeric", hour: "2-digit" });
      } else {
        dateStr = date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
      }
      
      return {
        date: dateStr,
        price: price ? parseFloat(price.toFixed(2)) : null,
        volume: volumes[index] ? Math.round(volumes[index] / 1000000) : 0,
      };
    }).filter((item: any) => item.price !== null);
  };

  const meta = (stockData as any)?.chart?.result?.[0]?.meta;
  const stockMarket = getMarketFromSymbol(symbol);
  const displaySymbol = stockMarket === 'TW' ? cleanTWSymbol(symbol) : symbol;
  
  // 獲取中文名稱（台股）
  let companyName = meta?.longName || symbol;
  if (stockMarket === 'TW') {
    // 先嘗試從 TW_STOCK_NAMES 映射表獲取中文名稱
    const twName = getTWStockName(symbol);
    if (twName) {
      companyName = twName;
    } else {
      // 如果映射表中沒有，再從 HOT_STOCKS 查找
      const twStock = HOT_STOCKS.TW.find(s => s.symbol === displaySymbol);
      if (twStock) {
        companyName = twStock.name;
      }
    }
  }
  const currentPrice = meta?.regularMarketPrice;
  const previousClose = meta?.chartPreviousClose;
  const priceChange = currentPrice && previousClose ? currentPrice - previousClose : 0;
  const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0;
  
  // 獲取貨幣符號
  const currencySymbol = MARKETS[market].currencySymbol;

  const handleWatchlistToggle = () => {
    if (!user) {
      toast.error("請先登入");
      return;
    }

    if (watchlistCheck?.isInWatchlist) {
      removeFromWatchlist.mutate({ symbol });
    } else {
      addToWatchlist.mutate({ symbol, companyName });
    }
  };

  const handleGetAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await getAIAnalysis.mutateAsync({
        symbol,
        companyName,
      });
      setAnalysis(result.analysis);
      if (result.fromCache) {
        toast.info("顯示緩存的分析結果");
      }
    } catch (error: any) {
      console.error('AI 分析錯誤:', error);
      toast.error(error.message || '獲取 AI 分析失敗，請稍後再試', {
        duration: 5000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetPrediction = async () => {
    setIsPredicting(true);
    try {
      // 準備原始數據格式（包含 close, high, low, volume）
      const result = (stockData as any)?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const quotes = result?.indicators?.quote?.[0] || {};
      const rawHistoricalData = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString(),
        close: quotes.close?.[index] || 0,
        high: quotes.high?.[index] || 0,
        low: quotes.low?.[index] || 0,
        volume: quotes.volume?.[index] || 0,
      })).filter((item: any) => item.close > 0);

      const predictionResult = await getTrendPrediction.mutateAsync({
        symbol,
        companyName,
        historicalData: rawHistoricalData, // 傳遞完整的歷史數據
      });
      setPrediction(predictionResult.prediction);
      if (predictionResult.fromCache) {
        toast.info("顯示緩存的預測結果");
      }
    } catch (error: any) {
      console.error('趨勢預測錯誤:', error);
      toast.error(error.message || '獲取趨勢預測失敗，請稍後再試', {
        duration: 5000,
      });
    } finally {
      setIsPredicting(false);
    }
  };

  if (loadingStock) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!(stockData as any)?.chart?.result?.[0]) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
          <Card className="mt-8">
            <CardContent className="text-center py-12">
              <p className="text-lg text-muted-foreground">找不到股票代碼 {symbol} 的資料</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const chartData = formatChartData(stockData);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按鈕 */}
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
        </Button>

        {/* 股票標題和收藏按鈕 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{displaySymbol}</h1>
            </div>
            <p className="text-2xl text-muted-foreground">
              {companyName}
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleWatchlistToggle}
            disabled={!user}
          >
            {watchlistCheck?.isInWatchlist ? (
              <>
                <StarOff className="h-5 w-5 mr-2" />
                取消收藏
              </>
            ) : (
              <>
                <Star className="h-5 w-5 mr-2" />
                加入收藏
              </>
            )}
          </Button>
        </div>

        {/* 價格資訊卡片 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">當前價格</p>
                <p className="text-3xl font-bold">{currencySymbol}{currentPrice?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">漲跌</p>
                <div className="flex items-center gap-2">
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                  <p className={`text-2xl font-bold ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChange >= 0 ? '+' : ''}{currencySymbol}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">開盤價</p>
                <p className="text-2xl font-semibold">{currencySymbol}{meta?.regularMarketOpen?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">昨收價</p>
                <p className="text-2xl font-semibold">{currencySymbol}{previousClose?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">最高價</p>
                <p className="text-2xl font-semibold">{currencySymbol}{meta?.regularMarketDayHigh?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">最低價</p>
                <p className="text-2xl font-semibold">{currencySymbol}{meta?.regularMarketDayLow?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">成交量</p>
                <p className="text-2xl font-semibold">{meta?.regularMarketVolume?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">市值</p>
                <p className="text-2xl font-semibold">
                  {meta?.marketCap ? `$${(meta.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* 數據更新時間戳 */}
            {(stockData as any)?._metadata && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">數據更新時間:</span>
                    <span>
                      {new Date((stockData as any)._metadata.lastUpdated).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  {(stockData as any)._metadata.isFromCache && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>使用緩存數據</span>
                    </div>
                  )}
                  {!(stockData as any)._metadata.isFromCache && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      <span>即時數據</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">緩存過期時間:</span>
                    <span>
                      {new Date((stockData as any)._metadata.expiresAt).toLocaleString('zh-TW', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 股價走勢圖 */}
        <StockChart
          symbol={symbol}
          data={chartData}
          isLoading={loadingStock}
          currentRange={chartRange}
          onRangeChange={(range, interval) => {
            setChartRange(range);
            setChartInterval(interval);
          }}
        />

        {/* 分析和預測標籤頁 */}
        <Tabs defaultValue="analysis" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">AI 投資分析</TabsTrigger>
            <TabsTrigger value="prediction">未來趨勢預測</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>AI 投資分析</CardTitle>
                <CardDescription>
                  基於公司基本面、技術面和市場情緒的綜合分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!analysis ? (
                  <div className="text-center py-12">
                    <Button onClick={handleGetAnalysis} disabled={isAnalyzing} size="lg">
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          分析中...
                        </>
                      ) : (
                        "開始分析"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <Streamdown>{analysis}</Streamdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prediction">
            <Card>
              <CardHeader>
                <CardTitle>未來趨勢預測</CardTitle>
                <CardDescription>
                  基於歷史數據和市場趨勢的未來走勢預測
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!prediction ? (
                  <div className="text-center py-12">
                    <Button onClick={handleGetPrediction} disabled={isPredicting} size="lg">
                      {isPredicting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          預測中...
                        </>
                      ) : (
                        "開始預測"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <Streamdown>{prediction}</Streamdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

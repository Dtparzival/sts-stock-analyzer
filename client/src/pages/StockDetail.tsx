import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Star, StarOff, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function StockDetail() {
  const [, params] = useRoute("/stock/:symbol");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const symbol = params?.symbol?.toUpperCase() || "";

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  const { data: stockData, isLoading: loadingStock } = trpc.stock.getStockData.useQuery(
    { symbol, range: "1mo", interval: "1d" },
    { enabled: !!symbol }
  );

  const { data: watchlistCheck } = trpc.watchlist.check.useQuery(
    { symbol },
    { enabled: !!user && !!symbol }
  );

  const utils = trpc.useUtils();
  const addToWatchlist = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      toast.success("已添加到收藏");
      utils.watchlist.check.invalidate({ symbol });
      utils.watchlist.list.invalidate();
    },
  });

  const removeFromWatchlist = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      toast.success("已從收藏中移除");
      utils.watchlist.check.invalidate({ symbol });
      utils.watchlist.list.invalidate();
    },
  });

  const getAIAnalysis = trpc.stock.getAIAnalysis.useMutation();
  const getTrendPrediction = trpc.stock.getTrendPrediction.useMutation();

  const [analysis, setAnalysis] = useState<string>("");
  const [prediction, setPrediction] = useState<string>("");

  const meta = (stockData as any)?.chart?.result?.[0]?.meta;
  const companyName = meta?.longName || symbol;
  const currentPrice = meta?.regularMarketPrice;
  const previousClose = meta?.chartPreviousClose;
  const priceChange = currentPrice && previousClose ? currentPrice - previousClose : 0;
  const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0;

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
        currentPrice,
      });
      setAnalysis(result.analysis);
      if (result.fromCache) {
        toast.info("顯示緩存的分析結果");
      }
    } catch (error) {
      toast.error("獲取分析失敗");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetPrediction = async () => {
    setIsPredicting(true);
    try {
      const result = await getTrendPrediction.mutateAsync({
        symbol,
        companyName,
      });
      setPrediction(result.prediction);
      if (result.fromCache) {
        toast.info("顯示緩存的預測結果");
      }
    } catch (error) {
      toast.error("獲取預測失敗");
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
        <div className="container mx-auto px-4 py-12">
          <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">找不到股票代碼：{symbol}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
        </Button>

        {/* 股票標題 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{companyName}</h1>
            <p className="text-xl text-muted-foreground">{symbol}</p>
          </div>
          {user && (
            <Button
              variant="outline"
              onClick={handleWatchlistToggle}
              disabled={addToWatchlist.isPending || removeFromWatchlist.isPending}
            >
              {watchlistCheck?.isInWatchlist ? (
                <>
                  <StarOff className="h-4 w-4 mr-2" />
                  取消收藏
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  加入收藏
                </>
              )}
            </Button>
          )}
        </div>

        {/* 價格資訊 */}
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="flex items-end gap-4">
              <div className="text-5xl font-bold">${currentPrice?.toFixed(2)}</div>
              <div className={`flex items-center gap-2 text-2xl ${priceChange >= 0 ? "price-up" : "price-down"}`}>
                {priceChange >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                <span>
                  {priceChange >= 0 ? "+" : ""}
                  {priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">開盤價</p>
                <p className="text-lg font-semibold">${meta?.regularMarketOpen?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">最高價</p>
                <p className="text-lg font-semibold">${meta?.regularMarketDayHigh?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">最低價</p>
                <p className="text-lg font-semibold">${meta?.regularMarketDayLow?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">成交量</p>
                <p className="text-lg font-semibold">{meta?.regularMarketVolume?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 分析標籤頁 */}
        <Tabs defaultValue="analysis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">投資分析</TabsTrigger>
            <TabsTrigger value="prediction">趨勢預測</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>AI 投資分析</CardTitle>
                <CardDescription>
                  基於公司基本面、技術面和市場環境的綜合分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!analysis ? (
                  <div className="text-center py-12">
                    <Button onClick={handleGetAnalysis} disabled={isAnalyzing} size="lg">
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          分析中...
                        </>
                      ) : (
                        "開始分析"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <Streamdown>{analysis}</Streamdown>
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
                  基於技術指標和市場情緒的短中期趨勢預測
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!prediction ? (
                  <div className="text-center py-12">
                    <Button onClick={handleGetPrediction} disabled={isPredicting} size="lg">
                      {isPredicting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          預測中...
                        </>
                      ) : (
                        "開始預測"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <Streamdown>{prediction}</Streamdown>
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

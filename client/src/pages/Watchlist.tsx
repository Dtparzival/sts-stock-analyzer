import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Star, Sparkles, TrendingUp, Globe, ArrowUpDown } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { getMarketFromSymbol, cleanTWSymbol, getTWStockName } from "@shared/markets";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";


type MarketFilter = 'all' | 'US' | 'TW';
type SortOption = 'addedAt' | 'price' | 'changePercent';

// 股價顯示組件 - 優化為與「為您推薦」區塊一致的樣式
function StockPriceDisplay({ 
  symbol, 
  addedAt, 
  onPriceLoaded 
}: { 
  symbol: string; 
  addedAt: Date;
  onPriceLoaded?: (symbol: string, price: number, changePercent: number) => void;
}) {
  const { data: stockData, isLoading, error } = trpc.stock.getStockData.useQuery(
    { symbol, range: '1d', interval: '1d' },
    { 
      enabled: !!symbol,
      retry: 1,
      refetchInterval: 30000, // 每 30 秒自動更新
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>載入中...</span>
      </div>
    );
  }

  // 從 stockData 中提取價格資訊
  const meta = stockData?.chart?.result?.[0]?.meta;
  const currentPrice = meta?.regularMarketPrice;
  const previousClose = meta?.previousClose || meta?.chartPreviousClose;
  
  // 檢查數據是否完整
  if (error || !stockData || !currentPrice || !previousClose) {
    return (
      <div className="text-[10px] sm:text-xs text-muted-foreground/70 flex items-center gap-1">
        <span className="truncate">添加於 {new Date(addedAt).toLocaleDateString("zh-TW")}</span>
      </div>
    );
  }

  const change = currentPrice - previousClose;
  const changePercent = (change / previousClose) * 100;
  const isPositive = change >= 0;

  // 回傳股價數據供排序使用
  useEffect(() => {
    if (onPriceLoaded && currentPrice && changePercent !== undefined) {
      onPriceLoaded(symbol, currentPrice, changePercent);
    }
  }, [symbol, currentPrice, changePercent, onPriceLoaded]);

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      {/* 當前股價 */}
      <div className="text-sm sm:text-base font-bold text-foreground">
        ${currentPrice.toFixed(2)}
      </div>
      {/* 漲跌幅 */}
      <div className={`text-xs sm:text-sm font-semibold ${
        isPositive 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-red-600 dark:text-red-400'
      }`}>
        {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
      </div>
    </div>
  );
}

export default function Watchlist() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('addedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const STORAGE_KEY = 'batch_analysis_results';



  const { data: watchlist, isLoading } = trpc.watchlist.list.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  
  const batchAnalyze = trpc.watchlist.batchAnalyze.useMutation({
    onSuccess: (data) => {
      // 儲存結果到 sessionStorage
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.results));
      toast.success(`成功分析 ${data.results.length} 支股票`);
      // 導航到全屏結果頁面
      setLocation('/batch-analysis');
    },
    onError: (error) => {
      toast.error(error.message || "批量分析失敗，請稍後再試");
    },
  });
  
  const removeFromWatchlist = trpc.watchlist.remove.useMutation({
    onMutate: async ({ symbol }) => {
      // 樂觀更新：立即從列表中移除
      await utils.watchlist.list.cancel();
      const previousData = utils.watchlist.list.getData();
      utils.watchlist.list.setData(undefined, (old) => 
        old ? old.filter(item => item.symbol !== symbol) : []
      );
      return { previousData };
    },
    onError: (error, variables, context) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        utils.watchlist.list.setData(undefined, context.previousData);
      }
      toast.error("移除收藏失敗，請稍後再試");
    },
    onSuccess: () => {
      toast.success("已從收藏中移除");
    },
    onSettled: () => {
      // 確保數據同步
      utils.watchlist.list.invalidate();
    },
  });

  const handleRemove = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation(); // 阻止事件冒泡，不觸發卡片點擊
    removeFromWatchlist.mutate({ symbol });
  };

  // 儲存股價數據供排序使用
  const [stockPrices, setStockPrices] = useState<Record<string, { price: number; changePercent: number }>>({});

  // 篩選和排序收藏列表
  const filteredWatchlist = useMemo(() => {
    if (!watchlist) return [];
    
    // 先篩選市場
    let filtered = marketFilter === 'all' 
      ? watchlist 
      : watchlist.filter(item => getMarketFromSymbol(item.symbol) === marketFilter);
    
    // 再排序
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'addedAt') {
        compareValue = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      } else if (sortBy === 'price') {
        const priceA = stockPrices[a.symbol]?.price ?? 0;
        const priceB = stockPrices[b.symbol]?.price ?? 0;
        compareValue = priceA - priceB;
      } else if (sortBy === 'changePercent') {
        const changeA = stockPrices[a.symbol]?.changePercent ?? 0;
        const changeB = stockPrices[b.symbol]?.changePercent ?? 0;
        compareValue = changeA - changeB;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
  }, [watchlist, marketFilter, sortBy, sortOrder, stockPrices]);

  // 切換排序選項
  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('desc');
    }
  };

  // 處理股價載入完成
  const handlePriceLoaded = useCallback((symbol: string, price: number, changePercent: number) => {
    setStockPrices(prev => ({
      ...prev,
      [symbol]: { price, changePercent }
    }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground mb-6">請先登入以查看收藏列表</p>
              <Button asChild>
                <a href={getLoginUrl()}>登入</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按鈕 - 優化設計 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <ArrowLeft className="h-5 w-5 text-white" />
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")} className="hover:bg-primary/10 font-semibold">
            返回首頁
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-secondary">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">我的收藏</h1>
              <p className="text-muted-foreground mt-1">追蹤您關注的股票</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* 排序按鈕 */}
            {watchlist && watchlist.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'addedAt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('addedAt')}
                  className={sortBy === 'addedAt' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
                >
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  添加時間
                  {sortBy === 'addedAt' && (
                    <span className="ml-1 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
                <Button
                  variant={sortBy === 'price' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('price')}
                  className={sortBy === 'price' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
                >
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  價格
                  {sortBy === 'price' && (
                    <span className="ml-1 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
                <Button
                  variant={sortBy === 'changePercent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('changePercent')}
                  className={sortBy === 'changePercent' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
                >
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  漲跌幅
                  {sortBy === 'changePercent' && (
                    <span className="ml-1 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </div>
            )}
            
            {/* 批量分析按鈕 */}
            {watchlist && watchlist.length > 0 && (
              <Button
                variant="default"
                size="default"
                onClick={() => batchAnalyze.mutate()}
                disabled={batchAnalyze.isPending}
                className="bg-gradient-primary text-white border-0 shadow-md button-hover"
              >
                {batchAnalyze.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    批量 AI 分析
                  </>
                )}
              </Button>
            )}
            
            {/* 市場篩選器 */}
            <div className="flex gap-2">
            <Button
              variant={marketFilter === 'all' ? 'default' : 'outline'}
              size="default"
              onClick={() => setMarketFilter('all')}
              className={marketFilter === 'all' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
            >
              全部
            </Button>
            <Button
              variant={marketFilter === 'US' ? 'default' : 'outline'}
              size="default"
              onClick={() => setMarketFilter('US')}
              className={marketFilter === 'US' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
            >
              美股
            </Button>
            <Button
              variant={marketFilter === 'TW' ? 'default' : 'outline'}
              size="default"
              onClick={() => setMarketFilter('TW')}
              className={marketFilter === 'TW' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
            >
              台股
            </Button>
          </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !watchlist || watchlist.length === 0 ? (
          <Card className="border-2 shadow-lg">
            <CardContent className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Star className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">尚未收藏任何股票</p>
                  <p className="text-muted-foreground">開始搜尋並收藏您關注的股票</p>
                </div>
                <Button onClick={() => setLocation("/")} className="mt-4 bg-gradient-primary text-white border-0 shadow-md button-hover">
                  前往首頁搜尋
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredWatchlist.length === 0 ? (
          <Card className="border-2 shadow-lg">
            <CardContent className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Star className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">沒有符合篩選條件的股票</p>
                  <p className="text-muted-foreground">請嘗試切換其他市場篩選器</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredWatchlist.map((item) => {
              const market = getMarketFromSymbol(item.symbol);
              const displaySymbol = market === 'TW' ? cleanTWSymbol(item.symbol) : item.symbol;
              
              // 處理顯示名稱
              let displayName = item.companyName;
              if (market === 'TW') {
                const twName = getTWStockName(item.symbol);
                if (twName) {
                  displayName = twName;
                } else if (item.companyName && !item.companyName.includes('.TW') && !item.companyName.includes('.TWO')) {
                  displayName = item.companyName;
                } else {
                  displayName = item.symbol;
                }
              }
              
              return (
                <Card
                  key={item.id}
                  className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 active:scale-95"
                  onClick={() => setLocation(`/stock/${item.symbol}`)}
                >
                  {/* 市場標籤 */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      market === 'US' 
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                        : 'bg-green-500/20 text-green-700 dark:text-green-300'
                    }`}>
                      <Globe className="h-3 w-3" />
                      {market === 'US' ? '美股' : '台股'}
                    </span>
                  </div>
                  
                  {/* 漸層背景裝飾 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <CardContent className="relative p-3 sm:p-4 flex flex-col items-center justify-center min-h-[180px] sm:min-h-[160px]">
                    {/* 股票圖標與收藏按鈕 */}
                    <div className="mb-2 sm:mb-3 flex items-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-background/80 hover:bg-background hover:scale-110 transition-all duration-200 shadow-sm"
                        onClick={(e) => handleRemove(e, item.symbol)}
                        title="移除收藏"
                      >
                        <Star className="h-4 w-4 text-primary fill-primary" />
                      </Button>
                    </div>
                    
                    {/* 股票代碼 */}
                    <div className="text-center mb-1 sm:mb-2">
                      <h4 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                        {displaySymbol}
                      </h4>
                    </div>
                    
                    {/* 股票名稱 */}
                    {displayName && (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center line-clamp-2 mb-1 sm:mb-2 min-h-[2rem] px-1">
                        {displayName}
                      </p>
                    )}
                    
                    {/* 即時股價資訊 */}
                    <StockPriceDisplay 
                      symbol={item.symbol} 
                      addedAt={item.addedAt} 
                      onPriceLoaded={handlePriceLoaded}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Star, X, Sparkles, TrendingUp, ChevronDown, ChevronUp, ExternalLink, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { getMarketFromSymbol, cleanTWSymbol, getTWStockName } from "@shared/markets";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

type MarketFilter = 'all' | 'US' | 'TW';

// 股價顯示組件 - 優化為與「為您推薦」區塊一致的樣式
function StockPriceDisplay({ symbol, addedAt }: { symbol: string; addedAt: Date }) {
  const { data: stockData, isLoading, error } = (trpc as any).stock.getStockData.useQuery(
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

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      {/* 當前股價 */}
      <div className="number-display text-sm sm:text-base font-bold text-foreground">
        ${currentPrice.toFixed(2)}
      </div>
      {/* 漲跌幅 */}
      <div className={`number-display text-xs sm:text-sm font-semibold ${
        isPositive 
          ? 'text-green-600' 
          : 'text-red-600'
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
  const [showBatchAnalysis, setShowBatchAnalysis] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{
    symbol: string;
    companyName: string | null;
    recommendation: string | null;
    summary: string;
    error: string | null;
  }>>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleExpand = (symbol: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const { data: watchlist, isLoading } = (trpc as any).watchlist.list.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  
  const batchAnalyze = (trpc as any).watchlist.batchAnalyze.useMutation({
    onSuccess: (data: any) => {
      setBatchResults(data.results);
      setShowBatchAnalysis(true);
      toast.success(`成功分析 ${data.results.length} 支股票`);
    },
    onError: (error: any) => {
      toast.error(error.message || "批量分析失敗，請稍後再試");
    },
  });
  
  const removeFromWatchlist = (trpc as any).watchlist.remove.useMutation({
    onMutate: async ({ symbol }: { symbol: string }) => {
      // 樂觀更新:立即從列表中移除
      await (utils as any).watchlist.list.cancel();
      const previousData = (utils as any).watchlist.list.getData();
      (utils as any).watchlist.list.setData(undefined, (old: any) => 
        old ? old.filter((item: any) => item.symbol !== symbol) : []
      );
      return { previousData };
    },
    onError: (error: any, variables: any, context: any) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        (utils as any).watchlist.list.setData(undefined, context.previousData);
      }
      toast.error("移除收藏失敗,請稍後再試");
    },
    onSuccess: () => {
      toast.success("已從收藏中移除");
    },
    onSettled: () => {
      // 確保數據同步
      (utils as any).watchlist.list.invalidate();
    },
  });

  const handleRemove = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation(); // 阻止事件冒泡，不觸發卡片點擊
    removeFromWatchlist.mutate({ symbol });
  };

  // 篩選收藏列表
  const filteredWatchlist = useMemo(() => {
    if (!watchlist) return [];
    if (marketFilter === 'all') return watchlist;
    return watchlist.filter((item: any) => getMarketFromSymbol(item.symbol) === marketFilter);
  }, [watchlist, marketFilter]);

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
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <Star className="h-8 w-8 text-yellow-600 fill-yellow-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">我的收藏</h1>
              <p className="text-muted-foreground mt-1">追蹤您關注的股票</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                <div className="p-4 rounded-full bg-yellow-500/10">
                  <Star className="h-12 w-12 text-yellow-600 fill-yellow-600" />
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
                <div className="p-4 rounded-full bg-yellow-500/10">
                  <Star className="h-12 w-12 text-yellow-600 fill-yellow-600" />
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">沒有符合篩選條件的股票</p>
                  <p className="text-muted-foreground">請嘗試切換其他市場篩選器</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
            {filteredWatchlist.map((item: any) => {
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
                  className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 active:scale-95 rounded-xl sm:rounded-2xl shadow-md touch-manipulation"
                  onClick={() => setLocation(`/stock/${item.symbol}`)}
                >
                  {/* 市場標籤 */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      market === 'US' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-green-500/20 text-green-700'
                    }`}>
                      <Globe className="h-3 w-3" />
                      {market === 'US' ? '美股' : '台股'}
                    </span>
                  </div>
                  
                  {/* 漸層背景裝飾 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <CardContent className="relative p-4 sm:p-5 lg:p-6 flex flex-col items-center justify-center min-h-[200px] sm:min-h-[180px] lg:min-h-[200px]">
                    {/* 股票圖標與收藏按鈕 */}
                    <div className="mb-2 sm:mb-3 flex items-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-background/80 hover:bg-background hover:scale-110 transition-all duration-200 shadow-sm touch-manipulation"
                        onClick={(e) => handleRemove(e, item.symbol)}
                        title="移除收藏"
                      >
                        <Star className="h-5 w-5 sm:h-4 sm:w-4 fill-yellow-600 text-yellow-600" />
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
                    <StockPriceDisplay symbol={item.symbol} addedAt={item.addedAt} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* 批量分析結果對話框 - 卡片式設計 */}
        <Dialog open={showBatchAnalysis} onOpenChange={setShowBatchAnalysis}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-primary">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      批量 AI 分析結果
                    </DialogTitle>
                    <DialogDescription className="text-base mt-1">
                      已完成 {batchResults.length} 支股票的 AI 投資分析
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBatchAnalysis(false)}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <AnimatePresence>
                {batchResults.map((result, index) => {
                  const displaySymbol = getMarketFromSymbol(result.symbol) === 'TW' ? cleanTWSymbol(result.symbol) : result.symbol;
                  const isExpanded = expandedCards.has(result.symbol);
                  const summaryPreview = result.summary.length > 80 ? result.summary.slice(0, 80) + '...' : result.summary;
                  
                  // 投資建議樣式
                  const getRecommendationStyle = (rec: string | null) => {
                    if (!rec) return { bg: 'bg-muted', text: 'text-muted-foreground', gradient: 'from-gray-400 to-gray-500' };
                    if (rec === '買入') return { bg: 'bg-green-50', text: 'text-green-700', gradient: 'from-green-400 to-emerald-500' };
                    if (rec === '賣出') return { bg: 'bg-red-50', text: 'text-red-700', gradient: 'from-red-400 to-rose-500' };
                    return { bg: 'bg-yellow-50', text: 'text-yellow-700', gradient: 'from-yellow-400 to-amber-500' };
                  };
                  
                  const recStyle = getRecommendationStyle(result.recommendation);
                  
                  return (
                    <motion.div
                      key={result.symbol}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row">
                            {/* 左側：股票資訊和投資建議 */}
                            <div className={`flex-shrink-0 p-6 ${recStyle.bg} border-b md:border-b-0 md:border-r border-border`}>
                              <div className="flex flex-col items-center md:items-start gap-4 md:w-48">
                                {/* 股票圖標 */}
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${recStyle.gradient} shadow-md`}>
                                  <TrendingUp className="h-8 w-8 text-white" />
                                </div>
                                
                                {/* 股票代號和名稱 */}
                                <div className="text-center md:text-left w-full">
                                  <div className="text-2xl font-bold text-foreground mb-1">
                                    {displaySymbol}
                                  </div>
                                  <div className="text-sm text-muted-foreground line-clamp-2">
                                    {result.companyName || '-'}
                                  </div>
                                </div>
                                
                                {/* 投資建議標籤 */}
                                <div className="w-full">
                                  {result.error ? (
                                    <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white text-center font-semibold shadow-md">
                                      分析失敗
                                    </div>
                                  ) : result.recommendation ? (
                                    <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${recStyle.gradient} text-white text-center text-lg font-bold shadow-md`}>
                                      {result.recommendation}
                                    </div>
                                  ) : (
                                    <div className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-center font-semibold">
                                      無建議
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* 右側：分析摘要和操作按鈕 */}
                            <div className="flex-1 p-6">
                              <div className="space-y-4">
                                {/* 分析摘要 */}
                                <div>
                                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">分析摘要</h4>
                                  {result.error ? (
                                    <p className="text-destructive text-sm">{result.error}</p>
                                  ) : (
                                    <div className="text-sm text-foreground leading-relaxed">
                                      <AnimatePresence mode="wait">
                                        {isExpanded ? (
                                          <motion.div
                                            key="expanded"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            {result.summary}
                                          </motion.div>
                                        ) : (
                                          <motion.div
                                            key="collapsed"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            {summaryPreview}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                                
                                {/* 操作按鈕 */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {!result.error && result.summary.length > 80 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleExpand(result.symbol)}
                                      className="hover:bg-primary/5 hover:border-primary/50 button-hover"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="h-4 w-4 mr-1" />
                                          收合
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-4 w-4 mr-1" />
                                          展開詳情
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setLocation(`/stock/${result.symbol}`)}
                                    className="bg-gradient-primary text-white border-0 shadow-md button-hover"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    查看詳情
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={() => setShowBatchAnalysis(false)}
                className="bg-gradient-primary text-white border-0 shadow-md button-hover"
              >
                關閉
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

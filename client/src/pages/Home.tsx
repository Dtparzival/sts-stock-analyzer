import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Search, TrendingUp, Wallet, History, Star, Sparkles, LogOut, Globe, Target, ArrowRight, BarChart3, Brain, Shield, Heart, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { MARKETS, HOT_STOCKS, type MarketType, searchTWStockByName, cleanTWSymbol, TW_STOCK_NAMES, getMarketFromSymbol } from "@shared/markets";
import sp500Stocks from "@shared/sp500-stocks.json";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import FloatingAIChat from "@/components/FloatingAIChat";
import { useDebounce } from "@shared/hooks/useDebounce";
import RecommendationEmptyState from "@/components/RecommendationEmptyState";
import RecommendationSkeleton from "@/components/RecommendationSkeleton";
import MobileRecommendationCarousel from "@/components/MobileRecommendationCarousel";
import MobileHotStocksCarousel from "@/components/MobileHotStocksCarousel";
import SmartSearchDropdown from "@/components/SmartSearchDropdown";

// 格式化相對時間
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  // 熱門股票區域的市場切換狀態（預設顯示全部）
  const [hotStocksMarket, setHotStocksMarket] = useState<MarketType>('ALL');
  

  
  // 獲取 AI 驅動的智能推薦（推薦未看過的優質股票）
  const { data: recommendationData, isLoading: isLoadingHistory, refetch: refetchRecommendations } = (trpc as any).history.getRecommendations.useQuery(
    { limit: 20 },
    { 
      enabled: !!user,
      refetchInterval: 30000, // 每 30 秒自動刷新
    }
  );
  
  // 從推薦結果中提取股票代碼列表
  const recentHistory = useMemo(() => {
    if (!recommendationData?.recommendations) return [];
    return recommendationData.recommendations.map((symbol: string) => ({ symbol }));
  }, [recommendationData]);
  
  // 推薦理由（由 AI 生成）
  const recommendationReason = recommendationData?.reason || '';
  
  // 手動刷新狀態
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // 手動刷新函數
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      // 同時刷新推薦列表和收藏狀態
      await Promise.all([
        refetchRecommendations(),
        (utils as any).watchlist.list.invalidate(),
      ]);
      toast.success('已刷新推薦內容');
    } catch (error) {
      toast.error('刷新失敗');
    } finally {
      setIsManualRefreshing(false);
    }
  };
  
  // 推薦股票不再根據市場過濾，顯示所有推薦
  const filteredRecommendations = useMemo(() => {
    if (!recentHistory) return [];
    return recentHistory;
  }, [recentHistory]);
  
  // 漸進式載入：分離前 3 個和後 3 個推薦股票
  const [showDelayedStocks, setShowDelayedStocks] = useState(false);
  
  // 獲取前 3 個推薦股票（優先載入）
  const prioritySymbols = useMemo(
    () => filteredRecommendations.slice(0, 3).map((item: any) => item.symbol) || [],
    [filteredRecommendations]
  );
  
  // 獲取後 3 個推薦股票（延遲載入）
  const delayedSymbols = useMemo(
    () => filteredRecommendations.slice(3, 6).map((item: any) => item.symbol) || [],
    [filteredRecommendations]
  );
  
  // 合併所有推薦股票符號（用於向下相容）
  const recommendedSymbols = useMemo(
    () => [...prioritySymbols, ...delayedSymbols],
    [prioritySymbols, delayedSymbols]
  );
  
  // 延遲載入後 3 個股票（500ms 後開始載入）
  useEffect(() => {
    if (prioritySymbols.length > 0 && delayedSymbols.length > 0) {
      const timer = setTimeout(() => {
        setShowDelayedStocks(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [prioritySymbols, delayedSymbols]);
  
  // 漸進式載入：前 3 個股票優先載入
  const stock0 = (trpc as any).stock.getStockData.useQuery(
    { symbol: prioritySymbols[0] || '' },
    { enabled: !!user && !!prioritySymbols[0], staleTime: 30000, retry: 1 }
  );
  const stock1 = (trpc as any).stock.getStockData.useQuery(
    { symbol: prioritySymbols[1] || '' },
    { enabled: !!user && !!prioritySymbols[1], staleTime: 30000, retry: 1 }
  );
  const stock2 = (trpc as any).stock.getStockData.useQuery(
    { symbol: prioritySymbols[2] || '' },
    { enabled: !!user && !!prioritySymbols[2], staleTime: 30000, retry: 1 }
  );
  
  // 漸進式載入：後 3 個股票延遲載入（僅當 showDelayedStocks 為 true 時才開始查詢）
  const stock3 = (trpc as any).stock.getStockData.useQuery(
    { symbol: delayedSymbols[0] || '' },
    { enabled: !!user && !!delayedSymbols[0] && showDelayedStocks, staleTime: 30000, retry: 1 }
  );
  const stock4 = (trpc as any).stock.getStockData.useQuery(
    { symbol: delayedSymbols[1] || '' },
    { enabled: !!user && !!delayedSymbols[1] && showDelayedStocks, staleTime: 30000, retry: 1 }
  );
  const stock5 = (trpc as any).stock.getStockData.useQuery(
    { symbol: delayedSymbols[2] || '' },
    { enabled: !!user && !!delayedSymbols[2] && showDelayedStocks, staleTime: 30000, retry: 1 }
  );
  
  const stockDataQueries = [stock0, stock1, stock2, stock3, stock4, stock5];
  
  // 檢查是否所有股價資料都已載入完成（至少有一個查詢已啟用且所有已啟用的查詢都已完成）
  const hasEnabledQueries = stockDataQueries.some((query: any) => query.isFetching || query.isLoading || query.data);
  const areAllStockDataLoaded = hasEnabledQueries && stockDataQueries.every((query: any) => 
    !query.isFetching && (!query.isLoading || !recommendedSymbols[stockDataQueries.indexOf(query)])
  );
  
  // 創建股價數據映射表
  const stockPriceMap = new Map<string, any>(
    stockDataQueries
      .filter((query: any) => query.data)
      .map((query: any, index: number) => [
        recommendedSymbols[index],
        query.data
      ])
  );
  
  // 獲取收藏狀態
  const { data: watchlistData } = (trpc as any).watchlist.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // 創建收藏狀態映射表
  const watchlistMap = new Map<string, any>(
    (watchlistData?.map((item: any) => [item.symbol, true]) || []) as [string, any][]
  );
  
  const utils = trpc.useUtils();
  
  // 添加收藏 mutation
  const addToWatchlistMutation = (trpc as any).watchlist.add.useMutation({
    onMutate: async ({ symbol, companyName }: any) => {
      // 樂觀更新：立即更新 UI
      await (utils as any).watchlist.list.cancel();
      const previousData = (utils as any).watchlist.list.getData();
      
      // 添加到收藏列表
      (utils as any).watchlist.list.setData(undefined, (old: any) => [
        ...(old || []),
        {
          id: Date.now(),
          userId: user!.id,
          symbol,
          companyName: companyName || null,
          addedAt: new Date(),
        },
      ]);
      
      return { previousData };
    },
    onError: (err: any, variables: any, context: any) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        (utils as any).watchlist.list.setData(undefined, context.previousData);
      }
      toast.error('加入收藏失敗');
    },
    onSuccess: () => {
      toast.success('已加入收藏');
      // 行為觸發更新：收藏後刷新推薦列表
      refetchRecommendations();
    },
    onSettled: () => {
      // 重新獲取數據以確保一致性
      (utils as any).watchlist.list.invalidate();
    },
  });
  
  // 移除收藏 mutation
  const removeFromWatchlistMutation = (trpc as any).watchlist.remove.useMutation({
    onMutate: async ({ symbol }: any) => {
      // 樂觀更新：立即更新 UI
      await (utils as any).watchlist.list.cancel();
      const previousData = (utils as any).watchlist.list.getData();
      
      // 從收藏列表移除
      (utils as any).watchlist.list.setData(undefined, (old: any) =>
        (old || []).filter((item: any) => item.symbol !== symbol)
      );
      
      return { previousData };
    },
    onError: (err: any, variables: any, context: any) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        (utils as any).watchlist.list.setData(undefined, context.previousData);
      }
      toast.error('取消收藏失敗');
    },
    onSuccess: () => {
      toast.success('已取消收藏');
      // 行為觸發更新：取消收藏後刷新推薦列表
      refetchRecommendations();
    },
    onSettled: () => {
      // 重新獲取數據以確保一致性
      (utils as any).watchlist.list.invalidate();
    },
  });
  
  // 切換收藏狀態
  const toggleWatchlist = (e: React.MouseEvent, symbol: string, companyName: string | null) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('請先登入');
      return;
    }
    
    const isInWatchlist = watchlistMap.has(symbol);
    
    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate({ symbol });
    } else {
      addToWatchlistMutation.mutate({ symbol, companyName: companyName || '' });
    }
  };
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("登出成功");
      // 清除用戶緩存，觸發 UI 更新為未登入狀態
      utils.auth.me.invalidate();
      // 不需要重新載入頁面，直接更新 UI
    },
    onError: () => {
      toast.error("登出失敗");
    }
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // 智能搜尋導航處理
  const handleSmartSearchNavigate = (symbol: string, market: 'TW' | 'US') => {
    setLocation(`/stock/${symbol}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 - 優化設計 */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-primary truncate max-w-[120px] md:max-w-none">
                {APP_TITLE}
              </h1>
            </div>
            <div className="flex items-center gap-1 md:gap-3">
              {loading ? (
                <div className="h-10 w-20 bg-muted animate-pulse rounded-lg" />
              ) : user ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/watchlist")} className="hidden sm:flex hover:bg-primary/10">
                    <Star className="h-4 w-4 mr-2" />
                    收藏
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setLocation("/watchlist")} className="sm:hidden hover:bg-primary/10">
                    <Star className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/portfolio")} className="hidden sm:flex hover:bg-primary/10">
                    <Wallet className="h-4 w-4 mr-2" />
                    投資組合
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setLocation("/portfolio")} className="sm:hidden hover:bg-primary/10">
                    <Wallet className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/history")} className="hidden sm:flex hover:bg-primary/10">
                    <History className="h-4 w-4 mr-2" />
                    歷史
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setLocation("/history")} className="sm:hidden hover:bg-primary/10">
                    <History className="h-4 w-4" />
                  </Button>
                  
                  <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-border">
                    <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="md:hidden hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button asChild className="button-hover bg-gradient-primary text-white border-0 shadow-md">
                  <a href={getLoginUrl()}>登入</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero Section - 全新設計 */}
        <div className="relative mb-20">
          {/* 背景裝飾 */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="text-center max-w-4xl mx-auto">
            {/* 標題區塊 */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI 驅動的智能投資分析</span>
              </div>
              <h2 className="text-display-1 mb-6 leading-tight px-4 animate-slide-down">
                透過
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  智能分析
                </span>
                <br />
                <span className="text-foreground">做出明智投資決策</span>
              </h2>
              <div className="reading-optimized px-4 animate-slide-up animate-delay-100">
                <p className="text-body-large" style={{ color: 'var(--color-text-secondary)' }}>
                  深度分析，即時追蹤台美股市場趨勢，為您的投資組合提供專業建議。
                </p>
              </div>
            </div>

            {/* 智能搜尋框 - 支援台美股統一搜尋 */}
            <SmartSearchDropdown onNavigate={handleSmartSearchNavigate} />
          </div>
        </div>

        {/* 核心功能特色 - 全新設計 */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-heading-2 font-bold mb-4 px-4 animate-fade-in">強大分析功能</h3>
            <p className="text-body-large text-muted-foreground px-4 animate-fade-in animate-delay-100">一站式投資分析平台，助您輕鬆管理投資組合</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
            <Card className="card-hover border-2 hover:border-blue-500/50 active:border-blue-600 active:scale-[0.98] cursor-pointer group animate-slide-up transition-all duration-300 hover:shadow-xl" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 sm:mb-5 p-5 sm:p-6 rounded-2xl w-fit shadow-lg group-hover:shadow-2xl group-hover:scale-110 group-active:scale-105 transition-all duration-500 relative" style={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)' }}>
                  {/* 光暈效果 */}
                  <div className="absolute inset-0 rounded-2xl bg-blue-400/0 group-hover:bg-blue-400/30 blur-xl transition-all duration-500"></div>
                  <BarChart3 className="h-11 w-11 sm:h-14 sm:w-14 text-white relative z-10 group-hover:rotate-6 transition-transform duration-500" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl mb-2 font-semibold group-hover:text-primary transition-colors duration-300">即時股票數據</CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
                  獲取最新的股票價格、歷史走勢和技術指標，掌握市場動態
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover border-2 border-gold/30 hover:border-gold/60 active:border-gold active:scale-[0.98] cursor-pointer group animate-slide-up animate-delay-100 shadow-lg hover:shadow-gold-lg transition-all duration-300" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 sm:mb-5 p-5 sm:p-6 rounded-2xl w-fit shadow-xl group-hover:shadow-2xl group-hover:scale-110 group-active:scale-105 transition-all duration-500 relative" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f4e5a1 50%, #d4af37 100%)' }}>
                  {/* 金色光暈效果 */}
                  <div className="absolute inset-0 rounded-2xl bg-yellow-400/0 group-hover:bg-yellow-400/40 blur-xl transition-all duration-500"></div>
                  <Brain className="h-11 w-11 sm:h-14 sm:w-14 text-white drop-shadow-md relative z-10 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl mb-2 font-semibold text-gold group-hover:text-gold/80 transition-colors duration-300">AI 投資分析</CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
                  運用人工智慧分析公司基本面、技術面，提供專業的投資建議
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-hover border-2 hover:border-blue-500/50 active:border-blue-600 active:scale-[0.98] cursor-pointer group animate-slide-up animate-delay-200 transition-all duration-300 hover:shadow-xl" onClick={() => setLocation("/portfolio")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 sm:mb-5 p-5 sm:p-6 rounded-2xl w-fit shadow-lg group-hover:shadow-2xl group-hover:scale-110 group-active:scale-105 transition-all duration-500 relative" style={{ background: 'linear-gradient(135deg, #00509e 0%, #0077cc 100%)' }}>
                  {/* 光暈效果 */}
                  <div className="absolute inset-0 rounded-2xl bg-blue-400/0 group-hover:bg-blue-400/30 blur-xl transition-all duration-500"></div>
                  <Wallet className="h-11 w-11 sm:h-14 sm:w-14 text-white drop-shadow-md relative z-10 group-hover:-rotate-6 transition-transform duration-500" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl mb-2 font-semibold group-hover:text-primary transition-colors duration-300">投資組合管理</CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
                  追蹤您的持股表現，計算投資回報，優化資產配置
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
        
        {/* 進階功能 - 優化設計 */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-heading-2 font-bold mb-4 px-4">進階分析工具</h3>
            <p className="text-body-large text-muted-foreground px-4">深入了解投資表現，做出更精準的決策</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
            <Card className="card-hover border-2 hover:border-green-500/50 active:border-green-600 active:scale-[0.98] cursor-pointer group animate-slide-up transition-all duration-300 hover:shadow-xl" onClick={() => setLocation("/analysis-accuracy")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 sm:mb-5 p-5 sm:p-6 rounded-2xl w-fit shadow-lg group-hover:shadow-2xl group-hover:scale-110 group-active:scale-105 transition-all duration-500 relative" style={{ background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)' }}>
                  {/* 綠色光暈效果 */}
                  <div className="absolute inset-0 rounded-2xl bg-green-400/0 group-hover:bg-green-400/30 blur-xl transition-all duration-500"></div>
                  <Target className="h-11 w-11 sm:h-14 sm:w-14 text-white relative z-10 group-hover:rotate-12 transition-transform duration-500" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl mb-2 font-semibold group-hover:text-success transition-colors duration-300">AI 分析準確度追蹤</CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
                  自動比對歷史分析建議與實際股價走勢，評估 AI 分析的可靠性
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-hover border-2 hover:border-orange-500/50 active:border-orange-600 active:scale-[0.98] cursor-pointer group animate-slide-up animate-delay-100 transition-all duration-300 hover:shadow-xl" onClick={() => setLocation("/watchlist")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 sm:mb-5 p-5 sm:p-6 rounded-2xl w-fit shadow-lg group-hover:shadow-2xl group-hover:scale-110 group-active:scale-105 transition-all duration-500 relative" style={{ background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)' }}>
                  {/* 橙色光暈效果 */}
                  <div className="absolute inset-0 rounded-2xl bg-orange-400/0 group-hover:bg-orange-400/40 blur-xl transition-all duration-500"></div>
                  <Star className="h-11 w-11 sm:h-14 sm:w-14 text-white fill-white relative z-10 group-hover:rotate-[360deg] transition-transform duration-700" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl mb-2 font-semibold group-hover:text-warning transition-colors duration-300">我的收藏</CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
                  收藏關注的股票，一鍵批量 AI 分析，快速掌握投資機會
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-hover border-2 hover:border-blue-500/50 active:border-blue-600 active:scale-[0.98] cursor-pointer group animate-slide-up animate-delay-200 transition-all duration-300 hover:shadow-xl" onClick={() => setLocation("/history")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 sm:mb-5 p-5 sm:p-6 rounded-2xl w-fit shadow-lg group-hover:shadow-2xl group-hover:scale-110 group-active:scale-105 transition-all duration-500 relative" style={{ background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}>
                  {/* 藍色光暈效果 */}
                  <div className="absolute inset-0 rounded-2xl bg-blue-400/0 group-hover:bg-blue-400/30 blur-xl transition-all duration-500"></div>
                  <History className="h-11 w-11 sm:h-14 sm:w-14 text-white relative z-10 group-hover:-rotate-12 transition-transform duration-500" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl mb-2 font-semibold group-hover:text-primary transition-colors duration-300">搜尋歷史</CardTitle>
                <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
                  查看最近搜尋的股票，快速返回關注的標的
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* 台美股融合顯示 - 全新設計 */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-full mb-4 animate-fade-in">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-2xl font-bold text-primary">熱門股票</h3>
            </div>
            <p className="text-body-large text-muted-foreground animate-fade-in animate-delay-100">
              市場關注度最高的台美股精選
            </p>
          </div>
          
          {/* 市場切換標籤 - 修正 z-index 避免被遮蔽 */}
          <div className="flex justify-center mb-8 px-4 relative z-10">
            <div className="inline-flex items-center gap-2 p-1.5 bg-muted/50 rounded-xl border border-border shadow-sm">
              <Button
                variant={hotStocksMarket === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHotStocksMarket('ALL' as MarketType)}
                className={`px-4 sm:px-6 py-2 rounded-lg transition-all text-sm sm:text-base ${
                  hotStocksMarket === 'ALL' 
                    ? 'bg-gradient-blue-primary text-white shadow-md' 
                    : 'hover:bg-muted'
                }`}
              >
                <Globe className="h-4 w-4 mr-1 sm:mr-2" />
                全部
              </Button>
              <Button
                variant={hotStocksMarket === 'US' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHotStocksMarket('US')}
                className={`px-4 sm:px-6 py-2 rounded-lg transition-all text-sm sm:text-base ${
                  hotStocksMarket === 'US' 
                    ? 'bg-gradient-blue-primary text-white shadow-md' 
                    : 'hover:bg-muted'
                }`}
              >
                美股
              </Button>
              <Button
                variant={hotStocksMarket === 'TW' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHotStocksMarket('TW')}
                className={`px-4 sm:px-6 py-2 rounded-lg transition-all text-sm sm:text-base ${
                  hotStocksMarket === 'TW' 
                    ? 'bg-gradient-blue-primary text-white shadow-md' 
                    : 'hover:bg-muted'
                }`}
              >
                台股
              </Button>
            </div>
          </div>
          {/* 股票網格 - 響應式設計 */}
          {/* 手機版：橫向滑動輪播 */}
          <div className="block md:hidden">
            <MobileHotStocksCarousel 
              stocks={(() => {
                const allStocks = hotStocksMarket === 'ALL' 
                  ? [...HOT_STOCKS.US, ...HOT_STOCKS.TW]
                  : HOT_STOCKS[hotStocksMarket];
                
                return allStocks.map(stock => {
                  const market = getMarketFromSymbol(stock.symbol);
                  return {
                    symbol: market === 'TW' ? cleanTWSymbol(stock.symbol) : stock.symbol,
                    name: stock.name,
                    originalSymbol: stock.symbol
                  };
                });
              })()}
              market={hotStocksMarket}
              onStockClick={(symbol) => {
                const allStocks = hotStocksMarket === 'ALL' 
                  ? [...HOT_STOCKS.US, ...HOT_STOCKS.TW]
                  : HOT_STOCKS[hotStocksMarket];
                
                const originalStock = allStocks.find(s => {
                  const market = getMarketFromSymbol(s.symbol);
                  const displaySymbol = market === 'TW' ? cleanTWSymbol(s.symbol) : s.symbol;
                  return displaySymbol === symbol;
                });
                
                if (originalStock) {
                  setLocation(`/stock/${originalStock.symbol}`);
                }
              }}
            />
          </div>
          
          {/* 平板/桌面版：網格佈局 */}
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 px-4">
            {(() => {
              const allStocks = hotStocksMarket === 'ALL' 
                ? [...HOT_STOCKS.US, ...HOT_STOCKS.TW]
                : HOT_STOCKS[hotStocksMarket];
              
              return allStocks.map((stock, index) => {
                const market = getMarketFromSymbol(stock.symbol);
                const displaySymbol = market === 'TW' 
                  ? cleanTWSymbol(stock.symbol) 
                  : stock.symbol;
              
              return (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center hover:bg-primary/10 hover:border-primary/50 hover:shadow-md transition-all card-hover border-2 animate-fade-in"
                  style={{
                    animationDelay: `${(index + 2) * 100}ms`
                  }}
                  onClick={() => setLocation(`/stock/${stock.symbol}`)}
                >
                  <span className="text-xl font-bold text-foreground">{displaySymbol}</span>
                  <span className="text-sm text-muted-foreground mt-1">{stock.name}</span>
                </Button>
              );
              });
            })()}
          </div>
        </div>

        {/* CTA Section - 全新設計 */}
        {!user && (
          <Card className="relative overflow-hidden border-2 border-primary/30 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20"></div>
            <CardContent className="relative text-center py-16 px-6">
              <div className="max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">安全可靠的投資分析平台</span>
                </div>
                <h3 className="text-display-2 font-bold mb-6 leading-tight">
                  開始您的
                  <span className="text-primary drop-shadow-[0_2px_8px_rgba(59,130,246,0.5)]"> 智能投資 </span>
                  之旅
                </h3>
                <div className="reading-optimized">
                  <p className="text-body-large text-muted-foreground mb-8">
                    登入以解鎖完整功能：收藏股票、管理投資組合、查看分析趋勢，讓 AI 成為您的投資顧問。
                  </p>
                </div>
                <Button size="lg" asChild className="h-14 px-10 text-lg font-semibold bg-gradient-gold hover:bg-gradient-gold-hover border-0 shadow-gold-lg button-hover">
                  <a href={getLoginUrl()}>
                    立即登入
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer - 優化設計 */}
      <footer className="border-t border-border/50 bg-card/50 mt-20">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">
                {APP_TITLE}
              </span>
            </div>
            <p className="text-muted-foreground mb-2">© 2025 {APP_TITLE}. 數據來源：Twelve Data</p>
            <p className="text-sm text-muted-foreground">
              本平台僅供參考，不構成投資建議。投資有風險，請謹慎決策。
            </p>
          </div>
        </div>
      </footer>
      
      {/* 浮動 AI 顧問 */}
      <FloatingAIChat />
    </div>
  );
}

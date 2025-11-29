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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('US');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);
  
  // 使用防抖機制，延遲 300ms 更新建議
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // 獲取智能推薦（整合行為數據進行排序）
  const { data: recentHistory, isLoading: isLoadingHistory, refetch: refetchRecommendations } = (trpc as any).history.getRecommendations.useQuery(
    { limit: 6 },
    { 
      enabled: !!user,
      refetchInterval: 30000, // 每 30 秒自動刷新
    }
  );
  
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
  
  // 根據當前市場過濾推薦股票
  const filteredRecommendations = useMemo(() => {
    if (!recentHistory) return [];
    
    return recentHistory.filter((item: any) => {
      const market = getMarketFromSymbol(item.symbol);
      return market === selectedMarket;
    });
  }, [recentHistory, selectedMarket]);
  
  // 獲取推薦股票的即時股價資訊（使用 useMemo 穩定引用）
  const recommendedSymbols = useMemo(
    () => filteredRecommendations.slice(0, 6).map((item: any) => item.symbol) || [],
    [filteredRecommendations]
  );
  
  // 獲取第一個股票的數據
  const stock0 = (trpc as any).stock.getStockData.useQuery(
    { symbol: recommendedSymbols[0] || '' },
    { enabled: !!user && !!recommendedSymbols[0], staleTime: 30000, retry: 1 }
  );
  const stock1 = (trpc as any).stock.getStockData.useQuery(
    { symbol: recommendedSymbols[1] || '' },
    { enabled: !!user && !!recommendedSymbols[1], staleTime: 30000, retry: 1 }
  );
  const stock2 = (trpc as any).stock.getStockData.useQuery(
    { symbol: recommendedSymbols[2] || '' },
    { enabled: !!user && !!recommendedSymbols[2], staleTime: 30000, retry: 1 }
  );
  const stock3 = (trpc as any).stock.getStockData.useQuery(
    { symbol: recommendedSymbols[3] || '' },
    { enabled: !!user && !!recommendedSymbols[3], staleTime: 30000, retry: 1 }
  );
  const stock4 = (trpc as any).stock.getStockData.useQuery(
    { symbol: recommendedSymbols[4] || '' },
    { enabled: !!user && !!recommendedSymbols[4], staleTime: 30000, retry: 1 }
  );
  const stock5 = (trpc as any).stock.getStockData.useQuery(
    { symbol: recommendedSymbols[5] || '' },
    { enabled: !!user && !!recommendedSymbols[5], staleTime: 30000, retry: 1 }
  );
  
  const stockDataQueries = [stock0, stock1, stock2, stock3, stock4, stock5];
  
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 如果是台股市場且輸入中文，嘗試匹配中文名稱
      if (selectedMarket === 'TW' && /[\u4e00-\u9fa5]/.test(searchQuery)) {
        const results = searchTWStockByName(searchQuery);
        if (results.length > 0) {
          // 使用第一個匹配結果
          setLocation(`/stock/${results[0].symbol}`);
          setSearchQuery('');
          setShowSuggestions(false);
          return;
        }
      }
      // 如果是台股市場，自動添加 .TW 後綴
      let symbol = searchQuery.trim().toUpperCase();
      if (selectedMarket === 'TW' && !symbol.endsWith('.TW') && !symbol.endsWith('.TWO')) {
        symbol = `${symbol}.TW`;
      }
      setLocation(`/stock/${symbol}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };
  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };
  
  // 使用 useEffect 監聴防抖後的搜尋查詢，更新建議
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    // 如果是台股市場且輸入中文，顯示建議
    if (selectedMarket === 'TW' && /[\u4e00-\u9fa5]/.test(debouncedSearchQuery)) {
      const results = searchTWStockByName(debouncedSearchQuery);
      setSuggestions(results.slice(0, 5)); // 最多顯示 5 個建議
      setShowSuggestions(results.length > 0);
    } 
    // 如果是美股市場，從 S&P 500 清單中搜尋
    else if (selectedMarket === 'US') {
      const query = debouncedSearchQuery.toUpperCase();
      const results = sp500Stocks
        .filter(stock => 
          stock.symbol.toUpperCase().includes(query) || 
          stock.name.toUpperCase().includes(query)
        )
        .slice(0, 8) // 美股顯示更多建議（8 個）
        .map(stock => ({
          symbol: stock.symbol,
          name: stock.name
        }));
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } 
    else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [debouncedSearchQuery, selectedMarket]);
  
  const handleSuggestionClick = (symbol: string) => {
    setLocation(`/stock/${symbol}`);
    setSearchQuery('');
    setShowSuggestions(false);
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
                  深度分析，即時追蹤{selectedMarket === 'US' ? '美股' : '台股'}市場趋势，為您的投資組合提供專業建議。
                </p>
              </div>
            </div>

            {/* 市場切換器 - 優化設計 */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8 px-4">
              <Button
                variant={selectedMarket === 'US' ? 'default' : 'outline'}
                onClick={() => setSelectedMarket('US')}
                className={`gap-2 px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base font-medium transition-all w-full sm:w-auto ${
                  selectedMarket === 'US' 
                    ? 'bg-gradient-primary text-white shadow-lg scale-105' 
                    : 'hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <Globe className="h-5 w-5" />
                美股市場
              </Button>
              <Button
                variant={selectedMarket === 'TW' ? 'default' : 'outline'}
                onClick={() => setSelectedMarket('TW')}
                className={`gap-2 px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base font-medium transition-all w-full sm:w-auto ${
                  selectedMarket === 'TW' 
                    ? 'bg-gradient-primary text-white shadow-lg scale-105' 
                    : 'hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <Globe className="h-5 w-5" />
                台股市場
              </Button>
            </div>

            {/* 搜尋框 - 優化設計 */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto px-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl rounded-2xl"></div>
                <div className="relative bg-card border-2 border-border rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={selectedMarket === 'US' ? "輸入股票代碼（例如：AAPL）" : "輸入股票代碼（例如：2330）"}
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        onFocus={() => {
                          if (suggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          // 延遲隱藏，讓點擊建議有時間觸發
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        className="pl-11 sm:pl-14 pr-3 sm:pr-4 h-12 sm:h-14 text-base sm:text-lg border-0 focus-visible:ring-0 bg-transparent"
                      />
                      {/* 自動完成建議 */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-xl shadow-2xl z-10 max-h-80 overflow-y-auto">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.symbol}
                              type="button"
                              onClick={() => handleSuggestionClick(suggestion.symbol)}
                              className="w-full px-5 py-4 text-left hover:bg-primary/10 transition-colors flex flex-col items-start border-b border-border last:border-0"
                            >
                              <span className="font-semibold text-lg text-foreground">{suggestion.symbol}</span>
                              <span className="text-sm text-muted-foreground mt-1">{suggestion.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-semibold bg-gradient-gold hover:bg-gradient-gold-hover border-0 shadow-gold-lg button-hover w-full sm:w-auto"
                    >
                      搜尋
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
            
            {/* 為您推薦區塊 - 全新優化設計 */}
            {/* 推薦區塊 - 僅登入用戶顯示 */}
            {user && (
              isLoadingHistory ? (
                <RecommendationSkeleton />
              ) : filteredRecommendations && filteredRecommendations.length > 0 ? (
                <div className="mt-12 max-w-6xl mx-auto px-4">
                {/* 區塊標題 */}
                <div className="text-center mb-8 relative">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 rounded-full mb-3">
                    <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                    <span className="text-base font-bold text-primary">為您推薦</span>
                  </div>
                  <p className="text-sm text-muted-foreground">根據您的瀏覽記錄精選推薦</p>
                  
                  {/* 手動刷新按鈕 */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleManualRefresh}
                    disabled={isManualRefreshing}
                    className="absolute top-0 right-0 h-10 w-10 rounded-full hover:bg-primary/10"
                  >
                    <RefreshCw className={`h-5 w-5 text-primary ${
                      isManualRefreshing ? 'animate-spin' : ''
                    }`} />
                  </Button>
                </div>
                
                {/* 推薦卡片 - 手機版橫向滑動，平板/桌面版網格 */}
                {/* 手機版：橫向滑動輪播 */}
                <div className="block sm:hidden">
                  <MobileRecommendationCarousel 
                    recommendations={filteredRecommendations.slice(0, 6)}
                    stockPriceMap={stockPriceMap}
                    stockDataQueries={stockDataQueries}
                    watchlistMap={watchlistMap as any}
                    toggleWatchlist={toggleWatchlist}
                    addToWatchlistMutation={addToWatchlistMutation}
                    removeFromWatchlistMutation={removeFromWatchlistMutation}
                    setLocation={setLocation}
                  />
                </div>
                
                {/* 平板/桌面版：網格佈局 */}
                <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
                  {filteredRecommendations.slice(0, 6).map((item: any) => {
                    // 處理顯示名稱：優先使用 shortName，其次是 companyName，最後從備用映射表獲取
                    let displaySymbol = item.symbol;
                    let displayName = item.shortName || item.companyName;
                    
                    const market = getMarketFromSymbol(item.symbol);
                    if (market === 'TW') {
                      const cleanSymbol = cleanTWSymbol(item.symbol);
                      displaySymbol = cleanSymbol;
                      
                      // 如果沒有 shortName 且 companyName 是舊格式，則從備用映射表獲取
                      if (!item.shortName && (!displayName || displayName === item.symbol || displayName.includes('.TW'))) {
                        displayName = TW_STOCK_NAMES[cleanSymbol] || null;
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
                        
                        <CardContent className="relative p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center min-h-[180px] sm:min-h-[200px] lg:min-h-[220px]">
                          {/* 股票圖標 */}
                          <div className="mb-2 sm:mb-3 p-1.5 sm:p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          </div>
                          
                          {/* 股票代碼 */}
                          <div className="text-center mb-1">
                            <h4 className="font-bold text-sm sm:text-base lg:text-lg text-foreground group-hover:text-primary transition-colors">
                              {displaySymbol}
                            </h4>
                          </div>
                          
                          {/* 股票名稱 */}
                          {displayName && (
                            <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground text-center line-clamp-2 mb-1 sm:mb-2 min-h-[1.5rem] sm:min-h-[2rem] px-1">
                              {displayName}
                            </p>
                          )}
                          
                          {/* 即時股價資訊 */}
                          {(() => {
                            const stockData = stockPriceMap.get(item.symbol);
                            const isLoading = stockDataQueries[filteredRecommendations.indexOf(item)]?.isLoading;
                            
                            if (isLoading) {
                              return (
                                <div className="flex flex-col items-center gap-1 w-full animate-pulse">
                                  {/* 骨架屏 - 當前股價 */}
                                  <div className="h-5 w-20 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 rounded"></div>
                                  {/* 骨架屏 - 漲跌幅 */}
                                  <div className="h-4 w-28 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded"></div>
                                </div>
                              );
                            }
                            
                            if (!stockData) {
                              return (
                                <div className="text-[10px] sm:text-xs text-muted-foreground/70 flex items-center gap-1">
                                  <History className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{formatRelativeTime(item.searchedAt)}</span>
                                </div>
                              );
                            }
                            
                            // 從 stockData 中提取價格資訊
                            const meta = stockData?.chart?.result?.[0]?.meta;
                            const currentPrice = meta?.regularMarketPrice;
                            const previousClose = meta?.previousClose || meta?.chartPreviousClose;
                            
                            // 檢查數據是否完整
                            if (!currentPrice || !previousClose) {
                              return (
                                <div className="text-[10px] sm:text-xs text-muted-foreground/70 flex items-center gap-1">
                                  <History className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{formatRelativeTime(item.searchedAt)}</span>
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
                          })()}
                          
                          {/* 收藏按鈕 - 所有裝置都顯示 - 優化觸控區域 */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 left-2 z-10 h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-background/80 hover:bg-background hover:scale-110 transition-all duration-200 shadow-sm touch-manipulation"
                            onClick={(e) => toggleWatchlist(e, item.symbol, displayName || item.companyName || '')}
                            disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                          >
                            {addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : watchlistMap.has(item.symbol) ? (
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            ) : (
                              <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                            )}
                          </Button>
                          
                          {/* Hover 時顯示的快速操作 - 僅桌面版 */}
                          <div className="hidden md:flex absolute inset-0 flex-col items-center justify-center gap-2 bg-primary/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-white hover:bg-white/90 text-primary font-semibold shadow-lg min-h-[44px] px-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/stock/${item.symbol}`);
                              }}
                            >
                              <Target className="h-4 w-4 mr-1" />
                              查看詳情
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                </div>
              ) : (
                // 空狀態顯示 - 使用新的空狀態組件
                <RecommendationEmptyState
                  market={selectedMarket}
                  onSearchClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                    input?.focus();
                  }}
                />
              )
            )}
          </div>
        </div>

        {/* 核心功能特色 - 全新設計 */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-heading-2 font-bold mb-4 px-4 animate-fade-in">強大的分析功能</h3>
            <p className="text-body-large text-muted-foreground px-4 animate-fade-in animate-delay-100">一站式投資分析平台，助您輕鬆管理投資組合</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {/* 即時股票數據 */}
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer group animate-fade-in animate-delay-100 transition-all duration-300 hover:shadow-xl" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 sm:mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-blue-primary w-fit shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={2} />
                </div>
                <CardTitle className="text-heading-4 mb-2 font-semibold group-hover:text-primary transition-colors">技術分析指標</CardTitle>
                <CardDescription className="text-body-small text-muted-foreground">
                  獲取最新的股票價格、歷史走勢和技術指標，掌握市場動態
                </CardDescription>
              </CardHeader>
            </Card>

            {/* AI 投資分析 - 金色點綴 */}
            <Card className="card-hover border-2 border-gold/30 hover:border-gold/50 cursor-pointer group animate-fade-in animate-delay-200 shadow-lg hover:shadow-2xl transition-all duration-300" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 sm:mb-4 p-4 sm:p-5 rounded-2xl gradient-gold w-fit shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                  <Brain className="h-10 w-10 sm:h-12 sm:w-12 text-white drop-shadow-md" strokeWidth={2} />
                </div>
                <CardTitle className="text-heading-4 mb-2 font-semibold text-gold group-hover:text-gold/80 transition-colors">AI 驅動的投資建議</CardTitle>
                <CardDescription className="text-body-small text-muted-foreground">
                  運用人工智慧分析公司基本面、技術面，提供專業的投資建議
                </CardDescription>
              </CardHeader>
            </Card>
            
            {/* 投資組合管理 */}
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer group animate-fade-in animate-delay-300 transition-all duration-300 hover:shadow-xl" onClick={() => setLocation("/portfolio")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 sm:mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-blue-secondary w-fit shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <Wallet className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={2} />
                </div>
                <CardTitle className="text-heading-4 mb-2 font-semibold group-hover:text-primary transition-colors">基本面分析</CardTitle>
                <CardDescription className="text-body-small text-muted-foreground">
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {/* AI 分析準確度追蹤 */}
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer group animate-fade-in animate-delay-100 transition-all duration-300 hover:shadow-xl" onClick={() => setLocation("/analysis-accuracy")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 sm:mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-green-600 to-green-500 w-fit shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <Target className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={2} />
                </div>
                <CardTitle className="text-heading-4 mb-2 font-semibold group-hover:text-primary transition-colors">AI 分析準確度追蹤</CardTitle>
                <CardDescription className="text-body-small text-muted-foreground">
                  自動比對歷史分析建議與實際股價走勢，評估 AI 分析的可靠性
                </CardDescription>
              </CardHeader>
            </Card>
            
            {/* 我的收藏 - 金色點綴 */}
            <Card className="card-hover border-2 border-gold/30 hover:border-gold/50 cursor-pointer group animate-fade-in animate-delay-200 shadow-lg hover:shadow-2xl transition-all duration-300" onClick={() => setLocation("/watchlist")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 sm:mb-4 p-4 sm:p-5 rounded-2xl gradient-gold w-fit shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                  <Star className="h-10 w-10 sm:h-12 sm:w-12 text-white fill-white" strokeWidth={2} />
                </div>
                <CardTitle className="text-heading-4 mb-2 font-semibold text-gold group-hover:text-gold/80 transition-colors">我的收藏</CardTitle>
                <CardDescription className="text-body-small text-muted-foreground">
                  收藏關注的股票，一鍵批量 AI 分析，快速掌握投資機會
                </CardDescription>
              </CardHeader>
            </Card>
            
            {/* 投資組合追蹤 */}
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer group animate-fade-in animate-delay-300 transition-all duration-300 hover:shadow-xl" onClick={() => setLocation("/history")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 sm:mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-blue-primary w-fit shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <History className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={2} />
                </div>
                <CardTitle className="text-heading-4 mb-2 font-semibold group-hover:text-primary transition-colors">歷史查詢記錄</CardTitle>
                <CardDescription className="text-body-small text-muted-foreground">
                  查看最近搜尋的股票，快速返回關注的標的
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* 熱門股票 - 優化設計 */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-heading-2 font-bold mb-2 px-4 sm:px-0">熱門{selectedMarket === 'US' ? '美股' : '台股'}</h3>
              <p className="text-body text-muted-foreground px-4 sm:px-0">市場關注度最高的股票</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HOT_STOCKS[selectedMarket].map((stock) => {
              // 移除台股代碼中的 .TW 後綴
              const displaySymbol = selectedMarket === 'TW' 
                ? cleanTWSymbol(stock.symbol) 
                : stock.symbol;
              
              return (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center hover:bg-primary/10 hover:border-primary/50 hover:shadow-md transition-all card-hover border-2"
                  onClick={() => setLocation(`/stock/${stock.symbol}`)}
                >
                  <span className="text-xl font-bold text-foreground">{displaySymbol}</span>
                  <span className="text-sm text-muted-foreground mt-1">{stock.name}</span>
                </Button>
              );
            })}
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

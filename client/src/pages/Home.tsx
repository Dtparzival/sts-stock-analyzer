import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Search, TrendingUp, Wallet, History, Star, Sparkles, LogOut, Globe, Target, ArrowRight, BarChart3, Brain, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MARKETS, HOT_STOCKS, type MarketType, searchTWStockByName, cleanTWSymbol, TW_STOCK_NAMES, getMarketFromSymbol } from "@shared/markets";
import sp500Stocks from "@shared/sp500-stocks.json";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import FloatingAIChat from "@/components/FloatingAIChat";
import { useDebounce } from "@shared/hooks/useDebounce";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('US');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);
  
  // 使用防抖機制，延遲 300ms 更新建議
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // 獲取用戶最近查看的股票（用於推薦）
  const { data: recentHistory } = trpc.history.list.useQuery(
    { limit: 8 },
    { enabled: !!user }
  );
  
  const utils = trpc.useUtils();
  
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
              <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent truncate max-w-[120px] md:max-w-none">
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
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="text-center max-w-4xl mx-auto">
            {/* 標題區塊 */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI 驅動的智能投資分析</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  精準掌握市場脈動
                </span>
                <br />
                <span className="text-foreground">做出明智投資決策</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
                透過 AI 深度分析，即時追蹤{selectedMarket === 'US' ? '美股' : '台股'}市場趨勢，
                <br className="hidden md:block" />
                為您的投資組合提供專業建議
              </p>
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
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl rounded-2xl"></div>
                <div className="relative bg-card border-2 border-border rounded-2xl shadow-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={selectedMarket === 'US' ? "輸入股票代碼（例如：AAPL, TSLA, GOOGL）" : "輸入股票代碼或中文名稱（例如：2330, 台積電）"}
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
                        className="pl-14 pr-4 h-14 text-lg border-0 focus-visible:ring-0 bg-transparent"
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
                      className="h-14 px-8 text-base font-semibold bg-gradient-primary text-white border-0 shadow-lg button-hover"
                    >
                      搜尋
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
            
            {/* 為您推薦區塊 - 優化設計 */}
            {user && recentHistory && recentHistory.length > 0 && (
              <div className="mt-8 max-w-3xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-base font-semibold text-foreground">為您推薦</span>
                  <span className="text-sm text-muted-foreground">（最近查看）</span>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {recentHistory.slice(0, 8).map((item) => {
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
                      <Button
                        key={item.id}
                        variant="outline"
                        size="sm"
                        className="hover:bg-primary/10 hover:border-primary/50 hover:shadow-md transition-all flex flex-col items-center py-3 h-auto min-w-[100px] card-hover"
                        onClick={() => setLocation(`/stock/${item.symbol}`)}
                      >
                        <span className="font-bold text-base text-foreground">{displaySymbol}</span>
                        {displayName && (
                          <span className="text-xs text-muted-foreground mt-1 line-clamp-1">{displayName}</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 核心功能特色 - 全新設計 */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 px-4">強大的分析功能</h3>
            <p className="text-base sm:text-lg text-muted-foreground px-4">一站式投資分析平台，助您輕鬆管理投資組合</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer group" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-secondary w-fit">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-xl mb-2">即時股票數據</CardTitle>
                <CardDescription className="text-base">
                  獲取最新的股票價格、歷史走勢和技術指標，掌握市場動態
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-primary w-fit">
                  <Brain className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-xl mb-2">AI 投資分析</CardTitle>
                <CardDescription className="text-base">
                  運用人工智慧分析公司基本面、技術面，提供專業的投資建議
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer group" onClick={() => setLocation("/portfolio")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-accent w-fit">
                  <Wallet className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-xl mb-2">投資組合管理</CardTitle>
                <CardDescription className="text-base">
                  追蹤您的持股表現，計算投資回報，優化資產配置
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
        
        {/* 進階功能 - 優化設計 */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 px-4">進階分析工具</h3>
            <p className="text-base sm:text-lg text-muted-foreground px-4">深入了解投資表現，做出更精準的決策</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer" onClick={() => setLocation("/analysis-accuracy")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-green-500/10 w-fit">
                  <Target className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-xl mb-2">AI 分析準確度追蹤</CardTitle>
                <CardDescription className="text-base">
                  自動比對歷史分析建議與實際股價走勢，評估 AI 分析的可靠性
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer" onClick={() => setLocation("/watchlist")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-yellow-500/10 w-fit">
                  <Star className="h-10 w-10 text-yellow-600" />
                </div>
                <CardTitle className="text-xl mb-2">我的收藏</CardTitle>
                <CardDescription className="text-base">
                  收藏關注的股票，一鍵批量 AI 分析，快速掌握投資機會
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-hover border-2 hover:border-primary/50 cursor-pointer" onClick={() => setLocation("/history")}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-blue-500/10 w-fit">
                  <History className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-xl mb-2">搜尋歷史</CardTitle>
                <CardDescription className="text-base">
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
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 px-4 sm:px-0">熱門{selectedMarket === 'US' ? '美股' : '台股'}</h3>
              <p className="text-sm sm:text-base text-muted-foreground px-4 sm:px-0">市場關注度最高的股票</p>
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
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-blue-600/20"></div>
            <CardContent className="relative text-center py-16 px-6">
              <div className="max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">安全可靠的投資分析平台</span>
                </div>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  開始您的
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> 智能投資 </span>
                  之旅
                </h3>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  登入以解鎖完整功能：收藏股票、管理投資組合、查看分析趨勢
                  <br className="hidden md:block" />
                  讓 AI 成為您的投資顧問
                </p>
                <Button size="lg" asChild className="h-14 px-10 text-lg font-semibold bg-gradient-primary text-white border-0 shadow-xl button-hover">
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
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {APP_TITLE}
              </span>
            </div>
            <p className="text-muted-foreground mb-2">© 2025 {APP_TITLE}. 數據來源：Yahoo Finance</p>
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

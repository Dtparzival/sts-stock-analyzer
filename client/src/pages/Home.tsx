import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Search, TrendingUp, Wallet, History, Star, Sparkles, LogOut, Globe, Target } from "lucide-react";
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
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("登出成功");
      window.location.reload();
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
      {/* 導航欄 */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <h1 className="text-lg md:text-2xl font-bold truncate max-w-[120px] md:max-w-none">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-1 md:gap-4">
              {loading ? (
                <div className="h-10 w-20 bg-muted animate-pulse rounded" />
              ) : user ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/watchlist")} className="hidden sm:flex">
                    <Star className="h-4 w-4 mr-2" />
                    收藏
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setLocation("/watchlist")} className="sm:hidden">
                    <Star className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/portfolio")} className="hidden sm:flex">
                    <Wallet className="h-4 w-4 mr-2" />
                    投資組合
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setLocation("/portfolio")} className="sm:hidden">
                    <Wallet className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/history")} className="hidden sm:flex">
                    <History className="h-4 w-4 mr-2" />
                    歷史
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setLocation("/history")} className="sm:hidden">
                    <History className="h-4 w-4" />
                  </Button>
                  
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="md:hidden">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <a href={getLoginUrl()}>登入</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            STS 投資分析平台
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            透過 AI 驅動的深度分析，掌握{selectedMarket === 'US' ? '美股' : '台股'}市場趨勢，做出更明智的投資決策
          </p>

          {/* 市場切換器 */}
          <div className="flex justify-center gap-2 mb-8">
            <Button
              variant={selectedMarket === 'US' ? 'default' : 'outline'}
              onClick={() => setSelectedMarket('US')}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              美股市場
            </Button>
            <Button
              variant={selectedMarket === 'TW' ? 'default' : 'outline'}
              onClick={() => setSelectedMarket('TW')}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              台股市場
            </Button>
          </div>

          {/* 搜尋框 */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                  className="pl-10 h-12 text-lg"
                />
                {/* 自動完成建議 */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.symbol}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion.symbol)}
                        className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors flex flex-col items-start"
                      >
                        <span className="font-medium text-base">{suggestion.symbol}</span>
                        <span className="text-sm text-muted-foreground">{suggestion.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" size="lg" className="px-8" style={{height: '48px'}}>
                搜尋
              </Button>
            </div>
          </form>
          
          {/* 為您推薦區塊 */}
          {user && recentHistory && recentHistory.length > 0 && (
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">為您推薦（最近查看）</span>
              </div>
              <div className="flex flex-wrap gap-2">
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
                      className="hover:bg-primary/10 hover:border-primary flex flex-col items-center py-3 h-auto"
                      onClick={() => setLocation(`/stock/${item.symbol}`)}
                    >
                      <span className="font-semibold text-base">{displaySymbol}</span>
                      {displayName && (
                        <span className="text-xs text-muted-foreground mt-0.5">{displayName}</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 功能特色 */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
            <CardHeader>
              <Search className="h-12 w-12 text-primary mb-4" />
              <CardTitle>即時股票數據</CardTitle>
              <CardDescription>
                獲取最新的股票價格、歷史走勢和技術指標，掌握市場動態
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>AI 投資分析</CardTitle>
              <CardDescription>
                運用人工智慧分析公司基本面、技術面，提供專業的投資建議
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/portfolio")}>
            <CardHeader>
              <Wallet className="h-12 w-12 text-primary mb-4" />
              <CardTitle>投資組合管理</CardTitle>
              <CardDescription>
                追蹤您的持股表現，計算投資回報，優化資產配置
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        
        {/* AI 分析功能 */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/analysis-accuracy")}>
            <CardHeader>
              <Target className="h-12 w-12 text-primary mb-4" />
              <CardTitle>AI 分析準確度追蹤</CardTitle>
              <CardDescription>
                自動比對歷史分析建議與實際股價走勢，評估 AI 分析的可靠性
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/watchlist")}>
            <CardHeader>
              <Star className="h-12 w-12 text-primary mb-4" />
              <CardTitle>我的收藏</CardTitle>
              <CardDescription>
                收藏關注的股票，一鍵批量 AI 分析，快速掌握投資機會
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/history")}>
            <CardHeader>
              <History className="h-12 w-12 text-primary mb-4" />
              <CardTitle>搜尋歷史</CardTitle>
              <CardDescription>
                查看最近搜尋的股票，快速返回關注的標的
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* 熱門股票 */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6">熱門{selectedMarket === 'US' ? '美股' : '台股'}</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {HOT_STOCKS[selectedMarket].map((stock) => {
              // 移除台股代碼中的 .TW 後綴
              const displaySymbol = selectedMarket === 'TW' 
                ? cleanTWSymbol(stock.symbol) 
                : stock.symbol;
              
              return (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center hover:bg-primary/10 hover:border-primary"
                  onClick={() => setLocation(`/stock/${stock.symbol}`)}
                >
                  <span className="text-lg font-semibold">{displaySymbol}</span>
                  <span className="text-xs text-muted-foreground">{stock.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <Card className="bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20">
            <CardContent className="text-center py-12">
              <h3 className="text-3xl font-bold mb-4">開始您的投資之旅</h3>
              <p className="text-lg text-muted-foreground mb-6">
                登入以解鎖完整功能：收藏股票、管理投資組合、查看分析趨勢
              </p>
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>立即登入</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 {APP_TITLE}. 數據來源：Yahoo Finance</p>
          <p className="text-sm mt-2">
            本平台僅供參考，不構成投資建議。投資有風險，請謹慎決策。
          </p>
        </div>
      </footer>
      
      {/* 浮動 AI 顧問 */}
      <FloatingAIChat />
    </div>
  );
}

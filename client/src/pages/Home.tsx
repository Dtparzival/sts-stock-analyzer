import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Search, TrendingUp, Star, Sparkles, LogOut } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<'US' | 'TW'>('US');
  
  // 獲取推薦列表
  const { data: recommendations, isLoading: isLoadingRec } = trpc.history.getRecommendations.useQuery(
    { market: selectedMarket, limit: 6 },
    { enabled: !!user }
  );
  
  // 獲取收藏清單
  const { data: watchlist } = trpc.watchlist.list.useQuery(undefined, { enabled: !!user });
  const watchlistSet = new Set(watchlist?.map(w => w.symbol) || []);
  
  // 添加搜尋記錄
  const addSearchMutation = trpc.history.add.useMutation();
  
  // 收藏操作
  const addToWatchlistMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => toast.success("已加入收藏"),
  });
  
  const removeFromWatchlistMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => toast.success("已移除收藏"),
  });
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // 添加搜尋記錄
    if (user) {
      await addSearchMutation.mutateAsync({
        symbol: searchQuery.toUpperCase(),
        shortName: null,
        companyName: null,
      });
    }
    
    // 導航到股票詳情頁（假設有這個頁面）
    toast.info(`搜尋: ${searchQuery}`);
    setSearchQuery("");
  };
  
  const toggleWatchlist = async (symbol: string, name: string) => {
    if (!user) {
      toast.error("請先登入");
      return;
    }
    
    if (watchlistSet.has(symbol)) {
      await removeFromWatchlistMutation.mutateAsync({ symbol });
    } else {
      await addToWatchlistMutation.mutateAsync({ symbol, name });
    }
  };
  
  const handleLogout = () => {
    logout();
    toast.success("已登出");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">{APP_TITLE}</h1>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {user.name || user.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    登出
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
      <main className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            智能
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              投資分析
            </span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            深度分析美股與台股市場，為您的投資組合提供專業建議
          </p>
          
          {/* 市場切換 */}
          <div className="flex justify-center gap-3 mb-6">
            <Button
              variant={selectedMarket === 'US' ? 'default' : 'outline'}
              onClick={() => setSelectedMarket('US')}
            >
              美股市場
            </Button>
            <Button
              variant={selectedMarket === 'TW' ? 'default' : 'outline'}
              onClick={() => setSelectedMarket('TW')}
            >
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
                  placeholder={selectedMarket === 'US' ? "輸入股票代碼（例如：AAPL）" : "輸入股票代碼（例如：2330）"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">搜尋</Button>
            </div>
          </form>
        </div>

        {/* 推薦區塊 */}
        {user && (
          <div className="max-w-6xl mx-auto mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-2xl font-bold">為您推薦</h3>
            </div>
            
            {isLoadingRec ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-40"></CardContent>
                  </Card>
                ))}
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {recommendations.map((item) => (
                  <Card
                    key={item.symbol}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-4 flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(item.symbol, item.shortName || item.companyName || item.symbol);
                          }}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              watchlistSet.has(item.symbol)
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </Button>
                      </div>
                      
                      <div className="text-center">
                        <p className="font-bold text-lg">{item.symbol}</p>
                        {item.shortName && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.shortName}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    尚無{selectedMarket === 'US' ? '美股' : '台股'}推薦
                  </p>
                  <p className="text-sm text-muted-foreground">
                    開始搜尋以獲得個人化推薦
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 功能特色 */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                即時股票數據
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                獲取最新的股票價格、歷史走勢和技術指標
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI 投資分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                運用人工智慧分析公司基本面、技術面
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                投資組合管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                追蹤您的持股表現，計算投資回報
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Search, TrendingUp, BarChart3, Wallet, History, Star } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/stock/${searchQuery.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="h-10 w-20 bg-muted animate-pulse rounded" />
              ) : user ? (
                <>
                  <Button variant="ghost" onClick={() => setLocation("/watchlist")}>
                    <Star className="h-4 w-4 mr-2" />
                    收藏
                  </Button>
                  <Button variant="ghost" onClick={() => setLocation("/portfolio")}>
                    <Wallet className="h-4 w-4 mr-2" />
                    投資組合
                  </Button>
                  <Button variant="ghost" onClick={() => setLocation("/history")}>
                    <History className="h-4 w-4 mr-2" />
                    歷史
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{user.name || user.email}</span>
                  </div>
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
            美股投資分析平台
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            透過 AI 驅動的深度分析，掌握美股市場趨勢，做出更明智的投資決策
          </p>

          {/* 搜尋框 */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="輸入股票代碼（例如：AAPL, TSLA, GOOGL）"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button type="submit" size="lg" className="px-8">
                搜尋
              </Button>
            </div>
          </form>
        </div>

        {/* 功能特色 */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>即時股票數據</CardTitle>
              <CardDescription>
                獲取最新的股票價格、歷史走勢和技術指標，掌握市場動態
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>AI 投資分析</CardTitle>
              <CardDescription>
                運用人工智慧分析公司基本面、技術面，提供專業的投資建議
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <Wallet className="h-12 w-12 text-primary mb-4" />
              <CardTitle>投資組合管理</CardTitle>
              <CardDescription>
                追蹤您的持股表現，計算投資回報，優化資產配置
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* 熱門股票 */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6">熱門美股</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA", "META", "NFLX"].map((symbol) => (
              <Button
                key={symbol}
                variant="outline"
                className="h-16 text-lg font-semibold hover:bg-primary/10 hover:border-primary"
                onClick={() => setLocation(`/stock/${symbol}`)}
              >
                {symbol}
              </Button>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <Card className="bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20">
            <CardContent className="text-center py-12">
              <h3 className="text-3xl font-bold mb-4">開始您的投資之旅</h3>
              <p className="text-lg text-muted-foreground mb-6">
                登入以解鎖完整功能：收藏股票、管理投資組合、查看分析歷史
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
          <p>© 2024 {APP_TITLE}. 數據來源：Yahoo Finance</p>
          <p className="text-sm mt-2">
            本平台僅供參考，不構成投資建議。投資有風險，請謹慎決策。
          </p>
        </div>
      </footer>
    </div>
  );
}

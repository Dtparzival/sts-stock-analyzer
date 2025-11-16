import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { getMarketFromSymbol } from "@shared/markets";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";

type MarketFilter = 'all' | 'US' | 'TW';

export default function Watchlist() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');

  const { data: watchlist, isLoading } = trpc.watchlist.list.useQuery(undefined, {
    enabled: !!user,
  });

  // 篩選收藏列表
  const filteredWatchlist = useMemo(() => {
    if (!watchlist) return [];
    if (marketFilter === 'all') return watchlist;
    return watchlist.filter(item => getMarketFromSymbol(item.symbol) === marketFilter);
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
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">我的收藏</h1>
          </div>
          
          {/* 市場篩選器 */}
          <div className="flex gap-2">
            <Button
              variant={marketFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarketFilter('all')}
            >
              全部
            </Button>
            <Button
              variant={marketFilter === 'US' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarketFilter('US')}
            >
              美股
            </Button>
            <Button
              variant={marketFilter === 'TW' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarketFilter('TW')}
            >
              台股
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !watchlist || watchlist.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">尚未收藏任何股票</p>
            </CardContent>
          </Card>
        ) : filteredWatchlist.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">沒有符合篩選條件的股票</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWatchlist.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setLocation(`/stock/${item.symbol}`)}
              >
                <CardContent className="py-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">{item.symbol}</h3>
                        <Badge variant="outline" className="text-xs">
                          {getMarketFromSymbol(item.symbol) === 'TW' ? '台股' : '美股'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.companyName || item.symbol}</p>
                    </div>
                    <Star className="h-5 w-5 text-primary fill-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    添加於 {new Date(item.addedAt).toLocaleDateString("zh-TW")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Star, X, Sparkles } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MarketFilter = 'all' | 'US' | 'TW';

// 股價顯示組件
function StockPriceDisplay({ symbol, addedAt }: { symbol: string; addedAt: Date }) {
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
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stockData || !stockData.price) {
    return (
      <div className="space-y-2 py-2">
        <div className="text-sm text-muted-foreground">
          添加於 {new Date(addedAt).toLocaleDateString("zh-TW")}
        </div>
        <div className="text-xs text-muted-foreground">
          點擊查看詳細股價信息
        </div>
      </div>
    );
  }

  const change = stockData.price - (stockData.previousClose || stockData.price);
  const changePercent = stockData.previousClose ? (change / stockData.previousClose) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold">
          ${stockData.price.toFixed(2)}
        </span>
        <span className={`text-sm font-medium ${
          changePercent >= 0 
            ? 'text-green-600' 
            : 'text-red-600'
        }`}>
          {changePercent >= 0 ? '+' : ''}
          {changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
          {changePercent >= 0 ? '+' : ''}
          ${change.toFixed(2)}
        </span>
        <span>
          添加於 {new Date(addedAt).toLocaleDateString("zh-TW")}
        </span>
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

  const { data: watchlist, isLoading } = trpc.watchlist.list.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  
  const batchAnalyze = trpc.watchlist.batchAnalyze.useMutation({
    onSuccess: (data) => {
      setBatchResults(data.results);
      setShowBatchAnalysis(true);
      toast.success(`成功分析 ${data.results.length} 支股票`);
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
          
          <div className="flex items-center gap-4">
            {/* 批量分析按鈕 */}
            {watchlist && watchlist.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => batchAnalyze.mutate()}
                disabled={batchAnalyze.isPending}
              >
                {batchAnalyze.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    批量 AI 分析
                  </>
                )}
              </Button>
            )}
            
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
                className="cursor-pointer hover:border-primary/50 transition-colors relative group"
                onClick={() => setLocation(`/stock/${item.symbol}`)}
              >
                <CardContent className="py-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">
                          {getMarketFromSymbol(item.symbol) === 'TW' ? cleanTWSymbol(item.symbol) : item.symbol}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {getMarketFromSymbol(item.symbol) === 'TW' ? '台股' : '美股'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                        {(() => {
                          const market = getMarketFromSymbol(item.symbol);
                          if (market === 'TW') {
                            // 台股：先嘗試從 TW_STOCK_NAMES 獲取中文名稱
                            const twName = getTWStockName(item.symbol);
                            if (twName) {
                              return twName;
                            }
                            // 如果 companyName 是新格式（例如：2330 台積電），直接使用
                            if (item.companyName && !item.companyName.includes('.TW') && !item.companyName.includes('.TWO')) {
                              return item.companyName;
                            }
                            // 如果都沒有，返回 symbol
                            return item.symbol;
                          }
                          // 美股：直接使用 companyName
                          return item.companyName || item.symbol;
                        })()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary fill-primary" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => handleRemove(e, item.symbol)}
                        title="移除收藏"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* 股價和漲跌幅 */}
                  <StockPriceDisplay symbol={item.symbol} addedAt={item.addedAt} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* 批量分析結果對話框 */}
        <Dialog open={showBatchAnalysis} onOpenChange={setShowBatchAnalysis}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>批量 AI 分析結果</DialogTitle>
              <DialogDescription>
                已完成 {batchResults.length} 支股票的 AI 投資分析
              </DialogDescription>
            </DialogHeader>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">股票代號</TableHead>
                  <TableHead className="w-[150px]">公司名稱</TableHead>
                  <TableHead className="w-[100px]">投資建議</TableHead>
                  <TableHead>分析摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchResults.map((result) => (
                  <TableRow key={result.symbol}>
                    <TableCell className="font-medium">
                      {getMarketFromSymbol(result.symbol) === 'TW' ? cleanTWSymbol(result.symbol) : result.symbol}
                    </TableCell>
                    <TableCell>
                      {result.companyName || '-'}
                    </TableCell>
                    <TableCell>
                      {result.error ? (
                        <Badge variant="destructive">失敗</Badge>
                      ) : result.recommendation ? (
                        <Badge 
                          variant={result.recommendation === '買入' ? 'default' : result.recommendation === '賣出' ? 'destructive' : 'secondary'}
                        >
                          {result.recommendation}
                        </Badge>
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {result.error ? (
                        <span className="text-destructive">{result.error}</span>
                      ) : (
                        <span className="text-muted-foreground">{result.summary}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => setShowBatchAnalysis(false)}>
                關閉
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

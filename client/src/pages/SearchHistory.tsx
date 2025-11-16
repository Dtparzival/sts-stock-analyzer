import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, History, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { getMarketFromSymbol } from "@shared/markets";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type MarketFilter = 'all' | 'US' | 'TW';

export default function SearchHistory() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');

  const { data: history, isLoading } = trpc.history.list.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );
  
  const { data: topStocks, isLoading: loadingTopStocks } = trpc.history.getTopStocks.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const utils = trpc.useUtils();
  
  const deleteOneMutation = trpc.history.deleteOne.useMutation({
    onSuccess: () => {
      utils.history.list.invalidate();
      toast.success("已刪除搜尋記錄");
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: () => {
      toast.error("刪除失敗，請稍後再試");
    },
  });
  
  const deleteAllMutation = trpc.history.deleteAll.useMutation({
    onSuccess: () => {
      utils.history.list.invalidate();
      toast.success("已清空所有搜尋記錄");
      setDeleteAllDialogOpen(false);
    },
    onError: () => {
      toast.error("清空失敗，請稍後再試");
    },
  });
  
  const handleDeleteOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteOne = () => {
    if (deletingId !== null) {
      deleteOneMutation.mutate({ id: deletingId });
    }
  };
  
  const confirmDeleteAll = () => {
    deleteAllMutation.mutate();
  };

  // 篩選搜尋歷史
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (marketFilter === 'all') return history;
    return history.filter(item => getMarketFromSymbol(item.symbol) === marketFilter);
  }, [history, marketFilter]);

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
              <p className="text-lg text-muted-foreground mb-6">請先登入以查看搜尋歷史</p>
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
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">搜尋歷史</h1>
          </div>
          
          {/* 市場篩選器和清空按鈕 */}
          <div className="flex gap-2">
            {history && history.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAllDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清空所有
              </Button>
            )}
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

        {/* 熱門追蹤區塊 */}
        {topStocks && topStocks.length > 0 && (
          <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                熱門追蹤
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topStocks.map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setLocation(`/stock/${stock.symbol}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-bold">{stock.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {stock.companyName || stock.symbol}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {stock.count} 次
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !history || history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">尚無搜尋記錄</p>
            </CardContent>
          </Card>
        ) : filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">沒有符合篩選條件的搜尋記錄</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setLocation(`/stock/${item.symbol}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-bold text-lg">{item.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {getMarketFromSymbol(item.symbol) === 'TW' ? '台股' : '美股'}
                      </Badge>
                      <span className="text-muted-foreground">
                        {item.companyName || item.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.searchedAt).toLocaleString("zh-TW")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteOne(item.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* 刪除單筆確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              是否要刪除這筆搜尋記錄？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOne}>
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 清空所有確認對話框 */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認清空</AlertDialogTitle>
            <AlertDialogDescription>
              是否要清空所有搜尋記錄？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              確認清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

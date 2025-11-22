import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, History, Trash2, Clock, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { getMarketFromSymbol, cleanTWSymbol } from "@shared/markets";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      {/* 頂部導航 */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* 第一行：返回按鈕和標題 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="flex-shrink-0 hover:bg-primary/10 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">返回首頁</span>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg blur-sm" />
                    <div className="relative bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">搜尋歷史</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">查看您的搜尋記錄</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 第二行：市場篩選器和清空按鈕 */}
            <div className="flex gap-2 flex-wrap">
            {history && history.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清空所有
              </Button>
            )}
            <Button
              variant={marketFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarketFilter('all')}
              className={marketFilter === 'all' ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600' : 'hover:border-blue-500/50 transition-all'}
            >
              全部
            </Button>
            <Button
              variant={marketFilter === 'US' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarketFilter('US')}
              className={marketFilter === 'US' ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600' : 'hover:border-blue-500/50 transition-all'}
            >
              美股
            </Button>
            <Button
              variant={marketFilter === 'TW' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMarketFilter('TW')}
              className={marketFilter === 'TW' ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600' : 'hover:border-blue-500/50 transition-all'}
            >
              台股
            </Button>
          </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* 熱門追蹤區塊 */}
        {topStocks && topStocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
          <Card className="mb-6 border-2 hover:shadow-lg transition-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
            <CardContent className="py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  熱門追蹤
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topStocks.map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-purple-500/5 hover:border-blue-500/20 border border-transparent transition-all"
                    onClick={() => setLocation(`/stock/${stock.symbol}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-bold">
                          {getMarketFromSymbol(stock.symbol) === 'TW' ? cleanTWSymbol(stock.symbol) : stock.symbol}
                        </div>
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
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !history || history.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full">
                  <History className="h-12 w-12 text-blue-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">尚無搜尋記錄</h3>
              <p className="text-sm text-muted-foreground">開始搜尋股票，您的搜尋歷史將顯示在這裡</p>
            </CardContent>
          </Card>
        ) : filteredHistory.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full">
                  <History className="h-12 w-12 text-blue-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">沒有符合篩選條件的搜尋記錄</h3>
              <p className="text-sm text-muted-foreground">請嘗試切換到其他市場篩選器</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.01, x: 4 }}
              >
              <Card
                className="cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all border-2"
                onClick={() => setLocation(`/stock/${item.symbol}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          {getMarketFromSymbol(item.symbol) === 'TW' ? cleanTWSymbol(item.symbol) : item.symbol}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getMarketFromSymbol(item.symbol) === 'TW' ? '台股' : '美股'}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
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
                        className="h-8 w-8 hover:bg-red-500/10 hover:text-red-600 transition-colors"
                        onClick={(e) => handleDeleteOne(item.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
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

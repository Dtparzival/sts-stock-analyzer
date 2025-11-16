import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { PortfolioPerformanceChart } from "@/components/PortfolioPerformanceChart";
import { PortfolioAnalysisDashboard } from "@/components/PortfolioAnalysisDashboard";
import { getMarketFromSymbol } from "@shared/markets";
import { Badge } from "@/components/ui/badge";

export default function Portfolio() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});

  // 表單狀態
  const [formData, setFormData] = useState({
    symbol: "",
    shares: "",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const { data: portfolio = [], isLoading, refetch } = trpc.portfolio.list.useQuery(undefined, {
    enabled: !!user,
  });

  const addMutation = trpc.portfolio.add.useMutation({
    onSuccess: () => {
      toast.success("持倉已添加");
      refetch();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`添加失敗: ${error.message}`);
    },
  });

  const deleteMutation = trpc.portfolio.delete.useMutation({
    onSuccess: () => {
      toast.success("持倉已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      symbol: "",
      shares: "",
      purchasePrice: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.shares || !formData.purchasePrice) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    addMutation.mutate({
      symbol: formData.symbol.toUpperCase(),
      shares: parseInt(formData.shares),
      purchasePrice: parseFloat(formData.purchasePrice),
      purchaseDate: new Date(formData.purchaseDate),
      notes: formData.notes || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這筆持倉嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  // 獲取當前股價
  const utils = trpc.useUtils();
  
  useEffect(() => {
    if (portfolio.length === 0) return;

    const fetchPrices = async () => {
      const prices: Record<string, number> = {};
      
      for (const item of portfolio) {
        try {
          const data = await utils.stock.getStockData.fetch({
            symbol: item.symbol,
            range: "1d",
            interval: "1d"
          }) as any;
          
          if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
            prices[item.symbol] = data.chart.result[0].meta.regularMarketPrice;
          }
        } catch (error) {
          console.error(`Failed to fetch price for ${item.symbol}:`, error);
        }
      }
      
      setStockPrices(prices);
    };

    fetchPrices();
  }, [portfolio, utils]);

  // 計算統計數據
  const calculateStats = () => {
    let totalInvestment = 0;
    let totalCurrentValue = 0;

    portfolio.forEach((item) => {
      const purchasePrice = item.purchasePrice / 100; // 轉換回美元
      const currentPrice = stockPrices[item.symbol] || purchasePrice;
      
      totalInvestment += purchasePrice * item.shares;
      totalCurrentValue += currentPrice * item.shares;
    });

    const totalGainLoss = totalCurrentValue - totalInvestment;
    const totalGainLossPercent = totalInvestment > 0 
      ? (totalGainLoss / totalInvestment) * 100 
      : 0;

    return {
      totalInvestment,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
    };
  };

  const stats = calculateStats();

  // 獲取歷史記錄
  const { data: historyData = [] } = trpc.portfolio.getHistory.useQuery(
    { days: undefined }, // 獲取所有歷史
    { enabled: !!user }
  );

  // 獲取持倉分析數據
  const { data: analysisData } = trpc.portfolio.getAnalysis.useQuery(undefined, {
    enabled: !!user && portfolio.length > 0,
  });

  // 記錄當前價值的 mutation
  const recordValueMutation = trpc.portfolio.recordCurrentValue.useMutation();

  // 當統計數據更新時，自動記錄當前價值
  useEffect(() => {
    if (!user || portfolio.length === 0 || Object.keys(stockPrices).length === 0) return;
    
    // 檢查是否所有股票都已獲取價格
    const allPricesFetched = portfolio.every(item => stockPrices[item.symbol] !== undefined);
    if (!allPricesFetched) return;

    // 記錄當前價值
    recordValueMutation.mutate({
      totalValue: stats.totalCurrentValue,
      totalCost: stats.totalInvestment,
      totalGainLoss: stats.totalGainLoss,
      gainLossPercent: stats.totalGainLossPercent,
    });
  }, [stats.totalCurrentValue, stats.totalInvestment, user, portfolio.length, Object.keys(stockPrices).length]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>需要登入</CardTitle>
            <CardDescription>請先登入以查看您的投資組合</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = getLoginUrl()}
            >
              登入
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/")}
            >
              返回首頁
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部導航 */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首頁
              </Button>
              <h1 className="text-2xl font-bold">投資組合</h1>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加持倉
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加新持倉</DialogTitle>
                  <DialogDescription>
                    輸入您的股票持倉資訊
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="symbol">股票代碼 *</Label>
                      <Input
                        id="symbol"
                        placeholder="例如: AAPL"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shares">持股數量 *</Label>
                      <Input
                        id="shares"
                        type="number"
                        min="1"
                        placeholder="例如: 100"
                        value={formData.shares}
                        onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">購買價格 (USD) *</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="例如: 150.50"
                        value={formData.purchasePrice}
                        onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">購買日期 *</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">備註</Label>
                      <Textarea
                        id="notes"
                        placeholder="選填：記錄購買原因或其他資訊"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      取消
                    </Button>
                    <Button type="submit" disabled={addMutation.isPending}>
                      {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      添加
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 績效圖表 */}
        {historyData.length > 0 && (
          <div className="mb-8">
            <PortfolioPerformanceChart data={historyData} />
          </div>
        )}

        {/* 持倉分析儀表板 */}
        {analysisData && portfolio.length > 0 && (
          <div className="mb-8">
            <PortfolioAnalysisDashboard 
              distribution={analysisData.distribution}
              riskMetrics={analysisData.riskMetrics}
            />
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>總投資金額</CardDescription>
              <CardTitle className="text-2xl">
                ${stats.totalInvestment.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>當前總價值</CardDescription>
              <CardTitle className="text-2xl">
                ${stats.totalCurrentValue.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>總損益</CardDescription>
              <CardTitle className={`text-2xl flex items-center gap-2 ${stats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalGainLoss >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                ${Math.abs(stats.totalGainLoss).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>總報酬率</CardDescription>
              <CardTitle className={`text-2xl ${stats.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalGainLossPercent >= 0 ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 持倉列表 */}
        <Card>
          <CardHeader>
            <CardTitle>持倉明細</CardTitle>
            <CardDescription>
              您的股票投資組合詳情
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : portfolio.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>尚無持倉記錄</p>
                <p className="text-sm mt-2">點擊上方「添加持倉」按鈕開始記錄您的投資</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>股票代碼</TableHead>
                      <TableHead>公司名稱</TableHead>
                      <TableHead className="text-right">持股數量</TableHead>
                      <TableHead className="text-right">購買價格</TableHead>
                      <TableHead className="text-right">當前價格</TableHead>
                      <TableHead className="text-right">成本</TableHead>
                      <TableHead className="text-right">市值</TableHead>
                      <TableHead className="text-right">損益</TableHead>
                      <TableHead className="text-right">報酬率</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.map((item) => {
                      const purchasePrice = item.purchasePrice / 100;
                      const currentPrice = stockPrices[item.symbol] || purchasePrice;
                      const costBasis = purchasePrice * item.shares;
                      const marketValue = currentPrice * item.shares;
                      const gainLoss = marketValue - costBasis;
                      const gainLossPercent = (gainLoss / costBasis) * 100;
                      const market = getMarketFromSymbol(item.symbol);
                      const currencySymbol = market === 'TW' ? 'NT$' : '$';

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setLocation(`/stock/${item.symbol}`)}
                                className="text-primary hover:underline"
                              >
                                {item.symbol}
                              </button>
                              <Badge variant="outline" className="text-xs">
                                {market === 'TW' ? '台股' : '美股'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{item.companyName || '-'}</TableCell>
                          <TableCell className="text-right">{item.shares}</TableCell>
                          <TableCell className="text-right">{currencySymbol}{purchasePrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {stockPrices[item.symbol] ? (
                              `${currencySymbol}${currentPrice.toFixed(2)}`
                            ) : (
                              <Loader2 className="h-4 w-4 animate-spin inline" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">{currencySymbol}{costBasis.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{currencySymbol}{marketValue.toFixed(2)}</TableCell>
                          <TableCell className={`text-right ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLoss >= 0 ? '+' : ''}{currencySymbol}{gainLoss.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

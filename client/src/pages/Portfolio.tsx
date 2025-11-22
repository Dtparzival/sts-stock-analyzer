import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Loader2, Briefcase, DollarSign, PieChart, TrendingUpIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
// import { PortfolioPerformanceChart } from "@/components/PortfolioPerformanceChart"; // 已移除
import { PortfolioAnalysisDashboard } from "@/components/PortfolioAnalysisDashboard";
import { getMarketFromSymbol, cleanTWSymbol } from "@shared/markets";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";

type Currency = 'USD' | 'TWD';

export default function Portfolio() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});
  const [currency, setCurrency] = useState<Currency>('USD'); // 預設顯示美元
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 獲取即時匯率
  const { data: exchangeRateData } = trpc.exchangeRate.getUSDToTWD.useQuery();
  const usdToTwdRate = exchangeRateData?.rate || 31.5; // 如果 API 失敗，使用備用匯率
  const twdToUsdRate = 1 / usdToTwdRate;

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

  const aiAnalysisMutation = trpc.portfolio.getPortfolioAIAnalysis.useMutation({
    onSuccess: (data: { analysis: string; fromCache: boolean }) => {
      setAiAnalysis(data.analysis);
      setIsAnalyzing(false);
      toast.success("AI 分析完成");
    },
    onError: (error: any) => {
      toast.error(`AI 分析失敗: ${error.message}`);
      setIsAnalyzing(false);
    },
  });

  const handleAIAnalysis = () => {
    if (portfolio.length === 0) {
      toast.error("投資組合為空，無法進行分析");
      return;
    }

    if (Object.keys(stockPrices).length === 0) {
      toast.error("正在獲取股價數據，請稍後再試");
      return;
    }

    setIsAnalyzing(true);
    aiAnalysisMutation.mutate({ currentPrices: stockPrices });
  };

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

  // 計算統計數據（以美元為基準）
  const calculateStats = () => {
    let totalInvestment = 0;
    let totalCurrentValue = 0;

    portfolio.forEach((item) => {
      const market = getMarketFromSymbol(item.symbol);
      const purchasePrice = item.purchasePrice / 100; // 轉換回原始價格
      const currentPrice = stockPrices[item.symbol] || purchasePrice;
      
      // 如果是台股，價格是台幣，需要轉換為美元
      const purchasePriceUSD = market === 'TW' ? purchasePrice * twdToUsdRate : purchasePrice;
      const currentPriceUSD = market === 'TW' ? currentPrice * twdToUsdRate : currentPrice;
      
      totalInvestment += purchasePriceUSD * item.shares;
      totalCurrentValue += currentPriceUSD * item.shares;
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

  // 根據選擇的貨幣轉換統計數據
  const convertCurrency = (value: number) => {
    return currency === 'TWD' ? value * usdToTwdRate : value;
  };

  // 獲取貨幣符號
  const getCurrencySymbol = () => {
    return currency === 'TWD' ? 'NT$' : '$';
  };

  const stats = calculateStats();
  
  // 檢查是否所有股票價格都已載入
  const allPricesLoaded = portfolio.length > 0 && portfolio.every(item => stockPrices[item.symbol] !== undefined);

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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* 第一行：標題和返回按鈕 */}
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
                      <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">投資組合</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">追蹤您的投資表現</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 第二行：貨幣切換和操作按鈕 */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* 貨幣切換 */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    variant={currency === 'USD' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrency('USD')}
                  >
                    USD ($)
                  </Button>
                  <Button
                    variant={currency === 'TWD' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrency('TWD')}
                  >
                    TWD (NT$)
                  </Button>
                </div>
                {exchangeRateData && (
                  <div className="text-xs text-muted-foreground">
                    匹率: 1 USD = {usdToTwdRate.toFixed(4)} TWD
                    {exchangeRateData.updateTime && (
                      <span className="ml-2 hidden sm:inline">
                        (更新於 {new Date(exchangeRateData.updateTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* 操作按鈕 */}
              <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleAIAnalysis}
                disabled={isAnalyzing || portfolio.length === 0}
                className="relative overflow-hidden group hover:border-blue-500/50 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin relative z-10" />
                    <span className="relative z-10">分析中...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2 relative z-10" />
                    <span className="relative z-10">AI 智能分析</span>
                  </>
                )}
              </Button>
              
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="relative overflow-hidden group bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between mb-2">
                <CardDescription className="text-xs font-medium">總投資金額</CardDescription>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold">
                {getCurrencySymbol()}{convertCurrency(stats.totalInvestment).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between mb-2">
                <CardDescription className="text-xs font-medium">當前總價值</CardDescription>
                <PieChart className="h-4 w-4 text-purple-500" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold">
                {!allPricesLoaded ? (
                  <span className="flex items-center gap-2 text-muted-foreground text-xl">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    載入中...
                  </span>
                ) : (
                  <>{getCurrencySymbol()}{convertCurrency(stats.totalCurrentValue).toFixed(2)}</>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all group">
            <div className={`absolute inset-0 ${stats.totalGainLoss >= 0 ? 'bg-gradient-to-br from-green-500/5' : 'bg-gradient-to-br from-red-500/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stats.totalGainLoss >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}`} />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between mb-2">
                <CardDescription className="text-xs font-medium">總損益</CardDescription>
                {stats.totalGainLoss >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>
              <CardTitle className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 ${stats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {!allPricesLoaded ? (
                  <span className="flex items-center gap-2 text-muted-foreground text-xl">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    載入中...
                  </span>
                ) : (
                  <>
                    {stats.totalGainLoss >= 0 ? '+' : '-'}{getCurrencySymbol()}{Math.abs(convertCurrency(stats.totalGainLoss)).toFixed(2)}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all group">
            <div className={`absolute inset-0 ${stats.totalGainLossPercent >= 0 ? 'bg-gradient-to-br from-green-500/5' : 'bg-gradient-to-br from-red-500/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stats.totalGainLossPercent >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}`} />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between mb-2">
                <CardDescription className="text-xs font-medium">總報酬率</CardDescription>
                <TrendingUpIcon className={`h-4 w-4 ${stats.totalGainLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <CardTitle className={`text-2xl sm:text-3xl font-bold ${stats.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {!allPricesLoaded ? (
                  <span className="flex items-center gap-2 text-muted-foreground text-xl">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    載入中...
                  </span>
                ) : (
                  <>{stats.totalGainLossPercent >= 0 ? '+' : ''}{stats.totalGainLossPercent.toFixed(2)}%</>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          </motion.div>
        </div>

        {/* 持倉列表 */}
        <Card className="mb-8 border-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                <PieChart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">持倉明細</CardTitle>
                <CardDescription className="text-sm">
                  您的股票投資組合詳情
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : portfolio.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full">
                    <Briefcase className="h-12 w-12 text-blue-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">尚無持倉記錄</h3>
                <p className="text-sm text-muted-foreground mb-6">點擊上方「添加持倉」按鈕開始記錄您的投資</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  開始添加持倉
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[800px] sm:min-w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/70 transition-colors">
                      <TableHead className="min-w-[120px]">股票</TableHead>
                      <TableHead className="text-right min-w-[80px]">持股數量</TableHead>
                      <TableHead className="text-right min-w-[100px]">購買價格</TableHead>
                      <TableHead className="text-right min-w-[100px]">當前價格</TableHead>
                      <TableHead className="text-right min-w-[120px]">成本</TableHead>
                      <TableHead className="text-right min-w-[120px]">市值</TableHead>
                      <TableHead className="text-right min-w-[100px]">損益</TableHead>
                      <TableHead className="text-right min-w-[80px]">報酬率</TableHead>
                      <TableHead className="text-right min-w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.map((item) => {
                      const purchasePrice = item.purchasePrice / 100;
                      const currentPrice = stockPrices[item.symbol] || purchasePrice;
                      const market = getMarketFromSymbol(item.symbol);
                      
                      // 根據股票市場和當前選擇的貨幣進行轉換
                      let displayPurchasePrice = purchasePrice;
                      let displayCurrentPrice = currentPrice;
                      
                      if (currency === 'TWD') {
                        // 如果選擇顯示台幣
                        if (market === 'US') {
                          // 美股需要轉換為台幣
                          displayPurchasePrice = purchasePrice * usdToTwdRate;
                          displayCurrentPrice = currentPrice * usdToTwdRate;
                        }
                        // 台股不需轉換
                      } else {
                        // 如果選擇顯示美元
                        if (market === 'TW') {
                          // 台股需要轉換為美元
                          displayPurchasePrice = purchasePrice * twdToUsdRate;
                          displayCurrentPrice = currentPrice * twdToUsdRate;
                        }
                        // 美股不需轉換
                      }
                      
                      const costBasis = displayPurchasePrice * item.shares;
                      const marketValue = displayCurrentPrice * item.shares;
                      const gainLoss = marketValue - costBasis;
                      const gainLossPercent = (gainLoss / costBasis) * 100;

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            <button
                              onClick={() => setLocation(`/stock/${item.symbol}`)}
                              className="text-left"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-primary hover:underline font-semibold">
                                    {getMarketFromSymbol(item.symbol) === 'TW' ? cleanTWSymbol(item.symbol) : item.symbol}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {market === 'TW' ? '台股' : '美股'}
                                  </Badge>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {item.companyName || '-'}
                                </span>
                              </div>
                            </button>
                          </TableCell>
                          <TableCell className="text-right">{item.shares}</TableCell>
                          <TableCell className="text-right">{getCurrencySymbol()}{displayPurchasePrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {stockPrices[item.symbol] ? (
                              `${getCurrencySymbol()}${displayCurrentPrice.toFixed(2)}`
                            ) : (
                              <Loader2 className="h-4 w-4 animate-spin inline" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">{getCurrencySymbol()}{costBasis.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{getCurrencySymbol()}{marketValue.toFixed(2)}</TableCell>
                          <TableCell className={`text-right ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLoss >= 0 ? '+' : ''}{getCurrencySymbol()}{gainLoss.toFixed(2)}
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
                              className="hover:bg-red-500/10 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* AI 分析結果 */}
        {aiAnalysis && (
          <Card className="mb-6 border-2 hover:shadow-lg transition-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AI 智能分析報告
                  </CardTitle>
                  <CardDescription className="text-sm">基於您的持倉組合提供的風險評估和優化建議</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="prose prose-sm max-w-none dark:prose-invert [&>*]:mb-3 [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm [&>ul]:pl-4 [&>ol]:pl-4">
                <Streamdown>{aiAnalysis}</Streamdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 持倉分析儀表板 */}
        {analysisData && portfolio.length > 0 && (
          <div className="mb-6">
            <PortfolioAnalysisDashboard 
              distribution={analysisData.distribution}
              riskMetrics={analysisData.riskMetrics}
            />
          </div>
        )}
      </main>
    </div>
  );
}

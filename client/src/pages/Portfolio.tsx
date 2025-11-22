import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Loader2, Briefcase, DollarSign, PieChart, TrendingUpIcon, Search, Calendar, Hash, DollarSign as DollarSignIcon, FileText, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { PortfolioPerformanceChart } from "@/components/PortfolioPerformanceChart";
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // 選中的日期，用於聯動高亮

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
    market: "US" as "US" | "TW", // 市場選擇
  });
  const [stockSuggestions, setStockSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

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

  // 獲取 tRPC utils
  const utils = trpc.useUtils();

  const resetForm = () => {
    setFormData({
      symbol: "",
      shares: "",
      purchasePrice: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: "",
      market: "US",
    });
    setStockSuggestions([]);
    setCurrentPrice(null);
  };

  // 當股票代碼輸入時，搜尋建議和獲取即時價格
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (!formData.symbol || formData.symbol.length < 1) {
        setStockSuggestions([]);
        setCurrentPrice(null);
        return;
      }

      // 台股：搜尋中文名稱建議（暫時禁用，因為 API 路徑問題）
      // if (formData.market === "TW" && formData.symbol.length >= 2) {
      //   try {
      //     const results = await utils.stock.searchTWStock.fetch({ query: formData.symbol });
      //     setStockSuggestions(results.slice(0, 5)); // 最多 5 個建議
      //   } catch (error) {
      //     console.error("Search failed:", error);
      //   }
      // }

      // 獲取即時價格（當代碼長度足夠時）
      if ((formData.market === "US" && formData.symbol.length >= 2) || 
          (formData.market === "TW" && formData.symbol.length >= 4)) {
        setIsLoadingPrice(true);
        try {
          const fullSymbol = formData.market === "TW" ? `${formData.symbol}.TW` : formData.symbol;
          const data = await utils.stock.getStockData.fetch({
            symbol: fullSymbol,
            range: "1d",
            interval: "1d"
          }) as any;
          
          if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
            setCurrentPrice(data.chart.result[0].meta.regularMarketPrice);
          } else {
            setCurrentPrice(null);
          }
        } catch (error) {
          console.error("Failed to fetch price:", error);
          setCurrentPrice(null);
        } finally {
          setIsLoadingPrice(false);
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimer);
  }, [formData.symbol, formData.market, utils]);

  // 選擇建議股票
  const handleSelectSuggestion = (symbol: string) => {
    setFormData({ ...formData, symbol });
    setStockSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.shares || !formData.purchasePrice) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    // 台股需要添加 .TW 後綴
    const fullSymbol = formData.market === "TW" ? `${formData.symbol}.TW` : formData.symbol.toUpperCase();

    addMutation.mutate({
      symbol: fullSymbol,
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
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-primary">
                    <ArrowLeft className="h-4 w-4 text-white" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/")}
                    className="flex-shrink-0 hover:bg-primary/10 transition-colors font-semibold"
                  >
                    <span className="hidden sm:inline">返回首頁</span>
                    <span className="sm:hidden">首頁</span>
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-accent">
                    <Briefcase className="h-8 w-8 text-white" />
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
                    className={currency === 'USD' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
                  >
                    USD ($)
                  </Button>
                  <Button
                    variant={currency === 'TWD' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrency('TWD')}
                    className={currency === 'TWD' ? 'bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold' : 'hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold'}
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
                onClick={() => setLocation("/portfolio/transactions")}
                className="relative overflow-hidden group hover:border-green-500/50 transition-all button-hover font-semibold"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <TrendingUpIcon className="h-4 w-4 mr-2 relative z-10" />
                <span className="relative z-10">交易歷史</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAIAnalysis}
                disabled={isAnalyzing || portfolio.length === 0}
                className="relative overflow-hidden group hover:border-blue-500/50 transition-all button-hover font-semibold"
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
                    <Button className="relative overflow-hidden group bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all button-hover font-semibold">
                      <Plus className="h-4 w-4 mr-2" />
                      添加持倉
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                          <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            添加新持倉
                          </DialogTitle>
                          <DialogDescription className="text-sm mt-1">
                            輸入您的股票持倉資訊
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-5 py-6">
                    {/* 市場選擇器 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">選擇市場 *</Label>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={formData.market === "US" ? "default" : "outline"}
                          className={`flex-1 h-12 font-semibold transition-all ${
                            formData.market === "US"
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                              : "hover:bg-blue-50 hover:border-blue-300"
                          }`}
                          onClick={() => {
                            setFormData({ ...formData, market: "US", symbol: "" });
                            setStockSuggestions([]);
                            setCurrentPrice(null);
                          }}
                        >
                          <span className="text-lg mr-2">🇺🇸</span>
                          美股市場
                        </Button>
                        <Button
                          type="button"
                          variant={formData.market === "TW" ? "default" : "outline"}
                          className={`flex-1 h-12 font-semibold transition-all ${
                            formData.market === "TW"
                              ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md"
                              : "hover:bg-purple-50 hover:border-purple-300"
                          }`}
                          onClick={() => {
                            setFormData({ ...formData, market: "TW", symbol: "" });
                            setStockSuggestions([]);
                            setCurrentPrice(null);
                          }}
                        >
                          <span className="text-lg mr-2">🇹🇼</span>
                          台股市場
                        </Button>
                      </div>
                    </div>
                    {/* 股票代碼輸入 */}
                    <div className="space-y-3">
                      <Label htmlFor="symbol" className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Search className="h-4 w-4 text-blue-500" />
                        股票代碼 *
                      </Label>
                      <div className="relative">
                        <Input
                          id="symbol"
                          placeholder={formData.market === "US" ? "例如: AAPL" : "例如: 2330"}
                          value={formData.symbol}
                          onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                          required
                          className="h-12 pl-10 pr-4 text-base border-2 focus:border-blue-400 transition-colors"
                          autoComplete="off"
                        />
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        
                        {/* 自動完成建議下拉列表 */}
                        {stockSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {stockSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleSelectSuggestion(suggestion.symbol)}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
                              >
                                <div className="flex-shrink-0 w-16 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-md flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{suggestion.symbol}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-foreground truncate">{suggestion.symbol}</div>
                                  <div className="text-xs text-muted-foreground truncate">{suggestion.name}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* 即時價格顯示 */}
                      {isLoadingPrice && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                          <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            正在獲取即時價格...
                          </span>
                        </div>
                      )}
                      {!isLoadingPrice && currentPrice !== null && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            當前市價: {formData.market === "TW" ? "NT$" : "$"}{currentPrice.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, purchasePrice: currentPrice.toString() })}
                            className="ml-auto text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                          >
                            使用此價格
                          </button>
                        </div>
                      )}
                    </div>
                    {/* 持股數量 */}
                    <div className="space-y-3">
                      <Label htmlFor="shares" className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Hash className="h-4 w-4 text-purple-500" />
                        持股數量 *
                      </Label>
                      <div className="relative">
                        <Input
                          id="shares"
                          type="number"
                          min="1"
                          placeholder="例如: 100"
                          value={formData.shares}
                          onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                          required
                          className="h-12 pl-4 pr-4 text-base border-2 focus:border-purple-400 transition-colors"
                        />
                      </div>
                    </div>
                    {/* 購買價格 */}
                    <div className="space-y-3">
                      <Label htmlFor="purchasePrice" className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <DollarSignIcon className="h-4 w-4 text-green-500" />
                        購買價格 ({formData.market === "TW" ? "TWD" : "USD"}) *
                      </Label>
                      <div className="relative">
                        <Input
                          id="purchasePrice"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder={formData.market === "TW" ? "例如: 500" : "例如: 150.50"}
                          value={formData.purchasePrice}
                          onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                          required
                          className="h-12 pl-10 pr-4 text-base border-2 focus:border-green-400 transition-colors"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                          {formData.market === "TW" ? "NT$" : "$"}
                        </span>
                      </div>
                      {formData.shares && formData.purchasePrice && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <DollarSignIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            總成本: {formData.market === "TW" ? "NT$" : "$"}{(parseFloat(formData.shares) * parseFloat(formData.purchasePrice)).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* 購買日期 */}
                    <div className="space-y-3">
                      <Label htmlFor="purchaseDate" className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        購買日期 *
                      </Label>
                      <div className="relative">
                        <Input
                          id="purchaseDate"
                          type="date"
                          value={formData.purchaseDate}
                          onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                          required
                          className="h-12 pl-10 pr-4 text-base border-2 focus:border-orange-400 transition-colors"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    {/* 備註 */}
                    <div className="space-y-3">
                      <Label htmlFor="notes" className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        備註
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="選填：記錄購買原因或其他資訊"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="min-h-[100px] text-base border-2 focus:border-gray-400 transition-colors resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-3 sm:gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                      className="h-12 px-6 font-semibold border-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      取消
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addMutation.isPending}
                      className="h-12 px-8 font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      {addMutation.isPending && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                      {addMutation.isPending ? "添加中..." : "添加持倉"}
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

        {/* 投資組合績效圖表 */}
        {historyData.length > 0 && (
          <div className="mb-6">
            <PortfolioPerformanceChart
              data={historyData}
              currentValue={stats.totalCurrentValue}
              currentCost={stats.totalInvestment}
              periodGainLoss={stats.totalGainLoss}
              periodGainLossPercent={stats.totalGainLossPercent}
            />
          </div>
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

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Star, StarOff, TrendingUp, TrendingDown, Loader2, History, Share2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TradingViewChart from "@/components/TradingViewChart";
import { getMarketFromSymbol, cleanTWSymbol, getTWStockName, HOT_STOCKS, MARKETS } from "@shared/markets";
import { isMarketOpen } from "@shared/tradingHours";
import StockDetailSkeleton from "@/components/StockDetailSkeleton";
import ShareButton from "@/components/ShareButton";
import { ChevronDown, ChevronUp, Clock, Filter, SortAsc, GitCompare, BarChart3 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import CompareAnalysisDialog from "@/components/CompareAnalysisDialog";
import AnalysisContentAccordion from "@/components/AnalysisContentAccordion";
import PredictionContentAccordion from "@/components/PredictionContentAccordion";
import AILoadingAnimation from "@/components/AILoadingAnimation";

// AI 分析歷史記錄卡片組件
interface AnalysisHistoryCardProps {
  record: {
    id: number;
    createdAt: Date;
    recommendation: string | null;
    priceAtAnalysis: number | null;
    content: string;
  };
  index: number;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
}

function AnalysisHistoryCard({ record, index, isSelected = false, onToggleSelect }: AnalysisHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = record.content.substring(0, 80);
  const hasMore = record.content.length > 80;

  // 根據建議類型返回不同的樣式
  const getRecommendationStyle = (recommendation: string | null) => {
    if (!recommendation) return { bg: 'bg-gray-100', text: 'text-gray-600', gradient: 'from-gray-400 to-gray-500' };
    if (recommendation === '買入') return { bg: 'bg-gradient-to-r from-green-50 to-emerald-50', text: 'text-green-700', gradient: 'from-green-500 to-emerald-500' };
    if (recommendation === '賣出') return { bg: 'bg-gradient-to-r from-red-50 to-rose-50', text: 'text-red-700', gradient: 'from-red-500 to-rose-500' };
    return { bg: 'bg-gradient-to-r from-yellow-50 to-amber-50', text: 'text-yellow-700', gradient: 'from-yellow-500 to-amber-500' };
  };

  const style = getRecommendationStyle(record.recommendation);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`rounded-xl border-2 overflow-hidden transition-all duration-300 hover:border-purple-300 hover:shadow-lg ${style.bg}`}
    >
      <div className="p-5">
        {/* 標頭區域 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {/* 選擇框 */}
            {onToggleSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(record.id)}
                className="h-5 w-5 flex-shrink-0"
              />
            )}
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center flex-shrink-0`}>
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-muted-foreground">
                {new Date(record.createdAt).toLocaleString('zh-TW', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {record.priceAtAnalysis && (
                 <div className="text-xs text-muted-foreground mt-1">
                  當時股價: <span className="number-display font-semibold">${(record.priceAtAnalysis / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 投資建議標籤 */}
          {record.recommendation && (
            <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${style.gradient} shadow-md`}>
              <span className="text-white font-bold text-base">
                {record.recommendation}
              </span>
            </div>
          )}
        </div>

        {/* 分析摘要 */}
        <div className="space-y-3">
          <div className="text-sm text-foreground/80 leading-relaxed">
            {isExpanded ? record.content : summary}
            {!isExpanded && hasMore && '...'}
          </div>
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-accent hover:text-accent/80 hover:bg-accent/10 -ml-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  收合
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  展開完整分析
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function StockDetail() {
  const [, params] = useRoute("/stock/:symbol");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const symbol = params?.symbol?.toUpperCase() || "";

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [chartRange, setChartRange] = useState("1mo");
  const [chartInterval, setChartInterval] = useState("1d");
  
  // 歷史記錄篩選和排序狀態
  const [filterRecommendation, setFilterRecommendation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("time-desc");
  
  // 分析對比功能狀態
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  const { data: stockData, isLoading: loadingStock, error: stockError, refetch: refetchStockData } = (trpc as any).stock.getStockData.useQuery(
    { symbol, range: chartRange, interval: chartInterval },
    { 
      enabled: !!symbol,
      retry: 1, // 只重試一次
    }
  );

  // 處理 API 錯誤
  useEffect(() => {
    if (stockError) {
      if (stockError.message?.includes('資料服務暫時繁忙')) {
        toast.error('資料服務暫時繁忙，請稍後再試。第二次請求會使用緩存數據。', {
          duration: 5000,
        });
      } else {
        toast.error(`無法載入股票數據：${stockError.message}`);
      }
    }
  }, [stockError]);

  // 判斷是否在交易時間內
  const market = getMarketFromSymbol(symbol);
  const marketOpen = isMarketOpen(market);

  const { data: watchlistCheck, refetch: refetchWatchlistCheck } = (trpc as any).watchlist.check.useQuery(
    { symbol },
    { 
      enabled: !!user && !!symbol,
      refetchOnMount: 'always', // 每次進入詳情頁時強制重新查詢
      refetchOnWindowFocus: false, // 禁用窗口聚焦時重新查詢
      staleTime: 0, // 立即過期
    }
  );

  // 當 symbol 改變時，強制重新查詢收藏狀態
  useEffect(() => {
    if (user && symbol && refetchWatchlistCheck) {
      refetchWatchlistCheck();
    }
  }, [symbol, user, refetchWatchlistCheck]);

  const utils = trpc.useUtils();
  const addToWatchlist = (trpc as any).watchlist.add.useMutation({
    onMutate: async () => {
      // 樂觀更新：立即更新 UI
      await (utils as any).watchlist.check.cancel({ symbol });
      const previousData = (utils as any).watchlist.check.getData({ symbol });
      (utils as any).watchlist.check.setData({ symbol }, { isInWatchlist: true });
      return { previousData };
    },
    onError: (error: any, variables: any, context: any) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        (utils as any).watchlist.check.setData({ symbol }, context.previousData);
      }
      toast.error("添加到收藏失敗，請稍後再試");
    },
    onSuccess: () => {
      toast.success("已添加到收藏");
    },
    onSettled: () => {
      // 確保數據同步
      (utils as any).watchlist.check.invalidate({ symbol });
      (utils as any).watchlist.list.invalidate();
    },
  });

  const removeFromWatchlist = (trpc as any).watchlist.remove.useMutation({
    onMutate: async () => {
      // 樂觀更新：立即更新 UI
      await (utils as any).watchlist.check.cancel({ symbol });
      const previousData = (utils as any).watchlist.check.getData({ symbol });
      (utils as any).watchlist.check.setData({ symbol }, { isInWatchlist: false });
      return { previousData };
    },
    onError: (error: any, variables: any, context: any) => {
      // 回滾樂觀更新
      if (context?.previousData) {
        (utils as any).watchlist.check.setData({ symbol }, context.previousData);
      }
      toast.error("移除收藏失敗，請稍後再試");
    },
    onSuccess: () => {
      toast.success("已從收藏中移除");
    },
    onSettled: () => {
      // 確保數據同步
      (utils as any).watchlist.check.invalidate({ symbol });
      (utils as any).watchlist.list.invalidate();
    },
  });

  const getAIAnalysis = (trpc as any).stock.getAIAnalysis.useMutation();
  const getTrendPrediction = (trpc as any).stock.getTrendPrediction.useMutation();

  const [analysis, setAnalysis] = useState<string>("");
  const [analysisCachedAt, setAnalysisCachedAt] = useState<Date | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string>("");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  
  // 獲取歷史分析記錄
  const { data: analysisHistory } = (trpc as any).stock.getAnalysisHistory.useQuery(
    { symbol, analysisType: 'investment_analysis', limit: 10 },
    { enabled: showHistoryDialog }
  );

  // 格式化圖表數據
  const formatChartData = (data: any) => {
    if (!data?.chart?.result?.[0]) return [];
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];
    
    return timestamps.map((timestamp: number, index: number) => {
      const date = new Date(timestamp * 1000);
      const open = opens[index];
      const high = highs[index];
      const low = lows[index];
      const close = closes[index];
      
      // 根據時間範圍決定日期格式
      let dateStr = "";
      if (chartRange === "1d") {
        dateStr = date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
      } else if (chartRange === "5d") {
        dateStr = date.toLocaleDateString("zh-TW", { month: "short", day: "numeric", hour: "2-digit" });
      } else {
        dateStr = date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
      }
      
      return {
        timestamp,
        date: dateStr,
        open: open ? parseFloat(open.toFixed(2)) : null,
        high: high ? parseFloat(high.toFixed(2)) : null,
        low: low ? parseFloat(low.toFixed(2)) : null,
        close: close ? parseFloat(close.toFixed(2)) : null,
        volume: volumes[index] || 0,
      };
    }).filter((item: any) => item.close !== null && item.open !== null && item.high !== null && item.low !== null);
  };

  const meta = (stockData as any)?.chart?.result?.[0]?.meta;
  const stockMarket = getMarketFromSymbol(symbol);
  const displaySymbol = stockMarket === 'TW' ? cleanTWSymbol(symbol) : symbol;
  
  // 獲取中文名稱（台股）
  let companyName = meta?.longName || symbol;
  if (stockMarket === 'TW') {
    // 先嘗試從 TW_STOCK_NAMES 映射表獲取中文名稱
    const twName = getTWStockName(symbol);
    if (twName) {
      companyName = twName;
    } else {
      // 如果映射表中沒有，再從 HOT_STOCKS 查找
      const twStock = HOT_STOCKS.TW.find(s => s.symbol === displaySymbol);
      if (twStock) {
        companyName = twStock.name;
      }
    }
  }
  const currentPrice = meta?.regularMarketPrice;
  const previousClose = meta?.chartPreviousClose;
  const priceChange = currentPrice && previousClose ? currentPrice - previousClose : 0;
  const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0;
  
  // 獲取貨幣符號
  const currencySymbol = MARKETS[market].currencySymbol;

  const handleWatchlistToggle = () => {
    if (!user) {
      toast.error("請先登入");
      return;
    }

    if (watchlistCheck?.isInWatchlist) {
      removeFromWatchlist.mutate({ symbol });
    } else {
      addToWatchlist.mutate({ symbol, companyName });
    }
  };

  const handleGetAnalysis = async (forceRefresh: boolean = false) => {
    setIsAnalyzing(true);
    try {
      const result = await getAIAnalysis.mutateAsync({
        symbol,
        companyName,
        forceRefresh,
      });
      setAnalysis(result.analysis);
      setAnalysisCachedAt(result.cachedAt ? new Date(result.cachedAt) : null);
      
      // 提取建議（買入/持有/賣出）
      let rec = null;
      if (result.analysis.includes('買入') || result.analysis.includes('买入')) {
        rec = '買入';
      } else if (result.analysis.includes('賣出') || result.analysis.includes('卖出')) {
        rec = '賣出';
      } else if (result.analysis.includes('持有')) {
        rec = '持有';
      }
      setRecommendation(rec);
      if (result.fromCache) {
        toast.info("顯示緩存的分析結果");
      } else if (forceRefresh) {
        toast.success("已重新生成分析結果");
      }
    } catch (error: any) {
      console.error('AI 分析錯誤:', error);
      toast.error(error.message || '獲取 AI 分析失敗，請稍後再試', {
        duration: 5000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetPrediction = async () => {
    setIsPredicting(true);
    try {
      // 準備原始數據格式（包含 close, high, low, volume）
      const result = (stockData as any)?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const quotes = result?.indicators?.quote?.[0] || {};
      const rawHistoricalData = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString(),
        close: quotes.close?.[index] || 0,
        high: quotes.high?.[index] || 0,
        low: quotes.low?.[index] || 0,
        volume: quotes.volume?.[index] || 0,
      })).filter((item: any) => item.close > 0);

      const predictionResult = await getTrendPrediction.mutateAsync({
        symbol,
        companyName,
        historicalData: rawHistoricalData, // 傳遞完整的歷史數據
      });
      setPrediction(predictionResult.prediction);
      if (predictionResult.fromCache) {
        toast.info("顯示緩存的預測結果");
      }
    } catch (error: any) {
      console.error('趨勢預測錯誤:', error);
      toast.error(error.message || '獲取趨勢預測失敗，請稍後再試', {
        duration: 5000,
      });
    } finally {
      setIsPredicting(false);
    }
  };

  if (loadingStock) {
    return <StockDetailSkeleton />;
  }

  if (!(stockData as any)?.chart?.result?.[0]) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
          <Card className="mt-8">
            <CardContent className="text-center py-12">
              <p className="text-lg text-muted-foreground">找不到股票代碼 {symbol} 的資料</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const chartData = formatChartData(stockData);

  // 動畫配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.div 
        className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* 返回按鈕 - 優化設計 */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-primary flex-shrink-0">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")} className="hover:bg-primary/10 font-semibold text-sm sm:text-base min-h-[44px]">
            返回首頁
          </Button>
        </div>

        {/* 股票標題和收藏按鈕 - 優化設計 */}
        <motion.div variants={itemVariants}>
        <Card className="mb-4 sm:mb-6 border-2 shadow-lg">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                  <h1 className="text-heading-2 md:text-heading-1 font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent break-words">{displaySymbol}</h1>
                  {market === 'TW' && (
                    <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 flex-shrink-0">台股</Badge>
                  )}
                  {market === 'US' && (
                    <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 flex-shrink-0">美股</Badge>
                  )}
                </div>
                <p className="text-body-large text-muted-foreground font-medium break-words">
                  {companyName}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <ShareButton
                  symbol={displaySymbol}
                  companyName={companyName}
                  currentPrice={currentPrice}
                  priceChange={priceChangePercent}
                />
                <Button
                  variant={watchlistCheck?.isInWatchlist ? "default" : "outline"}
                  size="lg"
                  onClick={handleWatchlistToggle}
                  disabled={!user}
                  className={`min-h-[44px] w-full sm:w-auto font-semibold ${watchlistCheck?.isInWatchlist 
                    ? "bg-gradient-gold text-white border-0 shadow-gold-lg hover:shadow-gold hover:-translate-y-0.5 transition-all duration-300" 
                    : "border-2 border-gold hover:bg-gradient-gold-subtle transition-all duration-300"}`}
                >
                  {watchlistCheck?.isInWatchlist ? (
                    <>
                      <Star className="h-5 w-5 mr-2 fill-white" />
                      <span className="text-sm sm:text-base">已收藏</span>
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5 mr-2 text-gold" />
                      <span className="text-sm sm:text-base">加入收藏</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* 價格資訊卡片 - 優化設計 */}
        <motion.div variants={itemVariants}>
        <Card className="mb-4 sm:mb-6 border-2 shadow-lg gradient-border">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            {/* 主要價格資訊 - 突出顯示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border">
              <div className="text-center md:text-left">
                <p className="text-caption sm:text-body-small font-semibold text-muted-foreground mb-2 sm:mb-3">當前價格</p>
                <p className="number-display-xl md:text-display-2 font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent break-words">{currencySymbol}{currentPrice?.toFixed(2)}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-caption sm:text-body-small font-semibold text-muted-foreground mb-2 sm:mb-3">漲跌幅</p>
                <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3">
                  {priceChange >= 0 ? (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-green-500/10 flex-shrink-0">
                      <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 flex-shrink-0">
                      <TrendingDown className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`number-display-lg md:number-display-xl font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'} break-words`}>
                      {priceChange >= 0 ? '+' : ''}{currencySymbol}{priceChange.toFixed(2)}
                    </p>
                    <p className={`number-display md:number-display-lg font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({priceChangePercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 其他價格資訊 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              <div className="gradient-blue-subtle rounded-lg p-3 sm:p-4">
                <p className="text-caption sm:text-body-small font-medium text-muted-foreground mb-2">開盤價</p>
                <p className="number-display-lg font-semibold text-foreground break-words">{currencySymbol}{meta?.regularMarketOpen?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="gradient-blue-subtle rounded-lg p-3 sm:p-4">
                <p className="text-caption sm:text-body-small font-medium text-muted-foreground mb-2">昨收價</p>
                <p className="number-display-lg font-semibold text-foreground break-words">{currencySymbol}{previousClose?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="gradient-blue-subtle rounded-lg p-3 sm:p-4">
                <p className="text-caption sm:text-body-small font-medium text-muted-foreground mb-2">最高價</p>
                <p className="number-display-lg font-semibold text-foreground break-words">{currencySymbol}{meta?.regularMarketDayHigh?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="gradient-blue-subtle rounded-lg p-3 sm:p-4">
                <p className="text-caption sm:text-body-small font-medium text-muted-foreground mb-2">最低價</p>
                <p className="number-display-lg font-semibold text-foreground break-words">{currencySymbol}{meta?.regularMarketDayLow?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="gradient-blue-subtle rounded-lg p-3 sm:p-4">
                <p className="text-caption sm:text-body-small font-medium text-muted-foreground mb-2">成交量</p>
                <p className="number-display-lg font-semibold text-foreground break-words">{meta?.regularMarketVolume?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="gradient-blue-subtle rounded-lg p-3 sm:p-4">
                <p className="text-caption sm:text-body-small font-medium text-muted-foreground mb-2">市值</p>
                <p className="number-display-lg font-semibold text-foreground break-words">
                  {meta?.marketCap ? `$${(meta.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* 數據更新時間戳 - 優化設計 */}
            {(stockData as any)?._metadata && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">數據更新時間:</span>
                    <span className="text-muted-foreground">
                      {new Date((stockData as any)._metadata.lastUpdated).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  {(stockData as any)._metadata.isFromCache && (
                    <Badge variant="secondary" className="gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                      使用緩存數據
                    </Badge>
                  )}
                  {!(stockData as any)._metadata.isFromCache && (
                    <Badge variant="secondary" className="gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      即時數據
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">緩存過期時間:</span>
                    <span className="text-muted-foreground">
                      {new Date((stockData as any)._metadata.expiresAt).toLocaleString('zh-TW', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* 股價走勢圖 */}
        <motion.div variants={itemVariants}>
        <TradingViewChart
          symbol={symbol}
          data={chartData}
          isLoading={loadingStock}
          currentRange={chartRange}
          onRangeChange={(range, interval) => {
            setChartRange(range);
            setChartInterval(interval);
          }}
        />
        </motion.div>

        {/* 分析和預測標籤頁 - 優化設計 */}
        <motion.div variants={itemVariants}>
        <Tabs defaultValue="analysis" className="mt-4 sm:mt-6 lg:mt-8">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 sm:p-1.5 lg:p-2 bg-muted/30 rounded-xl gap-1 sm:gap-1.5 lg:gap-2">
            <TabsTrigger 
              value="analysis" 
              className="text-xs sm:text-sm lg:text-base font-semibold py-2 sm:py-2.5 lg:py-3 px-1.5 sm:px-2 lg:px-4 rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-primary data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:hover:bg-muted/50 min-h-[44px] sm:min-h-[48px]"
            >
              <span className="block sm:inline">AI 投資分析</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prediction" 
              className="text-xs sm:text-sm lg:text-base font-semibold py-2 sm:py-2.5 lg:py-3 px-1.5 sm:px-2 lg:px-4 rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-primary data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] data-[state=inactive]:hover:bg-muted/50 min-h-[44px] sm:min-h-[48px]"
            >
              <span className="block sm:inline">未來趨勢預測</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            <Card className="border-2 shadow-lg">
              <CardHeader className="px-3 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-heading-4 sm:text-heading-3">AI 投資分析</CardTitle>
                <CardDescription className="text-body-small sm:text-body">
                  基於公司基本面、技術面和市場情緒的綜合分析
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
                {!analysis ? (
                  <div className="text-center py-8 sm:py-12 lg:py-16">
                    {isAnalyzing ? (
                      <AILoadingAnimation type="analysis" />
                    ) : (
                      <Button onClick={() => handleGetAnalysis(false)} disabled={isAnalyzing} size="lg" className="h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-base font-semibold bg-gradient-gold text-white border-0 shadow-gold-lg hover:shadow-gold hover:-translate-y-0.5 transition-all duration-300 min-h-[44px]">
                        開始分析
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        分析時間：{analysisCachedAt ? new Date(analysisCachedAt).toLocaleString('zh-TW') : '剛剛'}
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="button-hover font-semibold text-xs sm:text-sm min-h-[44px] flex-1 sm:flex-initial">
                              <History className="h-4 w-4 mr-2" />
                              歷史記錄
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
                            <DialogHeader className="border-b pb-3 sm:pb-4">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                                  <History className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <DialogTitle className="text-lg sm:text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                    AI 分析歷史記錄
                                  </DialogTitle>
                                  <DialogDescription className="text-xs sm:text-base mt-1">
                                    {symbol} 的歷史 AI 分析記錄 · 共 {analysisHistory?.length || 0} 筆
                                  </DialogDescription>
                                </div>
                              </div>
                            </DialogHeader>
                            
                            {/* 篩選和排序控制區 */}
                            <div className="border-b pb-4 space-y-3">
                              <div className="flex flex-col sm:flex-row gap-3">
                                {/* 篩選器 */}
                                <div className="flex-1">
                                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    投資建議篩選
                                  </label>
                                  <Select value={filterRecommendation} onValueChange={setFilterRecommendation}>
                                    <SelectTrigger className="w-full bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">全部</SelectItem>
                                      <SelectItem value="買入">買入</SelectItem>
                                      <SelectItem value="持有">持有</SelectItem>
                                      <SelectItem value="賣出">賣出</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* 排序器 */}
                                <div className="flex-1">
                                  <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <SortAsc className="h-4 w-4" />
                                    排序方式
                                  </label>
                                  <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-full bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="time-desc">時間（新到舊）</SelectItem>
                                      <SelectItem value="time-asc">時間（舊到新）</SelectItem>
                                      <SelectItem value="price-desc">股價（高到低）</SelectItem>
                                      <SelectItem value="price-asc">股價（低到高）</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              {/* 重置按鈕 */}
                              {(filterRecommendation !== "all" || sortBy !== "time-desc") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setFilterRecommendation("all");
                                    setSortBy("time-desc");
                                  }}
                                  className="w-full sm:w-auto"
                                >
                                  重置篩選
                                </Button>
                              )}
                            </div>
                            
                            <div className="flex-1 overflow-y-auto py-4 px-1">
                              {!analysisHistory || analysisHistory.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground">
                                  <History className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                  <p className="text-lg">尚無歷史分析記錄</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {(() => {
                                    // 篩選邏輯
                                    let filtered = analysisHistory;
                                    if (filterRecommendation !== "all") {
                                      filtered = filtered.filter((record: any) => record.recommendation === filterRecommendation);
                                    }
                                    
                                    // 排序邏輯
                                    const sorted = [...filtered].sort((a, b) => {
                                      switch (sortBy) {
                                        case "time-asc":
                                          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                                        case "time-desc":
                                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                        case "price-asc":
                                          return (a.priceAtAnalysis || 0) - (b.priceAtAnalysis || 0);
                                        case "price-desc":
                                          return (b.priceAtAnalysis || 0) - (a.priceAtAnalysis || 0);
                                        default:
                                          return 0;
                                      }
                                    });
                                    
                                    if (sorted.length === 0) {
                                      return (
                                        <div className="text-center py-16 text-muted-foreground">
                                          <Filter className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                          <p className="text-lg">沒有符合條件的記錄</p>
                                        </div>
                                      );
                                    }
                                    
                                    return sorted.map((record, index) => (
                                      <AnalysisHistoryCard 
                                        key={record.id} 
                                        record={record} 
                                        index={index}
                                        isSelected={selectedRecords.includes(record.id)}
                                        onToggleSelect={(id) => {
                                          if (selectedRecords.includes(id)) {
                                            setSelectedRecords(selectedRecords.filter(rid => rid !== id));
                                          } else if (selectedRecords.length < 2) {
                                            setSelectedRecords([...selectedRecords, id]);
                                          } else {
                                            toast.error("最多只能選擇 2 筆記錄進行對比");
                                          }
                                        }}
                                      />
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                            
                            <div className="border-t pt-3 sm:pt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                              <Button
                                onClick={() => setShowCompareDialog(true)}
                                disabled={selectedRecords.length !== 2}
                                className="button-hover bg-gradient-primary text-white min-h-[44px] text-sm sm:text-base"
                              >
                                <GitCompare className="h-4 w-4 mr-2" />
                                對比分析 ({selectedRecords.length}/2)
                              </Button>
                              <Button 
                                onClick={() => {
                                  setShowHistoryDialog(false);
                                  setSelectedRecords([]);
                                }}
                                variant="outline"
                                className="button-hover min-h-[44px] text-sm sm:text-base"
                              >
                                關閉
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {/* 分析對比對話框 */}
                        <CompareAnalysisDialog
                          open={showCompareDialog}
                          onOpenChange={setShowCompareDialog}
                          records={analysisHistory?.filter((r: any) => selectedRecords.includes(r.id)) || []}
                          symbol={symbol}
                        />
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleGetAnalysis(true)} 
                          disabled={isAnalyzing}
                          className="button-hover font-semibold text-xs sm:text-sm min-h-[44px] flex-1 sm:flex-initial"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 loading-spin text-primary" />
                              <span className="hidden sm:inline">重新分析中...</span>
                              <span className="sm:hidden">分析中...</span>
                            </>
                          ) : (
                            '重新分析'
                          )}
                        </Button>
                      </div>
                    </div>
                    {/* 使用可折疊的分段結構（手機版友善） */}
                    <div className="block sm:hidden">
                      <AnalysisContentAccordion analysis={analysis} />
                    </div>
                    
                    {/* 桌面版和平板版優化長文本閱讀體驗 */}
                    <div className="hidden sm:block">
                      <div className="mx-auto">
                        <div className="prose prose-sm sm:prose lg:prose-lg prose-slate reading-optimized">
                          <Streamdown>{analysis}</Streamdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prediction">
            <Card className="border-2 shadow-lg">
              <CardHeader className="px-3 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-heading-4 sm:text-heading-3">未來趋勢預測</CardTitle>
                <CardDescription className="text-body-small sm:text-body">
                  基於歷史數據和市場趋勢的未來走勢預測
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
                {!prediction ? (
                  <div className="text-center py-8 sm:py-12 lg:py-16">
                    {isPredicting ? (
                      <AILoadingAnimation type="prediction" />
                    ) : (
                      <Button onClick={handleGetPrediction} disabled={isPredicting} size="lg" className="h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-base font-semibold bg-gradient-gold text-white border-0 shadow-gold-lg hover:shadow-gold hover:-translate-y-0.5 transition-all duration-300 min-h-[44px]">
                        開始預測
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {/* 使用可折疊的分段結構（手機版友善） */}
                    <div className="block sm:hidden">
                      <PredictionContentAccordion prediction={prediction} />
                    </div>
                    
                    {/* 桌面版和平板版優化長文本閱讀體驗 */}
                    <div className="hidden sm:block">
                      <div className="mx-auto">
                        <div className="prose prose-sm sm:prose lg:prose-lg prose-slate reading-optimized">
                          <Streamdown>{prediction}</Streamdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}

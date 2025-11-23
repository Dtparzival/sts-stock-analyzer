import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, TrendingUp, ChevronDown, ChevronUp, ExternalLink, Globe, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMarketFromSymbol, cleanTWSymbol } from "@shared/markets";

interface AnalysisResult {
  symbol: string;
  companyName: string | null;
  recommendation: string | null;
  summary: string;
  error: string | null;
}

const STORAGE_KEY = 'batch_analysis_results';

export default function BatchAnalysisResults() {
  const [, setLocation] = useLocation();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  // 從 sessionStorage 讀取批量分析結果
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setResults(parsed);
      }
    } catch (error) {
      console.error('Failed to load batch analysis results:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <Card className="border-2 shadow-lg">
            <CardContent className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Sparkles className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">沒有批量分析結果</p>
                  <p className="text-muted-foreground">請先在收藏列表中執行批量分析</p>
                </div>
                <Button onClick={() => setLocation("/watchlist")} className="mt-4 bg-gradient-primary text-white border-0 shadow-md button-hover">
                  前往收藏列表
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const toggleExpand = (symbol: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  // 投資建議樣式
  const getRecommendationStyle = (rec: string | null) => {
    if (!rec) return { bg: 'bg-muted', text: 'text-muted-foreground', gradient: 'from-gray-400 to-gray-500' };
    if (rec === '買入') return { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', gradient: 'from-green-400 to-emerald-500' };
    if (rec === '賣出') return { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', gradient: 'from-red-400 to-rose-500' };
    return { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-300', gradient: 'from-yellow-400 to-amber-500' };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按鈕 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <ArrowLeft className="h-5 w-5 text-white" />
          </div>
          <Button variant="ghost" onClick={() => setLocation("/watchlist")} className="hover:bg-primary/10 font-semibold">
            返回收藏列表
          </Button>
        </div>

        {/* 頁面標題 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-gradient-secondary">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              批量 AI 分析結果
            </h1>
            <p className="text-muted-foreground mt-1">已完成 {results.length} 支股票的 AI 投資分析</p>
          </div>
        </div>

        {/* 分析結果卡片列表 */}
        <div className="space-y-4 pb-8">
          <AnimatePresence>
            {results.map((result, index) => {
              const market = getMarketFromSymbol(result.symbol);
              const displaySymbol = market === 'TW' ? cleanTWSymbol(result.symbol) : result.symbol;
              const isExpanded = expandedCards.has(result.symbol);
              const summaryPreview = result.summary.length > 150 ? result.summary.slice(0, 150) + '...' : result.summary;
              const recStyle = getRecommendationStyle(result.recommendation);

              return (
                <motion.div
                  key={result.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Card className="border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        {/* 左側：股票資訊和投資建議 */}
                        <div className={`flex-shrink-0 p-6 lg:p-8 ${recStyle.bg} border-b lg:border-b-0 lg:border-r border-border`}>
                          <div className="flex flex-col items-center lg:items-start gap-4 lg:w-64">
                            {/* 股票圖標 */}
                            <div className={`p-4 rounded-xl bg-gradient-to-br ${recStyle.gradient} shadow-lg`}>
                              <TrendingUp className="h-10 w-10 text-white" />
                            </div>

                            {/* 市場標籤 */}
                            <div className="w-full">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                                market === 'US' 
                                  ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                                  : 'bg-green-500/20 text-green-700 dark:text-green-300'
                              }`}>
                                <Globe className="h-3 w-3" />
                                {market === 'US' ? '美股' : '台股'}
                              </span>
                            </div>

                            {/* 股票代號和名稱 */}
                            <div className="text-center lg:text-left w-full">
                              <div className="text-3xl font-bold text-foreground mb-2">
                                {displaySymbol}
                              </div>
                              <div className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {result.companyName || '-'}
                              </div>
                            </div>

                            {/* 投資建議標籤 */}
                            <div className="w-full">
                              {result.error ? (
                                <div className="px-5 py-3 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white text-center font-semibold shadow-lg">
                                  分析失敗
                                </div>
                              ) : result.recommendation ? (
                                <div className={`px-5 py-3 rounded-lg bg-gradient-to-r ${recStyle.gradient} text-white text-center text-xl font-bold shadow-lg`}>
                                  {result.recommendation}
                                </div>
                              ) : (
                                <div className="px-5 py-3 rounded-lg bg-muted text-muted-foreground text-center font-semibold">
                                  無建議
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 右側：分析摘要和操作按鈕 */}
                        <div className="flex-1 p-6 lg:p-8">
                          <div className="space-y-6">
                            {/* 分析摘要 */}
                            <div>
                              <h4 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary"></div>
                                分析摘要
                              </h4>
                              {result.error ? (
                                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                                  <p className="text-destructive text-sm">{result.error}</p>
                                </div>
                              ) : (
                                <div className="text-sm text-foreground leading-relaxed">
                                  <AnimatePresence mode="wait">
                                    {isExpanded ? (
                                      <motion.div
                                        key="expanded"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="whitespace-pre-wrap"
                                      >
                                        {result.summary}
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        key="collapsed"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        {summaryPreview}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>

                            {/* 操作按鈕 */}
                            <div className="flex flex-wrap gap-3 pt-2">
                              {!result.error && result.summary.length > 150 && (
                                <Button
                                  variant="outline"
                                  size="default"
                                  onClick={() => toggleExpand(result.symbol)}
                                  className="hover:bg-primary/5 hover:border-primary/50 button-hover"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-2" />
                                      收合
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                      展開詳情
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="default"
                                onClick={() => setLocation(`/stock/${result.symbol}`)}
                                className="bg-gradient-primary text-white border-0 shadow-md button-hover"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                查看詳情
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 底部操作按鈕 */}
        <div className="flex justify-center gap-4 pb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/watchlist")}
            className="hover:border-primary/50 hover:bg-primary/5 button-hover font-semibold"
          >
            返回收藏列表
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => setLocation("/")}
            className="bg-gradient-primary text-white border-0 shadow-md button-hover font-semibold"
          >
            返回首頁
          </Button>
        </div>
      </div>
    </div>
  );
}

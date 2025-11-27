import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMarketFromSymbol, cleanTWSymbol } from "@shared/markets";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type TimeRange = '7' | '30' | '90';

export default function AnalysisAccuracy() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>('30');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  // 從 URL 參數獲取股票代號
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const symbolParam = params.get('symbol');
    if (symbolParam) {
      setSelectedSymbol(symbolParam);
      setIsReportDialogOpen(true);
    }
  }, []);

  const { data: accuracyStats, isLoading, error } = (trpc as any).analysis.getAccuracyStats.useQuery();
  const { data: accuracyTrend, isLoading: isTrendLoading } = (trpc as any).analysis.getAccuracyTrend.useQuery({
    timeRange: parseInt(timeRange) as 7 | 30 | 90,
  });
  const { data: stockReport, isLoading: isReportLoading } = (trpc as any).analysis.getStockReport.useQuery(
    { symbol: selectedSymbol! },
    { enabled: !!selectedSymbol }
  );
  const { data: lowAccuracyWarnings } = (trpc as any).analysis.getLowAccuracyWarnings.useQuery({
    threshold: 0.5,
    timeRange: parseInt(timeRange) as 7 | 30 | 90,
  });

  const handleViewReport = (symbol: string) => {
    setSelectedSymbol(symbol);
    setIsReportDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 根據選擇的時間範圍獲取準確率
  const getAccuracyRate = (days: TimeRange) => {
    if (!accuracyStats) return 0;
    if (days === '7') return accuracyStats.overall.accuracyRate7Days;
    if (days === '30') return accuracyStats.overall.accuracyRate30Days;
    return accuracyStats.overall.accuracyRate90Days;
  };

  const getAccurateCount = (days: TimeRange) => {
    if (!accuracyStats) return 0;
    if (days === '7') return accuracyStats.overall.accurate7Days;
    if (days === '30') return accuracyStats.overall.accurate30Days;
    return accuracyStats.overall.accurate90Days;
  };

  // 準備圓餅圖數據
  const pieData = accuracyStats ? [
    { name: '準確', value: getAccurateCount(timeRange), color: '#22c55e' },
    { 
      name: '不準確', 
      value: accuracyStats.overall.total - getAccurateCount(timeRange), 
      color: '#ef4444' 
    },
  ] : [];

  // 準備按建議類型的柱狀圖數據
  const barData = accuracyStats ? [
    {
      name: '買入',
      準確率: timeRange === '7' 
        ? accuracyStats.byRecommendation['買入']?.accuracyRate7Days * 100 || 0
        : timeRange === '30'
        ? accuracyStats.byRecommendation['買入']?.accuracyRate30Days * 100 || 0
        : accuracyStats.byRecommendation['買入']?.accuracyRate90Days * 100 || 0,
    },
    {
      name: '持有',
      準確率: timeRange === '7' 
        ? accuracyStats.byRecommendation['持有']?.accuracyRate7Days * 100 || 0
        : timeRange === '30'
        ? accuracyStats.byRecommendation['持有']?.accuracyRate30Days * 100 || 0
        : accuracyStats.byRecommendation['持有']?.accuracyRate90Days * 100 || 0,
    },
    {
      name: '賣出',
      準確率: timeRange === '7' 
        ? accuracyStats.byRecommendation['賣出']?.accuracyRate7Days * 100 || 0
        : timeRange === '30'
        ? accuracyStats.byRecommendation['賣出']?.accuracyRate30Days * 100 || 0
        : accuracyStats.byRecommendation['賣出']?.accuracyRate90Days * 100 || 0,
    },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI 分析準確度追蹤</h1>
          </div>
          
          {/* 時間範圍選擇器 */}
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7')}
            >
              7 天
            </Button>
            <Button
              variant={timeRange === '30' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30')}
            >
              30 天
            </Button>
            <Button
              variant={timeRange === '90' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90')}
            >
              90 天
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-destructive">載入失敗：{error.message}</p>
            </CardContent>
          </Card>
        ) : !accuracyStats || accuracyStats.overall.total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">尚無足夠的歷史分析數據</p>
              <p className="text-sm text-muted-foreground mt-2">
                請先使用 AI 投資分析功能，系統會自動追蹤分析準確度
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 整體統計卡片 */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    總分析次數
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{accuracyStats.overall.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    整體準確率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {(getAccuracyRate(timeRange) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeRange} 天後驗證
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    準確次數
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {getAccurateCount(timeRange)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    不準確次數
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {accuracyStats.overall.total - getAccurateCount(timeRange)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 圖表區域 */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* 準確率圓餅圖 */}
              <Card>
                <CardHeader>
                  <CardTitle>整體準確率分布</CardTitle>
                  <CardDescription>
                    {timeRange} 天後驗證的準確率分布
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 按建議類型的準確率柱狀圖 */}
              <Card>
                <CardHeader>
                  <CardTitle>各類建議準確率</CardTitle>
                  <CardDescription>
                    買入/持有/賣出建議的準確率比較
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Bar dataKey="準確率" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* 低準確率股票警告 */}
            {lowAccuracyWarnings && lowAccuracyWarnings.length > 0 && (
              <Card className="mb-6 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-yellow-800">低準確率股票警告</CardTitle>
                  </div>
                  <CardDescription className="text-yellow-700">
                    以下股票的 AI 分析準確率低於 50%，建議謹慎參考 AI 建議
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {lowAccuracyWarnings.map((warning: any) => (
                      <Card key={warning.symbol} className="bg-white">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-lg">
                              {getMarketFromSymbol(warning.symbol) === 'TW' 
                                ? cleanTWSymbol(warning.symbol) 
                                : warning.symbol}
                            </span>
                            <Badge variant="destructive">
                              {(warning.accuracyRate * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            分析次數: {warning.totalAnalyses}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            最近建議: {warning.recommendation}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => handleViewReport(warning.symbol)}
                          >
                            查看詳細報告
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 準確度時間趋勢圖 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>準確度時間趋勢</CardTitle>
                <CardDescription>
                  AI 分析準確率隨時間的變化趋勢（按月份統計）
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isTrendLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !accuracyTrend || accuracyTrend.overall.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    尚無足夠的歷史數據以生成趋勢圖
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={accuracyTrend.overall.map((d: any) => ({
                      month: d.month,
                      準確率: d.accuracyRate * 100,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="準確率" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 按股票的準確度明細表格 */}
            <Card>
              <CardHeader>
                <CardTitle>各股票準確度明細</CardTitle>
                <CardDescription>
                  顯示每支股票的 AI 分析準確度統計
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>股票代號</TableHead>
                      <TableHead className="text-center">分析次數</TableHead>
                      <TableHead className="text-center">7 天準確率</TableHead>
                      <TableHead className="text-center">30 天準確率</TableHead>
                      <TableHead className="text-center">90 天準確率</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(accuracyStats.bySymbol).map(([symbol, stats]: [string, any]) => (
                      <TableRow key={symbol}>
                        <TableCell className="font-medium">
                          {getMarketFromSymbol(symbol) === 'TW' ? cleanTWSymbol(symbol) : symbol}
                        </TableCell>
                        <TableCell className="text-center">{stats.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={stats.accuracyRate7Days >= 0.6 ? 'default' : 'destructive'}>
                            {(stats.accuracyRate7Days * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={stats.accuracyRate30Days >= 0.6 ? 'default' : 'destructive'}>
                            {(stats.accuracyRate30Days * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={stats.accuracyRate90Days >= 0.6 ? 'default' : 'destructive'}>
                            {(stats.accuracyRate90Days * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReport(symbol)}
                          >
                            查看報告
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 說明卡片 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>準確度評估標準</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>買入建議</strong>：分析後 N 天股價上漲 ≥ 3% 視為準確</p>
                <p>• <strong>賣出建議</strong>：分析後 N 天股價下跌 ≥ 3% 視為準確</p>
                <p>• <strong>持有建議</strong>：分析後 N 天股價變化在 ±3% 範圍內視為準確</p>
                <p className="mt-4 text-xs">
                  * 準確度統計會自動比對歷史分析建議與實際股價走勢，幫助您評估 AI 分析的可靠性
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 個股深度分析報告對話框 */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSymbol && (getMarketFromSymbol(selectedSymbol) === 'TW' 
                ? cleanTWSymbol(selectedSymbol) 
                : selectedSymbol)} - AI 分析表現報告
            </DialogTitle>
            <DialogDescription>
              歷史分析建議回顧、準確率統計和案例分析
            </DialogDescription>
          </DialogHeader>

          {isReportLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !stockReport ? (
            <p className="text-center text-muted-foreground py-12">
              無法載入報告
            </p>
          ) : stockReport.totalAnalyses === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              該股票尚無 AI 分析歷史記錄
            </p>
          ) : (
            <div className="space-y-6">
              {/* 概覽統計 */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      總分析次數
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stockReport.totalAnalyses}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      整體準確率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {(stockReport.accuracyRates.overall * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      最佳預測獲利
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stockReport.bestCase 
                        ? `$${stockReport.bestCase.profit!.toFixed(0)}` 
                        : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      最差預測損失
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {stockReport.worstCase 
                        ? `$${stockReport.worstCase.profit!.toFixed(0)}` 
                        : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 建議類型統計 */}
              <Card>
                <CardHeader>
                  <CardTitle>歷史建議統計</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">買入建議</p>
                      <p className="text-2xl font-bold">{stockReport.recommendationCounts.買入}</p>
                      <p className="text-sm text-muted-foreground">
                        準確率: {(stockReport.accuracyRates.買入 * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">持有建議</p>
                      <p className="text-2xl font-bold">{stockReport.recommendationCounts.持有}</p>
                      <p className="text-sm text-muted-foreground">
                        準確率: {(stockReport.accuracyRates.持有 * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">賣出建議</p>
                      <p className="text-2xl font-bold">{stockReport.recommendationCounts.賣出}</p>
                      <p className="text-sm text-muted-foreground">
                        準確率: {(stockReport.accuracyRates.賣出 * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 最佳/最差案例 */}
              {(stockReport.bestCase || stockReport.worstCase) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {stockReport.bestCase && (
                    <Card className="border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-600">最佳預測案例</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><strong>日期:</strong> {new Date(stockReport.bestCase.date).toLocaleDateString()}</p>
                        <p><strong>建議:</strong> {stockReport.bestCase.recommendation}</p>
                        <p><strong>分析時價格:</strong> ${stockReport.bestCase.priceAtAnalysis.toFixed(2)}</p>
                        <p><strong>30 天後價格:</strong> ${stockReport.bestCase.priceAfter30Days?.toFixed(2)}</p>
                        <p><strong>價格變化:</strong> 
                          <span className="text-green-600 font-semibold">
                            {stockReport.bestCase.priceChange ? `${(stockReport.bestCase.priceChange * 100).toFixed(2)}%` : 'N/A'}
                          </span>
                        </p>
                        <p><strong>假設獲利:</strong> 
                          <span className="text-green-600 font-semibold">
                            ${stockReport.bestCase.profit?.toFixed(0)}
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {stockReport.worstCase && (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-600">最差預測案例</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><strong>日期:</strong> {new Date(stockReport.worstCase.date).toLocaleDateString()}</p>
                        <p><strong>建議:</strong> {stockReport.worstCase.recommendation}</p>
                        <p><strong>分析時價格:</strong> ${stockReport.worstCase.priceAtAnalysis.toFixed(2)}</p>
                        <p><strong>30 天後價格:</strong> ${stockReport.worstCase.priceAfter30Days?.toFixed(2)}</p>
                        <p><strong>價格變化:</strong> 
                          <span className="text-red-600 font-semibold">
                            {stockReport.worstCase.priceChange ? `${(stockReport.worstCase.priceChange * 100).toFixed(2)}%` : 'N/A'}
                          </span>
                        </p>
                        <p><strong>假設損失:</strong> 
                          <span className="text-red-600 font-semibold">
                            ${stockReport.worstCase.profit?.toFixed(0)}
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* 最近分析記錄 */}
              <Card>
                <CardHeader>
                  <CardTitle>最近 10 次分析記錄</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>建議</TableHead>
                        <TableHead className="text-right">分析時價格</TableHead>
                        <TableHead className="text-right">30 天後價格</TableHead>
                        <TableHead className="text-right">價格變化</TableHead>
                        <TableHead className="text-center">準確性</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockReport.recentCases.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>{new Date(c.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.recommendation}</Badge>
                          </TableCell>
                          <TableCell className="text-right">${c.priceAtAnalysis.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {c.priceAfter30Days ? `$${c.priceAfter30Days.toFixed(2)}` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {c.priceChange !== null ? (
                              <span className={c.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {(c.priceChange * 100).toFixed(2)}%
                              </span>
                            ) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            {c.isAccurate === null ? (
                              <Badge variant="outline">N/A</Badge>
                            ) : c.isAccurate ? (
                              <Badge variant="default">準確</Badge>
                            ) : (
                              <Badge variant="destructive">不準確</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

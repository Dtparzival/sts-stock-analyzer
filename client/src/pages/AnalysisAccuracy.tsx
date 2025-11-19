import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";

type TimeRange = '7' | '30' | '90';

export default function AnalysisAccuracy() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

  const { data: accuracyStats, isLoading, error } = trpc.analysis.getAccuracyStats.useQuery();

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(accuracyStats.bySymbol).map(([symbol, stats]) => (
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
    </div>
  );
}

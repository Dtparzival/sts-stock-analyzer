import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, TrendingUp, TrendingDown, Plus, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function CompareStocks() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedRange, setSelectedRange] = useState("1mo");

  // 獲取多股票數據
  const { data: stocksData, isLoading: isLoadingStocks, refetch: refetchStocks } = trpc.compare.getMultipleStocks.useQuery(
    { symbols, range: selectedRange },
    { enabled: symbols.length >= 2 }
  );

  // AI 對比分析
  const analyzeComparison = trpc.compare.analyzeComparison.useMutation({
    onError: (error) => {
      toast.error(`分析失敗: ${error.message}`);
    },
  });

  const handleAddSymbol = () => {
    const trimmed = inputValue.trim().toUpperCase();
    if (!trimmed) {
      toast.error("請輸入股票代碼");
      return;
    }
    if (symbols.includes(trimmed)) {
      toast.error("該股票已在列表中");
      return;
    }
    if (symbols.length >= 5) {
      toast.error("最多只能比較 5 支股票");
      return;
    }
    setSymbols([...symbols, trimmed]);
    setInputValue("");
  };

  const handleRemoveSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  const handleAnalyze = () => {
    if (symbols.length < 2) {
      toast.error("至少需要 2 支股票才能進行對比分析");
      return;
    }
    analyzeComparison.mutate({ symbols });
  };

  // 準備圖表數據
  const chartData = stocksData && stocksData.length > 0 ? (() => {
    const allTimestamps = new Set<number>();
    stocksData.forEach((stock: any) => {
      stock.chart.result[0].timestamp.forEach((ts: number) => allTimestamps.add(ts));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    return sortedTimestamps.map(timestamp => {
      const dataPoint: any = {
        timestamp,
        date: new Date(timestamp * 1000).toLocaleDateString(),
      };

      stocksData.forEach((stock: any) => {
        const result = stock.chart.result[0];
        const index = result.timestamp.indexOf(timestamp);
        if (index !== -1) {
          const close = result.indicators.quote[0].close[index];
          dataPoint[result.meta.symbol] = close;
        }
      });

      return dataPoint;
    });
  })() : [];

  // 顏色配置
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto py-8 px-4">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-blue-600" />
            多股票對比分析
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            同時比較多支股票的價格走勢和投資價值
          </p>
        </div>

        {/* 股票輸入區 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>選擇股票</CardTitle>
            <CardDescription>
              輸入股票代碼（例如：AAPL、TSLA、2330），最多可比較 5 支股票
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSymbol();
                  }
                }}
                placeholder="輸入股票代碼..."
                className="flex-1"
              />
              <Button onClick={handleAddSymbol} disabled={symbols.length >= 5}>
                <Plus className="h-4 w-4 mr-2" />
                添加
              </Button>
            </div>

            {/* 已選股票列表 */}
            {symbols.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {symbols.map((symbol, index) => (
                  <Badge
                    key={symbol}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm"
                    style={{ backgroundColor: `${colors[index]}20`, color: colors[index] }}
                  >
                    {symbol}
                    <button
                      onClick={() => handleRemoveSymbol(symbol)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 時間範圍選擇 */}
        {symbols.length >= 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>時間範圍</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['1d', '5d', '1mo', '3mo', '1y'].map((range) => (
                  <Button
                    key={range}
                    variant={selectedRange === range ? "default" : "outline"}
                    onClick={() => {
                      setSelectedRange(range);
                      if (symbols.length >= 2) {
                        refetchStocks();
                      }
                    }}
                  >
                    {range === '1d' && '1 天'}
                    {range === '5d' && '5 天'}
                    {range === '1mo' && '1 個月'}
                    {range === '3mo' && '3 個月'}
                    {range === '1y' && '1 年'}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 價格對比圖表 */}
        {symbols.length >= 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>價格走勢對比</CardTitle>
              <CardDescription>
                比較各股票的價格變化趨勢
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStocks ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : stocksData && stocksData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {stocksData.map((stock: any, index: number) => (
                      <Line
                        key={stock.chart.result[0].meta.symbol}
                        type="monotone"
                        dataKey={stock.chart.result[0].meta.symbol}
                        stroke={colors[index]}
                        strokeWidth={2}
                        dot={false}
                        name={`${stock.chart.result[0].meta.symbol} (${stock.chart.result[0].meta.currency})`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  請添加至少 2 支股票開始對比
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 股票資訊卡片 */}
        {stocksData && stocksData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stocksData.map((stock: any, index: number) => {
              const meta = stock.chart.result[0].meta;
              const change = meta.regularMarketPrice - meta.previousClose;
              const changePercent = (change / meta.previousClose) * 100;
              const isPositive = change >= 0;

              return (
                <Card key={meta.symbol}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{meta.symbol}</CardTitle>
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: `${colors[index]}20`, color: colors[index] }}
                      >
                        {meta.currency}
                      </Badge>
                    </div>
                    <CardDescription className="truncate">
                      {meta.longName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold">
                        {meta.currency} {meta.regularMarketPrice.toFixed(2)}
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* AI 對比分析 */}
        {symbols.length >= 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI 對比分析</CardTitle>
                  <CardDescription>
                    使用 AI 深入分析各股票的投資價值和風險
                  </CardDescription>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeComparison.isPending}
                >
                  {analyzeComparison.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    '開始分析'
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analyzeComparison.data ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Streamdown>{String(analyzeComparison.data.analysis)}</Streamdown>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  點擊「開始分析」按鈕，AI 將為您生成詳細的對比分析報告
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

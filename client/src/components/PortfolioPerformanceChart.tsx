import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceDot } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PerformanceData {
  recordDate: Date;
  totalValue: number;
  totalCost: number;
  gainLossPercent: number;
}

interface Transaction {
  id: number;
  symbol: string;
  companyName: string | null;
  transactionType: 'buy' | 'sell';
  shares: number;
  price: number;
  totalAmount: number;
  transactionDate: Date;
  notes: string | null;
}

interface PortfolioPerformanceChartProps {
  data: PerformanceData[];
  currentValue?: number;
  currentCost?: number;
  periodGainLoss?: number;
  periodGainLossPercent?: number;
}

type TimeRange = '7' | '30' | '90' | 'all';
type BenchmarkIndex = 'none' | 'SPX' | 'NASDAQ' | 'DOW';

export function PortfolioPerformanceChart({ 
  data, 
  currentValue = 0,
  currentCost = 0,
  periodGainLoss = 0,
  periodGainLossPercent = 0,
}: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30');
  const [benchmarkIndex, setBenchmarkIndex] = useState<BenchmarkIndex>('none');
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);

  // 獲取交易歷史
  const { data: transactions = [] } = trpc.portfolio.getTransactions.useQuery(
    { days: timeRange === 'all' ? undefined : parseInt(timeRange) },
    { enabled: data.length > 0 }
  );

  // 獲取基準指數數據
  const rangeMap: Record<TimeRange, string> = {
    '7': '5d',
    '30': '1mo',
    '90': '3mo',
    'all': '1y',
  };
  
  const { data: benchmarkData } = trpc.portfolio.getBenchmarkIndex.useQuery(
    {
      indexType: benchmarkIndex as 'SPX' | 'NASDAQ' | 'DOW',
      range: rangeMap[timeRange],
    },
    { enabled: benchmarkIndex !== 'none' && data.length > 0 }
  );

  // 根據時間範圍過濾數據
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    if (timeRange === 'all') return data;
    
    const days = parseInt(timeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // 過濾出指定天數內的數據
    const filtered = data.filter(item => {
      const itemDate = new Date(item.recordDate);
      return itemDate >= cutoffDate;
    });
    
    return filtered;
  };

  const filteredData = getFilteredData();

  // 計算 Brush 的初始索引範圍
  const calculateBrushIndices = () => {
    if (timeRange === 'all' || filteredData.length === 0) {
      return { start: 0, end: filteredData.length - 1 };
    }
    const days = parseInt(timeRange);
    const totalDays = filteredData.length;
    const startIndex = Math.max(0, totalDays - days);
    return { start: startIndex, end: totalDays - 1 };
  };

  // 當時間範圍改變時，更新 Brush 索引
  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    const indices = calculateBrushIndices();
    setBrushStartIndex(indices.start);
    setBrushEndIndex(indices.end);
  };

  // 處理 Brush 拖動事件
  const handleBrushChange = (range: { startIndex?: number; endIndex?: number }) => {
    if (range.startIndex !== undefined && range.endIndex !== undefined) {
      setBrushStartIndex(range.startIndex);
      setBrushEndIndex(range.endIndex);
      // 根據拖動範圍更新時間範圍選擇器（可選）
      const rangeLength = range.endIndex - range.startIndex + 1;
      if (rangeLength <= 7) {
        setTimeRange('7');
      } else if (rangeLength <= 30) {
        setTimeRange('30');
      } else if (rangeLength <= 90) {
        setTimeRange('90');
      } else {
        setTimeRange('all');
      }
    }
  };

  // 格式化數據供圖表使用
  const chartData = filteredData.map(item => ({
    date: new Date(item.recordDate).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
    fullDate: new Date(item.recordDate).toISOString().split('T')[0],
    value: item.totalValue,
    cost: item.totalCost,
    returnRate: item.gainLossPercent,
    benchmarkValue: undefined as number | undefined,
  }));

  // 處理基準指數數據：標準化為與投資組合相同的起始值
  if (benchmarkData && benchmarkData.timestamps && benchmarkData.prices && chartData.length > 0) {
    const portfolioStartValue = chartData[0].value;
    const benchmarkStartPrice = benchmarkData.prices[0];
    
    benchmarkData.timestamps.forEach((timestamp: number, index: number) => {
      const benchmarkDate = new Date(timestamp * 1000).toISOString().split('T')[0];
      const matchingDataPoint = chartData.find(d => d.fullDate === benchmarkDate);
      
      if (matchingDataPoint) {
        const benchmarkPrice = benchmarkData.prices[index];
        const normalizedValue = (benchmarkPrice / benchmarkStartPrice) * portfolioStartValue;
        (matchingDataPoint as any).benchmarkValue = normalizedValue;
      }
    });
  }

  // 處理交易標註：將交易日期對應到圖表數據點
  const transactionAnnotations = transactions.map(transaction => {
    const transactionDate = new Date(transaction.transactionDate).toISOString().split('T')[0];
    const dataPoint = chartData.find(d => d.fullDate === transactionDate);
    
    if (!dataPoint) return null;
    
    return {
      date: dataPoint.date,
      value: dataPoint.value,
      type: transaction.transactionType,
      symbol: transaction.symbol,
      shares: transaction.shares,
      price: transaction.price,
      totalAmount: transaction.totalAmount,
      notes: transaction.notes,
    };
  }).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">投資組合績效</CardTitle>
            <CardDescription className="mt-1">追蹤您的投資組合價值變化</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">時間範圍：</span>
              <Select value={timeRange} onValueChange={(value) => handleTimeRangeChange(value as TimeRange)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">最近 7 天</SelectItem>
                  <SelectItem value="30">最近 30 天</SelectItem>
                  <SelectItem value="90">最近 90 天</SelectItem>
                  <SelectItem value="all">全部</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">基準指數：</span>
              <Select value={benchmarkIndex} onValueChange={(value) => setBenchmarkIndex(value as BenchmarkIndex)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無對比</SelectItem>
                  <SelectItem value="SPX">S&P 500</SelectItem>
                  <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                  <SelectItem value="DOW">DOW</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>尚無歷史記錄</p>
            <p className="text-sm mt-2">系統將自動記錄每日的投資組合價值</p>
          </div>
        ) : (
          <>
            {/* 期間報酬和當前價值 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="p-6 bg-muted/30 rounded-xl border border-border/50 hover:border-border transition-colors">
                <p className="text-sm font-medium text-muted-foreground mb-2">期間報酬</p>
                <p className={`text-4xl font-bold mb-1 ${periodGainLoss >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                  {periodGainLoss >= 0 ? '+' : ''}${periodGainLoss.toFixed(2)}
                </p>
                <p className={`text-base font-medium ${periodGainLossPercent >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                  {periodGainLossPercent >= 0 ? '+' : ''}{periodGainLossPercent.toFixed(2)}%
                </p>
              </div>
              <div className="p-6 bg-muted/30 rounded-xl border border-border/50 hover:border-border transition-colors">
                <p className="text-sm font-medium text-muted-foreground mb-2">當前價值</p>
                <p className="text-4xl font-bold mb-1">${currentValue.toFixed(2)}</p>
                <p className="text-base text-muted-foreground">
                  成本: ${currentCost.toFixed(2)}
                </p>
              </div>
            </div>
            
            {/* 曲線圖 */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'returnRate') {
                      return [`${value.toFixed(2)}%`, '報酬率'];
                    }
                    return [`$${value.toLocaleString()}`, name === 'value' ? '總價值' : '總成本'];
                  }}
                  content={(props: any) => {
                    if (!props.active || !props.payload || props.payload.length === 0) return null;
                    
                    const data = props.payload[0].payload;
                    const dateTransactions = transactionAnnotations.filter((t: any) => t.date === data.date);
                    
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2 text-foreground">{data.date}</p>
                        <div className="space-y-1">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">總價值:</span> ${data.value.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">總成本:</span> ${data.cost.toLocaleString()}
                          </p>
                          <p className="text-sm text-foreground">
                            <span className="font-medium">報酬率:</span> {data.returnRate.toFixed(2)}%
                          </p>
                        </div>
                        
                        {dateTransactions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs font-semibold mb-2 text-foreground">交易記錄</p>
                            {dateTransactions.map((transaction: any, index: number) => (
                              <div key={index} className="text-xs mb-1">
                                <span className={`font-medium ${transaction.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                                  {transaction.type === 'buy' ? '▲ 買入' : '▼ 賣出'}
                                </span>
                                <span className="text-foreground ml-1">
                                  {transaction.symbol} {transaction.shares}股 @ ${transaction.price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="總價值"
                  dot={{ r: 3 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="總成本"
                  dot={{ r: 3 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
                
                {/* 基準指數曲線 */}
                {benchmarkIndex !== 'none' && (
                  <Line 
                    type="monotone" 
                    dataKey="benchmarkValue" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    name={benchmarkIndex === 'SPX' ? 'S&P 500' : benchmarkIndex === 'NASDAQ' ? 'NASDAQ' : 'DOW'}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                )}
                
                {/* 交易標註 */}
                {transactionAnnotations.map((annotation: any, index: number) => (
                  <ReferenceDot
                    key={index}
                    x={annotation.date}
                    y={annotation.value}
                    r={8}
                    fill={annotation.type === 'buy' ? '#10b981' : '#ef4444'}
                    stroke="white"
                    strokeWidth={2}
                    label={{
                      value: annotation.type === 'buy' ? '▲' : '▼',
                      position: annotation.type === 'buy' ? 'top' : 'bottom',
                      fill: annotation.type === 'buy' ? '#10b981' : '#ef4444',
                      fontSize: 16,
                      fontWeight: 'bold',
                    }}
                  />
                ))}
                
                <Brush
                  dataKey="date"
                  height={30}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--muted))"
                  startIndex={brushStartIndex}
                  endIndex={brushEndIndex}
                  onChange={handleBrushChange}
                  travellerWidth={10}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}

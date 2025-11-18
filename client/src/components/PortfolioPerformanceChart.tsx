import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PerformanceData {
  recordDate: Date;
  totalValue: number;
  totalCost: number;
  gainLossPercent: number;
}

interface PortfolioPerformanceChartProps {
  data: PerformanceData[];
  currentValue?: number;
  currentCost?: number;
  periodGainLoss?: number;
  periodGainLossPercent?: number;
}

type TimeRange = '7' | '30' | '90' | 'all';

export function PortfolioPerformanceChart({ 
  data, 
  currentValue = 0,
  currentCost = 0,
  periodGainLoss = 0,
  periodGainLossPercent = 0,
}: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

  const handleTimeRangeChange = (range: TimeRange) => {
    console.log('🔵 按鈕被點擊！時間範圍:', range);
    setTimeRange(range);
  };

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

  // 格式化數據供圖表使用
  const chartData = filteredData.map(item => ({
    date: new Date(item.recordDate).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
    value: item.totalValue,
    cost: item.totalCost,
    returnRate: item.gainLossPercent,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">投資組合績效</CardTitle>
            <CardDescription className="mt-1">追蹤您的投資組合價值變化</CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleTimeRangeChange('7')}
              onMouseDown={(e) => {
                console.log('🟢 7天按鈕 onMouseDown 觸發');
                e.stopPropagation();
              }}
              className={`min-w-[60px] px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                timeRange === '7'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-input bg-transparent hover:bg-accent'
              }`}
              type="button"
              style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
            >
              7天
            </button>
            <button
              onClick={() => handleTimeRangeChange('30')}
              onMouseDown={(e) => {
                console.log('🟢 30天按鈕 onMouseDown 觸發');
                e.stopPropagation();
              }}
              className={`min-w-[60px] px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                timeRange === '30'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-input bg-transparent hover:bg-accent'
              }`}
              type="button"
              style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
            >
              30天
            </button>
            <button
              onClick={() => handleTimeRangeChange('90')}
              onMouseDown={(e) => {
                console.log('🟢 90天按鈕 onMouseDown 觸發');
                e.stopPropagation();
              }}
              className={`min-w-[60px] px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                timeRange === '90'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-input bg-transparent hover:bg-accent'
              }`}
              type="button"
              style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
            >
              90天
            </button>
            <button
              onClick={() => handleTimeRangeChange('all')}
              onMouseDown={(e) => {
                console.log('🟢 全部按鈕 onMouseDown 觸發');
                e.stopPropagation();
              }}
              className={`min-w-[60px] px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-input bg-transparent hover:bg-accent'
              }`}
              type="button"
              style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
            >
              全部
            </button>
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
              <LineChart data={chartData}>
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
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
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
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="總成本"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

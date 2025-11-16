import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PerformanceData {
  recordDate: Date;
  totalValue: number;
  totalCost: number;
  gainLossPercent: number;
}

interface PortfolioPerformanceChartProps {
  data: PerformanceData[];
}

type TimeRange = '7' | '30' | '90' | 'all';

export function PortfolioPerformanceChart({ data }: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

  // 根據時間範圍過濾數據
  const getFilteredData = () => {
    if (timeRange === 'all') return data;
    const days = parseInt(timeRange);
    return data.slice(-days);
  };

  const filteredData = getFilteredData();

  // 格式化數據供圖表使用
  const chartData = filteredData.map(item => ({
    date: new Date(item.recordDate).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
    value: item.totalValue,
    cost: item.totalCost,
    returnRate: item.gainLossPercent,
  }));

  // 計算統計數據
  const latestValue = filteredData[filteredData.length - 1]?.totalValue || 0;
  const initialValue = filteredData[0]?.totalValue || 0;
  const totalReturn = latestValue - initialValue;
  const totalReturnPercent = initialValue > 0 ? ((latestValue - initialValue) / initialValue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>投資組合績效</CardTitle>
            <CardDescription className="hidden sm:block">追蹤您的投資組合價值變化</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant={timeRange === '7' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7')}
              className="flex-1 sm:flex-none"
            >
              7天
            </Button>
            <Button
              variant={timeRange === '30' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30')}
              className="flex-1 sm:flex-none"
            >
              30天
            </Button>
            <Button
              variant={timeRange === '90' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90')}
              className="flex-1 sm:flex-none"
            >
              90天
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('all')}
              className="flex-1 sm:flex-none"
            >
              全部
            </Button>
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
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">期間報酬</p>
                <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalReturn.toFixed(2)}
                </p>
                <p className={`text-sm ${totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">當前價值</p>
                <p className="text-2xl font-bold">${latestValue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  成本: ${filteredData[filteredData.length - 1]?.totalCost.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'returnRate') {
                      return [`${value.toFixed(2)}%`, '報酬率'];
                    }
                    return [`$${value.toLocaleString()}`, name === 'value' ? '總價值' : '總成本'];
                  }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="總價值"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="總成本"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

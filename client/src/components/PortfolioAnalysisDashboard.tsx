import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

interface DistributionItem {
  symbol: string;
  companyName: string;
  value: number;
  percentage: number;
}

interface RiskMetrics {
  concentration: number;
  diversification: number;
}

interface PortfolioAnalysisDashboardProps {
  distribution: DistributionItem[];
  riskMetrics: RiskMetrics;
}

// 優化的色彩配置，使用更專業的配色方案
const COLORS = [
  '#2563eb', // 深藍
  '#10b981', // 绿色
  '#f59e0b', // 橙色
  '#ef4444', // 紅色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉紅
  '#14b8a6', // 青色
  '#f97316', // 深橙
  '#06b6d4', // 天藍
  '#84cc16', // 萊姆綠
];

export function PortfolioAnalysisDashboard({ distribution, riskMetrics }: PortfolioAnalysisDashboardProps) {
  // 準備圓餅圖數據
  const chartData = distribution.map(item => ({
    name: item.symbol,
    value: item.value,
    percentage: item.percentage,
  }));

  // 生成投資建議
  const getRecommendations = () => {
    const recommendations: { type: 'warning' | 'success' | 'info'; message: string }[] = [];

    // 集中度建議
    if (riskMetrics.concentration > 50) {
      recommendations.push({
        type: 'warning',
        message: `持倉過於集中：單一股票佔比達 ${riskMetrics.concentration.toFixed(1)}%，建議分散投資以降低風險。`,
      });
    } else if (riskMetrics.concentration > 30) {
      recommendations.push({
        type: 'info',
        message: `持倉集中度適中：最大單一股票佔比 ${riskMetrics.concentration.toFixed(1)}%，可考慮進一步分散。`,
      });
    } else {
      recommendations.push({
        type: 'success',
        message: `持倉分散良好：最大單一股票佔比僅 ${riskMetrics.concentration.toFixed(1)}%，風險控制得當。`,
      });
    }

    // 分散化建議
    if (riskMetrics.diversification < 30) {
      recommendations.push({
        type: 'warning',
        message: `投資組合多樣性不足（${riskMetrics.diversification.toFixed(0)}分），建議增加持倉數量至少5-10支股票。`,
      });
    } else if (riskMetrics.diversification < 60) {
      recommendations.push({
        type: 'info',
        message: `投資組合多樣性適中（${riskMetrics.diversification.toFixed(0)}分），可考慮增加更多不同產業的股票。`,
      });
    } else {
      recommendations.push({
        type: 'success',
        message: `投資組合多樣性良好（${riskMetrics.diversification.toFixed(0)}分），持倉數量充足。`,
      });
    }

    // 持倉數量建議
    if (distribution.length < 3) {
      recommendations.push({
        type: 'warning',
        message: '建議至少持有3-5支不同的股票，以達到基本的風險分散效果。',
      });
    } else if (distribution.length > 20) {
      recommendations.push({
        type: 'info',
        message: '持倉數量較多，請確保能夠有效監控所有持倉的表現。',
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* 持倉分布圓餅圖 */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
          <CardTitle className="flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            持倉分布
          </CardTitle>
          <CardDescription>按市值佔比顯示各股票持倉</CardDescription>
        </CardHeader>
        <CardContent>
          {distribution.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>尚無持倉數據</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percentage }) => {
                      // 只顯示占比大於 5% 的標籤
                      if (percentage < 5) return '';
                      return `${name} ${percentage.toFixed(1)}%`;
                    }}
                    outerRadius={110}
                    innerRadius={0}
                    paddingAngle={2}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '市值']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      padding: '12px',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="mt-6 space-y-2">
                <div className="text-sm font-semibold text-muted-foreground mb-3">持倉明細</div>
                {distribution.map((item, index) => (
                  <div 
                    key={item.symbol} 
                    className="flex items-center justify-between text-xs sm:text-sm gap-2 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div 
                        className="w-4 h-4 rounded-md flex-shrink-0 shadow-sm" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                        <span className="font-semibold flex-shrink-0">{item.symbol}</span>
                        <span className="text-muted-foreground text-xs truncate hidden sm:inline">{item.companyName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      <span className="text-muted-foreground font-medium hidden sm:inline">${item.value.toLocaleString()}</span>
                      <span className="font-bold text-sm">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 風險評估與建議 */}
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* 風險指標 */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20">
            <CardTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-600 rounded-full"></div>
              風險評估
            </CardTitle>
            <CardDescription>投資組合的風險指標分析</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">集中度指標</span>
                <span className={`text-sm font-bold ${
                  riskMetrics.concentration > 50 ? 'text-red-600' :
                  riskMetrics.concentration > 30 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {riskMetrics.concentration.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    riskMetrics.concentration > 50 ? 'bg-red-600' :
                    riskMetrics.concentration > 30 ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(riskMetrics.concentration, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                最大單一持倉佔比，越低表示風險越分散
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">多樣性評分</span>
                <span className={`text-sm font-bold ${
                  riskMetrics.diversification < 30 ? 'text-red-600' :
                  riskMetrics.diversification < 60 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {riskMetrics.diversification.toFixed(0)}/100
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    riskMetrics.diversification < 30 ? 'bg-red-600' :
                    riskMetrics.diversification < 60 ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${riskMetrics.diversification}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                基於持倉數量的多樣性評分，越高表示分散程度越好
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 投資建議 */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20">
            <CardTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-green-600 rounded-full"></div>
              投資建議
            </CardTitle>
            <CardDescription>基於您的持倉配置提供的建議</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, index) => (
              <div 
                key={index}
                className={`flex gap-3 p-3 rounded-lg ${
                  rec.type === 'warning' ? 'bg-red-50 dark:bg-red-950/20' :
                  rec.type === 'success' ? 'bg-green-50 dark:bg-green-950/20' :
                  'bg-blue-50 dark:bg-blue-950/20'
                }`}
              >
                {rec.type === 'warning' && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                {rec.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />}
                {rec.type === 'info' && <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                <p className={`text-sm ${
                  rec.type === 'warning' ? 'text-red-900 dark:text-red-100' :
                  rec.type === 'success' ? 'text-green-900 dark:text-green-100' :
                  'text-blue-900 dark:text-blue-100'
                }`}>
                  {rec.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

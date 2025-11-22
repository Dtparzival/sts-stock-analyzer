import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitCompare, TrendingUp, TrendingDown, Clock, DollarSign, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CompareAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: Array<{
    id: number;
    createdAt: Date;
    recommendation: string | null;
    priceAtAnalysis: number | null;
    content: string;
  }>;
  symbol: string;
}

export default function CompareAnalysisDialog({ open, onOpenChange, records, symbol }: CompareAnalysisDialogProps) {
  if (records.length !== 2) {
    return null;
  }

  const [record1, record2] = records.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 計算股價變化
  const priceChange = record1.priceAtAnalysis && record2.priceAtAnalysis
    ? ((record2.priceAtAnalysis - record1.priceAtAnalysis) / record1.priceAtAnalysis * 100)
    : null;

  // 準備圖表數據
  const chartData = [
    {
      name: '第一次分析',
      股價: record1.priceAtAnalysis ? (record1.priceAtAnalysis / 100).toFixed(2) : 0,
      時間: new Date(record1.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    },
    {
      name: '第二次分析',
      股價: record2.priceAtAnalysis ? (record2.priceAtAnalysis / 100).toFixed(2) : 0,
      時間: new Date(record2.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    }
  ];

  // 根據建議類型返回樣式
  const getRecommendationStyle = (recommendation: string | null) => {
    if (!recommendation) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', gradient: 'from-gray-500 to-gray-600' };
    if (recommendation === '買入') return { bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', gradient: 'from-green-500 to-emerald-500' };
    if (recommendation === '賣出') return { bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', gradient: 'from-red-500 to-rose-500' };
    return { bg: 'bg-yellow-100 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', gradient: 'from-yellow-500 to-amber-500' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <GitCompare className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI 分析對比
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {symbol} 的兩次分析記錄對比
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* 股價變化趨勢圖 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">股價變化趨勢</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="股價" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
            {priceChange !== null && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-black/20">
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({new Date(record1.createdAt).toLocaleDateString('zh-TW')} → {new Date(record2.createdAt).toLocaleDateString('zh-TW')})
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* 並排對比 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 第一次分析 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  第一次分析
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  {new Date(record1.createdAt).toLocaleString('zh-TW')}
                </p>
              </div>
              <div className="p-4 space-y-3">
                {/* 當時股價 */}
                {record1.priceAtAnalysis && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      當時股價
                    </span>
                    <span className="text-lg font-bold">${(record1.priceAtAnalysis / 100).toFixed(2)}</span>
                  </div>
                )}
                {/* 投資建議 */}
                {record1.recommendation && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                    <span className="text-sm font-medium text-muted-foreground">投資建議</span>
                    <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRecommendationStyle(record1.recommendation).gradient}`}>
                      <span className="text-white font-bold">{record1.recommendation}</span>
                    </div>
                  </div>
                )}
                {/* 分析摘要 */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                  <p className="text-sm font-medium text-muted-foreground mb-2">分析摘要</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {record1.content.substring(0, 150)}...
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 第二次分析 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="rounded-xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  第二次分析
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  {new Date(record2.createdAt).toLocaleString('zh-TW')}
                </p>
              </div>
              <div className="p-4 space-y-3">
                {/* 當時股價 */}
                {record2.priceAtAnalysis && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      當時股價
                    </span>
                    <span className="text-lg font-bold">${(record2.priceAtAnalysis / 100).toFixed(2)}</span>
                  </div>
                )}
                {/* 投資建議 */}
                {record2.recommendation && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                    <span className="text-sm font-medium text-muted-foreground">投資建議</span>
                    <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRecommendationStyle(record2.recommendation).gradient}`}>
                      <span className="text-white font-bold">{record2.recommendation}</span>
                    </div>
                  </div>
                )}
                {/* 分析摘要 */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                  <p className="text-sm font-medium text-muted-foreground mb-2">分析摘要</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {record2.content.substring(0, 150)}...
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="button-hover">
            關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

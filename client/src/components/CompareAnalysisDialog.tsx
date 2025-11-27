import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitCompare, TrendingUp, TrendingDown, Clock, DollarSign, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

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
  const [currentView, setCurrentView] = useState<'chart' | 'record1' | 'record2'>('chart');
  
  if (records.length !== 2) {
    return null;
  }

  const [record1, record2] = records.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // 手勢滑動處理
  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      // 向右滑
      if (currentView === 'record2') setCurrentView('record1');
      else if (currentView === 'record1') setCurrentView('chart');
    } else if (info.offset.x < -swipeThreshold) {
      // 向左滑
      if (currentView === 'chart') setCurrentView('record1');
      else if (currentView === 'record1') setCurrentView('record2');
    }
  };

  // 計算股價變化
  const priceChange = record1.priceAtAnalysis && record2.priceAtAnalysis
    ? ((record2.priceAtAnalysis - record1.priceAtAnalysis) / record1.priceAtAnalysis * 100)
    : null;

  // 準備柱狀圖數據
  const barChartData = [
    {
      name: '第一次',
      股價: record1.priceAtAnalysis ? parseFloat((record1.priceAtAnalysis / 100).toFixed(2)) : 0,
      時間: new Date(record1.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    },
    {
      name: '第二次',
      股價: record2.priceAtAnalysis ? parseFloat((record2.priceAtAnalysis / 100).toFixed(2)) : 0,
      時間: new Date(record2.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    }
  ];
  
  // 準備趋勢線圖數據
  const lineChartData = [
    {
      時間: new Date(record1.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
      股價: record1.priceAtAnalysis ? parseFloat((record1.priceAtAnalysis / 100).toFixed(2)) : 0,
    },
    {
      時間: new Date(record2.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
      股價: record2.priceAtAnalysis ? parseFloat((record2.priceAtAnalysis / 100).toFixed(2)) : 0,
    }
  ];

  // 根據建議類型返回樣式
  const getRecommendationStyle = (recommendation: string | null) => {
    if (!recommendation) return { bg: 'bg-gray-100', text: 'text-gray-600', gradient: 'from-gray-500 to-gray-600' };
    if (recommendation === '買入') return { bg: 'bg-green-100', text: 'text-green-700', gradient: 'from-green-500 to-emerald-500' };
    if (recommendation === '賣出') return { bg: 'bg-red-100', text: 'text-red-700', gradient: 'from-red-500 to-rose-500' };
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', gradient: 'from-yellow-500 to-amber-500' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw] sm:w-full overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center">
              <GitCompare className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI 分析對比
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {symbol} 的兩次分析記錄對比
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* 桌面版：傳統並排布局 */}
        <div className="hidden lg:block flex-1 overflow-y-auto py-4 space-y-6">
          {/* 股價變化趋勢圖 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-accent" />
              <h3 className="text-base sm:text-lg font-semibold">股價變化趋勢</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="時間" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="股價" 
                  stroke="url(#lineGradient)" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 6 }}
                  activeDot={{ r: 8 }}
                />
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
            {priceChange !== null && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/50">
                  {priceChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  )}
                  <span className={`text-sm sm:text-base font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
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
              className="rounded-xl border-2 border-primary/20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-primary via-primary to-accent p-4 text-white">
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
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      當時股價
                    </span>
                    <span className="text-lg font-bold">${(record1.priceAtAnalysis / 100).toFixed(2)}</span>
                  </div>
                )}
                {/* 投資建議 */}
                {record1.recommendation && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
                    <span className="text-sm font-medium text-muted-foreground">投資建議</span>
                    <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRecommendationStyle(record1.recommendation).gradient}`}>
                      <span className="text-white font-bold">{record1.recommendation}</span>
                    </div>
                  </div>
                )}
                {/* 分析摘要 */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
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
              className="rounded-xl border-2 border-primary/20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-accent via-accent to-primary p-4 text-white">
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
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      當時股價
                    </span>
                    <span className="text-lg font-bold">${(record2.priceAtAnalysis / 100).toFixed(2)}</span>
                  </div>
                )}
                {/* 投資建議 */}
                {record2.recommendation && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5">
                    <span className="text-sm font-medium text-muted-foreground">投資建議</span>
                    <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRecommendationStyle(record2.recommendation).gradient}`}>
                      <span className="text-white font-bold">{record2.recommendation}</span>
                    </div>
                  </div>
                )}
                {/* 分析摘要 */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5">
                  <p className="text-sm font-medium text-muted-foreground mb-2">分析摘要</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {record2.content.substring(0, 150)}...
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* 手機版/平板版：滑動切換布局 */}
        <div className="lg:hidden flex-1 overflow-hidden py-4">
          {/* 切換按鈕 */}
          <div className="flex items-center justify-center gap-2 mb-4 px-4">
            <Button
              variant={currentView === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('chart')}
              className="flex-1 min-h-[44px]"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              圖表
            </Button>
            <Button
              variant={currentView === 'record1' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('record1')}
              className="flex-1 min-h-[44px]"
            >
              第一次
            </Button>
            <Button
              variant={currentView === 'record2' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('record2')}
              className="flex-1 min-h-[44px]"
            >
              第二次
            </Button>
          </div>
          
          {/* 滑動內容區域 */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="px-4 overflow-y-auto max-h-[60vh]"
          >
            <AnimatePresence mode="wait">
              {currentView === 'chart' && (
                <motion.div
                  key="chart"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    <h3 className="text-base font-semibold">股價變化趋勢</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="時間" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="股價" 
                        stroke="url(#lineGradientMobile)" 
                        strokeWidth={3}
                        dot={{ fill: '#8b5cf6', r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                      <defs>
                        <linearGradient id="lineGradientMobile" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                  {priceChange !== null && (
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50">
                        {priceChange >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(record1.createdAt).toLocaleDateString('zh-TW')} → {new Date(record2.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    左右滑動查看分析詳情
                  </p>
                </motion.div>
              )}
              
              {currentView === 'record1' && (
                <motion.div
                  key="record1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border-2 border-primary/20 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-primary via-primary to-accent p-4 text-white">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      第一次分析
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                      {new Date(record1.createdAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    {record1.priceAtAnalysis && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <DollarSign className="h-3 w-3" />
                          當時股價
                        </span>
                        <span className="text-base font-bold">${(record1.priceAtAnalysis / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {record1.recommendation && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
                        <span className="text-xs font-medium text-muted-foreground">投資建議</span>
                        <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRecommendationStyle(record1.recommendation).gradient}`}>
                          <span className="text-white text-xs font-bold">{record1.recommendation}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">分析摘要</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {record1.content.substring(0, 200)}...
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pb-4">
                    左右滑動切換視圖
                  </p>
                </motion.div>
              )}
              
              {currentView === 'record2' && (
                <motion.div
                  key="record2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border-2 border-primary/20 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-accent via-accent to-primary p-4 text-white">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      第二次分析
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                      {new Date(record2.createdAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    {record2.priceAtAnalysis && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <DollarSign className="h-3 w-3" />
                          當時股價
                        </span>
                        <span className="text-base font-bold">${(record2.priceAtAnalysis / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {record2.recommendation && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5">
                        <span className="text-xs font-medium text-muted-foreground">投資建議</span>
                        <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getRecommendationStyle(record2.recommendation).gradient}`}>
                          <span className="text-white text-xs font-bold">{record2.recommendation}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-accent/5 to-primary/5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">分析摘要</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {record2.content.substring(0, 200)}...
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pb-4">
                    左右滑動切換視圖
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
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

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Zap } from "lucide-react";

interface PredictionSummaryCardProps {
  prediction: string;
}

export default function PredictionSummaryCard({ prediction }: PredictionSummaryCardProps) {
  // 從預測內容中提取關鍵資訊
  const extractKeyPoints = (text: string): string[] => {
    const points: string[] = [];
    
    // 移除 Markdown 標記（###、####、**、* 等）
    const cleanText = text
      .replace(/#{1,6}\s+/g, '') // 移除標題標記
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗體標記
      .replace(/\*([^*]+)\*/g, '$1') // 移除斜體標記
      .replace(/^[-*]\s+/gm, '') // 移除列表標記
      .trim();
    
    // 嘗試提取包含關鍵詞的句子
    const keywords = ['預測', '趨勢', '上漲', '下跌', '突破', '支撐', '阻力', '目標價', '預期', '波動', '區間'];
    const sentences = cleanText.split(/[。！？\n]/);
    
    keywords.forEach(keyword => {
      const found = sentences.find(s => s.includes(keyword) && s.length > 10 && s.length < 120);
      if (found && points.length < 4) {
        points.push(found.trim());
      }
    });
    
    // 如果沒找到足夠的關鍵點，使用前幾句
    if (points.length === 0) {
      points.push(...sentences.slice(0, 3).filter(s => s.length > 10).map(s => s.trim()));
    }
    
    return points.slice(0, 4);
  };

  // 提取關鍵指標（數字、百分比、價格等）
  const extractKeyMetrics = (text: string): Array<{label: string, value: string}> => {
    const metrics: Array<{label: string, value: string}> = [];
    
    // 匹配常見的指標模式
    const patterns = [
      { regex: /目標價[：:]*\s*([\d.,]+)/i, label: '目標價' },
      { regex: /預期漲幅[：:]*\s*([\d.,+-]+%)/i, label: '預期漲幅' },
      { regex: /支撐位[：:]*\s*([\d.,]+)/i, label: '支撐位' },
      { regex: /阻力位[：:]*\s*([\d.,]+)/i, label: '阻力位' },
      { regex: /波動區間[：:]*\s*([\d.,\s-~至]+)/i, label: '波動區間' },
    ];
    
    patterns.forEach(({ regex, label }) => {
      const match = text.match(regex);
      if (match && match[1] && metrics.length < 3) {
        metrics.push({ label, value: match[1].trim() });
      }
    });
    
    return metrics;
  };

  // 判斷趨勢方向（用於樣式）
  const detectTrend = (text: string): 'up' | 'down' | 'neutral' => {
    const lowerText = text.toLowerCase();
    const upKeywords = ['上漲', '看漲', '突破', '買入', '增長', '上升', 'bullish', 'upward'];
    const downKeywords = ['下跌', '看跌', '賣出', '下降', '下行', 'bearish', 'downward'];
    
    const upCount = upKeywords.filter(k => lowerText.includes(k)).length;
    const downCount = downKeywords.filter(k => lowerText.includes(k)).length;
    
    if (upCount > downCount) return 'up';
    if (downCount > upCount) return 'down';
    return 'neutral';
  };

  const keyPoints = extractKeyPoints(prediction);
  const keyMetrics = extractKeyMetrics(prediction);
  const trend = detectTrend(prediction);

  // 根據趨勢類型返回樣式
  const getTrendStyle = (trendType: 'up' | 'down' | 'neutral') => {
    if (trendType === 'up') return { 
      gradient: 'from-green-500 to-emerald-500', 
      icon: TrendingUp, 
      text: '看漲趨勢',
      bg: 'from-green-50/50 to-emerald-50/50',
      border: 'border-green-200'
    };
    if (trendType === 'down') return { 
      gradient: 'from-red-500 to-rose-500', 
      icon: TrendingDown, 
      text: '看跌趨勢',
      bg: 'from-red-50/50 to-rose-50/50',
      border: 'border-red-200'
    };
    return { 
      gradient: 'from-blue-500 to-cyan-500', 
      icon: Target, 
      text: '震盪整理',
      bg: 'from-primary/5 to-accent/5',
      border: 'border-primary/20'
    };
  };

  const style = getTrendStyle(trend);
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`border-2 ${style.border} bg-gradient-to-br ${style.bg} shadow-lg mb-4 sm:mb-6`}>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
          {/* 標題區域 */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center flex-shrink-0`}>
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h3 className={`text-base sm:text-lg font-bold bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>
              預測重點摘要
            </h3>
          </div>

          {/* 趨勢徵章 */}
          <div className="mb-3 sm:mb-4">
            <Badge className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-gradient-to-r ${style.gradient} text-white border-0 shadow-md`}>
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              趨勢判斷：{style.text}
            </Badge>
          </div>

          {/* 關鍵指標（如果有）*/}
          {keyMetrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
              {keyMetrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`p-2 sm:p-3 rounded-lg bg-gradient-to-br from-white to-${trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'blue'}-50/50 === 'up' ? 'green' : trend === 'down' ? 'red' : 'blue'}-950/30 border-2 ${style.border} text-center`}
                >
                  <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">
                    {metric.label}
                  </div>
                  <div className={`text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>
                    {metric.value}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* 關鍵要點列表 */}
          <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
            {keyPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex items-start gap-2 sm:gap-2.5 lg:gap-3 p-2.5 sm:p-3 lg:p-4 rounded-lg bg-white/60 border ${style.border.replace('border-', 'border-').replace('dark:border-', 'dark:border-')} hover:border-opacity-100 transition-colors duration-200`}
              >
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r ${style.gradient} mt-1.5 sm:mt-2 flex-shrink-0`} />
                <p className="text-xs sm:text-sm lg:text-base text-foreground/90 leading-relaxed sm:leading-relaxed lg:leading-loose flex-1">
                  {point}
                </p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

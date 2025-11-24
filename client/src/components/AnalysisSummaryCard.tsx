import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Target } from "lucide-react";

interface AnalysisSummaryCardProps {
  analysis: string;
  recommendation?: string | null;
}

export default function AnalysisSummaryCard({ analysis, recommendation }: AnalysisSummaryCardProps) {
  // 從分析內容中提取關鍵資訊
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
    const keywords = ['建議', '風險', '機會', '趨勢', '預期', '目標', '支撐', '阻力', '突破'];
    const sentences = cleanText.split(/[。！？\n]/);
    
    keywords.forEach(keyword => {
      const found = sentences.find(s => s.includes(keyword) && s.length > 10 && s.length < 100);
      if (found && points.length < 3) {
        points.push(found.trim());
      }
    });
    
    // 如果沒找到足夠的關鍵點，使用前幾句
    if (points.length === 0) {
      points.push(...sentences.slice(0, 2).filter(s => s.length > 10).map(s => s.trim()));
    }
    
    return points.slice(0, 3);
  };

  const keyPoints = extractKeyPoints(analysis);

  // 根據建議類型返回樣式
  const getRecommendationStyle = (rec: string | null) => {
    if (!rec) return { gradient: 'from-gray-500 to-gray-600', icon: AlertCircle, text: '待評估' };
    if (rec === '買入') return { gradient: 'from-green-500 to-emerald-500', icon: TrendingUp, text: '買入' };
    if (rec === '賣出') return { gradient: 'from-red-500 to-rose-500', icon: TrendingDown, text: '賣出' };
    return { gradient: 'from-yellow-500 to-amber-500', icon: Target, text: '持有' };
  };

  const style = getRecommendationStyle(recommendation ?? null);
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 shadow-lg mb-4 sm:mb-6">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
          {/* 標題區域 */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI 分析重點摘要
            </h3>
          </div>

          {/* 投資建議徽章 */}
          {recommendation && (
            <div className="mb-3 sm:mb-4">
              <Badge className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-gradient-to-r ${style.gradient} text-white border-0 shadow-md`}>
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                投資建議：{style.text}
              </Badge>
            </div>
          )}

          {/* 關鍵要點列表 */}
          <div className="space-y-2 sm:space-y-3">
            {keyPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-purple-100 dark:border-purple-900"
              >
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r ${style.gradient} mt-1.5 sm:mt-2 flex-shrink-0`} />
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed flex-1">
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

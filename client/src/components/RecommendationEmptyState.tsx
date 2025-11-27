import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp } from "lucide-react";
import type { MarketType } from "@shared/markets";
import { motion } from "framer-motion";
import { HOT_STOCKS } from "@shared/markets";

interface RecommendationEmptyStateProps {
  market: MarketType;
  onSearchClick: () => void;
  onStockClick?: (symbol: string) => void;
}

/**
 * 推薦區塊空狀態組件（簡化版）
 * 當切換市場後推薦列表為空時顯示友善的引導訊息
 * 遵循全站風格設計，確保響應式顯示
 */
export default function RecommendationEmptyState({ market, onSearchClick, onStockClick }: RecommendationEmptyStateProps) {
  const marketName = market === 'US' ? '美股' : '台股';
  
  // 根據市場獲取熱門股票（前 5 支）
  const hotStocks = HOT_STOCKS[market].slice(0, 5);
  
  return (
    <motion.div 
      className="mt-6 sm:mt-8 max-w-2xl mx-auto px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="border-dashed border-2 border-border/60 hover:border-primary/40 transition-all duration-300">
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10 px-4 sm:px-6">
          {/* 標題 */}
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-center text-foreground/90">
            尚無{marketName}推薦
          </h3>
          
          {/* 描述文字 */}
          <p className="text-sm text-muted-foreground text-center mb-5 max-w-md">
            開始搜尋{marketName}以獲得個人化推薦，例如：{market === 'US' ? 'AAPL、TSLA、NVDA' : '2330、2317、2454'}
          </p>
          
          {/* 熱門股票快速入口 */}
          <div className="w-full max-w-md mb-5">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground/80">熱門{marketName}股票</span>
            </div>
            {/* 手機版：單欄布局，增大觸控區域 */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-2 sm:justify-center">
              {hotStocks.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] sm:min-h-[36px] px-4 sm:px-3 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 w-full sm:w-auto touch-manipulation"
                  onClick={() => onStockClick?.(stock.symbol)}
                >
                  <span className="font-mono text-sm sm:text-xs font-semibold">{stock.symbol}</span>
                  <span className="ml-2 sm:ml-1.5 text-sm sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[80px]">{stock.name}</span>
                </Button>
              ))}
            </div>
          </div>
          
          {/* 操作按鈕 */}
          <Button
            variant="default"
            size="default"
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 min-h-[44px] px-6"
            onClick={onSearchClick}
          >
            <Search className="h-4 w-4 mr-2" />
            <span>搜尋{marketName}</span>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import type { MarketType } from "@shared/markets";
import { motion } from "framer-motion";

interface PersonalizedEmptyStateProps {
  market: MarketType;
  onSearchClick: () => void;
  onStockClick: (symbol: string) => void;
  suggestedStocks?: Array<{
    symbol: string;
    name: string;
    reason?: string;
  }>;
}

/**
 * 個人化空狀態組件
 * 根據用戶歷史搜尋記錄動態推薦熱門股票
 * 當推薦列表為空時顯示，提供個人化建議
 */
export default function PersonalizedEmptyState({ 
  market, 
  onSearchClick,
  onStockClick,
  suggestedStocks = [],
}: PersonalizedEmptyStateProps) {
  const marketName = market === 'US' ? '美股' : '台股';
  
  // 默認推薦股票（當沒有個人化建議時）
  const defaultSuggestions = market === 'US' 
    ? [
        { symbol: 'AAPL', name: 'Apple Inc.', reason: '科技龍頭' },
        { symbol: 'TSLA', name: 'Tesla Inc.', reason: '電動車領導者' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', reason: '搜尋引擎巨頭' },
        { symbol: 'MSFT', name: 'Microsoft Corp.', reason: '軟體巨擘' },
        { symbol: 'NVDA', name: 'NVIDIA Corp.', reason: 'AI 晶片龍頭' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', reason: '電商巨頭' },
      ]
    : [
        { symbol: '2330', name: '台積電', reason: '半導體龍頭' },
        { symbol: '0050', name: '元大台灣50', reason: 'ETF 首選' },
        { symbol: '2317', name: '鴻海', reason: '電子代工龍頭' },
        { symbol: '2454', name: '聯發科', reason: 'IC 設計龍頭' },
        { symbol: '2412', name: '中華電', reason: '電信龍頭' },
        { symbol: '2882', name: '國泰金', reason: '金融龍頭' },
      ];
  
  const displaySuggestions = suggestedStocks.length > 0 ? suggestedStocks : defaultSuggestions;
  const isPersonalized = suggestedStocks.length > 0;
  
  return (
    <motion.div 
      className="mt-6 sm:mt-8 max-w-4xl mx-auto px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="border-dashed border-2 border-border/60 hover:border-primary/40 transition-all duration-300 overflow-hidden">
        <CardContent className="py-8 sm:py-10 px-4 sm:px-6">
          {/* 標題區塊 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 rounded-full mb-3">
              {isPersonalized ? (
                <Sparkles className="h-5 w-5 text-accent animate-pulse" />
              ) : (
                <TrendingUp className="h-5 w-5 text-primary" />
              )}
              <span className="text-base font-bold text-primary">
                {isPersonalized ? '為您推薦' : `熱門${marketName}`}
              </span>
            </div>
            
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground/90">
              {isPersonalized ? '根據您的搜尋記錄' : `探索${marketName}市場`}
            </h3>
            
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isPersonalized 
                ? '以下是根據您的投資偏好精選的股票' 
                : `從這些熱門股票開始您的${marketName}投資之旅`}
            </p>
          </div>
          
          {/* 推薦股票網格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {displaySuggestions.map((stock, index) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto py-3 px-3 flex flex-col items-start gap-1 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group"
                  onClick={() => onStockClick(stock.symbol)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {stock.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {stock.name}
                      </div>
                    </div>
                  </div>
                  {stock.reason && (
                    <div className="text-xs text-muted-foreground/80 mt-1 w-full text-left">
                      {stock.reason}
                    </div>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
          
          {/* 搜尋按鈕 */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3">
              或者搜尋其他{marketName}
            </p>
            <Button
              variant="default"
              size="default"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 min-h-[44px] px-6"
              onClick={onSearchClick}
            >
              <Search className="h-4 w-4 mr-2" />
              <span>搜尋{marketName}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

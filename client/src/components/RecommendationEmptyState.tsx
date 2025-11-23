import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import type { MarketType } from "@shared/markets";

interface RecommendationEmptyStateProps {
  market: MarketType;
  onSearchClick: () => void;
}

/**
 * 推薦區塊空狀態組件
 * 當切換市場後推薦列表為空時顯示友善的引導訊息
 * 遵循全站漸層風格設計，確保響應式顯示
 */
export default function RecommendationEmptyState({ market, onSearchClick }: RecommendationEmptyStateProps) {
  const marketName = market === 'US' ? '美股' : '台股';
  
  return (
    <div className="mt-8 sm:mt-12 max-w-3xl mx-auto px-4">
      <Card className="border-dashed border-2 border-border/60 hover:border-primary/40 transition-all duration-300 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 relative">
          {/* 背景裝飾 - 漸層圓形 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>
          
          {/* 圖標 - 漸層背景 */}
          <div className="relative mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-2xl blur-xl opacity-50" />
            <Sparkles className="relative h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          </div>
          
          {/* 標題 */}
          <h3 className="relative text-lg sm:text-xl font-bold mb-3 text-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            尚無{marketName}推薦
          </h3>
          
          {/* 描述文字 */}
          <p className="relative text-sm sm:text-base text-muted-foreground text-center mb-6 max-w-md leading-relaxed">
            開始搜尋{marketName}股票，我們將根據您的瀏覽記錄和收藏偏好，為您推薦相關的{marketName}投資標的
          </p>
          
          {/* 操作按鈕 */}
          <Button
            variant="default"
            size="lg"
            className="relative bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 min-h-[44px] px-6 sm:px-8"
            onClick={onSearchClick}
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="font-semibold">開始搜尋{marketName}</span>
          </Button>
          
          {/* 提示文字 */}
          <p className="relative mt-6 text-xs sm:text-sm text-muted-foreground/70 text-center max-w-sm">
            💡 提示：您可以透過上方搜尋欄輸入股票代碼或公司名稱來開始探索
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

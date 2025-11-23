import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { MarketType } from "@shared/markets";

interface RecommendationEmptyStateProps {
  market: MarketType;
  onSearchClick: () => void;
}

/**
 * 推薦區塊空狀態組件（簡化版）
 * 當切換市場後推薦列表為空時顯示友善的引導訊息
 * 遵循全站風格設計，確保響應式顯示
 */
export default function RecommendationEmptyState({ market, onSearchClick }: RecommendationEmptyStateProps) {
  const marketName = market === 'US' ? '美股' : '台股';
  
  return (
    <div className="mt-6 sm:mt-8 max-w-2xl mx-auto px-4">
      <Card className="border-dashed border-2 border-border/60 hover:border-primary/40 transition-all duration-300">
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10 px-4 sm:px-6">
          {/* 標題 */}
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-center text-foreground/90">
            尚無{marketName}推薦
          </h3>
          
          {/* 描述文字 */}
          <p className="text-sm text-muted-foreground text-center mb-5 max-w-md">
            開始搜尋{marketName}以獲得個人化推薦
          </p>
          
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
    </div>
  );
}

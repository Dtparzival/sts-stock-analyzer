import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 推薦區塊骨架屏組件
 * 遵循全站漸層風格，提供流暢的載入動畫
 */
export default function RecommendationSkeleton() {
  return (
    <div className="mt-12 max-w-6xl mx-auto px-4">
      {/* 區塊標題 */}
      <div className="text-center mb-8 relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-full mb-3">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
          <span className="text-base font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            為您推薦
          </span>
        </div>
        <p className="text-sm text-muted-foreground">正在載入推薦內容...</p>
        
        {/* 刷新按鈕（載入中禁用） */}
        <Button
          size="icon"
          variant="ghost"
          disabled
          className="absolute top-0 right-0 h-10 w-10 rounded-full opacity-50"
        >
          <RefreshCw className="h-5 w-5 text-primary" />
        </Button>
      </div>
      
      {/* 骨架屏卡片網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <Card 
            key={i} 
            className="overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 animate-pulse"
          >
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center min-h-[140px] sm:min-h-[120px]">
              {/* 市場標籤骨架 */}
              <div className="absolute top-2 right-2 h-5 w-14 bg-muted/50 rounded-full"></div>
              
              {/* 收藏按鈕骨架 */}
              <div className="absolute top-2 left-2 h-8 w-8 bg-muted/50 rounded-full"></div>
              
              {/* 股票圖標骨架 */}
              <div className="mb-2 sm:mb-3 h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10"></div>
              
              {/* 股票代碼骨架 */}
              <div className="h-5 w-16 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 rounded mb-1 sm:mb-2"></div>
              
              {/* 股票名稱骨架 */}
              <div className="h-4 w-20 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded mb-1 sm:mb-2"></div>
              
              {/* 股價資訊骨架 */}
              <div className="flex flex-col items-center gap-1 w-full mt-1">
                <div className="h-4 w-16 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 rounded"></div>
                <div className="h-3 w-24 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, TrendingDown, Minus, Sparkles, Eye, Search, Clock } from "lucide-react";
import { useState, useEffect } from "react";

interface SmartRecommendationCardProps {
  symbol: string;
  companyName?: string;
  currentPrice?: number;
  changePercent?: number;
  score: number;
  reason: string;
  viewCount: number;
  searchCount: number;
  totalViewTime: number;
  isFavorite: boolean;
  isInWatchlist: boolean;
  isAddingToWatchlist: boolean;
  isRemovingFromWatchlist: boolean;
  onToggleWatchlist: () => void;
  onClick: () => void;
}

export default function SmartRecommendationCard({
  symbol,
  companyName,
  currentPrice,
  changePercent,
  score,
  reason,
  viewCount,
  searchCount,
  totalViewTime,
  isFavorite,
  isInWatchlist,
  isAddingToWatchlist,
  isRemovingFromWatchlist,
  onToggleWatchlist,
  onClick,
}: SmartRecommendationCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 進場動畫延遲
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // 格式化時間（秒轉分鐘）
  const formatViewTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分鐘`;
  };

  // 判斷價格趨勢
  const getTrendIcon = () => {
    if (!changePercent) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (changePercent > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (changePercent < 0) return <TrendingDown className="h-4 w-4 text-error" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // 價格變動顏色
  const getPriceChangeColor = () => {
    if (!changePercent) return "text-muted-foreground";
    if (changePercent > 0) return "text-success";
    if (changePercent < 0) return "text-error";
    return "text-muted-foreground";
  };

  return (
    <Card
      className={`
        group relative overflow-hidden cursor-pointer
        border border-border hover:border-primary/50
        bg-card hover:bg-card/80
        transition-all duration-300 ease-out
        hover:shadow-lg hover:-translate-y-1
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      onClick={onClick}
    >
      {/* 背景漸層效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* 卡片內容 */}
      <div className="relative p-4 sm:p-5">
        {/* 頂部：股票代號與收藏按鈕 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground truncate">
                {symbol}
              </h3>
              {isFavorite && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded-full">
                  <Star className="h-3 w-3 text-accent fill-accent" />
                  <span className="text-xs font-medium text-accent">已收藏</span>
                </div>
              )}
            </div>
            {companyName && (
              <p className="text-sm text-muted-foreground truncate">
                {companyName}
              </p>
            )}
          </div>

          {/* 收藏按鈕 */}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist();
            }}
            disabled={isAddingToWatchlist || isRemovingFromWatchlist}
            className="h-9 w-9 rounded-full hover:bg-accent/10 shrink-0"
          >
            <Star
              className={`h-5 w-5 transition-all ${
                isInWatchlist
                  ? "text-accent fill-accent"
                  : "text-muted-foreground hover:text-accent"
              }`}
            />
          </Button>
        </div>

        {/* 中部：價格資訊 */}
        {currentPrice !== undefined && (
          <div className="mb-3 py-2 border-y border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold number-display text-foreground">
                  ${currentPrice.toFixed(2)}
                </span>
                {changePercent !== undefined && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span className={`text-sm font-semibold number-display ${getPriceChangeColor()}`}>
                      {changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 底部：推薦理由與行為統計 */}
        <div className="space-y-2">
          {/* 推薦理由 */}
          <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/90 leading-relaxed">
              {reason}
            </p>
          </div>

          {/* 行為統計標籤 */}
          <div className="flex flex-wrap gap-2">
            {viewCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  查看 {viewCount} 次
                </span>
              </div>
            )}
            {searchCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  搜尋 {searchCount} 次
                </span>
              </div>
            )}
            {totalViewTime > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  停留 {formatViewTime(totalViewTime)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 卡片底部裝飾線 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}

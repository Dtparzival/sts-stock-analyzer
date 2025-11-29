import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Globe, Star, History, Loader2, Target } from "lucide-react";
import { cleanTWSymbol, TW_STOCK_NAMES, getMarketFromSymbol } from "@shared/markets";
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

// 格式化相對時間
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

interface MobileRecommendationCarouselProps {
  recommendations: Array<{
    id: number;
    symbol: string;
    shortName: string | null;
    companyName: string | null;
    searchedAt: Date;
  }>;
  stockPriceMap: Map<string, any>;
  stockDataQueries: Array<any>;
  watchlistMap: Map<string, any>;
  toggleWatchlist: (e: React.MouseEvent, symbol: string, name: string) => void;
  addToWatchlistMutation: any;
  removeFromWatchlistMutation: any;
  setLocation: (path: string) => void;
}

export default function MobileRecommendationCarousel({
  recommendations,
  stockPriceMap,
  stockDataQueries,
  watchlistMap,
  toggleWatchlist,
  addToWatchlistMutation,
  removeFromWatchlistMutation,
  setLocation,
}: MobileRecommendationCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);
  
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);
  
  return (
    <div className="relative">
      {/* 輪播容器 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 touch-pan-y">
          {recommendations.map((item, index) => {
            // 處理顯示名稱：優先使用 shortName，其次是 companyName，最後從備用映射表獲取
            let displaySymbol = item.symbol;
            let displayName = item.shortName || item.companyName;
            
            const market = getMarketFromSymbol(item.symbol);
            if (market === 'TW') {
              const cleanSymbol = cleanTWSymbol(item.symbol);
              displaySymbol = cleanSymbol;
              
              // 如果沒有 shortName 且 companyName 是舊格式，則從備用映射表獲取
              if (!item.shortName && (!displayName || displayName === item.symbol || displayName.includes('.TW'))) {
                displayName = TW_STOCK_NAMES[cleanSymbol] || null;
              }
            }
            
            return (
              <div 
                key={item.id} 
                className="flex-[0_0_75%] min-w-0"
              >
                <Card
                  className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 active:scale-95 rounded-xl shadow-md touch-manipulation h-full"
                  onClick={() => setLocation(`/stock/${item.symbol}`)}
                >
                  {/* 市場標籤 */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      market === 'US' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-green-500/20 text-green-700'
                    }`}>
                      <Globe className="h-3 w-3" />
                      {market === 'US' ? '美股' : '台股'}
                    </span>
                  </div>
                  
                  {/* 漸層背景裝飾 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <CardContent className="relative p-4 flex flex-col items-center justify-center min-h-[160px]">
                    {/* 股票圖標 - 根據漲跌顯示不同顏色 - 僅在數據載入完成後顯示 */}
                    {(() => {
                      const stockData = stockPriceMap.get(item.symbol);
                      const isLoading = stockDataQueries[index]?.isLoading;
                      
                      // 如果正在載入或沒有數據，不顯示圖示
                      if (isLoading || !stockData) {
                        return null;
                      }
                      
                      const meta = stockData?.chart?.result?.[0]?.meta;
                      const currentPrice = meta?.regularMarketPrice;
                      const previousClose = meta?.previousClose || meta?.chartPreviousClose;
                      
                      // 如果價格數據不完整，不顯示圖示
                      if (!currentPrice || !previousClose) {
                        return null;
                      }
                      
                      const change = currentPrice - previousClose;
                      const isPositive = change >= 0;
                      
                      return (
                        <div className={`mb-2 p-2 rounded-full transition-colors ${
                          isPositive 
                            ? 'bg-green-500/10 group-hover:bg-green-500/20' 
                            : 'bg-red-500/10 group-hover:bg-red-500/20'
                        }`}>
                          <TrendingUp className={`h-4 w-4 ${
                            isPositive ? 'text-green-600' : 'text-red-600 rotate-[60deg]'
                          }`} />
                        </div>
                      );
                    })()}
                    
                    {/* 股票代碼 */}
                    <div className="text-center mb-1">
                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {displaySymbol}
                      </h4>
                    </div>
                    
                    {/* 股票名稱 */}
                    {displayName && (
                      <p className="text-xs text-muted-foreground text-center line-clamp-2 mb-1 min-h-[2rem] px-1">
                        {displayName}
                      </p>
                    )}
                    
                    {/* 即時股價資訊 */}
                    {(() => {
                      const stockData = stockPriceMap.get(item.symbol);
                      const isLoading = stockDataQueries[index]?.isLoading;
                      
                      if (isLoading) {
                        return (
                          <div className="flex flex-col items-center gap-1 w-full animate-pulse">
                            {/* 骨架屏 - 當前股價 */}
                            <div className="h-5 w-20 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 rounded"></div>
                            {/* 骨架屏 - 漲跌幅 */}
                            <div className="h-4 w-28 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded"></div>
                          </div>
                        );
                      }
                      
                      if (!stockData) {
                        return (
                          <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <History className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatRelativeTime(item.searchedAt)}</span>
                          </div>
                        );
                      }
                      
                      // 從 stockData 中提取價格資訊
                      const meta = stockData?.chart?.result?.[0]?.meta;
                      const currentPrice = meta?.regularMarketPrice;
                      const previousClose = meta?.previousClose || meta?.chartPreviousClose;
                      
                      // 檢查數據是否完整
                      if (!currentPrice || !previousClose) {
                        return (
                          <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <History className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatRelativeTime(item.searchedAt)}</span>
                          </div>
                        );
                      }
                      
                      const change = currentPrice - previousClose;
                      const changePercent = (change / previousClose) * 100;
                      const isPositive = change >= 0;
                      
                      return (
                        <div className="flex flex-col items-center gap-1 w-full">
                          {/* 當前股價 */}
                          <div className="number-display text-sm font-bold text-foreground">
                            ${currentPrice.toFixed(2)}
                          </div>
                          {/* 漲跌幅 */}
                          <div className={`number-display text-xs font-semibold ${
                            isPositive 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* 收藏按鈕 - 優化觸控區域 */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 left-2 z-10 h-10 w-10 rounded-full bg-background/80 hover:bg-background hover:scale-110 transition-all duration-200 shadow-sm touch-manipulation"
                      onClick={(e) => toggleWatchlist(e, item.symbol, displayName || item.companyName || '')}
                      disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                    >
                      {addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : watchlistMap.has(item.symbol) ? (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 指示器點點 */}
      <div className="flex justify-center gap-2 mt-4">
        {recommendations.map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex 
                ? 'w-6 bg-primary' 
                : 'w-2 bg-primary/30'
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`前往第 ${index + 1} 張卡片`}
          />
        ))}
      </div>
    </div>
  );
}

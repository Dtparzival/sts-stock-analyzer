import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Globe, Star, History, Loader2, Share2, GitCompare, X } from "lucide-react";
import { cleanTWSymbol, TW_STOCK_NAMES, getMarketFromSymbol } from "@shared/markets";
import { useSwipeable } from 'react-swipeable';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";

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

interface EnhancedRecommendationCardProps {
  item: {
    id: number;
    symbol: string;
    shortName: string | null;
    companyName: string | null;
    searchedAt: Date;
  };
  stockData: any;
  isLoading: boolean;
  isInWatchlist: boolean;
  onToggleWatchlist: (e: React.MouseEvent) => void;
  onNavigate: () => void;
  onShare?: () => void;
  onCompare?: () => void;
  isPending: boolean;
}

export default function EnhancedRecommendationCard({
  item,
  stockData,
  isLoading,
  isInWatchlist,
  onToggleWatchlist,
  onNavigate,
  onShare,
  onCompare,
  isPending,
}: EnhancedRecommendationCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 處理顯示名稱
  let displaySymbol = item.symbol;
  let displayName = item.shortName || item.companyName;
  
  const market = getMarketFromSymbol(item.symbol);
  if (market === 'TW') {
    const cleanSymbol = cleanTWSymbol(item.symbol);
    displaySymbol = cleanSymbol;
    
    // 如果沒有從資料庫獲取到名稱，則從備用映射表獲取
    // 注意：TW_STOCK_NAMES 的 key 是完整格式（例如 2330.TW），所以要用原始 symbol
    if (!item.shortName && (!displayName || displayName === item.symbol || displayName.includes('.TW'))) {
      displayName = TW_STOCK_NAMES[item.symbol] || null;
    }
  }
  
  // 滑動手勢處理
  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const offset = eventData.deltaX;
      // 限制滑動範圍在 -80 到 80 之間
      const clampedOffset = Math.max(-80, Math.min(80, offset));
      setSwipeOffset(clampedOffset);
    },
    onSwiped: (eventData) => {
      // 如果滑動超過 50px，顯示操作按鈕
      if (Math.abs(eventData.deltaX) > 50) {
        setShowActions(true);
        setSwipeOffset(eventData.deltaX > 0 ? 80 : -80);
      } else {
        setSwipeOffset(0);
        setShowActions(false);
      }
    },
    trackMouse: false,
    trackTouch: true,
  });
  
  // 長按手勢處理
  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      setShowContextMenu(true);
      // 觸發震動反饋（如果設備支持）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms 長按觸發
  };
  
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };
  
  // 重置滑動狀態
  const resetSwipe = () => {
    setSwipeOffset(0);
    setShowActions(false);
  };
  
  // 處理分享
  const handleShare = async () => {
    setShowContextMenu(false);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displaySymbol} - ${displayName || '股票資訊'}`,
          text: `查看 ${displaySymbol} 的最新分析和股價資訊`,
          url: window.location.origin + `/stock/${item.symbol}`,
        });
      } catch (error) {
        // 用戶取消分享，不顯示錯誤
        if ((error as Error).name !== 'AbortError') {
          toast.error('分享失敗');
        }
      }
    } else {
      // 降級方案：複製連結
      try {
        await navigator.clipboard.writeText(window.location.origin + `/stock/${item.symbol}`);
        toast.success('連結已複製到剪貼簿');
      } catch (error) {
        toast.error('無法複製連結');
      }
    }
    
    onShare?.();
  };
  
  // 處理比較
  const handleCompare = () => {
    setShowContextMenu(false);
    toast.info('比較功能即將推出');
    onCompare?.();
  };
  
  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
        resetSwipe();
      }
    };
    
    if (showContextMenu || showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [showContextMenu, showActions]);
  
  return (
    <div className="relative" ref={cardRef}>
      {/* 背景操作按鈕 */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-between px-4 z-0"
          >
            {/* 左滑：收藏/取消收藏 */}
            {swipeOffset < 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto"
              >
                <Button
                  size="icon"
                  variant={isInWatchlist ? "destructive" : "default"}
                  className="h-12 w-12 rounded-full shadow-lg"
                  onClick={(e) => {
                    onToggleWatchlist(e);
                    resetSwipe();
                  }}
                >
                  {isInWatchlist ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Star className="h-5 w-5" />
                  )}
                </Button>
              </motion.div>
            )}
            
            {/* 右滑：分享 */}
            {swipeOffset > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mr-auto"
              >
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-12 w-12 rounded-full shadow-lg"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 卡片主體 */}
      <motion.div
        {...swipeHandlers}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        animate={{ x: swipeOffset }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10"
      >
        <Card
          className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 active:scale-95 rounded-xl shadow-md touch-manipulation"
          onClick={() => {
            if (!showActions && !showContextMenu) {
              onNavigate();
            }
          }}
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
            {/* 股票圖標 */}
            <div className="mb-2 p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            
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
              if (isLoading) {
                return (
                  <div className="flex flex-col items-center gap-1 w-full animate-pulse">
                    <div className="h-5 w-20 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 rounded"></div>
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
              
              const meta = stockData?.chart?.result?.[0]?.meta;
              const currentPrice = meta?.regularMarketPrice;
              const previousClose = meta?.previousClose || meta?.chartPreviousClose;
              
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
                  <div className="number-display text-sm font-bold text-foreground">
                    ${currentPrice.toFixed(2)}
                  </div>
                  <div className={`number-display text-xs font-semibold ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                  </div>
                </div>
              );
            })()}
            
            {/* 收藏按鈕 */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 left-2 z-10 h-10 w-10 rounded-full bg-background/80 hover:bg-background hover:scale-110 transition-all duration-200 shadow-sm touch-manipulation"
              onClick={onToggleWatchlist}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : isInWatchlist ? (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              ) : (
                <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* 長按選單 */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-background border border-border rounded-lg shadow-2xl p-2 min-w-[160px]"
          >
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                分享
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={handleCompare}
              >
                <GitCompare className="h-4 w-4" />
                比較
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={(e) => {
                  onToggleWatchlist(e);
                  setShowContextMenu(false);
                }}
              >
                <Star className="h-4 w-4" />
                {isInWatchlist ? '取消收藏' : '加入收藏'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import EnhancedRecommendationCard from './EnhancedRecommendationCard';
interface EnhancedMobileRecommendationCarouselProps {
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

export default function EnhancedMobileRecommendationCarousel({
  recommendations,
  stockPriceMap,
  stockDataQueries,
  watchlistMap,
  toggleWatchlist,
  addToWatchlistMutation,
  removeFromWatchlistMutation,
  setLocation,
}: EnhancedMobileRecommendationCarouselProps) {
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
  
  // 處理卡片導航
  const handleNavigate = (symbol: string) => {
    setLocation(`/stock/${symbol}`);
  };
  
  return (
    <div className="relative">
      {/* 輪播容器 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 touch-pan-y">
          {recommendations.map((item, index) => {
            const stockData = stockPriceMap.get(item.symbol);
            const isLoading = stockDataQueries[index]?.isLoading;
            const isInWatchlist = watchlistMap.has(item.symbol);
            const displayName = item.shortName || item.companyName || '';
            
            return (
              <div 
                key={item.id} 
                className="flex-[0_0_75%] min-w-0"
              >
                <EnhancedRecommendationCard
                  item={item}
                  stockData={stockData}
                  isLoading={isLoading}
                  isInWatchlist={isInWatchlist}
                  onToggleWatchlist={(e) => toggleWatchlist(e, item.symbol, displayName)}
                  onNavigate={() => handleNavigate(item.symbol)}
                  isPending={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                />
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

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Globe } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

interface HotStock {
  symbol: string;
  name: string;
}

interface MobileHotStocksCarouselProps {
  stocks: HotStock[];
  onStockClick: (symbol: string) => void;
  market?: 'US' | 'TW';
}

export default function MobileHotStocksCarousel({ 
  stocks, 
  onStockClick,
  market = 'US'
}: MobileHotStocksCarouselProps) {
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
          {stocks.map((stock, index) => (
            <div 
              key={stock.symbol} 
              className="flex-[0_0_45%] min-w-0"
            >
              <Card
                className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 active:scale-95 rounded-xl shadow-md touch-manipulation h-full"
                onClick={() => onStockClick(stock.symbol)}
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
                
                <CardContent className="relative p-3 flex flex-col items-center justify-center min-h-[100px]">
                  {/* 股票代碼 */}
                  <div className="text-center mb-2">
                    <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors number-display">
                      {stock.symbol}
                    </h4>
                  </div>
                  
                  {/* 股票名稱 */}
                  <p className="text-xs text-muted-foreground text-center line-clamp-2 px-1">
                    {stock.name}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
      
      {/* 指示器點點 */}
      <div className="flex justify-center gap-2 mt-4">
        {stocks.map((_, index) => (
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

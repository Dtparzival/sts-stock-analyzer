import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HotStock {
  symbol: string;
  name: string;
}

interface MobileHotStocksCarouselProps {
  stocks: HotStock[];
  onStockClick: (symbol: string) => void;
}

export default function MobileHotStocksCarousel({ stocks, onStockClick }: MobileHotStocksCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative px-4">
      {/* 輪播容器 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {stocks.map((stock, index) => (
            <div
              key={stock.symbol}
              className="flex-[0_0_45%] min-w-0 animate-fade-in"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center hover:bg-primary/10 hover:border-primary/50 hover:shadow-md transition-all card-hover border-2 active:scale-95"
                onClick={() => onStockClick(stock.symbol)}
              >
                <span className="text-lg font-bold text-foreground">{stock.symbol}</span>
                <span className="text-xs text-muted-foreground mt-1 line-clamp-1">{stock.name}</span>
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 左右導航按鈕 */}
      {canScrollPrev && (
        <Button
          size="icon"
          variant="ghost"
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background border border-border z-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      
      {canScrollNext && (
        <Button
          size="icon"
          variant="ghost"
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background border border-border z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

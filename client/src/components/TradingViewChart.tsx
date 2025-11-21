import { useEffect, useRef, useState } from "react";
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  HistogramData, 
  Time,
  CandlestickSeries,
  HistogramSeries
} from "lightweight-charts";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChartDataPoint {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  symbol: string;
  onRangeChange?: (range: string, interval: string) => void;
  data?: ChartDataPoint[];
  isLoading?: boolean;
  currentRange?: string;
}

const timeRanges = [
  { label: "1天", value: "1d", interval: "5m" },
  { label: "5天", value: "5d", interval: "15m" },
  { label: "1個月", value: "1mo", interval: "1d" },
  { label: "3個月", value: "3mo", interval: "1d" },
  { label: "1年", value: "1y", interval: "1wk" },
  { label: "5年", value: "5y", interval: "1mo" },
];

export default function TradingViewChart({
  symbol,
  onRangeChange,
  data = [],
  isLoading = false,
  currentRange = "1mo",
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  
  const [selectedRange, setSelectedRange] = useState(currentRange);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [isCustomRange, setIsCustomRange] = useState(false);

  // 同步父組件傳入的 currentRange
  useEffect(() => {
    if (currentRange.includes("-")) {
      setIsCustomRange(true);
      const [start, end] = currentRange.split("-");
      setCustomStartDate(new Date(parseInt(start) * 1000));
      setCustomEndDate(new Date(parseInt(end) * 1000));
    } else {
      setIsCustomRange(false);
      setSelectedRange(currentRange);
    }
  }, [currentRange]);

  // 初始化圖表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 獲取計算後的 CSS 顏色值
    const getComputedColor = (cssVar: string): string => {
      const root = document.documentElement;
      const value = getComputedStyle(root).getPropertyValue(cssVar).trim();
      // 如果是 HSL 格式，轉換為 hsl() 字符串
      if (value && !value.startsWith('hsl') && !value.startsWith('rgb') && !value.startsWith('#')) {
        return `hsl(${value})`;
      }
      return value || '#888888'; // 降級顏色
    };

    const textColor = getComputedColor('--muted-foreground');
    const borderColor = getComputedColor('--border');

    // 創建圖表
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          width: 1,
          color: textColor,
          style: 3, // Dashed
        },
        horzLine: {
          width: 1,
          color: textColor,
          style: 3, // Dashed
        },
      },
    });

    chartRef.current = chart;

    // 創建 K 線系列
    const candlestickSeriesInstance = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", // 綠色（上漲）
      downColor: "#ef4444", // 紅色（下跌）
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candlestickSeriesRef.current = candlestickSeriesInstance as any;

    // 創建成交量系列
    const volumeSeriesInstance = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume",
    });

    volumeSeriesRef.current = volumeSeriesInstance as any;

    // 設置成交量的價格比例
    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8, // 成交量佔 20% 的空間
        bottom: 0,
      },
    });

    // 響應式調整
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // 更新圖表數據
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !data || data.length === 0) {
      return;
    }

    // 轉換數據格式
    const candlestickData: CandlestickData<Time>[] = [];
    const volumeData: HistogramData<Time>[] = [];

    data.forEach((item) => {
      if (!item.open || !item.high || !item.low || !item.close) return;

      const time = item.timestamp as Time;

      // K 線數據
      candlestickData.push({
        time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      });

      // 成交量數據
      if (item.volume !== undefined) {
        const isUp = item.close >= item.open;
        volumeData.push({
          time,
          value: item.volume,
          color: isUp ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)", // 綠漲紅跌，半透明
        });
      }
    });

    // 設置數據
    candlestickSeriesRef.current.setData(candlestickData);
    volumeSeriesRef.current.setData(volumeData);

    // 自動調整視圖
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  const handleRangeChange = (range: string, interval: string) => {
    setSelectedRange(range);
    setIsCustomRange(false);
    onRangeChange?.(range, interval);
  };

  const handleCustomRangeApply = () => {
    if (!customStartDate || !customEndDate) return;
    
    const startTimestamp = Math.floor(customStartDate.getTime() / 1000);
    const endTimestamp = Math.floor(customEndDate.getTime() / 1000);
    const customRange = `${startTimestamp}-${endTimestamp}`;
    
    setIsCustomRange(true);
    onRangeChange?.(customRange, "1d");
  };

  return (
    <Card className="p-6">
      {/* 時間範圍選擇器 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {timeRanges.map((range) => (
          <Button
            key={range.value}
            size="sm"
            variant={selectedRange === range.value && !isCustomRange ? "default" : "outline"}
            onClick={() => handleRangeChange(range.value, range.interval)}
            disabled={isLoading}
          >
            {range.label}
          </Button>
        ))}
        
        {/* 自訂日期範圍 */}
        <div className="flex items-center gap-2 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !customStartDate && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "yyyy/MM/dd", { locale: zhTW }) : "起始日期"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground">至</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !customEndDate && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "yyyy/MM/dd", { locale: zhTW }) : "結束日期"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button
            size="sm"
            onClick={handleCustomRangeApply}
            disabled={!customStartDate || !customEndDate || isLoading}
            variant={isCustomRange ? "default" : "outline"}
          >
            查詢
          </Button>
        </div>
      </div>

      {/* 圖表容器 */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {!isLoading && (!data || data.length === 0) && (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">暫無數據</p>
              <p className="text-sm mt-2">請選擇其他時間範圍或稍後再試</p>
            </div>
          </div>
        )}
        
        <div
          ref={chartContainerRef}
          className={cn(
            "w-full",
            (!data || data.length === 0 || isLoading) && "hidden"
          )}
        />
      </div>
    </Card>
  );
}

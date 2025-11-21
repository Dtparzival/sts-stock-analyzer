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
import { Calendar as CalendarIcon, Maximize2, Minimize2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ChartSkeleton from "./ChartSkeleton";

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
  
  const [selectedRange, setSelectedRange] = useState<string>(currentRange);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useNativeFullscreen, setUseNativeFullscreen] = useState(true);
  const chartCardRef = useRef<HTMLDivElement>(null);
  
  // Tooltip 狀態
  const [tooltipData, setTooltipData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
    x: number;
    y: number;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // 檢查 Fullscreen API 是否可用
  useEffect(() => {
    setUseNativeFullscreen(!!document.fullscreenEnabled);
  }, []);
  
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
      
      // 如果是 OKLCH 格式，使用 Canvas API 強制轉換為 RGB
      if (value && value.startsWith('oklch')) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = value;
            ctx.fillRect(0, 0, 1, 1);
            const imageData = ctx.getImageData(0, 0, 1, 1).data;
            const rgb = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
            console.log(`[TradingView] OKLCH conversion: ${value} -> ${rgb}`);
            return rgb;
          }
        } catch (error) {
          console.error(`[TradingView] Failed to convert OKLCH: ${value}`, error);
        }
        return '#888888';
      }
      
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
        vertLines: { 
          color: borderColor,
          style: 1, // Dotted
        },
        horzLines: { 
          color: borderColor,
          style: 1, // Dotted
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: isFullscreen && !useNativeFullscreen ? window.innerHeight - 150 : 500, // 降級全螢幕模式下自動調整高度
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // 留出空間給成交量
        },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          width: 1,
          color: textColor,
          style: 2, // Dashed
          labelBackgroundColor: textColor,
        },
        horzLine: {
          width: 1,
          color: textColor,
          style: 2, // Dashed
          labelBackgroundColor: textColor,
        },
      },
      handleScroll: {
        mouseWheel: true, // 啟用滑鼠滾輪縮放
        pressedMouseMove: true, // 啟用滑鼠拖曳
      },
      handleScale: {
        mouseWheel: true, // 啟用滑鼠滾輪縮放
        pinch: true, // 啟用觸控縮放
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
        top: 0.85, // 成交量佔 15% 的空間，K 線圖佔 85%
        bottom: 0,
      },
      visible: false, // 隱藏成交量的價格標籤，避免與 K 線圖重疊
    });

    // 響應式調整（帶 debounce 防抖機制）
    let resizeTimeout: NodeJS.Timeout | null = null;

    const handleResize = () => {
      // 清除之前的延遲執行
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // 設定 150ms 延遲，只有當用戶停止調整視窗大小後才執行
      resizeTimeout = setTimeout(() => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: isFullscreen && !useNativeFullscreen ? window.innerHeight - 150 : 500,
          });
        }
      }, 150);
    };

    const handleFullscreenChange = () => {
      handleResize();
    };

    // 訂閱 Crosshair 事件，實現 Tooltip 功能
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point || !candlestickSeriesRef.current || !volumeSeriesRef.current) {
        setTooltipData(null);
        return;
      }

      const candleData = param.seriesData.get(candlestickSeriesRef.current) as CandlestickData | undefined;
      const volumeData = param.seriesData.get(volumeSeriesRef.current) as HistogramData | undefined;
      
      if (!candleData) {
        setTooltipData(null);
        return;
      }

      // 計算漲跌幅
      const change = candleData.close - candleData.open;
      const changePercent = (change / candleData.open) * 100;

      // 格式化時間
      const timeStr = typeof param.time === 'number' 
        ? new Date(param.time * 1000).toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : String(param.time);

      setTooltipData({
        time: timeStr,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: volumeData?.value || 0,
        change,
        changePercent,
        x: param.point.x,
        y: param.point.y,
      });
    });

    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      // 清除延遲執行
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      chart.remove();
    };
  }, [isFullscreen, useNativeFullscreen]);

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

    // 添加當前價格水平線
    if (candlestickData.length > 0) {
      const lastCandle = candlestickData[candlestickData.length - 1];
      const currentPrice = lastCandle.close;
      const isUp = lastCandle.close >= lastCandle.open;
      
      candlestickSeriesRef.current.createPriceLine({
        price: currentPrice,
        color: isUp ? "#22c55e" : "#ef4444", // 綠漲紅跌
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: "",
      });
    }

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

  // 全螢幕模式處理
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (isFullscreen && !useNativeFullscreen) {
          // 降級模式：ESC 鍵退出 CSS 全螢幕
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, useNativeFullscreen]);

  const toggleFullscreen = async () => {
    if (!chartCardRef.current) return;

    try {
      if (useNativeFullscreen) {
        // 優先使用原生 Fullscreen API
        if (!document.fullscreenElement) {
          await chartCardRef.current.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } else {
        // 降級策略：使用 CSS fixed 定位模擬全螢幕
        setIsFullscreen(!isFullscreen);
      }
    } catch (err) {
      console.error('全螢幕模式切換失敗:', err);
      // 如果原生 API 失敗，自動切換到降級模式
      setUseNativeFullscreen(false);
      setIsFullscreen(!isFullscreen);
    }
  };

  return (
    <Card 
      ref={chartCardRef}
      className={cn(
        "p-6 transition-all",
        isFullscreen && "bg-background",
        // 降級模式：使用 CSS fixed 定位模擬全螢幕
        !useNativeFullscreen && isFullscreen && "fixed inset-0 z-[9999] w-screen h-screen rounded-none"
      )}
      style={!useNativeFullscreen && isFullscreen ? {
        margin: 0,
        maxWidth: '100vw',
        maxHeight: '100vh',
      } : undefined}
    >
      {/* 時間範圍選擇器 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 全螢幕按鈕 */}
        <Button
          size="sm"
          variant="outline"
          onClick={toggleFullscreen}
          className="mr-2"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        
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
      {isLoading ? (
        <ChartSkeleton />
      ) : !data || data.length === 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">暫無數據</p>
              <p className="text-sm mt-2">請選擇其他時間範圍或稍後再試</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="relative">
          <div
            ref={chartContainerRef}
            className="w-full"
          />
          
          {/* Tooltip */}
          {tooltipData && (() => {
            // 格式化成交量（K/M/B）
            const formatVolume = (vol: number): string => {
              if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
              if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
              if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
              return vol.toFixed(0);
            };

            return (
              <div
                ref={tooltipRef}
                className={cn(
                  "absolute pointer-events-none z-20 rounded-md shadow-lg p-2 min-w-[160px] backdrop-blur-sm",
                  "bg-background/98 border",
                  tooltipData.change >= 0 ? "border-green-500/50" : "border-red-500/50"
                )}
                style={{
                  left: `${Math.min(tooltipData.x + 15, window.innerWidth - 200)}px`,
                  top: `${Math.max(tooltipData.y - 10, 10)}px`,
                }}
              >
                <div className="text-[10px] font-medium text-muted-foreground mb-1.5">{tooltipData.time}</div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">O:</span>
                    <span className="font-mono font-semibold">{tooltipData.open.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">H:</span>
                    <span className="font-mono font-semibold text-green-600">{tooltipData.high.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">L:</span>
                    <span className="font-mono font-semibold text-red-600">{tooltipData.low.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">C:</span>
                    <span className="font-mono font-semibold">{tooltipData.close.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">成交量:</span>
                    <span className="font-mono font-semibold">{formatVolume(tooltipData.volume)}</span>
                  </div>
                  <div className="border-t border-border pt-1 mt-1">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">漲跌幅:</span>
                      <span 
                        className={cn(
                          "font-mono font-bold text-xs",
                          tooltipData.change >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {tooltipData.change >= 0 ? '+' : ''}{tooltipData.change.toFixed(2)} ({tooltipData.changePercent >= 0 ? '+' : ''}{tooltipData.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}

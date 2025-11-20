import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, CandlestickData, HistogramData, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";
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
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
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
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const [selectedRange, setSelectedRange] = useState(currentRange);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [isCustomRange, setIsCustomRange] = useState(false);

  // 同步父組件傳入的 currentRange
  useEffect(() => {
    if (currentRange.includes("-")) {
      setIsCustomRange(true);
      setSelectedRange("custom");
    } else {
      setIsCustomRange(false);
      setSelectedRange(currentRange);
    }
  }, [currentRange]);

  const handleRangeChange = (range: string, interval: string) => {
    setSelectedRange(range);
    setIsCustomRange(false);
    onRangeChange?.(range, interval);
  };

  const handleCustomRangeApply = () => {
    if (!customStartDate || !customEndDate) {
      return;
    }
    
    if (customStartDate > customEndDate) {
      alert("起始日期不能晚於結束日期");
      return;
    }
    
    setIsCustomRange(true);
    setSelectedRange("custom");
    
    const daysDiff = Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24));
    let interval = "1d";
    if (daysDiff <= 5) {
      interval = "15m";
    } else if (daysDiff <= 60) {
      interval = "1d";
    } else if (daysDiff <= 365) {
      interval = "1wk";
    } else {
      interval = "1mo";
    }
    
    const startTimestamp = Math.floor(customStartDate.getTime() / 1000);
    const endTimestamp = Math.floor(customEndDate.getTime() / 1000);
    
    onRangeChange?.(`${startTimestamp}-${endTimestamp}`, interval);
  };

  // 初始化圖表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#374151", style: 1, visible: true },
        horzLines: { color: "#374151", style: 1, visible: true },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#374151",
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 創建 K 線圖系列
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candlestickSeriesRef.current = candlestickSeries;

    // 創建成交量系列
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    volumeSeriesRef.current = volumeSeries;

    // 調整成交量系列的高度
    chart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // 響應式調整圖表大小
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

    // 轉換數據格式為 Lightweight Charts 格式
    const candlestickData: CandlestickData[] = [];
    const volumeData: HistogramData[] = [];

    data.forEach((item) => {
      if (item.open !== undefined && item.high !== undefined && item.low !== undefined && item.close !== undefined) {
        candlestickData.push({
          time: item.timestamp as any,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        });

        if (item.volume !== undefined) {
          volumeData.push({
            time: item.timestamp as any,
            value: item.volume,
            color: item.close >= item.open ? "#22c55e80" : "#ef444480",
          });
        }
      }
    });

    // 設置數據
    candlestickSeriesRef.current.setData(candlestickData);
    volumeSeriesRef.current.setData(volumeData);

    // 自動調整可見範圍
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // 計算價格變化百分比
  const priceChange =
    data.length >= 2
      ? ((data[data.length - 1].price - data[0].price) / data[0].price) * 100
      : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="space-y-4">
      {/* 時間範圍選擇器 */}
      <div className="flex flex-wrap gap-2 items-center">
        {timeRanges.map((range) => (
          <Button
            key={range.value}
            variant={selectedRange === range.value && !isCustomRange ? "default" : "outline"}
            size="sm"
            onClick={() => handleRangeChange(range.value, range.interval)}
            disabled={isLoading}
          >
            {range.label}
          </Button>
        ))}
        
        <div className="h-8 w-px bg-border mx-2" />
        
        {/* 自訂日期範圍 */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
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
                variant="outline"
                size="sm"
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

      {/* 圖表區域 */}
      <Card className="p-6">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">載入圖表數據中...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">暫無圖表數據</p>
              <p className="text-sm text-muted-foreground">
                請選擇其他時間範圍
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 價格變化指標 */}
            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                ${data[data.length - 1]?.price.toFixed(2)}
              </span>
              <span
                className={`text-sm font-medium ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {isPositive ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
            </div>

            {/* TradingView 圖表 */}
            <div ref={chartContainerRef} className="w-full" />
          </>
        )}
      </Card>
    </div>
  );
}

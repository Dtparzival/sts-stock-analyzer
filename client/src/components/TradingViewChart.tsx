import { useEffect, useRef, useState } from "react";
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  Time,
  CandlestickSeries,
} from "lightweight-charts";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Calendar as CalendarIcon, Maximize2, Minimize2, ChevronsRight, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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

// 數據轉換函數：將日線圖數據轉換為週線圖或月線圖
function aggregateData(
  data: ChartDataPoint[],
  period: 'daily' | 'weekly' | 'monthly'
): ChartDataPoint[] {
  if (period === 'daily' || data.length === 0) {
    return data;
  }

  const aggregated: ChartDataPoint[] = [];
  let currentGroup: ChartDataPoint[] = [];
  
  // 根據週期類型分組
  const getGroupKey = (date: Date, period: 'weekly' | 'monthly') => {
    if (period === 'weekly') {
      // 每週一為一週的開始
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      return `${monday.getFullYear()}-W${Math.ceil((monday.getDate()) / 7)}`;
    } else {
      // 每月的第一天
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  };

  let currentKey = '';
  
  data.forEach((point, index) => {
    const date = new Date(point.timestamp * 1000);
    const key = getGroupKey(date, period);
    
    if (key !== currentKey) {
      // 開始新的分組
      if (currentGroup.length > 0) {
        aggregated.push(aggregateGroup(currentGroup));
      }
      currentGroup = [point];
      currentKey = key;
    } else {
      currentGroup.push(point);
    }
    
    // 最後一個分組
    if (index === data.length - 1 && currentGroup.length > 0) {
      aggregated.push(aggregateGroup(currentGroup));
    }
  });
  
  return aggregated;
}

// 合併一組數據點
function aggregateGroup(group: ChartDataPoint[]): ChartDataPoint {
  const first = group[0];
  const last = group[group.length - 1];
  
  return {
    timestamp: first.timestamp,
    date: first.date,
    open: first.open,
    high: Math.max(...group.map(d => d.high)),
    low: Math.min(...group.map(d => d.low)),
    close: last.close,
    volume: group.reduce((sum, d) => sum + (d.volume || 0), 0),
  };
}

export default function TradingViewChart({
  symbol,
  onRangeChange,
  data = [],
  isLoading = false,
  currentRange = "1mo",
}: TradingViewChartProps) {
  // 單一圖表容器
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // 圖表實例
  const chartRef = useRef<IChartApi | null>(null);
  
  // 系列引用
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [selectedRange, setSelectedRange] = useState<string>(currentRange);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

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

  // 初始化單一圖表
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

    // 創建圖表（100% 高度）
    const chartHeight = isFullscreen && !useNativeFullscreen ? window.innerHeight - 150 : 500;
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
      height: chartHeight,
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        vertTouchDrag: true, // 啟用垂直觸控拖曳
      },
      handleScale: {
        mouseWheel: true,
        pinch: true, // 啟用雙指縮放
        axisPressedMouseMove: true,
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    // 創建 K 線系列（使用專業信任藍配色方案）
    const upColor = "#3b82f6"; // 藍色（上漲）
    const downColor = "#ef4444"; // 紅色（下跌）
    const candlestickSeriesInstance = chart.addSeries(CandlestickSeries, {
      upColor: upColor,
      downColor: downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    candlestickSeriesRef.current = candlestickSeriesInstance as any;

    // 添加當前價格水平線
    if (data.length > 0) {
      const lastPrice = data[data.length - 1].close;
      const firstPrice = data[0].open;
      const isUp = lastPrice >= firstPrice;

      candlestickSeriesInstance.createPriceLine({
        price: lastPrice,
        color: isUp ? "#3b82f6" : "#ef4444", // 使用藍色表示上漲
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: "當前價格",
      });
    }

    // 設置十字線事件（Tooltip）
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point || !candlestickSeriesRef.current) {
        setTooltipData(null);
        return;
      }

      const candleData = param.seriesData.get(candlestickSeriesRef.current) as CandlestickData | undefined;
      
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

      // 從處理後的數據中查找對應的成交量
      const processedData = aggregateData(data, chartPeriod);
      const dataPoint = processedData.find(d => {
        if (typeof param.time === 'number') {
          return d.timestamp === param.time;
        } else {
          return d.date === param.time;
        }
      });

      setTooltipData({
        time: timeStr,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: dataPoint?.volume || 0,
        change,
        changePercent,
        x: param.point.x,
        y: param.point.y,
      });
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
          });
        }
      }, 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // 清除延遲執行
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      chart.remove();
    };
  }, [isFullscreen, useNativeFullscreen]);

  // 更新圖表數據
  useEffect(() => {
    if (!candlestickSeriesRef.current || data.length === 0) return;

    // 根據選擇的時間週期轉換數據
    const processedData = aggregateData(data, chartPeriod);

    // 轉換數據格式
    const candlestickData: CandlestickData[] = processedData.map((d) => ({
      time: (d.timestamp || new Date(d.date).getTime() / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    // 設置數據
    candlestickSeriesRef.current.setData(candlestickData);

    // 自動縮放以適應所有數據
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, chartPeriod]);

  // 處理時間範圍變更
  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    setIsCustomRange(false);
    const selectedTimeRange = timeRanges.find((r) => r.value === range);
    if (selectedTimeRange && onRangeChange) {
      onRangeChange(selectedTimeRange.value, selectedTimeRange.interval);
    }
  };

  // 處理自訂日期範圍查詢
  const handleCustomRangeQuery = () => {
    if (!customStartDate || !customEndDate) return;

    const startTimestamp = Math.floor(customStartDate.getTime() / 1000);
    const endTimestamp = Math.floor(customEndDate.getTime() / 1000);

    if (onRangeChange) {
      const daysDiff = Math.floor((endTimestamp - startTimestamp) / 86400);
      let interval = "1d";
      if (daysDiff <= 1) interval = "15m";
      else if (daysDiff <= 7) interval = "1d";
      else if (daysDiff <= 90) interval = "1wk";
      else interval = "1mo";

      onRangeChange(`${startTimestamp}-${endTimestamp}`, interval);
      setIsCustomRange(true);
    }
  };

  // 跳至最新數據
  const handleJumpToLatest = () => {
    if (!chartRef.current) return;
    try {
      chartRef.current.timeScale().scrollToRealTime();
    } catch (error) {
      console.error('[TradingView] Failed to jump to latest:', error);
    }
  };

  // 重置縮放
  const handleResetZoom = () => {
    if (!chartRef.current) return;
    try {
      chartRef.current.timeScale().fitContent();
    } catch (error) {
      console.error('[TradingView] Failed to reset zoom:', error);
    }
  };

  // 切換全螢幕模式
  const toggleFullscreen = async () => {
    if (!chartCardRef.current) return;

    try {
      if (!isFullscreen) {
        // 進入全螢幕
        if (useNativeFullscreen && chartCardRef.current.requestFullscreen) {
          await chartCardRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else {
          // 降級策略：使用 CSS fixed 定位
          setIsFullscreen(true);
        }
      } else {
        // 退出全螢幕
        if (useNativeFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          // 降級策略
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('[TradingView] Fullscreen error:', error);
      // 如果原生 API 失敗，使用降級策略
      setIsFullscreen(!isFullscreen);
    }
  };

  // 監聽全螢幕變化事件
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (useNativeFullscreen) {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [useNativeFullscreen]);

  // 監聽 ESC 鍵退出全螢幕
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (!useNativeFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, useNativeFullscreen]);

  // 格式化成交量
  const formatVolume = (volume: number): string => {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(2)}B`;
    } else if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toString();
  };

  // 智能 Tooltip 定位（檢查邊界）
  const getTooltipPosition = () => {
    if (!tooltipData) return {};

    const tooltipWidth = 130; // Tooltip 最小寬度
    const tooltipHeight = 150; // Tooltip 預估高度
    const padding = 10; // 邊界留白

    let left = tooltipData.x + 15;
    let top = tooltipData.y - 10;

    // 檢查右邊界
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = tooltipData.x - tooltipWidth - 15; // 顯示在左側
    }

    // 檢查下邊界
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = window.innerHeight - tooltipHeight - padding;
    }

    // 檢查上邊界
    if (top < padding) {
      top = padding;
    }

    // 檢查左邊界
    if (left < padding) {
      left = padding;
    }

    return { left: `${left}px`, top: `${top}px` };
  };

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
          無圖表數據
        </div>
      </Card>
    );
  }

  return (
    <Card 
      ref={chartCardRef}
      className={cn(
        "p-4",
        isFullscreen && !useNativeFullscreen && "fixed inset-0 z-[9999] rounded-none"
      )}
    >
      {/* 控制欄 */}
      <div className="space-y-3 mb-4">
        {/* 手機版：時間範圍下拉選單 */}
        <div className="md:hidden space-y-2">
          {/* 時間週期切換 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">週期：</span>
            <div className="flex gap-1 flex-1">
              <Button
                variant={chartPeriod === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('daily')}
                disabled={isLoading}
                className="flex-1"
              >
                日線
              </Button>
              <Button
                variant={chartPeriod === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('weekly')}
                disabled={isLoading}
                className="flex-1"
              >
                週線
              </Button>
              <Button
                variant={chartPeriod === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('monthly')}
                disabled={isLoading}
                className="flex-1"
              >
                月線
              </Button>
            </div>
          </div>
          
          {/* 時間範圍選擇 */}
          <Select
            value={isCustomRange ? "custom" : selectedRange}
            onValueChange={(value) => {
              if (value === "custom") {
                setIsCustomRange(true);
              } else {
                handleRangeChange(value);
              }
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選擇時間範圍" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">自訂範圍</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 桌面版：時間範圍按鈕組 */}
        <div className="hidden md:flex flex-wrap items-center gap-4">
          {/* 時間週期切換 */}
          <div className="flex items-center gap-2 border-r border-border pr-4">
            <span className="text-sm text-muted-foreground">週期：</span>
            <div className="flex gap-1">
              <Button
                variant={chartPeriod === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('daily')}
                disabled={isLoading}
                className="px-3"
              >
                日線
              </Button>
              <Button
                variant={chartPeriod === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('weekly')}
                disabled={isLoading}
                className="px-3"
              >
                週線
              </Button>
              <Button
                variant={chartPeriod === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('monthly')}
                disabled={isLoading}
                className="px-3"
              >
                月線
              </Button>
            </div>
          </div>
          
          {/* 時間範圍按鈕 */}
          <div className="flex flex-wrap items-center gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={selectedRange === range.value && !isCustomRange ? "default" : "outline"}
              size="sm"
              onClick={() => handleRangeChange(range.value)}
              disabled={isLoading}
            >
              {range.label}
            </Button>
          ))}
          </div>
        </div>

        {/* 自訂日期範圍和功能按鈕 */}
        {/* 手機版：垂直排列 */}
        <div className="md:hidden space-y-2">
          {/* 日期選擇器 */}
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !customStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, "MM/dd", { locale: zhTW }) : "起始日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  locale={zhTW}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !customEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "MM/dd", { locale: zhTW }) : "結束日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  disabled={(date) => 
                    date > new Date() || 
                    (customStartDate ? date < customStartDate : false)
                  }
                  initialFocus
                  locale={zhTW}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 查詢按鈕 */}
          <Button
            variant="default"
            size="sm"
            onClick={handleCustomRangeQuery}
            disabled={!customStartDate || !customEndDate || isLoading}
            className="w-full"
          >
            查詢自訂範圍
          </Button>

          {/* 功能按鈕組 */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              disabled={isLoading}
              title="重置縮放"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleJumpToLatest}
              disabled={isLoading}
              title="跳至最新"
              className="w-full"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              title="全螢幕"
              className="w-full"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 桌面版：水平排列 */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
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
                  locale={zhTW}
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
                  disabled={(date) => 
                    date > new Date() || 
                    (customStartDate ? date < customStartDate : false)
                  }
                  initialFocus
                  locale={zhTW}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="default"
              size="sm"
              onClick={handleCustomRangeQuery}
              disabled={!customStartDate || !customEndDate || isLoading}
            >
              查詢
            </Button>
          </div>

          {/* 功能按鈕組 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            disabled={isLoading}
            title="重置縮放"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleJumpToLatest}
            disabled={isLoading}
            title="跳至最新數據"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 圖表容器 */}
      <div ref={chartContainerRef} className="relative" />

      {/* Tooltip */}
      {tooltipData && (
        <div
          ref={tooltipRef}
          className="fixed z-50 min-w-[130px] rounded-md border bg-background/98 backdrop-blur-sm p-1.5 text-[10px] shadow-md pointer-events-none"
          style={{
            ...getTooltipPosition(),
            borderColor: tooltipData.changePercent >= 0 ? "#3b82f6" : "#ef4444",
            borderWidth: "1px",
          }}
        >
          {/* 時間 */}
          <div className="text-[9px] text-muted-foreground mb-0.5 font-medium">
            {tooltipData.time}
          </div>

          {/* OHLC 數據 */}
          <div className="space-y-0 font-mono">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground font-medium">O</span>
              <span className="font-semibold">${tooltipData.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground font-medium">H</span>
              <span className="font-semibold text-green-600">${tooltipData.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground font-medium">L</span>
              <span className="font-semibold text-red-600">${tooltipData.low.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground font-medium">C</span>
              <span className="font-semibold">${tooltipData.close.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground font-medium text-[9px]">量</span>
              <span className="font-semibold text-[9px]">{formatVolume(tooltipData.volume)}</span>
            </div>
          </div>

          {/* 漲跌幅 */}
          <div 
            className="pt-0.5 mt-0.5 border-t border-border/50"
          >
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground font-medium text-[9px]">漲跌</span>
              <span 
                className={cn(
                  "font-bold text-[10px]",
                  tooltipData.changePercent >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {tooltipData.changePercent >= 0 ? "+" : ""}
                {tooltipData.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

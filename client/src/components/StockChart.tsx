import { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  volume?: number;
}

interface StockChartProps {
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

export default function StockChart({
  symbol,
  onRangeChange,
  data = [],
  isLoading = false,
  currentRange = "1mo",
}: StockChartProps) {
  const [selectedRange, setSelectedRange] = useState(currentRange);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [isCustomRange, setIsCustomRange] = useState(false);

  // 同步父組件傳入的 currentRange
  useEffect(() => {
    // 如果 currentRange 包含 "-" 表示是自訂範圍
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
    
    // 計算日期差異以決定適當的 interval
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
    
    // 轉換為 Unix timestamp (秒)
    const startTimestamp = Math.floor(customStartDate.getTime() / 1000);
    const endTimestamp = Math.floor(customEndDate.getTime() / 1000);
    
    onRangeChange?.(`${startTimestamp}-${endTimestamp}`, interval);
  };

  // 計算價格變化百分比
  const priceChange =
    data.length >= 2
      ? ((data[data.length - 1].price - data[0].price) / data[0].price) * 100
      : 0;
  const isPositive = priceChange >= 0;

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-1.5 bg-card/95 backdrop-blur border-border shadow-sm min-w-[120px]">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground leading-tight">{data.date}</p>
            <p className="text-sm font-semibold leading-tight">
              ${data.price.toFixed(2)}
            </p>
            {data.volume && (
              <p className="text-[10px] text-muted-foreground leading-tight">
                量: {(data.volume / 1000000).toFixed(1)}M
              </p>
            )}
          </div>
        </Card>
      );
    }
    return null;
  };

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
        
        {/* 分隔線 */}
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

            {/* 圖表 */}
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? "#22c55e" : "#ef4444"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? "#22c55e" : "#ef4444"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? "#22c55e" : "#ef4444"}
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>
    </div>
  );
}

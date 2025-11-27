import { Card } from "./ui/card";

/**
 * 圖表骨架屏組件
 * 在圖表載入時顯示，模擬圖表的大致輪廓，提升用戶等待體驗
 */
export default function ChartSkeleton() {
  return (
    <Card className="p-6">
      <div className="animate-pulse">
        {/* 時間範圍選擇器骨架 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="h-8 w-16 bg-muted rounded"></div>
          <div className="h-8 w-16 bg-muted rounded"></div>
          <div className="h-8 w-16 bg-muted rounded"></div>
          <div className="h-8 w-16 bg-muted rounded"></div>
          <div className="h-8 w-16 bg-muted rounded"></div>
          <div className="h-8 w-16 bg-muted rounded"></div>
        </div>

        {/* 圖表主體骨架 */}
        <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden">
          {/* 模擬價格軸 */}
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-muted/50 flex flex-col justify-between p-2">
            <div className="h-3 w-12 bg-muted rounded"></div>
            <div className="h-3 w-12 bg-muted rounded"></div>
            <div className="h-3 w-12 bg-muted rounded"></div>
            <div className="h-3 w-12 bg-muted rounded"></div>
            <div className="h-3 w-12 bg-muted rounded"></div>
          </div>

          {/* 模擬時間軸 */}
          <div className="absolute left-0 right-16 bottom-0 h-8 bg-muted/50 flex justify-between items-center px-4">
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="h-3 w-16 bg-muted rounded"></div>
          </div>

          {/* 模擬 K 線圖 */}
          <div className="absolute left-4 right-20 top-4 bottom-12 flex items-end justify-between gap-1">
            {Array.from({ length: 20 }).map((_, i) => {
              const height = Math.random() * 60 + 20; // 隨機高度 20-80%
              return (
                <div
                  key={i}
                  className="flex-1 bg-muted rounded-sm"
                  style={{ height: `${height}%` }}
                ></div>
              );
            })}
          </div>

          {/* 載入提示 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground text-sm">載入圖表中...</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * 股票詳情頁面的骨架屏組件
 * 遵循全站風格一致性：漸層背景、陰影、圓角、過渡動畫
 */
export default function StockDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* 股票標題骨架屏 */}
        <div className="mb-8 animate-pulse">
          <div className="h-12 w-48 bg-muted rounded-lg mb-2"></div>
          <div className="h-6 w-64 bg-muted rounded-lg"></div>
        </div>

        {/* 價格資訊卡片骨架屏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm animate-pulse"
            >
              <CardHeader className="pb-3">
                <div className="h-4 w-24 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded mb-2"></div>
                <div className="h-4 w-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 圖表區域骨架屏 */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-8 animate-pulse">
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full bg-muted rounded-lg"></div>
          </CardContent>
        </Card>

        {/* 標籤按鈕骨架屏 */}
        <div className="flex flex-wrap gap-4 mb-6 animate-pulse">
          <div className="h-12 w-40 bg-muted rounded-lg"></div>
          <div className="h-12 w-40 bg-muted rounded-lg"></div>
        </div>

        {/* 內容區域骨架屏 */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-5/6 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

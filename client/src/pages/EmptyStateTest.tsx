import RecommendationEmptyState from "@/components/RecommendationEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

/**
 * 空狀態組件視覺測試頁面
 * 用於測試不同市場的空狀態顯示效果和響應式設計
 */
export default function EmptyStateTest() {
  const [selectedMarket, setSelectedMarket] = useState<'US' | 'TW'>('US');
  
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>推薦區塊空狀態測試</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              此頁面用於測試「為您推薦」區塊的空狀態組件在不同市場和裝置尺寸下的顯示效果
            </p>
            
            {/* 市場切換按鈕 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSelectedMarket('US')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedMarket === 'US'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                美股市場
              </button>
              <button
                onClick={() => setSelectedMarket('TW')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedMarket === 'TW'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                台股市場
              </button>
            </div>
            
            {/* 當前市場提示 */}
            <div className="text-sm text-muted-foreground mb-4">
              當前選擇：<span className="font-semibold text-foreground">{selectedMarket === 'US' ? '美股' : '台股'}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* 空狀態組件展示 */}
        <RecommendationEmptyState
          market={selectedMarket}
          onSearchClick={() => {
            alert(`點擊了「開始搜尋${selectedMarket === 'US' ? '美股' : '台股'}」按鈕`);
          }}
        />
        
        {/* 響應式設計說明 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>響應式設計測試</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✅ <strong>手機版</strong>（&lt; 640px）：圖標和文字縮小，按鈕最小觸控區域 44x44px</p>
              <p>✅ <strong>平板版</strong>（640px - 1024px）：中等尺寸圖標和文字</p>
              <p>✅ <strong>桌面版</strong>（&gt; 1024px）：完整尺寸圖標和文字</p>
              <p>✅ <strong>漸層背景</strong>：遵循全站風格，使用主題色漸層</p>
              <p>✅ <strong>友善提示</strong>：根據市場類型顯示對應的引導訊息</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

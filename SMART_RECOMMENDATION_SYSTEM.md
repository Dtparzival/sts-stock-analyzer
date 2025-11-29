# 智能推薦系統技術文檔

## 概述

本文檔記錄美股投資分析平台的智能推薦系統實作細節，包括推薦演算法邏輯、行為追蹤機制、效能優化策略和快取機制。

## 系統架構

### 核心組件

1. **用戶行為追蹤系統** (`server/db.ts`)
   - 追蹤用戶查看、搜尋、收藏、點擊等行為
   - 聚合統計方式儲存數據，減少資料庫負擔

2. **推薦演算法引擎** (`server/recommendation.ts`)
   - 多維度評分機制
   - 時間衰減因子
   - 推薦理由生成

3. **快取管理系統** (`server/recommendation.ts`)
   - 記憶體快取（Map 結構）
   - 5 分鐘快取過期時間
   - 自動清理機制

4. **前端整合** (`client/src/pages/Home.tsx`)
   - 漸進式載入（前 3 個立即載入，後 3 個延遲載入）
   - 自動刷新機制（每 60 秒）
   - 手動刷新功能

## 資料庫結構

### userBehavior 表

```typescript
{
  id: number;                    // 主鍵
  userId: number;                // 用戶 ID（關聯 users 表）
  symbol: string;                // 股票代碼
  viewCount: number;             // 查看次數
  searchCount: number;           // 搜尋次數
  totalViewTime: number;         // 總停留時間（秒）
  clickCount: number;            // 點擊次數
  lastViewedAt: Date;            // 最後查看時間
  lastSearchedAt: Date | null;   // 最後搜尋時間
  lastClickedAt: Date | null;    // 最後點擊時間
  createdAt: Date;               // 建立時間
  updatedAt: Date;               // 更新時間
}
```

### 索引設計

- `userId` - 快速查詢用戶所有行為
- `symbol` - 快速查詢特定股票的行為
- `userSymbolIdx (userId, symbol)` - 複合索引，優化用戶+股票查詢
- `lastViewedAtIdx (lastViewedAt)` - 優化時間排序查詢

## 推薦演算法

### 評分機制

推薦評分由四個維度組成，每個維度有不同的權重：

```typescript
const weights = {
  viewCount: 0.3,      // 查看頻率權重
  searchCount: 0.2,    // 搜尋頻率權重
  viewTime: 0.25,      // 停留時間權重
  favorite: 0.25,      // 收藏偏好權重
};
```

### 評分計算公式

```typescript
// 1. 正規化各項指標（使用對數轉換避免極端值）
const normalizedViewCount = Math.log1p(viewCount);
const normalizedSearchCount = Math.log1p(searchCount);
const normalizedViewTime = Math.log1p(totalViewTime / 60); // 轉換為分鐘
const favoriteScore = isFavorite ? 1 : 0;

// 2. 計算基礎評分
const baseScore = 
  normalizedViewCount * weights.viewCount +
  normalizedSearchCount * weights.searchCount +
  normalizedViewTime * weights.viewTime +
  favoriteScore * weights.favorite;

// 3. 應用時間衰減因子
const daysSinceLastView = (now - lastViewedAt) / (1000 * 60 * 60 * 24);
const timeDecay = Math.max(Math.exp(-daysSinceLastView / 30), 0.1);

// 4. 最終評分
const finalScore = baseScore * timeDecay;
```

### 時間衰減機制

時間衰減採用指數衰減函數，確保近期行為權重更高：

- **衰減週期**：30 天
- **最小衰減係數**：0.1（即使很久沒查看，仍保留 10% 的權重）
- **衰減公式**：`decay = Math.exp(-daysSinceLastView / 30)`

**衰減效果示例**：
- 今天查看：衰減係數 = 1.0（100%）
- 7 天前查看：衰減係數 ≈ 0.8（80%）
- 30 天前查看：衰減係數 ≈ 0.37（37%）
- 90 天前查看：衰減係數 ≈ 0.1（10%，最小值）

### 推薦理由生成

系統根據用戶行為數據自動生成個人化推薦理由：

```typescript
const generateRecommendationReason = (
  viewCount: number,
  searchCount: number,
  totalViewTime: number,
  isFavorite: boolean
): string => {
  const reasons: string[] = [];

  if (isFavorite) {
    reasons.push('您已收藏此股票');
  }

  if (viewCount >= 5) {
    reasons.push('您經常查看此股票');
  } else if (viewCount >= 3) {
    reasons.push('您多次查看此股票');
  }

  if (searchCount >= 3) {
    reasons.push('您多次搜尋此股票');
  }

  if (totalViewTime >= 300) { // 5 分鐘
    reasons.push('您在此股票停留時間較長');
  }

  if (reasons.length === 0) {
    reasons.push('基於您的瀏覽記錄');
  }

  return reasons.join('，');
};
```

## 行為追蹤機制

### 追蹤函數

1. **trackView(userId, symbol)**
   - 追蹤用戶查看股票行為
   - 增加 viewCount
   - 更新 lastViewedAt

2. **trackSearch(userId, symbol)**
   - 追蹤用戶搜尋股票行為
   - 增加 searchCount
   - 更新 lastSearchedAt

3. **trackViewTime(userId, symbol, viewTimeSeconds)**
   - 追蹤用戶停留時間
   - 累加 totalViewTime
   - 更新 lastViewedAt

4. **trackClick(userId, symbol)**
   - 追蹤用戶點擊推薦卡片行為
   - 增加 clickCount
   - 更新 lastClickedAt

### 前端整合點

- **StockDetail 頁面**：記錄 view 行為和停留時間
- **Home 頁面搜尋**：記錄 search 行為
- **推薦卡片點擊**：記錄 click 行為
- **Watchlist 頁面**：記錄 favorite/unfavorite 行為

## 快取機制

### 快取結構

```typescript
interface CacheEntry {
  data: RecommendationResult[];
  timestamp: number;
}

const recommendationCache = new Map<number, CacheEntry>();
```

### 快取策略

1. **快取鍵**：用戶 ID
2. **快取過期時間**：5 分鐘（300,000 毫秒）
3. **快取清理**：自動檢查過期時間，過期則返回 null

### 快取操作

```typescript
// 設定快取
setCachedRecommendations(userId, recommendations);

// 獲取快取（自動檢查過期）
const cached = await getCachedRecommendations(userId);

// 清除快取
clearRecommendationCache(userId);
```

### 快取刷新策略

- **自動刷新**：前端每 60 秒自動重新查詢
- **手動刷新**：用戶點擊刷新按鈕時清除快取並重新查詢
- **行為觸發刷新**：用戶執行關鍵行為（如收藏）後自動刷新

## 效能優化

### 1. 漸進式載入

**策略**：
- 首屏立即載入前 3 個推薦股票
- 前 3 個載入完成後，延遲 300ms 載入後 3 個
- 避免同時發起過多 API 請求

**實作**：
```typescript
const [shouldLoadMore, setShouldLoadMore] = useState(false);

// 前 3 個推薦股票（立即載入）
const stock0 = trpc.stock.getStockData.useQuery(
  { symbol: recommendedSymbols[0] },
  { enabled: !!user && !!recommendedSymbols[0] }
);

// 後 3 個推薦股票（延遲載入）
const stock3 = trpc.stock.getStockData.useQuery(
  { symbol: recommendedSymbols[3] },
  { enabled: !!user && !!recommendedSymbols[3] && shouldLoadMore }
);

useEffect(() => {
  const firstThreeLoaded = 
    !stock0.isLoading && !stock1.isLoading && !stock2.isLoading;
  
  if (firstThreeLoaded && !shouldLoadMore) {
    setTimeout(() => setShouldLoadMore(true), 300);
  }
}, [stock0.isLoading, stock1.isLoading, stock2.isLoading]);
```

### 2. 資料庫查詢優化

- **使用索引**：所有查詢都利用索引加速
- **限制結果數量**：推薦查詢限制為 20 筆（過濾後取 6 筆）
- **聚合統計**：使用聚合表而非事件流，減少查詢複雜度

### 3. 快取優化

- **記憶體快取**：避免重複計算推薦結果
- **快取過期時間**：5 分鐘，平衡即時性和效能
- **自動清理**：過期快取自動清除，避免記憶體洩漏

### 4. 前端優化

- **骨架屏**：載入過程中顯示骨架屏，提升感知速度
- **懶載入**：使用 `enabled` 選項控制查詢時機
- **防抖動**：手動刷新按鈕使用防抖動機制

## API 端點

### 1. 獲取智能推薦

```typescript
trpc.recommendation.getSmartRecommendations.useQuery()
```

**回傳格式**：
```typescript
{
  symbol: string;
  score: number;
  reason: string;
  viewCount: number;
  searchCount: number;
  totalViewTime: number;
  isFavorite: boolean;
  lastViewedAt: Date;
}[]
```

### 2. 刷新推薦

```typescript
trpc.recommendation.refreshRecommendations.useMutation()
```

**功能**：清除快取並重新生成推薦結果

## 測試覆蓋

### 單元測試 (`recommendation.test.ts`)

1. **用戶行為追蹤測試**
   - ✅ 追蹤用戶點擊推薦卡片
   - ✅ 正確更新 lastClickedAt 時間戳
   - ✅ 處理新股票的首次點擊
   - ✅ 累計多次點擊

2. **推薦評分機制測試**
   - ✅ 正確計算包含點擊頻率的推薦評分
   - ✅ 對收藏的股票給予更高評分

### 測試結果

```
Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  7.43s
```

## 配色方案整合

推薦系統 UI 完全遵循「美股投資分析平台配色方案建議 v3.0」：

### 視覺元素

1. **推薦理由顯示**
   - 使用 `bg-primary/5` 背景色
   - Target 圖示使用主色調
   - 文字使用 `text-foreground/80`

2. **行為統計標籤**
   - 使用 `bg-muted/50` 背景色
   - 圖示和文字使用 `text-muted-foreground`

3. **數字顯示**
   - 股價使用 `.number-display` 類別（IBM Plex Mono 字體）
   - 漲跌幅使用 `text-success` 或 `text-error`

4. **動畫效果**
   - 卡片進場使用 `opacity` 和 `translate-y` 動畫
   - Hover 效果使用 `shadow-lg` 和 `-translate-y-1`

### 響應式設計

- **手機版**：橫向滑動輪播（75% 寬度卡片）
- **平板版**：3 欄網格佈局
- **桌面版**：6 欄網格佈局

## 未來優化方向

1. **協同過濾**：整合其他用戶的行為數據，提供「相似用戶也在看」推薦
2. **內容過濾**：基於股票屬性（產業、市值、波動率）進行推薦
3. **A/B 測試**：測試不同權重配置的推薦效果
4. **機器學習**：使用 ML 模型優化權重和評分機制
5. **即時推薦**：整合即時市場數據，提供熱門股票推薦

## 維護指南

### 調整權重

修改 `server/recommendation.ts` 中的 `weights` 物件：

```typescript
const weights = {
  viewCount: 0.3,      // 調整查看頻率權重
  searchCount: 0.2,    // 調整搜尋頻率權重
  viewTime: 0.25,      // 調整停留時間權重
  favorite: 0.25,      // 調整收藏偏好權重
};
```

### 調整快取過期時間

修改 `server/recommendation.ts` 中的 `CACHE_EXPIRY_MS`：

```typescript
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 分鐘
```

### 調整推薦數量

修改 `server/recommendation.ts` 中的查詢限制：

```typescript
.orderBy(desc(userBehavior.lastViewedAt))
.limit(20); // 調整此數字
```

## 參考資料

- [配色方案建議 v3.0](./美股投資分析平台配色方案建議_v3.0.md)
- [資料庫 Schema](./drizzle/schema.ts)
- [推薦演算法實作](./server/recommendation.ts)
- [前端整合](./client/src/pages/Home.tsx)

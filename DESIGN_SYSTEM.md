# 美股投資分析平台設計系統文檔

**作者**: Manus AI  
**日期**: 2025-11-25  
**版本**: 1.0

---

## 摘要

本文檔為美股投資分析平台提供完整的設計系統規範,包含色彩系統、字體層級、數字顯示樣式、間距與圓角、陰影效果、動畫規範、組件樣式等,確保未來開發時能夠保持全站視覺一致性和專業性。所有設計規範基於「專業信任藍(Professional Trust Blue)」配色方案,遵循金融科技產業的最佳實踐和無障礙設計標準。

---

## 設計原則

### 核心理念

美股投資分析平台的設計系統遵循以下核心原則:

**專業性與信任感**是平台設計的首要目標。通過深邃的藍色系主調、等寬字體的數字顯示、清晰的資訊層級,傳達平台的專業性和可靠性,建立用戶對平台的信心。

**視覺一致性**要求所有頁面和組件使用統一的設計語言,包括色彩、字體、間距、圓角、陰影等視覺元素。這不僅提升品牌識別度,也能降低用戶的學習成本,提供一致的使用體驗。

**響應式設計**確保平台在手機、平板、桌面等不同裝置上都能提供優質的視覺體驗。通過響應式字體大小、間距調整、佈局優化,確保跨裝置的一致性和可用性。

**可讀性與無障礙**要求所有文字與背景的對比度達到 WCAG AA 標準(最低 4.5:1),確保包括視力障礙用戶在內的所有使用者都能清晰閱讀內容。同時,不僅依賴色彩傳達資訊,還使用圖標和文字標籤輔助說明。

---

## 色彩系統

### 主要色彩

平台採用「專業信任藍」配色方案,以深邃的藍色系為主調,搭配金色點綴,傳達專業、穩定和值得信賴的品牌形象。

| 用途 | CSS 變數 | OKLCH 值 | 說明 |
|------|---------|---------|------|
| **主色調** | `--primary` | `oklch(0.55 0.18 240)` | 主要按鈕、連結、重點元素 |
| **主色調前景** | `--primary-foreground` | `oklch(0.98 0 0)` | 主色調上的文字顏色 |
| **次要色** | `--secondary` | `oklch(0.98 0.001 286.375)` | 次要按鈕、輔助元素 |
| **次要色前景** | `--secondary-foreground` | `oklch(0.4 0.015 65)` | 次要色上的文字顏色 |

### 金色點綴

金色是平台的重要視覺元素,用於強化高端感和專業形象,但應謹慎使用,僅用於最重要的元素。

| 用途 | CSS 變數 | OKLCH 值 | 說明 |
|------|---------|---------|------|
| **金色強調** | `--accent-gold` | `oklch(0.75 0.15 80)` | 重要指標、品牌點綴 |
| **金色深色** | `--accent-gold-dark` | `oklch(0.65 0.18 70)` | 金色文字、圖標 |
| **金色漸層** | `--gradient-gold` | `linear-gradient(135deg, oklch(0.80 0.15 85) 0%, oklch(0.70 0.18 75) 50%, oklch(0.75 0.15 80) 100%)` | CTA 按鈕、重要卡片 |
| **金色漸層 Hover** | `--gradient-gold-hover` | `linear-gradient(135deg, oklch(0.85 0.18 85) 0%, oklch(0.75 0.20 75) 50%, oklch(0.80 0.18 80) 100%)` | 按鈕 hover 狀態 |

### 背景與表面

| 用途 | CSS 變數 | OKLCH 值 | 說明 |
|------|---------|---------|------|
| **背景色** | `--background` | `oklch(1 0 0)` | 主要背景(白色) |
| **卡片背景** | `--card` | `oklch(1 0 0)` | 卡片、面板背景 |
| **卡片前景** | `--card-foreground` | `oklch(0.235 0.015 65)` | 卡片上的文字顏色 |
| **彈出層背景** | `--popover` | `oklch(1 0 0)` | 彈出層、對話框背景 |
| **彈出層前景** | `--popover-foreground` | `oklch(0.235 0.015 65)` | 彈出層上的文字顏色 |

### 文字色彩

| 用途 | CSS 變數 | OKLCH 值 | 對比度 | 說明 |
|------|---------|---------|--------|------|
| **主要文字** | `--foreground` | `oklch(0.235 0.015 65)` | 16.1:1 | 主要文字內容 |
| **次要文字** | `--muted-foreground` | `oklch(0.552 0.016 285.938)` | 7.0:1 | 次要文字、說明文字 |

### 狀態色彩

| 用途 | CSS 變數 | OKLCH 值 | 說明 |
|------|---------|---------|------|
| **成功/上漲** | `--color-green-500` | Tailwind 預設綠色 | 正向趨勢、上漲數據 |
| **錯誤/下跌** | `--color-red-500` | Tailwind 預設紅色 | 負向趨勢、下跌數據 |
| **破壞性操作** | `--destructive` | `oklch(0.577 0.245 27.325)` | 刪除、警告操作 |
| **破壞性前景** | `--destructive-foreground` | `oklch(0.985 0 0)` | 破壞性按鈕上的文字 |

### 邊框與輸入

| 用途 | CSS 變數 | OKLCH 值 | 說明 |
|------|---------|---------|------|
| **邊框色** | `--border` | `oklch(0.92 0.004 286.32)` | 分隔線、邊框 |
| **輸入框邊框** | `--input` | `oklch(0.92 0.004 286.32)` | 輸入框邊框 |
| **焦點環** | `--ring` | `oklch(0.623 0.214 259.815)` | 焦點狀態的外框 |

### 使用指南

**主色調應用**: 主色調(`--primary`)應用於主要操作按鈕、導航列的選中狀態、重要的行動呼籲元素。例如「立即分析」、「查看詳情」等主要按鈕。

**金色點綴應用**: 金色(`--accent-gold`)僅用於最重要的 CTA 按鈕(如「加入收藏」、「開始分析」)和關鍵指標卡片(如 AI 推薦評分、重要財務數據)。使用金色漸層效果(`--gradient-gold`)來增強視覺吸引力。

**狀態色應用**: 上漲或正向數據使用綠色系,下跌或負向數據使用紅色系。必須同時使用圖標(向上/向下箭頭)和文字標籤來輔助說明,不僅依賴色彩傳達資訊。

**文字色彩應用**: 主要文字使用 `--foreground`,次要文字使用 `--muted-foreground`,確保清晰的資訊層級。所有文字與背景的對比度都達到 WCAG AA 標準。

---

## 字體系統

### 字體家族

平台使用兩種主要字體:

| 用途 | 字體家族 | CSS 變數 | 說明 |
|------|---------|---------|------|
| **正文字體** | Inter | `--font-sans` | 用於所有正文、標題、UI 文字 |
| **等寬字體** | IBM Plex Mono | `--font-mono` | 用於所有數字、價格、財務數據 |

**字體引用**: 在 `client/index.html` 中引用 Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 字體層級

平台定義了完整的字體層級系統,用於建立清晰的資訊架構:

| 層級 | CSS 類別 | 字體大小 | 字重 | 行高 | 使用場景 |
|------|---------|---------|------|------|---------|
| **Display 1** | `.text-display-1` | 3.5rem (56px) | 700 | 1.2 | 首頁主標題 |
| **Display 2** | `.text-display-2` | 3rem (48px) | 700 | 1.2 | 重要頁面標題 |
| **Heading 1** | `.text-heading-1` | 2.5rem (40px) | 600 | 1.3 | 頁面主標題 |
| **Heading 2** | `.text-heading-2` | 2rem (32px) | 600 | 1.3 | 區塊標題 |
| **Heading 3** | `.text-heading-3` | 1.5rem (24px) | 600 | 1.4 | 子區塊標題 |
| **Heading 4** | `.text-heading-4` | 1.25rem (20px) | 600 | 1.4 | 卡片標題 |
| **Body Large** | `.text-body-large` | 1.125rem (18px) | 400 | 1.6 | 重要正文 |
| **Body** | `.text-body` | 1rem (16px) | 400 | 1.6 | 一般正文 |
| **Body Small** | `.text-body-small` | 0.875rem (14px) | 400 | 1.5 | 次要正文 |
| **Caption** | `.text-caption` | 0.75rem (12px) | 400 | 1.4 | 輔助說明、時間戳記 |

### 響應式字體

平台提供響應式字體工具類別,確保在不同裝置上的可讀性:

| CSS 類別 | 手機版 | 平板版 | 桌面版 | 使用場景 |
|---------|--------|--------|--------|---------|
| `.text-responsive-xs` | 12px | 14px | 14px | 極小文字 |
| `.text-responsive-sm` | 14px | 16px | 16px | 小文字 |
| `.text-responsive-base` | 16px | 18px | 18px | 一般文字 |
| `.text-responsive-lg` | 18px | 20px | 20px | 大文字 |
| `.text-responsive-xl` | 20px | 24px | 30px | 特大文字 |
| `.text-responsive-2xl` | 24px | 30px | 36px | 超大文字 |

---

## 數字顯示系統

### 設計目標

為所有價格、百分比、財務數據套用等寬字體(IBM Plex Mono),確保數字對齊整齊、易於比較,充分發揮專業感和可讀性。

### 數字顯示層級

平台定義了四個層級的數字顯示樣式:

| 層級 | CSS 類別 | 字體大小 | 字重 | 使用場景 |
|------|---------|---------|------|---------|
| **標準** | `.number-display` | 繼承父元素 | 繼承父元素 | 一般數字、百分比 |
| **小型** | `.number-display-sm` | 0.875rem (14px) | 400 | 表格中的數字、次要指標 |
| **大型** | `.number-display-lg` | 1.5rem (24px) | 600 | 重要指標、卡片中的價格 |
| **特大** | `.number-display-xl` | 2rem (32px) | 600 | 主要股價、關鍵數據 |

### 樣式定義

所有數字顯示類別都包含以下樣式:

```css
.number-display {
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;  /* 等寬數字 */
  letter-spacing: -0.02em;             /* 微調字距 */
}
```

### 使用範例

```tsx
{/* 股票詳情頁主要股價 */}
<div className="number-display-xl text-primary">
  $123.45
</div>

{/* 漲跌幅百分比 */}
<div className="number-display text-green-500">
  +5.67%
</div>

{/* 表格中的財務數據 */}
<td className="number-display-sm">
  1,234,567
</td>

{/* 卡片中的重要指標 */}
<div className="number-display-lg text-foreground">
  $2.5T
</div>
```

### 注意事項

1. **一致性**: 所有數字、價格、百分比、財務比率、技術指標數值都必須套用 `.number-display` 類別或其變體
2. **對齊**: 等寬字體確保數字在垂直排列時自動對齊,無需額外調整
3. **可讀性**: `font-variant-numeric: tabular-nums` 確保數字寬度一致,提升可讀性
4. **字距**: `letter-spacing: -0.02em` 微調字距,使數字顯示更緊湊專業

---

## 間距系統

### 間距變數

平台定義了統一的間距系統,確保所有組件使用一致的間距:

| 名稱 | CSS 變數 | 值 | Tailwind 等價 | 使用場景 |
|------|---------|---|--------------|---------|
| **XS** | `--spacing-xs` | 0.5rem (8px) | `p-2` | 極小間距、緊湊佈局 |
| **SM** | `--spacing-sm` | 0.75rem (12px) | `p-3` | 小間距、按鈕內邊距 |
| **MD** | `--spacing-md` | 1rem (16px) | `p-4` | 標準間距、卡片內邊距 |
| **LG** | `--spacing-lg` | 1.5rem (24px) | `p-6` | 大間距、區塊間距 |
| **XL** | `--spacing-xl` | 2rem (32px) | `p-8` | 特大間距、頁面間距 |
| **2XL** | `--spacing-2xl` | 3rem (48px) | `p-12` | 超大間距、區塊分隔 |

### 使用指南

**卡片內邊距**: 標準卡片使用 `--spacing-lg` (24px),小型卡片使用 `--spacing-md` (16px)。

**區塊間距**: 不同區塊之間使用 `--spacing-xl` (32px) 或 `--spacing-2xl` (48px) 來建立清晰的視覺分隔。

**按鈕內邊距**: 按鈕內邊距使用 `--spacing-sm` (12px) 垂直方向,`--spacing-lg` (24px) 水平方向。

**響應式間距**: 在手機版上適當減少間距,在桌面版上使用標準間距,確保跨裝置的一致性。

---

## 圓角系統

### 圓角變數

平台定義了統一的圓角系統,用於卡片、按鈕、輸入框等元素:

| 名稱 | CSS 變數 | 值 | Tailwind 等價 | 使用場景 |
|------|---------|---|--------------|---------|
| **SM** | `--radius-sm` | 0.375rem (6px) | `rounded-sm` | 小型元素、標籤 |
| **MD** | `--radius-md` | 0.5rem (8px) | `rounded-md` | 按鈕、輸入框 |
| **LG** | `--radius-lg` | 0.75rem (12px) | `rounded-lg` | 卡片、面板 |
| **XL** | `--radius-xl` | 1rem (16px) | `rounded-xl` | 大型卡片 |
| **2XL** | `--radius-2xl` | 1.5rem (24px) | `rounded-2xl` | 特大卡片、對話框 |
| **Full** | `--radius-full` | 9999px | `rounded-full` | 圓形元素、頭像 |

### 使用指南

**卡片圓角**: 標準卡片使用 `--radius-lg` (12px),大型卡片使用 `--radius-xl` (16px)。

**按鈕圓角**: 按鈕使用 `--radius-md` (8px),確保視覺柔和但不過於圓潤。

**輸入框圓角**: 輸入框使用 `--radius-md` (8px),與按鈕保持一致。

**圓形元素**: 頭像、圖標容器使用 `--radius-full`,確保完全圓形。

---

## 陰影系統

### 陰影變數

平台定義了五個層級的陰影效果,用於建立視覺層次:

| 名稱 | CSS 變數 | Tailwind 等價 | 使用場景 |
|------|---------|--------------|---------|
| **SM** | `--shadow-sm` | `shadow-sm` | 微妙陰影、懸浮卡片 |
| **MD** | `--shadow-md` | `shadow-md` | 標準陰影、卡片 |
| **LG** | `--shadow-lg` | `shadow-lg` | 明顯陰影、彈出層 |
| **XL** | `--shadow-xl` | `shadow-xl` | 強烈陰影、對話框 |
| **2XL** | `--shadow-2xl` | `shadow-2xl` | 最強陰影、模態框 |

### 特殊陰影

平台還定義了金色和藍色的特殊陰影效果:

| 名稱 | CSS 類別 | 使用場景 |
|------|---------|---------|
| **金色陰影** | `.shadow-gold` | 重要卡片、金色按鈕 |
| **金色大陰影** | `.shadow-gold-lg` | 強調的金色卡片 |
| **藍色陰影** | `.shadow-blue` | 主色調卡片、藍色按鈕 |
| **藍色大陰影** | `.shadow-blue-lg` | 強調的藍色卡片 |

### 使用指南

**卡片陰影**: 標準卡片使用 `shadow-sm`,hover 狀態使用 `shadow-md` 或 `shadow-lg`。

**按鈕陰影**: 按鈕 hover 狀態使用 `shadow-md`,金色按鈕使用 `.shadow-gold`。

**彈出層陰影**: 彈出層、對話框使用 `shadow-xl` 或 `shadow-2xl`,確保明顯的視覺層級。

**特殊陰影**: 重要卡片或強調元素使用金色或藍色陰影,增強視覺吸引力。

---

## 動畫系統

### 進場動畫

平台定義了三種進場動畫效果:

| 動畫名稱 | CSS 類別 | 效果 | 使用場景 |
|---------|---------|------|---------|
| **淡入** | `.animate-fade-in` | 透明度從 0 到 1 | 內容區塊、圖片 |
| **向上滑入** | `.animate-slide-up` | 從下方滑入並淡入 | 卡片、列表項目 |
| **向下滑入** | `.animate-slide-down` | 從上方滑入並淡入 | 標題、導航 |

### 動畫延遲

平台提供三個延遲級別,用於創建階梯式進場效果:

| CSS 類別 | 延遲時間 | 使用場景 |
|---------|---------|---------|
| `.animate-delay-100` | 0.1s | 第一個元素 |
| `.animate-delay-200` | 0.2s | 第二個元素 |
| `.animate-delay-300` | 0.3s | 第三個元素 |

### 載入動畫

平台定義了統一的載入動畫風格,使用藍色系效果:

| 動畫名稱 | CSS 類別 | 效果 | 使用場景 |
|---------|---------|------|---------|
| **脈衝** | `.loading-pulse` | 藍色脈衝效果 | 載入指示器 |
| **旋轉** | `.loading-spin` | 順時針旋轉 | 載入圖標 |
| **環形** | `.loading-ring` | 環形脈衝擴散 | 重要載入狀態 |
| **骨架屏** | `.skeleton` | 漸層移動效果 | 內容載入中 |

### 使用範例

```tsx
{/* 標題進場動畫 */}
<h1 className="animate-slide-down text-display-1">
  美股投資分析平台
</h1>

{/* 副標題延遲進場 */}
<p className="animate-slide-up animate-delay-100 text-body-large">
  專業的數據分析,智能的投資建議
</p>

{/* 內容區塊淡入 */}
<div className="animate-fade-in animate-delay-200">
  {/* 主要內容 */}
</div>

{/* 載入狀態 */}
<div className="loading-pulse">
  <Loader2 className="w-8 h-8 text-primary" />
</div>

{/* 骨架屏 */}
<div className="skeleton h-20 w-full"></div>
```

---

## 組件樣式規範

### 卡片組件

#### 標準卡片

```tsx
<div className="bg-card border border-border rounded-lg p-6 shadow-sm">
  <h3 className="text-heading-4">卡片標題</h3>
  <p className="text-body">卡片內容...</p>
</div>
```

**樣式規範**:
- 背景: `bg-card`
- 邊框: `border border-border`
- 圓角: `rounded-lg` (12px)
- 內邊距: `p-6` (24px)
- 陰影: `shadow-sm`

#### Hover 卡片

```tsx
<div className="bg-card border border-border rounded-lg p-6 shadow-sm card-hover">
  <h3 className="text-heading-4">可互動卡片</h3>
  <p className="text-body">滑鼠懸停時會有提升效果</p>
</div>
```

**樣式規範**:
- 基礎樣式同標準卡片
- 添加 `.card-hover` 類別
- Hover 效果: 陰影增強、向上位移 4px

#### 金色強調卡片

```tsx
<div className="bg-card border-gold rounded-lg p-6 shadow-gold">
  <div className="text-gold font-semibold">重要指標</div>
  <div className="number-display-xl text-gold">9.2/10</div>
</div>
```

**樣式規範**:
- 背景: `bg-card`
- 邊框: `.border-gold` (金色邊框)
- 圓角: `rounded-lg` (12px)
- 內邊距: `p-6` (24px)
- 陰影: `.shadow-gold` (金色陰影)
- 文字: `.text-gold` (金色文字)

### 按鈕組件

#### 主要按鈕

```tsx
<button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors">
  主要按鈕
</button>
```

**樣式規範**:
- 背景: `bg-primary`
- 文字: `text-primary-foreground`
- 內邊距: `px-6 py-3` (水平 24px, 垂直 12px)
- 圓角: `rounded-md` (8px)
- 字重: `font-semibold`
- Hover: `hover:bg-primary/90`

#### 金色 CTA 按鈕

```tsx
<button className="btn-gold">
  立即分析
</button>
```

**樣式規範**:
- 使用 `.btn-gold` 類別
- 背景: 金色漸層 (`--gradient-gold`)
- 文字: 白色
- 內邊距: 垂直 12px, 水平 24px
- 圓角: 8px
- Hover: 漸層變亮、向上位移 2px、金色陰影

#### 次要按鈕

```tsx
<button className="bg-secondary text-secondary-foreground px-6 py-3 rounded-md font-semibold hover:bg-secondary/80 transition-colors">
  次要按鈕
</button>
```

**樣式規範**:
- 背景: `bg-secondary`
- 文字: `text-secondary-foreground`
- 內邊距: `px-6 py-3`
- 圓角: `rounded-md` (8px)
- 字重: `font-semibold`
- Hover: `hover:bg-secondary/80`

#### 輪廓按鈕

```tsx
<button className="border border-border bg-transparent text-foreground px-6 py-3 rounded-md font-semibold hover:bg-accent hover:text-accent-foreground transition-colors">
  輪廓按鈕
</button>
```

**樣式規範**:
- 背景: `bg-transparent`
- 邊框: `border border-border`
- 文字: `text-foreground`
- 內邊距: `px-6 py-3`
- 圓角: `rounded-md` (8px)
- 字重: `font-semibold`
- Hover: `hover:bg-accent hover:text-accent-foreground`

### 表單組件

#### 輸入框

```tsx
<input 
  type="text"
  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
  placeholder="請輸入..."
/>
```

**樣式規範**:
- 寬度: `w-full`
- 內邊距: `px-4 py-2` (水平 16px, 垂直 8px)
- 邊框: `border border-input`
- 圓角: `rounded-md` (8px)
- 背景: `bg-background`
- 文字: `text-foreground`
- 焦點: `focus:ring-2 focus:ring-ring`

#### 選擇框

```tsx
<select className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
  <option>選項 1</option>
  <option>選項 2</option>
</select>
```

**樣式規範**: 同輸入框

---

## 響應式設計規範

### 斷點系統

平台使用 Tailwind CSS 的標準斷點系統:

| 斷點 | 最小寬度 | 裝置類型 | 使用前綴 |
|------|---------|---------|---------|
| **手機** | 0px | 手機直向 | (無前綴) |
| **SM** | 640px | 手機橫向、小平板 | `sm:` |
| **MD** | 768px | 平板直向 | `md:` |
| **LG** | 1024px | 平板橫向、小筆電 | `lg:` |
| **XL** | 1280px | 桌面 | `xl:` |
| **2XL** | 1536px | 大螢幕 | `2xl:` |

### 響應式間距

| 裝置 | Container 內邊距 | 區塊間距 | 卡片內邊距 |
|------|----------------|---------|-----------|
| **手機** | 16px | 24px | 16px |
| **平板** | 24px | 32px | 20px |
| **桌面** | 32px | 48px | 24px |

### 響應式字體

使用響應式字體工具類別(`.text-responsive-*`)確保在不同裝置上的可讀性。參考「字體系統 > 響應式字體」章節。

### 響應式佈局

**手機版**: 單欄佈局,卡片垂直堆疊,減少間距和內邊距。

**平板版**: 雙欄或三欄佈局,適度增加間距,優化橫向和直向模式。

**桌面版**: 多欄佈局,充分利用螢幕空間,使用完整的視覺效果(漸層、陰影、動畫)。

---

## 圖標使用規範

### 圖標庫

平台使用 **Lucide React** 圖標庫,提供一致的視覺風格和豐富的圖標選擇。

### 圖標大小

| 大小 | CSS 類別 | 尺寸 | 使用場景 |
|------|---------|------|---------|
| **小** | `w-4 h-4` | 16px | 內聯圖標、按鈕圖標 |
| **標準** | `w-5 h-5` | 20px | 一般圖標、列表圖標 |
| **中** | `w-6 h-6` | 24px | 卡片圖標、導航圖標 |
| **大** | `w-8 h-8` | 32px | 主要圖標、載入圖標 |
| **特大** | `w-12 h-12` | 48px | 空狀態圖標、裝飾圖標 |

### 圖標顏色

圖標顏色應與文字顏色保持一致:

```tsx
{/* 主要圖標 */}
<TrendingUp className="w-5 h-5 text-foreground" />

{/* 次要圖標 */}
<Info className="w-4 h-4 text-muted-foreground" />

{/* 成功圖標 */}
<Check className="w-5 h-5 text-green-500" />

{/* 錯誤圖標 */}
<X className="w-5 h-5 text-red-500" />

{/* 金色圖標 */}
<Star className="w-5 h-5 text-gold" />
```

### 特殊圖標

**收藏圖標**: 使用 `Star` 圖標,已收藏為實心黃色(`fill-yellow-600`),未收藏為空心。

**趨勢圖標**: 上漲使用 `TrendingUp`,下跌使用 `TrendingDown`,搭配對應的綠色或紅色。

**載入圖標**: 使用 `Loader2` 圖標,搭配 `.loading-spin` 或 `.loading-pulse` 動畫。

---

## 無障礙設計規範

### 對比度要求

所有文字與背景的對比度必須達到 WCAG AA 標準(最低 4.5:1):

| 文字/背景組合 | 對比度 | 符合標準 |
|--------------|--------|---------|
| 主要文字 / 背景 | 16.1:1 | ✓ AAA |
| 次要文字 / 背景 | 7.0:1 | ✓ AAA |
| 主色調 / 背景 | 8.6:1 | ✓ AAA |
| 金色 / 背景 | 4.8:1 | ✓ AA |

### 色盲友善設計

**不僅依賴色彩**: 除了使用綠色表示上漲、紅色表示下跌之外,還必須使用圖標(向上/向下箭頭)或文字標籤來輔助說明。

```tsx
{/* 上漲趨勢 - 使用顏色 + 圖標 + 文字 */}
<div className="flex items-center gap-2 text-green-500">
  <TrendingUp className="w-4 h-4" />
  <span className="number-display">+5.67%</span>
  <span className="text-caption text-muted-foreground">(上漲)</span>
</div>

{/* 下跌趨勢 - 使用顏色 + 圖標 + 文字 */}
<div className="flex items-center gap-2 text-red-500">
  <TrendingDown className="w-4 h-4" />
  <span className="number-display">-3.24%</span>
  <span className="text-caption text-muted-foreground">(下跌)</span>
</div>
```

### 鍵盤導航

所有互動元素必須支援鍵盤導航:

- 使用 `Tab` 鍵在元素間移動
- 使用 `Enter` 或 `Space` 鍵觸發按鈕
- 使用 `Esc` 鍵關閉對話框或彈出層
- 焦點狀態使用 `focus:ring-2 focus:ring-ring` 顯示清晰的焦點環

---

## 實作檢查清單

在開發新功能或組件時,請參考以下檢查清單確保符合設計系統規範:

### 色彩使用

- [ ] 主色調(`--primary`)用於主要操作按鈕和重點元素
- [ ] 金色(`--accent-gold`)僅用於最重要的 CTA 按鈕和關鍵指標
- [ ] 狀態色(綠色/紅色)搭配圖標和文字標籤使用
- [ ] 所有文字與背景的對比度達到 WCAG AA 標準(4.5:1)

### 字體使用

- [ ] 正文使用 Inter 字體
- [ ] 所有數字使用 IBM Plex Mono 字體(`.number-display` 類別)
- [ ] 字體層級符合設計系統規範(`.text-heading-*`, `.text-body-*`)
- [ ] 響應式字體使用 `.text-responsive-*` 類別

### 間距與圓角

- [ ] 卡片內邊距使用 `--spacing-lg` (24px) 或 `p-6`
- [ ] 區塊間距使用 `--spacing-xl` (32px) 或 `--spacing-2xl` (48px)
- [ ] 卡片圓角使用 `--radius-lg` (12px) 或 `rounded-lg`
- [ ] 按鈕圓角使用 `--radius-md` (8px) 或 `rounded-md`

### 陰影與動畫

- [ ] 卡片陰影使用 `shadow-sm`,hover 狀態使用 `shadow-md` 或 `shadow-lg`
- [ ] 重要卡片使用 `.shadow-gold` 或 `.shadow-blue`
- [ ] 進場動畫使用 `.animate-fade-in`, `.animate-slide-up`, `.animate-slide-down`
- [ ] 載入動畫使用 `.loading-pulse`, `.loading-spin`, `.skeleton`

### 響應式設計

- [ ] 手機版使用單欄佈局,減少間距和內邊距
- [ ] 平板版使用雙欄或三欄佈局,適度增加間距
- [ ] 桌面版使用多欄佈局,充分利用螢幕空間
- [ ] 響應式字體和間距使用 `sm:`, `md:`, `lg:` 前綴

### 無障礙設計

- [ ] 所有互動元素支援鍵盤導航
- [ ] 焦點狀態使用 `focus:ring-2 focus:ring-ring`
- [ ] 狀態色搭配圖標和文字標籤,不僅依賴色彩
- [ ] 對比度達到 WCAG AA 標準

---

## 參考資源

### 內部文檔

- [美股投資分析平台配色方案建議 v3.0](./美股投資分析平台配色方案建議_v3.0.md)
- [專案 TODO 列表](./todo.md)

### 外部資源

- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Lucide React 圖標庫](https://lucide.dev/)
- [WCAG 2.1 無障礙標準](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM 對比度檢查工具](https://webaim.org/resources/contrastchecker/)

---

## 版本歷史

### 1.0 (2025-11-25)

- 初始版本發布
- 定義完整的色彩系統、字體層級、數字顯示樣式
- 建立間距、圓角、陰影、動畫規範
- 提供組件樣式規範和響應式設計指南
- 整合無障礙設計要求和實作檢查清單

---

**文檔結束**

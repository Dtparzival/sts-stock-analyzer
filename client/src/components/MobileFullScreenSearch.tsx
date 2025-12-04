import { useState, useEffect, useRef } from "react";
import { Search, X, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebounce } from "@shared/hooks/useDebounce";
import { trpc } from "@/lib/trpc";
import { searchTWStockByName, cleanTWSymbol, TW_STOCK_NAMES } from "@shared/markets";
import sp500Stocks from "@shared/sp500-stocks.json";

interface MobileFullScreenSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (symbol: string, market: 'TW' | 'US') => void;
}

interface SearchResult {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
}

/**
 * 手機版全螢幕搜尋元件
 * 提供更大的輸入與結果顯示空間，改善手機版搜尋體驗
 */
export default function MobileFullScreenSearch({ isOpen, onClose, onNavigate }: MobileFullScreenSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // 當搜尋框打開時自動聚焦
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // 延遲聚焦以確保動畫完成
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 搜尋台股
  const { data: twSearchResults } = trpc.twStock.search.useQuery(
    { 
      keyword: debouncedSearchQuery,
      limit: 5,
    },
    { 
      enabled: debouncedSearchQuery.length >= 1,
      staleTime: 30000,
    }
  );

  // 搜尋美股
  const { data: usSearchResults } = trpc.usStock.search.useQuery(
    { 
      keyword: debouncedSearchQuery,
      limit: 5,
    },
    { 
      enabled: debouncedSearchQuery.length >= 1,
      staleTime: 30000,
    }
  );

  // 合併搜尋結果
  useEffect(() => {
    if (debouncedSearchQuery.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const results: SearchResult[] = [];

    // 台股結果
    if (twSearchResults) {
      twSearchResults.forEach((stock: any) => {
        results.push({
          symbol: stock.symbol,
          name: stock.name || '',
          market: 'TW',
        });
      });
    }

    // 美股結果
    if (usSearchResults) {
      usSearchResults.forEach((stock: any) => {
        results.push({
          symbol: stock.symbol,
          name: stock.name || '',
          market: 'US',
        });
      });
    }

    setSearchResults(results);
    setIsSearching(false);
  }, [debouncedSearchQuery, twSearchResults, usSearchResults]);

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.symbol, result.market);
    onClose();
    setSearchQuery("");
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
  };

  // 防止背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background animate-slide-up">
      {/* 頂部搜尋列 */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="shrink-0 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="搜尋股票代號或名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-12 text-base border-2 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* 搜尋結果 */}
      <div className="overflow-y-auto h-[calc(100vh-80px)]">
        {searchQuery.length === 0 ? (
          // 空狀態提示
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="p-6 rounded-full bg-primary/10 mb-4">
              <Search className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">搜尋台美股</h3>
            <p className="text-sm text-muted-foreground">
              輸入股票代號或公司名稱開始搜尋
            </p>
          </div>
        ) : isSearching ? (
          // 載入狀態
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">搜尋中...</p>
            </div>
          </div>
        ) : searchResults.length === 0 ? (
          // 無結果狀態
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="p-6 rounded-full bg-muted mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">找不到相關股票</h3>
            <p className="text-sm text-muted-foreground">
              請嘗試其他關鍵字或股票代號
            </p>
          </div>
        ) : (
          // 搜尋結果列表
          <div className="px-4 py-3">
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.market}-${result.symbol}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg transition-all duration-200",
                    "bg-card hover:bg-muted/50 active:scale-[0.98] border border-border/50"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-lg shrink-0",
                    result.market === 'US' 
                      ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                      : "bg-gradient-to-br from-green-500 to-green-600"
                  )}>
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground truncate">
                        {result.symbol}
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full shrink-0",
                        result.market === 'US'
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      )}>
                        {result.market === 'US' ? '美股' : '台股'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {result.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { Search, X, Clock, TrendingUp, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@shared/hooks/useDebounce";
import { useSearchHistory, type SearchHistoryItem } from "@/hooks/useSearchHistory";

interface FullScreenSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (symbol: string, market: 'TW' | 'US') => void;
}

export default function FullScreenSearch({ isOpen, onClose, onNavigate }: FullScreenSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { history, addSearchItem, removeSearchItem, clearHistory, popularSearches } = useSearchHistory();
  
  // 使用統一搜尋 API
  const { data: searchResults, isLoading } = trpc.search.unified.useQuery(
    { query: debouncedSearchQuery, limit: 10 },
    { 
      enabled: debouncedSearchQuery.trim().length > 0,
      staleTime: 30000,
    }
  );
  
  // 當開啟時自動聚焦輸入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);
  
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
  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleResultClick = (symbol: string, name: string, market: 'TW' | 'US') => {
    // 儲存到搜尋歷史
    addSearchItem({ symbol, name, market });
    
    // 導航到股票詳情頁
    const fullSymbol = market === 'TW' ? `${symbol}.TW` : symbol;
    onNavigate(fullSymbol, market);
    onClose();
  };
  
  const handleHistoryClick = (item: SearchHistoryItem) => {
    handleResultClick(item.symbol, item.name, item.market === 'tw' ? 'TW' : 'US');
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults?.data && searchResults.data.length > 0) {
      const firstResult = searchResults.data[0];
      handleResultClick(firstResult.symbol, firstResult.name, firstResult.market);
    }
  };
  
  const handleRemoveHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSearchItem(id);
  };
  
  const handleClearHistory = () => {
    clearHistory();
  };
  
  if (!isOpen) return null;
  
  const showSearchResults = searchQuery.trim().length > 0;
  const hasSearchResults = searchResults?.data && searchResults.data.length > 0;
  
  return (
    <div className="fixed inset-0 z-[100] bg-background animate-fade-in" style={{ animationDuration: '200ms' }}>
      {/* 頂部搜尋欄 */}
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-6 w-6" />
            </Button>
            
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="輸入股票代碼或名稱"
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="pl-12 pr-4 h-12 text-base border-2 focus-visible:ring-2 focus-visible:ring-primary bg-background"
              />
              
              {isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
      
      {/* 搜尋內容區域 */}
      <div className="container mx-auto px-4 py-6 overflow-y-auto h-[calc(100vh-88px)]">
        {showSearchResults ? (
          // 搜尋結果
          <div>
            {hasSearchResults ? (
              <div className="space-y-2">
                {searchResults.data.map((result) => (
                  <button
                    key={`${result.market}-${result.symbol}`}
                    type="button"
                    onClick={() => handleResultClick(result.symbol, result.name, result.market)}
                    className="w-full px-4 py-4 text-left hover:bg-primary/10 active:bg-primary/15 transition-all duration-200 flex items-start justify-between rounded-lg border border-border group"
                  >
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          {result.symbol}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          result.market === 'US' 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                            : 'bg-green-500/10 text-green-600 dark:text-green-400'
                        }`}>
                          {result.market === 'US' ? '美股' : '台股'}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground truncate w-full">
                        {result.name}
                      </span>
                      {result.industry && (
                        <span className="text-xs text-muted-foreground/70 mt-1">
                          {result.industry}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">搜尋中...</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">找不到符合的股票</p>
              </div>
            )}
          </div>
        ) : (
          // 搜尋歷史與熱門搜尋
          <div className="space-y-8">
            {/* 搜尋歷史 */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">最近搜尋</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    全部清除
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleHistoryClick(item)}
                      className="w-full px-4 py-3 text-left hover:bg-primary/10 active:bg-primary/15 transition-all duration-200 flex items-center justify-between rounded-lg border border-border group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {item.symbol}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              item.market === 'us' 
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                : 'bg-green-500/10 text-green-600 dark:text-green-400'
                            }`}>
                              {item.market === 'us' ? '美股' : '台股'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground truncate w-full">
                            {item.name}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleRemoveHistoryItem(e, item.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 熱門搜尋 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">熱門搜尋</h3>
              </div>
              
              <div className="space-y-2">
                {popularSearches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleHistoryClick(item)}
                    className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center justify-between rounded-lg border border-border group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {item.symbol}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            item.market === 'us' 
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                              : 'bg-green-500/10 text-green-600 dark:text-green-400'
                          }`}>
                            {item.market === 'us' ? '美股' : '台股'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate w-full">
                          {item.name}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@shared/hooks/useDebounce";
import FullScreenSearch from "./FullScreenSearch";

interface SmartSearchDropdownProps {
  onNavigate: (symbol: string, market: 'TW' | 'US') => void;
}

export default function SmartSearchDropdown({ onNavigate }: SmartSearchDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 檢測是否為手機版
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 使用統一搜尋 API
  const { data: searchResults, isLoading } = trpc.search.unified.useQuery(
    { query: debouncedSearchQuery, limit: 10 },
    { 
      enabled: debouncedSearchQuery.trim().length > 0 && !isMobile,
      staleTime: 30000,
    }
  );
  
  // 當搜尋結果變化時，顯示或隱藏建議
  useEffect(() => {
    if (debouncedSearchQuery.trim().length > 0 && !isMobile) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedSearchQuery, searchResults, isMobile]);
  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSuggestionClick = (symbol: string, market: 'TW' | 'US') => {
    const fullSymbol = market === 'TW' ? `${symbol}.TW` : symbol;
    onNavigate(fullSymbol, market);
    setSearchQuery('');
    setShowSuggestions(false);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (searchResults?.data && searchResults.data.length > 0) {
        const firstResult = searchResults.data[0];
        handleSuggestionClick(firstResult.symbol, firstResult.market);
      }
    }
  };
  
  const handleMobileInputClick = () => {
    if (isMobile) {
      setIsFullScreenOpen(true);
    }
  };
  
  return (
    <>
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto px-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl rounded-2xl"></div>
          <div className="relative bg-card border-2 border-border rounded-xl sm:rounded-2xl shadow-xl overflow-visible">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground z-10" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="輸入股票代碼或名稱（例如：AAPL、2330、台積電）"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onClick={handleMobileInputClick}
                  onFocus={() => {
                    if (!isMobile && searchResults?.data && searchResults.data.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    if (!isMobile) {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }
                  }}
                  readOnly={isMobile}
                  className="pl-11 sm:pl-14 pr-3 sm:pr-4 h-12 sm:h-14 text-base sm:text-lg border-0 focus-visible:ring-0 bg-transparent cursor-pointer sm:cursor-text"
                />
                
                {/* 載入指示器 */}
                {isLoading && !isMobile && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {/* 自動完成建議（僅桌面版） */}
                {!isMobile && showSuggestions && searchResults?.data && searchResults.data.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                    {searchResults.data.map((result) => (
                      <button
                        key={`${result.market}-${result.symbol}`}
                        type="button"
                        onClick={() => handleSuggestionClick(result.symbol, result.market)}
                        className="w-full px-5 py-4 text-left hover:bg-primary/10 transition-colors flex items-start justify-between border-b border-border last:border-0 group"
                      >
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
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
                          <span className="text-xs sm:text-sm text-muted-foreground truncate w-full">
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
                )}
                
                {/* 無結果提示（僅桌面版） */}
                {!isMobile && showSuggestions && searchResults?.data && searchResults.data.length === 0 && !isLoading && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-xl shadow-2xl z-50 p-6 text-center">
                    <p className="text-sm text-muted-foreground">找不到符合的股票</p>
                  </div>
                )}
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-semibold bg-gradient-gold hover:bg-gradient-gold-hover border-0 shadow-gold-lg button-hover w-full sm:w-auto"
                disabled={!searchQuery.trim() || isLoading}
                onClick={(e) => {
                  if (isMobile) {
                    e.preventDefault();
                    setIsFullScreenOpen(true);
                  }
                }}
              >
                搜尋
              </Button>
            </div>
          </div>
        </div>
      </form>
      
      {/* 全螢幕搜尋介面（僅手機版） */}
      <FullScreenSearch
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
}

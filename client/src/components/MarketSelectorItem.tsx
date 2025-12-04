import { Check } from 'lucide-react';
import type { MarketType } from '@shared/markets';

interface MarketSelectorItemProps {
  market: MarketType;
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * 市場選擇選單項目元件
 * 用於底部彈出選單中的市場選項
 */
export default function MarketSelectorItem({
  market,
  label,
  description,
  isSelected,
  onClick,
}: MarketSelectorItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200
        ${isSelected 
          ? 'bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg' 
          : 'bg-muted/30 hover:bg-muted/50 active:bg-muted/70'
        }
      `}
      aria-pressed={isSelected}
    >
      <div className="flex-1 text-left">
        <div className={`text-base font-semibold mb-1 ${isSelected ? 'text-white' : 'text-foreground'}`}>
          {label}
        </div>
        <div className={`text-sm ${isSelected ? 'text-blue-100' : 'text-muted-foreground'}`}>
          {description}
        </div>
      </div>
      
      {isSelected && (
        <div className="ml-3 flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
        </div>
      )}
    </button>
  );
}

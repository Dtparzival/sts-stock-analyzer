import { Star, Wallet, History } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

/**
 * 手機版底部導航列元件
 * 僅在手機版（< 640px）顯示，提供快速導航功能
 */
export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    {
      icon: Star,
      label: "收藏",
      path: "/watchlist",
    },
    {
      icon: Wallet,
      label: "投資組合",
      path: "/portfolio",
    },
    {
      icon: History,
      label: "歷史",
      path: "/history",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-card/95 backdrop-blur-md border-t border-border/50 shadow-lg">
      <div className="flex items-center justify-around px-4 py-3 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-[72px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "animate-bounce-subtle")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

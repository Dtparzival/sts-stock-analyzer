import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Portfolio() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: portfolio, isLoading } = trpc.portfolio.list.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground mb-6">請先登入以查看投資組合</p>
              <Button asChild>
                <a href={getLoginUrl()}>登入</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">投資組合</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !portfolio || portfolio.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">尚未添加任何持倉</p>
              <p className="text-sm text-muted-foreground">
                此功能即將推出，敬請期待
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {portfolio.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{item.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{item.companyName || item.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">持股數量</p>
                      <p className="text-xl font-bold">{item.shares}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">買入價格</p>
                      <p className="font-semibold">${(item.purchasePrice / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">買入日期</p>
                      <p className="font-semibold">
                        {new Date(item.purchaseDate).toLocaleDateString("zh-TW")}
                      </p>
                    </div>
                  </div>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-4">備註：{item.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

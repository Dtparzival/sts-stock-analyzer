import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Database, TrendingUp, Calendar, Activity } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * 資料同步狀態頁面
 * 展示台美股資料同步進度、統計資訊與錯誤記錄
 */
export default function SyncStatus() {
  const { data: overview, isLoading: overviewLoading } = trpc.syncStatus.getOverview.useQuery();
  const { data: twHistory } = trpc.syncStatus.getSyncHistory.useQuery({ market: "TW", limit: 10 });
  const { data: usHistory } = trpc.syncStatus.getSyncHistory.useQuery({ market: "US", limit: 10 });
  const { data: twErrors } = trpc.syncStatus.getSyncErrors.useQuery({ 
    market: "TW", 
    resolved: false, 
    limit: 10 
  });
  const { data: usErrors } = trpc.syncStatus.getSyncErrors.useQuery({ 
    market: "US", 
    resolved: false, 
    limit: 10 
  });

  if (overviewLoading) {
    return (
      <div className="container py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const twData = overview?.data?.tw;
  const usData = overview?.data?.us;

  return (
    <div className="container py-8">
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">資料同步狀態</h1>
          <p className="text-muted-foreground mt-2">
            檢視台美股資料同步進度與統計資訊
          </p>
        </div>

        {/* 整體統計卡片 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 台股統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                台股資料統計
              </CardTitle>
              <CardDescription>Taiwan Stock Market</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">股票總數</p>
                  <p className="text-2xl font-bold font-mono">{twData?.totalStocks || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">價格記錄數</p>
                  <p className="text-2xl font-bold font-mono">{twData?.totalPriceRecords?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">已同步股票</p>
                  <p className="text-2xl font-bold font-mono">{twData?.stocksWithPrices || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">覆蓋率</p>
                  <p className="text-2xl font-bold font-mono">{twData?.coveragePercent || 0}%</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    最早資料日期
                  </span>
                  <span className="font-mono">{twData?.earliestPriceDate || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    最新資料日期
                  </span>
                  <span className="font-mono">{twData?.latestPriceDate || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    最後同步時間
                  </span>
                  <span className="font-mono text-xs">
                    {twData?.latestSyncTime 
                      ? new Date(twData.latestSyncTime).toLocaleString("zh-TW")
                      : "N/A"}
                  </span>
                </div>
              </div>

              {twData && twData.unresolvedErrors > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>發現錯誤</AlertTitle>
                  <AlertDescription>
                    有 {twData.unresolvedErrors} 筆未解決的同步錯誤
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 美股統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                美股資料統計
              </CardTitle>
              <CardDescription>US Stock Market</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">股票總數</p>
                  <p className="text-2xl font-bold font-mono">{usData?.totalStocks || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">價格記錄數</p>
                  <p className="text-2xl font-bold font-mono">{usData?.totalPriceRecords?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">已同步股票</p>
                  <p className="text-2xl font-bold font-mono">{usData?.stocksWithPrices || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">覆蓋率</p>
                  <p className="text-2xl font-bold font-mono">{usData?.coveragePercent || 0}%</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    最早資料日期
                  </span>
                  <span className="font-mono">{usData?.earliestPriceDate || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    最新資料日期
                  </span>
                  <span className="font-mono">{usData?.latestPriceDate || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    最後同步時間
                  </span>
                  <span className="font-mono text-xs">
                    {usData?.latestSyncTime 
                      ? new Date(usData.latestSyncTime).toLocaleString("zh-TW")
                      : "N/A"}
                  </span>
                </div>
              </div>

              {usData && usData.unresolvedErrors > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>發現錯誤</AlertTitle>
                  <AlertDescription>
                    有 {usData.unresolvedErrors} 筆未解決的同步錯誤
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 同步歷史與錯誤記錄 */}
        <Card>
          <CardHeader>
            <CardTitle>同步歷史與錯誤記錄</CardTitle>
            <CardDescription>檢視最近的同步記錄與錯誤詳情</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tw-history" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="tw-history">台股歷史</TabsTrigger>
                <TabsTrigger value="us-history">美股歷史</TabsTrigger>
                <TabsTrigger value="tw-errors">台股錯誤</TabsTrigger>
                <TabsTrigger value="us-errors">美股錯誤</TabsTrigger>
              </TabsList>

              {/* 台股同步歷史 */}
              <TabsContent value="tw-history" className="space-y-4">
                {twHistory?.data && twHistory.data.length > 0 ? (
                  <div className="space-y-3">
                    {twHistory.data.map((record: any) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={record.status === "success" ? "default" : "destructive"}>
                              {record.status}
                            </Badge>
                            <span className="font-medium">{record.dataType}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            同步 {record.recordCount} 筆資料
                          </p>
                          {record.errorMessage && (
                            <p className="text-sm text-destructive">{record.errorMessage}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{new Date(record.lastSyncAt).toLocaleString("zh-TW")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無同步記錄</p>
                )}
              </TabsContent>

              {/* 美股同步歷史 */}
              <TabsContent value="us-history" className="space-y-4">
                {usHistory?.data && usHistory.data.length > 0 ? (
                  <div className="space-y-3">
                    {usHistory.data.map((record: any) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={record.status === "success" ? "default" : "destructive"}>
                              {record.status}
                            </Badge>
                            <span className="font-medium">{record.dataType}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            同步 {record.recordCount} 筆資料
                          </p>
                          {record.errorMessage && (
                            <p className="text-sm text-destructive">{record.errorMessage}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{new Date(record.lastSyncAt).toLocaleString("zh-TW")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無同步記錄</p>
                )}
              </TabsContent>

              {/* 台股錯誤記錄 */}
              <TabsContent value="tw-errors" className="space-y-4">
                {twErrors?.data && twErrors.data.length > 0 ? (
                  <div className="space-y-3">
                    {twErrors.data.map((error: any) => (
                      <Alert key={error.id} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="flex items-center gap-2">
                          {error.errorType}
                          {error.symbol && <Badge variant="outline">{error.symbol}</Badge>}
                        </AlertTitle>
                        <AlertDescription>
                          <p className="mb-2">{error.errorMessage}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(error.syncedAt).toLocaleString("zh-TW")} · 
                            重試 {error.retryCount} 次
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">目前沒有未解決的錯誤</p>
                  </div>
                )}
              </TabsContent>

              {/* 美股錯誤記錄 */}
              <TabsContent value="us-errors" className="space-y-4">
                {usErrors?.data && usErrors.data.length > 0 ? (
                  <div className="space-y-3">
                    {usErrors.data.map((error: any) => (
                      <Alert key={error.id} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="flex items-center gap-2">
                          {error.errorType}
                          {error.symbol && <Badge variant="outline">{error.symbol}</Badge>}
                        </AlertTitle>
                        <AlertDescription>
                          <p className="mb-2">{error.errorMessage}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(error.syncedAt).toLocaleString("zh-TW")} · 
                            重試 {error.retryCount} 次
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">目前沒有未解決的錯誤</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

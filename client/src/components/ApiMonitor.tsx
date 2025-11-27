import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * API 速率限制監控組件
 * 顯示 TwelveData API 使用狀況和警告
 */
export function ApiMonitor() {
  const [showMonitor, setShowMonitor] = useState(false);
  
  // 每 30 秒查詢一次 API 使用狀況
  const { data: monitorData } = trpc.apiMonitor.getTwelveDataStats.useQuery(undefined, {
    refetchInterval: 30000, // 30 秒
    enabled: true,
  });

  // 當接近速率限制時顯示監控面板
  useEffect(() => {
    if (monitorData?.isNearLimit) {
      setShowMonitor(true);
    }
  }, [monitorData?.isNearLimit]);

  // 如果沒有警告訊息且不需要顯示，則不渲染
  if (!showMonitor && !monitorData?.warningMessage) {
    return null;
  }

  const stats = monitorData?.stats;
  const warningMessage = monitorData?.warningMessage;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {warningMessage && (
        <Alert variant={monitorData.isNearLimit ? "destructive" : "default"} className="mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API 速率限制提示</AlertTitle>
          <AlertDescription>{warningMessage}</AlertDescription>
        </Alert>
      )}
      
      {showMonitor && stats && (
        <Alert variant="default" className="bg-background/95 backdrop-blur">
          <Info className="h-4 w-4" />
          <AlertTitle>API 使用狀況</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>可用令牌：</span>
                <span className="font-mono">{stats.availableTokens} / {stats.maxTokens}</span>
              </div>
              <div className="flex justify-between">
                <span>使用率：</span>
                <span className="font-mono">{stats.utilizationRate}</span>
              </div>
              <div className="flex justify-between">
                <span>排隊請求：</span>
                <span className="font-mono">{stats.queueLength}</span>
              </div>
              <div className="flex justify-between">
                <span>本分鐘請求：</span>
                <span className="font-mono">{stats.currentMinuteRequests}</span>
              </div>
              <div className="flex justify-between">
                <span>總請求數：</span>
                <span className="font-mono">{stats.totalRequests}</span>
              </div>
              <div className="flex justify-between">
                <span>成功 / 失敗：</span>
                <span className="font-mono">{stats.successRequests} / {stats.failedRequests}</span>
              </div>
            </div>
            <button
              onClick={() => setShowMonitor(false)}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground"
            >
              關閉監控面板
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

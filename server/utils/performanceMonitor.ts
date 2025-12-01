/**
 * API 效能監控模組
 * 記錄並統計 API 回應時間，提供效能分析功能
 */

interface PerformanceMetric {
  path: string;
  type: string;
  duration: number;
  timestamp: Date;
  status: 'success' | 'slow' | 'very_slow' | 'error';
}

interface PerformanceStats {
  path: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  slowCount: number; // > 1s
  verySlowCount: number; // > 3s
  errorCount: number;
}

// 記憶體中的效能指標（最多保留 1000 筆）
const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

/**
 * 記錄 API 效能指標
 */
export function recordMetric(
  path: string,
  type: string,
  duration: number,
  status: 'success' | 'slow' | 'very_slow' | 'error'
): void {
  const metric: PerformanceMetric = {
    path,
    type,
    duration,
    timestamp: new Date(),
    status,
  };

  metrics.push(metric);

  // 保持最多 MAX_METRICS 筆記錄
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
}

/**
 * 取得所有效能指標
 */
export function getAllMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/**
 * 取得指定時間範圍內的效能指標
 */
export function getMetricsByTimeRange(
  startTime: Date,
  endTime: Date
): PerformanceMetric[] {
  return metrics.filter(
    (m) => m.timestamp >= startTime && m.timestamp <= endTime
  );
}

/**
 * 計算效能統計資料
 */
export function getPerformanceStats(): PerformanceStats[] {
  const statsMap = new Map<string, PerformanceStats>();

  for (const metric of metrics) {
    const key = metric.path;
    const existing = statsMap.get(key);

    if (!existing) {
      statsMap.set(key, {
        path: metric.path,
        count: 1,
        avgDuration: metric.duration,
        minDuration: metric.duration,
        maxDuration: metric.duration,
        slowCount: metric.status === 'slow' || metric.status === 'very_slow' ? 1 : 0,
        verySlowCount: metric.status === 'very_slow' ? 1 : 0,
        errorCount: metric.status === 'error' ? 1 : 0,
      });
    } else {
      existing.count++;
      existing.avgDuration =
        (existing.avgDuration * (existing.count - 1) + metric.duration) /
        existing.count;
      existing.minDuration = Math.min(existing.minDuration, metric.duration);
      existing.maxDuration = Math.max(existing.maxDuration, metric.duration);
      
      if (metric.status === 'slow' || metric.status === 'very_slow') {
        existing.slowCount++;
      }
      if (metric.status === 'very_slow') {
        existing.verySlowCount++;
      }
      if (metric.status === 'error') {
        existing.errorCount++;
      }

      statsMap.set(key, existing);
    }
  }

  return Array.from(statsMap.values());
}

/**
 * 取得最慢的 API（按平均回應時間排序）
 */
export function getSlowestAPIs(limit: number = 10): PerformanceStats[] {
  const stats = getPerformanceStats();
  return stats
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, limit);
}

/**
 * 取得錯誤率最高的 API
 */
export function getHighestErrorAPIs(limit: number = 10): PerformanceStats[] {
  const stats = getPerformanceStats();
  return stats
    .filter((s) => s.errorCount > 0)
    .sort((a, b) => b.errorCount / b.count - a.errorCount / a.count)
    .slice(0, limit);
}

/**
 * 清除所有效能指標
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * 產生效能報告
 */
export function generatePerformanceReport(): {
  totalRequests: number;
  avgDuration: number;
  slowRequests: number;
  verySlowRequests: number;
  errorRequests: number;
  slowestAPIs: PerformanceStats[];
  highestErrorAPIs: PerformanceStats[];
} {
  const stats = getPerformanceStats();
  const totalRequests = metrics.length;
  const avgDuration =
    metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests || 0;
  const slowRequests = metrics.filter(
    (m) => m.status === 'slow' || m.status === 'very_slow'
  ).length;
  const verySlowRequests = metrics.filter(
    (m) => m.status === 'very_slow'
  ).length;
  const errorRequests = metrics.filter((m) => m.status === 'error').length;

  return {
    totalRequests,
    avgDuration: Math.round(avgDuration),
    slowRequests,
    verySlowRequests,
    errorRequests,
    slowestAPIs: getSlowestAPIs(5),
    highestErrorAPIs: getHighestErrorAPIs(5),
  };
}

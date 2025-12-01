/**
 * 效能監控模組單元測試
 * 測試效能指標記錄、統計和報告功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordMetric,
  getAllMetrics,
  getPerformanceStats,
  getSlowestAPIs,
  getHighestErrorAPIs,
  generatePerformanceReport,
  clearMetrics,
} from '../../server/utils/performanceMonitor';

describe('效能監控模組測試', () => {
  beforeEach(() => {
    // 每個測試前清除所有指標
    clearMetrics();
  });

  describe('記錄效能指標', () => {
    it('應該正確記錄 API 效能指標', () => {
      recordMetric('stock.getDetail', 'query', 150, 'success');
      
      const metrics = getAllMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].path).toBe('stock.getDetail');
      expect(metrics[0].type).toBe('query');
      expect(metrics[0].duration).toBe(150);
      expect(metrics[0].status).toBe('success');
    });

    it('應該正確分類慢查詢', () => {
      recordMetric('stock.getDetail', 'query', 1500, 'slow');
      
      const metrics = getAllMetrics();
      expect(metrics[0].status).toBe('slow');
    });

    it('應該正確分類非常慢的查詢', () => {
      recordMetric('stock.getDetail', 'query', 3500, 'very_slow');
      
      const metrics = getAllMetrics();
      expect(metrics[0].status).toBe('very_slow');
    });

    it('應該正確記錄錯誤', () => {
      recordMetric('stock.getDetail', 'query', 500, 'error');
      
      const metrics = getAllMetrics();
      expect(metrics[0].status).toBe('error');
    });

    it('應該限制最多保留 1000 筆記錄', () => {
      // 記錄 1100 筆
      for (let i = 0; i < 1100; i++) {
        recordMetric(`api.test${i}`, 'query', 100, 'success');
      }
      
      const metrics = getAllMetrics();
      expect(metrics).toHaveLength(1000);
    });
  });

  describe('效能統計計算', () => {
    beforeEach(() => {
      // 準備測試資料
      recordMetric('stock.getDetail', 'query', 100, 'success');
      recordMetric('stock.getDetail', 'query', 200, 'success');
      recordMetric('stock.getDetail', 'query', 1500, 'slow');
      recordMetric('stock.getDetail', 'query', 3500, 'very_slow');
      recordMetric('stock.search', 'query', 50, 'success');
      recordMetric('stock.search', 'query', 500, 'error');
    });

    it('應該正確計算平均回應時間', () => {
      const stats = getPerformanceStats();
      const stockDetailStats = stats.find(s => s.path === 'stock.getDetail');
      
      expect(stockDetailStats).toBeDefined();
      expect(stockDetailStats!.count).toBe(4);
      // 平均值 = (100 + 200 + 1500 + 3500) / 4 = 1325
      expect(stockDetailStats!.avgDuration).toBeCloseTo(1325, 0);
    });

    it('應該正確計算最小和最大回應時間', () => {
      const stats = getPerformanceStats();
      const stockDetailStats = stats.find(s => s.path === 'stock.getDetail');
      
      expect(stockDetailStats!.minDuration).toBe(100);
      expect(stockDetailStats!.maxDuration).toBe(3500);
    });

    it('應該正確統計慢查詢數量', () => {
      const stats = getPerformanceStats();
      const stockDetailStats = stats.find(s => s.path === 'stock.getDetail');
      
      // 1 個 slow + 1 個 very_slow = 2
      expect(stockDetailStats!.slowCount).toBe(2);
      expect(stockDetailStats!.verySlowCount).toBe(1);
    });

    it('應該正確統計錯誤數量', () => {
      const stats = getPerformanceStats();
      const stockSearchStats = stats.find(s => s.path === 'stock.search');
      
      expect(stockSearchStats!.errorCount).toBe(1);
    });
  });

  describe('最慢 API 查詢', () => {
    beforeEach(() => {
      recordMetric('api.fast', 'query', 50, 'success');
      recordMetric('api.medium', 'query', 500, 'success');
      recordMetric('api.slow', 'query', 1500, 'slow');
      recordMetric('api.verySlow', 'query', 3500, 'very_slow');
    });

    it('應該按平均回應時間降序排序', () => {
      const slowest = getSlowestAPIs(10);
      
      expect(slowest[0].path).toBe('api.verySlow');
      expect(slowest[1].path).toBe('api.slow');
      expect(slowest[2].path).toBe('api.medium');
      expect(slowest[3].path).toBe('api.fast');
    });

    it('應該正確限制返回數量', () => {
      const slowest = getSlowestAPIs(2);
      
      expect(slowest).toHaveLength(2);
      expect(slowest[0].path).toBe('api.verySlow');
      expect(slowest[1].path).toBe('api.slow');
    });
  });

  describe('錯誤率最高 API 查詢', () => {
    beforeEach(() => {
      // api.error1: 50% 錯誤率 (1/2)
      recordMetric('api.error1', 'query', 100, 'success');
      recordMetric('api.error1', 'query', 100, 'error');
      
      // api.error2: 33% 錯誤率 (1/3)
      recordMetric('api.error2', 'query', 100, 'success');
      recordMetric('api.error2', 'query', 100, 'success');
      recordMetric('api.error2', 'query', 100, 'error');
      
      // api.noError: 0% 錯誤率
      recordMetric('api.noError', 'query', 100, 'success');
    });

    it('應該按錯誤率降序排序', () => {
      const highestError = getHighestErrorAPIs(10);
      
      expect(highestError[0].path).toBe('api.error1');
      expect(highestError[1].path).toBe('api.error2');
      // api.noError 不應該出現在列表中（錯誤數為 0）
      expect(highestError.find(api => api.path === 'api.noError')).toBeUndefined();
    });
  });

  describe('效能報告生成', () => {
    beforeEach(() => {
      recordMetric('api.test1', 'query', 100, 'success');
      recordMetric('api.test2', 'query', 1500, 'slow');
      recordMetric('api.test3', 'query', 3500, 'very_slow');
      recordMetric('api.test4', 'query', 500, 'error');
    });

    it('應該生成完整的效能報告', () => {
      const report = generatePerformanceReport();
      
      expect(report).toHaveProperty('totalRequests');
      expect(report).toHaveProperty('avgDuration');
      expect(report).toHaveProperty('slowRequests');
      expect(report).toHaveProperty('verySlowRequests');
      expect(report).toHaveProperty('errorRequests');
      expect(report).toHaveProperty('slowestAPIs');
      expect(report).toHaveProperty('highestErrorAPIs');
    });

    it('應該正確統計總請求數', () => {
      const report = generatePerformanceReport();
      
      expect(report.totalRequests).toBe(4);
    });

    it('應該正確計算平均回應時間', () => {
      const report = generatePerformanceReport();
      
      // 平均值 = (100 + 1500 + 3500 + 500) / 4 = 1400
      expect(report.avgDuration).toBe(1400);
    });

    it('應該正確統計慢查詢和錯誤數量', () => {
      const report = generatePerformanceReport();
      
      expect(report.slowRequests).toBe(2); // slow + very_slow
      expect(report.verySlowRequests).toBe(1);
      expect(report.errorRequests).toBe(1);
    });

    it('應該包含最慢的 5 個 API', () => {
      const report = generatePerformanceReport();
      
      expect(report.slowestAPIs).toHaveLength(4); // 只有 4 個不同的 API
      expect(report.slowestAPIs[0].path).toBe('api.test3'); // 最慢的
    });
  });

  describe('清除效能指標', () => {
    it('應該清除所有效能指標', () => {
      recordMetric('api.test', 'query', 100, 'success');
      expect(getAllMetrics()).toHaveLength(1);
      
      clearMetrics();
      expect(getAllMetrics()).toHaveLength(0);
    });
  });
});
